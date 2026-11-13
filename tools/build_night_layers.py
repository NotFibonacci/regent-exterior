import cv2, numpy as np
from PIL import Image, ImageDraw
U='/mnt/user-data/uploads/'; OUT='/home/claude/regent-exterior/public/home2/'
N={'path':'73f79c83','stone':'1ed70ea6','eave':'bcf14a73','holiday':'2019fc99'}
W,H=1448,1086
def load(p): return np.array(Image.open(p).convert('RGB').resize((W,H),Image.LANCZOS))
m={k:load(U+v+'-image.png') for k,v in N.items()}
real=load('/tmp/mk/real.png')
# Privacy: paint out the house number and the yard sign in every image.
mask=np.zeros((H,W),np.uint8)
cv2.rectangle(mask,(646,570),(684,596),255,-1); cv2.rectangle(mask,(1104,826),(1150,872),255,-1); cv2.rectangle(mask,(1124,872),(1134,915),255,-1)
for k in m: m[k]=cv2.inpaint(m[k],mask,5,cv2.INPAINT_TELEA)
real=cv2.inpaint(real,mask,5,cv2.INPAINT_TELEA)
lin=lambda a:(a.astype(np.float32)/255)**2.2
enc=lambda a:(np.clip(a,0,1)**(1/2.2)*255).astype(np.uint8)
L={k:lin(v) for k,v in m.items()}
# Unlit base: darkest value any mockup shows for each pixel.
lumf=lambda a:a@np.array([.2126,.7152,.0722],np.float32)
# The unlit house is the real night photograph (it lines up with the mockups
# to a tenth of a pixel). It has no fixtures at all, and its siding laps and
# stone joints are real. Its tone is graded to the mockups' look: the
# low-frequency ratio between the stone mockup and the photo is measured
# where the mockup is unlit, then spread smoothly over the whole frame.
R=lin(real)
mn=np.minimum.reduce([L['path'],L['stone'],L['holiday'],L['eave']])
unlit=(lumf(L['stone'])-lumf(mn)<0.003).astype(np.float32)
ratio=np.clip((L['stone']+0.002)/(R+0.002),0.05,6.0)
lr=np.log(ratio)
ok=unlit*((np.abs(lr-np.median(lr,axis=(0,1)))<1.2).all(-1)).astype(np.float32)
def nconv(v,wt,sig):
    return cv2.GaussianBlur(v*wt,(0,0),sig)/(cv2.GaussianBlur(wt,(0,0),sig)+1e-6)
grade=np.dstack([np.exp(nconv(lr[...,c],ok,28)) for c in range(3)])
base=R*grade
# Yard sign: cover the painted-out patch with stone cloned from its left.
x0,y0,x1,y1=1096,816,1158,920; sx=64
a=np.zeros((y1-y0,x1-x0),np.float32); a[6:-6,6:-6]=1; a=cv2.GaussianBlur(a,(0,0),3)[...,None]
base[y0:y1,x0:x1]=base[y0:y1,x0-sx:x1-sx]*a+base[y0:y1,x0:x1]*(1-a)
# The photo has lights on in two rooms and the mockups do not. The windows
# (frames, muntins and dark glass) come from the soffit mockup, whose
# windows are clean and unlit, so the grid reads properly at night.
for (x0,y0,x1,y1) in [(870,560,990,735),(880,835,970,900),(1262,562,1322,725)]:
    a=np.zeros((H,W),np.float32); cv2.rectangle(a,(x0+3,y0+3),(x1-3,y1-3),1,-1); a=cv2.GaussianBlur(a,(0,0),2.5)[...,None]
    base=base*(1-a)+L['eave']*a
# Where mockups disagree about objects (door, window box), keep one source.
for (x0,y0,x1,y1) in [(628,596,712,790),(815,372,990,470)]:
    a=np.zeros((H,W),np.float32); cv2.rectangle(a,(x0,y0),(x1,y1),1,-1); a=cv2.GaussianBlur(a,(0,0),6)[...,None]
    pass
# Sky from the stone mockup.
s=m['stone']; hsv=cv2.cvtColor(s,cv2.COLOR_RGB2HSV)
cand=((s[...,2].astype(int)>s[...,0].astype(int)+10)&(hsv[...,2]>25)).astype(np.uint8)
cand=cv2.morphologyEx(cand,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
n,lab=cv2.connectedComponents(cand); keep=set(np.unique(lab[0:5,:]))-{0}
sky=np.isin(lab,list(keep)).astype(np.float32); sky[int(H*.62):]=0
sky=cv2.GaussianBlur(sky,(0,0),1.5)[...,None]
base=base*(1-sky)+L['stone']*sky
lum=lambda a:a@np.array([.2126,.7152,.0722],np.float32)
layers={}
logl=lambda a:np.log(lumf(a)+0.002)
hp=lambda a:logl(a)-cv2.GaussianBlur(logl(a),(0,0),4)
bulbnear=None
masks={}
mailbox=np.zeros((H,W),np.float32); cv2.ellipse(mailbox,(516,772),(70,82),0,0,360,1,-1); mailbox=cv2.GaussianBlur(mailbox,(0,0),9)
# Light fixtures drawn in the path mockup (posts, caps, small cans), traced
# by hand. They belong to the path layer only, so with nothing switched on
# there is no hardware on the property at all.
POSTS=[(86,898,122,984),(124,836,142,874),(348,828,380,894),(501,874,534,944),(642,864,662,894),
       (1004,926,1044,1038),(1052,884,1074,908),(1178,880,1202,908),(722,890,738,912)]
for k in L:
    # Lit mask: light this mockup adds over the darkest of the set, so the
    # mockups' shared look (white trim, grass) never counts as light.
    d=np.clip(L[k]-mn,0,None)*(1-sky)
    w=np.clip((cv2.GaussianBlur(lumf(d),(0,0),3)-0.005)/0.025,0,1); w=w*w*(3-2*w)
    w=cv2.GaussianBlur(w,(0,0),3)*(1-sky[...,0])
    if k=='path':
        pm=np.zeros((H,W),np.float32)
        for (x0,y0,x1,y1) in POSTS: cv2.rectangle(pm,(x0,y0),(x1,y1),1,-1)
        w=np.maximum(w,cv2.GaussianBlur(pm,(0,0),1.5))
    else:
        # Other mockups' copies of path hardware stay out of their layers.
        pm=np.zeros((H,W),np.float32)
        for (x0,y0,x1,y1) in POSTS: cv2.rectangle(pm,(x0-6,y0-8),(x1+6,y1+4),1,-1)
        w*=1-cv2.GaussianBlur(pm,(0,0),2)
    w*=(1-mailbox)
    masks[k]=w
# Holiday layer: only its own lights, at full strength. The mask is built
# from the bulbs themselves (strong local peaks, widened to take in each
# bulb's glow on the fascia), plus the net-lit shrubs and the window box.
hl=lumf(np.clip(L['holiday']-mn,0,None)); hb=cv2.GaussianBlur(hl,(0,0),1.0)
pk=((hb==cv2.dilate(hb,np.ones((5,5),np.uint8)))&((hb-cv2.GaussianBlur(hl,(0,0),7))>0.08)&(hb>0.15)).astype(np.float32)
# Stone texture throws false peaks: bulbs are only looked for off the walls.
walls=np.zeros((H,W),np.float32)
for (x0,y0,x1,y1) in [(738,578,1162,910),(612,412,738,602),(1170,580,1260,890),(276,592,472,860),(1186,560,1340,880)]: cv2.rectangle(walls,(x0,y0),(x1,y1),1,-1)
pk*=1-walls
near=np.clip(cv2.GaussianBlur(pk,(0,0),3.5)*40,0,1)
near=np.maximum(near,np.clip(cv2.GaussianBlur(pk,(0,0),9)*60,0,1)*0.85)
plants=np.zeros((H,W),np.float32)
cv2.ellipse(plants,(262,780),(178,92),0,0,360,1,-1); cv2.ellipse(plants,(772,690),(84,96),0,0,360,1,-1); cv2.ellipse(plants,(160,700),(66,34),0,0,360,1,-1)
cv2.rectangle(plants,(815,385),(990,470),1,-1)
plants=cv2.GaussianBlur(plants,(0,0),4)*np.clip(hl/0.02,0,1)
masks['holiday']=np.clip(np.maximum(near,plants),0,1)*(1-sky[...,0])*(1-mailbox)
# Never on the lawn, walk, steps or low planting; never on the door.
gk=np.zeros((H,W),np.float32)
cv2.fillPoly(gk,[np.array([(0,872),(452,868),(468,792),(712,792),(726,872),(1448,900),(1448,1086),(0,1086)],np.int32)],1)
cv2.rectangle(gk,(626,594),(714,792),1,-1)
shr=np.zeros((H,W),np.float32); cv2.ellipse(shr,(262,780),(178,92),0,0,360,1,-1); cv2.ellipse(shr,(772,690),(84,96),0,0,360,1,-1)
masks['holiday']*=cv2.GaussianBlur(np.clip(1-gk+shr,0,1),(0,0),3)
# Stone uplights: no ground lights. The two post lights and the glow in the
# bed below the wall belong to the path layer.
ground=np.zeros((H,W),np.float32)
cv2.fillPoly(ground,[np.array([(560,905),(700,890),(1448,880),(1448,1086),(560,1086)],np.int32)],1)
for (x0,y0,x1,y1) in [(608,832,652,898),(664,846,708,908),(1026,866,1072,952),(1052,884,1074,910)]: cv2.rectangle(ground,(x0,y0),(x1,y1),1,-1)
masks['stone']*=1-cv2.GaussianBlur(ground,(0,0),5)
# Each mockup draws the windows a few pixels off from the others, so a layer
# would lay its own frame and grid over the base's. Inside the windows every
# layer uses the soffit mockup's window (the one in the base) and keeps only
# its own lighting, as a smooth ratio.
WINDOWS=[(870,560,990,735),(880,835,970,900),(1262,562,1322,725)]
for k in ['path','stone','holiday']:
    gain=np.clip(cv2.GaussianBlur(L[k],(0,0),10)/(cv2.GaussianBlur(L['eave'],(0,0),10)+0.002),0.4,4.0)
    for (x0,y0,x1,y1) in WINDOWS:
        a=np.zeros((H,W),np.float32); cv2.rectangle(a,(x0-6,y0-6),(x1+6,y1+6),1,-1); a=cv2.GaussianBlur(a,(0,0),3)[...,None]
        L[k]=L[k]*(1-a)+L['eave']*gain*a
for k in L:
    w=masks[k]
    layers[k]=np.clip(L[k]-mn,0,None)*w[...,None]
    src=L[k]
    if k=='holiday':
        src=L[k]+np.clip(L[k]-mn,0,None)*1.1*near[...,None]
    rgba=np.dstack([enc(src),(np.clip(w,0,1)*255).astype(np.uint8)])
    Image.fromarray(rgba,'RGBA').save(OUT+f'light-{k}.webp',quality=90,method=6,exact=True)
Image.fromarray(enc(base)).save(OUT+'base.webp',quality=92,method=6)
Image.fromarray(real).save(OUT+'real.webp',quality=86,method=6)
# Holiday bulbs: local maxima of the holiday layer; each gets a colour index.
hl=lum(layers['holiday']); hb=cv2.GaussianBlur(hl,(0,0),1.0)
hp=hb-cv2.GaussianBlur(hl,(0,0),7)
peak=(hb==cv2.dilate(hb,np.ones((5,5),np.uint8)))&(hp>0.16)&(hb>0.3)
ys,xs=np.nonzero(peak); print(len(xs),'bulbs')
rng=np.random.default_rng(4); ids=rng.integers(0,4,len(xs))
seed=np.ones((H,W),np.uint8); seed[ys,xs]=0
dist,labels=cv2.distanceTransformWithLabels(seed,cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
lab2id=np.zeros(labels.max()+1,np.int32); lab2id[labels[ys,xs]]=ids
idx=lab2id[labels]
fall=np.exp(-(dist/8.0)**2)
tex=np.zeros((H,W,4),np.uint8); tex[...,3]=((1-sky[...,0])*255).astype(np.uint8); tex[...,0]=idx*85; tex[...,1]=(fall*255).astype(np.uint8)
# Snow cover in blue: roofs (dark shingles inside a hull) and the ground.
def poly(p):
    im=Image.new('L',(W,H),0); ImageDraw.Draw(im).polygon(p,fill=255); return np.array(im).astype(np.float32)/255
rl=lum(lin(real))
roof=poly([(262,578),(285,560),(760,250),(990,156),(1250,66),(1264,98),(1150,278),(905,128),(742,380),(700,300),(652,342),(640,420),(470,552)])*(rl<0.035)*(1-sky[...,0])
roof=cv2.morphologyEx(roof.astype(np.uint8),cv2.MORPH_OPEN,np.ones((3,3),np.uint8)).astype(np.float32)
roof=cv2.morphologyEx(roof.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((9,9),np.uint8)).astype(np.float32)
n1=cv2.GaussianBlur(rng.random((H//8,W//8)).astype(np.float32),(0,0),5); n1=cv2.resize((n1-n1.min())/np.ptp(n1),(W,H))
n2=cv2.GaussianBlur(rng.random((H//2,W//2)).astype(np.float32),(0,0),2); n2=cv2.resize((n2-n2.min())/np.ptp(n2),(W,H))
ground=poly([(0,872),(120,868),(430,872),(560,905),(760,935),(1000,975),(1200,1010),(1448,930),(1448,1086),(0,1086)])
snow=np.clip(roof*(0.75+0.25*n2)+ground*np.clip(0.2+0.9*n1+0.3*(n2-.5),0,.9),0,1)
tex[...,2]=(cv2.GaussianBlur(snow,(0,0),1.6)*255).astype(np.uint8)
Image.fromarray(tex).save(OUT+'holiday-map.png',optimize=True)
# previews
allon=base+np.maximum.reduce([layers['path'],layers['stone'],layers['eave']])
sh=Image.new('RGB',(W*2,H*2)); 
for i,a in enumerate([base,allon,base+layers['holiday'],np.dstack([snow,roof,fall])][:3]): sh.paste(Image.fromarray(enc(a)),((i%2)*W,(i//2)*H))
sh.resize((1448,1086)).save('/tmp/mk/prev.jpg',quality=88)
import os
for f in sorted(os.listdir(OUT)): print(f,os.path.getsize(OUT+f)//1024,'KB')

# ---- Tiers: the lowest package level at which each part of a layer lights.
# Tier 3 is the full mockup; tier 2 drops the extras; tier 1 is the essentials.
def tiermap(rules):
    t=np.full((H,W),3,np.float32)
    for tier,pts in rules:
        m=np.zeros((H,W),np.uint8); cv2.fillPoly(m,[np.array(pts,np.int32)],1); t=np.where(m>0,np.minimum(t,tier),t)
    return cv2.GaussianBlur(t,(0,0),5)
rect=lambda x0,y0,x1,y1:[(x0,y0),(x1,y0),(x1,y1),(x0,y1)]
T={
 # Path: 1 = the two posts at the steps; 2 = every walkway post and pool; 3 = plus shrub and planting uplights.
 'path':[(2,[(0,895),(330,868),(560,868),(1060,925),(1060,1086),(0,1086)]),(2,rect(84,890,124,990)),(2,rect(122,832,144,878)),(2,rect(340,820,390,900)),
         (1,rect(330,818,560,960))],
 # Stone: 1 = the front face beside the tree; 2 = the whole front face; 3 = plus the entry stone and the corner pier.
 'stone':[(2,rect(735,520,1160,930)),(1,rect(745,520,965,930))],
 # Soffit: 1 = the band over the stone; 2 = plus the wing eave; 3 = plus gable peaks, dormer and side.
 'eave':[(1,rect(735,500,1160,640)),(2,rect(255,540,480,640))],
 # Holiday: 1 = the front gable and its eave line; 2 = every roofline; 3 = plus shrubs, tree, wreath and window box.
 'holiday':[(2,[(255,0),(1448,0),(1448,600),(255,600)]),(1,[(730,100),(912,100),(1170,250),(1170,560),(730,560)]),
            (3,rect(815,380,995,475))],
}
tm=np.dstack([tiermap(T[k]) for k in ['path','stone','eave','holiday']])
Image.fromarray(np.clip(tm*85,0,255).astype(np.uint8),'RGBA').save(OUT+'tier-map.png',optimize=True)
print('tier map written')
