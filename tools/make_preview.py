"""Copy dist/ to a preview folder that works when served from any sub-path
(the claude.ai artifact host): root-relative links become relative, directory
links end in index.html, and _astro/ becomes assets/ ("_" paths are reserved)."""
import os, re, shutil, sys
src, out = sys.argv[1], sys.argv[2]
shutil.rmtree(out, ignore_errors=True)
shutil.copytree(src, out)
os.rename(os.path.join(out, '_astro'), os.path.join(out, 'assets'))
files = set()
for root, _, fs in os.walk(out):
    for f in fs: files.add(os.path.relpath(os.path.join(root, f), out).replace(os.sep, '/'))

def fix(path, prefix):
    q = ''
    m = re.match(r'([^?#]*)([?#].*)?$', path); path, q = m.group(1), m.group(2) or ''
    path = path.lstrip('/').replace('_astro/', 'assets/')
    if path == '' : path = 'index.html'
    elif path.endswith('/'): path += 'index.html'
    return prefix + path + q, path

missing = set()
for rel in sorted(files):
    if not rel.endswith(('.html', '.css')): continue
    p = os.path.join(out, rel)
    depth = rel.count('/')
    prefix = '../' * depth if rel.endswith('.html') else ''
    s = open(p, encoding='utf-8').read()
    def rep(m):
        new, target = fix(m.group(2), prefix)
        if target.split('#')[0] not in files: missing.add((rel, target))
        return m.group(1) + new
    if rel.endswith('.html'):
        s = re.sub(r'((?:href|src|content|data-assets|component-url|renderer-url|before-hydration-url)=")(/(?!/)[^"]*)', lambda m: rep(m) if not m.group(0).startswith('content') or m.group(2).startswith('/img') else m.group(0), s)
        s = re.sub(r'data-assets="((?:\.\./)*)index\.html"', lambda m: 'data-assets="' + (m.group(1) or './') + '"', s)
        s = re.sub(r'(srcset=")(/[^"]*)', rep, s)
    else:
        s = re.sub(r'(url\()(/_astro/[^)]*)', lambda m: m.group(1) + m.group(2).replace('/_astro/', ''), s)
    open(p, 'w', encoding='utf-8').write(s)
for r in files:
    if r.endswith('.js'):
        p = os.path.join(out, r.replace('_astro/', 'assets/')) if False else os.path.join(out, r)
for root, _, fs in os.walk(os.path.join(out, 'assets')):
    for f in fs:
        if f.endswith('.js'):
            p = os.path.join(root, f); s = open(p, encoding='utf-8').read()
            if '/_astro/' in s: open(p, 'w').write(s.replace('/_astro/', './'))
missing = {m for m in missing if not m[1].endswith(('sitemap-index.xml', 'robots.txt'))}
print('missing references:', sorted(missing) if missing else 'none')
