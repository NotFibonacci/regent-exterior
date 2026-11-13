export type County = {
  slug: string;
  name: string;
  towns: string[];
  zips: string; // 'ZIP Place|ZIP Place', grouped by place on the page
  intro: string;
  homes: string;
  lighting: string;
  holiday: string;
  note: string;
};

// Each page is written for its county. A county page that would only repeat
// another one with the name swapped is not published.
export const counties: County[] = [
  {
    slug: 'baltimore-county',
    name: 'Baltimore County',
    towns: ['Towson', 'Ruxton', 'Lutherville-Timonium', 'Cockeysville', 'Catonsville', 'Pikesville', 'Owings Mills', 'Perry Hall'],
    zips: '21234 Parkville|21117 Owings Mills|21222 Dundalk|21228 Catonsville|21207 Gwynn Oak|21221 Essex|21220 Middle River|21236 Nottingham|21093 Lutherville-Timonium|21244 Windsor Mill|21227 Halethorpe|21204 Towson|21286 Towson|21204 Ruxton|21208 Pikesville|21153 Stevenson|21071 Glyndon|21131 Phoenix|21013 Baldwin|21051 Fork|21057 Glen Arm|21082 Hydes|21162 White Marsh|21128 Perry Hall|21030 Cockeysville|21111 Monkton|21120 Parkton',
    intro: 'From the older streets around Towson and Ruxton to the newer neighbourhoods out toward Owings Mills and Perry Hall, Baltimore County homes cover almost every style built in Maryland over the last century.',
    homes: 'Many of the homes we see here are stone and brick colonials, Tudors and Cape Cods on mature lots, often with large trees close to the house. Those trees shape everything: where light can reach, how much leaf litter ends up in the gutters, and which walls stay in shadow at night.',
    lighting: 'On older stone and brick fronts, grazing the wall from close to its base brings out the texture of the masonry. Under mature trees we often light the canopy from below instead of adding more light to the house, which keeps the street side calm and the house itself the focus.',
    holiday: 'Steep rooflines and tall gables are common, so many installs here involve second-storey and peak work. We measure and plan those runs before install day, and the estimate reflects the height.',
    note: 'If your home sits in a historic district or under covenants, we can prepare fixture details for your review before anything is installed.',
  },
  {
    slug: 'baltimore-city',
    name: 'Baltimore City',
    towns: ['Roland Park', 'Guilford', 'Homeland', 'Mount Washington', 'Federal Hill', 'Fells Point', 'Canton', 'Hampden'],
    zips: '21215 Baltimore|21206 Baltimore|21210 Roland Park|21209 Mount Washington|21212 Homeland|21212 Guilford|21218 Charles Village|21211 Hampden|21202 Mount Vernon|21231 Fells Point|21230 Federal Hill|21224 Canton',
    intro: 'Baltimore City homes run from the stone and shingle houses of Roland Park, Guilford and Homeland to the brick rowhomes of Federal Hill, Fells Point and Canton, and each needs its own plan.',
    homes: 'In the northern neighbourhoods, detached homes sit on tree-lined lots with deep porches and steep roofs. Closer to the harbour, rowhomes share walls with their neighbours, fronts are narrow and the sidewalk is a step from the door.',
    lighting: 'On a rowhome a little light goes a long way: one warm fixture at the door, a soft wash up the brick, and nothing that spills onto the house next door. On the larger detached homes up north, we light the porch, the walk and the trees much as we would in the county.',
    holiday: 'Rowhome fronts are short runs, often with a cornice, railings and a stoop to dress, so the price depends more on detail than on footage. Detached homes are measured by roofline like anywhere else.',
    note: 'Many city neighbourhoods are local historic districts, where exterior changes go through CHAP review, and some, such as Roland Park, also have their own covenants. We can prepare fixture details for both before work starts.',
  },
  {
    slug: 'anne-arundel-county',
    name: 'Anne Arundel County',
    towns: ['Annapolis', 'Severna Park', 'Arnold', 'Crofton', 'Davidsonville', 'Edgewater', 'Pasadena', 'Millersville'],
    zips: '21122 Pasadena|21061 Glen Burnie|21060 Glen Burnie|21401 Annapolis|21403 Annapolis|21405 Annapolis|21409 Annapolis|21144 Severn|21113 Odenton|21225 Brooklyn Park|21056 Gibson Island|21146 Severna Park|21012 Arnold|21035 Davidsonville|21140 Riva|21032 Crownsville|21054 Gambrills|21108 Millersville|21114 Crofton|21037 Edgewater|20765 Galesville|20778 West River|20779 Tracys Landing|20776 Harwood|21076 Hanover',
    intro: 'Anne Arundel County runs from the water at Annapolis and Severna Park to the wooded lots around Davidsonville and Crofton, and the setting changes what a good exterior needs.',
    homes: 'Near the water, salt air and wind are hard on anything left outside. Further inland, larger lots and long drives are common, and many homes sit well back from the road.',
    lighting: 'For waterfront and near-water homes we specify fixtures in brass, copper or other corrosion-resistant finishes, because painted aluminium does not last in salt air. On deeper lots, a lit drive and path matter as much as the house itself: guests should find the door without a floodlight.',
    holiday: 'Waterfront homes are often seen from the water and the far shore as well as the street, so we plan the rooflines that face both. Wind exposure also means clips and runs are fixed for weather, not just for looks.',
    note: 'Homes in or near downtown Annapolis may fall under historic review. We can prepare what your review board asks for before any work starts.',
  },
  {
    slug: 'howard-county',
    name: 'Howard County',
    towns: ['Ellicott City', 'Columbia', 'Clarksville', 'Fulton', 'Highland', 'Glenelg', 'Elkridge', 'Woodbine'],
    zips: '21043 Ellicott City|21042 Ellicott City|21044 Columbia|21045 Columbia|21046 Columbia|21075 Elkridge|20723 Laurel|21738 Glenwood|20759 Fulton|21737 Glenelg|21029 Clarksville|21723 Cooksville|21794 West Friendship|20777 Highland|21036 Dayton|21104 Marriottsville|21797 Woodbine|21163 Woodstock',
    intro: 'Howard County mixes the stone and frame homes of historic Ellicott City with planned neighbourhoods in Columbia and larger estate lots in Clarksville, Fulton, Highland and Glenelg.',
    homes: 'In planned communities, exterior changes often need approval from a village board or HOA, including lighting and colours. Out west, homes on larger lots tend to be newer, with long drives, open lawns and wide frontages.',
    lighting: 'Where a review board is involved, we put together the fixture types, finishes, colour temperature and a simple plan of where each light goes, which is usually what an application asks for. On larger lots, a few well-placed lights on the house and drive do more than lighting the whole lawn.',
    holiday: 'Wide frontages mean long roofline runs, and the estimate is driven mainly by that footage. Our estimator gives you a range before we visit, and we confirm it on site.',
    note: 'Older properties in Ellicott City may be under historic preservation review. Ask us, and we will help you check before choosing fixtures.',
  },
  {
    slug: 'montgomery-county',
    name: 'Montgomery County',
    towns: ['Bethesda', 'Potomac', 'Chevy Chase', 'Kensington', 'Olney', 'North Potomac', 'Brookeville', 'Silver Spring'],
    zips: '20901 Silver Spring|20910 Silver Spring|20854 Potomac|20817 Bethesda|20816 Bethesda|20814 Bethesda|20815 Chevy Chase|20818 Cabin John|20812 Glen Echo|20896 Garrett Park|20895 Kensington|20878 North Potomac|20853 Rockville|20833 Brookeville|20832 Olney|20861 Ashton|20882 Laytonsville|20841 Boyds|20837 Poolesville|20871 Clarksburg|20905 Colesville',
    intro: 'Montgomery County takes in close-in Bethesda, Chevy Chase and Kensington, the estate lots of Potomac and North Potomac, and the open country around Olney, Brookeville and Poolesville.',
    homes: 'Close in, homes are often older colonials and Tudors alongside new custom builds, on tight, tree-shaded lots. In Potomac and further out, larger houses sit well back behind long drives, with formal entries and mature planting.',
    lighting: 'On close-in lots, light has to stay on your property: shielded fixtures, low output and careful aim, so nothing shines into a neighbour\'s windows. On estate lots, the drive, the entry and a few specimen trees carry the design, and the house is lit to be seen from the approach.',
    holiday: 'Larger homes mean long rooflines and tall peaks, and many have drives and trees worth dressing too. We measure everything at the design visit and confirm the price before install.',
    note: 'Some areas, including Chevy Chase Village, Garrett Park and Kensington, have historic designations or town rules that cover exterior work. We will help you check what applies and prepare details for any review.',
  },
  {
    slug: 'prince-georges-county',
    name: "Prince George's County",
    towns: ['Bowie', 'Upper Marlboro', 'Mitchellville', 'Laurel', 'Greenbelt', 'College Park', 'Brandywine', 'Fort Washington'],
    zips: '20744 Fort Washington|20772 Upper Marlboro|20774 Upper Marlboro|20783 Hyattsville|20785 Hyattsville|20782 Hyattsville|20706 Lanham|20740 College Park|20721 Mitchellville|20720 Bowie|20715 Bowie|20716 Bowie|20769 Glenn Dale|20607 Accokeek|20613 Brandywine|20623 Cheltenham|20735 Clinton',
    intro: "In Prince George's County we work mostly with the colonial and contemporary homes around Bowie, Mitchellville and Upper Marlboro, where generous lots and two-storey fronts are the norm.",
    homes: 'Many homes here have brick or stone fronts with siding on the sides and back, two full storeys, and a formal entry. Lots are often wide, with a front lawn between the house and the street.',
    lighting: 'Brick and stone fronts respond well to soft uplighting across the whole face, with the entry kept the warmest point. Where siding takes over on the sides, a gentle wash keeps the house reading as one piece at night instead of just a lit front.',
    holiday: 'Two-storey fronts with a formal entry suit a crisp roofline outline with the entry and front shrubs dressed to match. We plan colour and spacing with you before install.',
    note: 'Many neighbourhoods here have HOAs with guidelines on exterior lighting. We can provide fixture details for your application.',
  },
  {
    slug: 'carroll-county',
    name: 'Carroll County',
    towns: ['Westminster', 'Eldersburg', 'Sykesville', 'Hampstead', 'Mount Airy', 'Manchester', 'Taneytown', 'New Windsor'],
    zips: '21784 Sykesville|21784 Eldersburg|21771 Mount Airy|21048 Finksburg|21157 Westminster|21158 Westminster|21074 Hampstead|21102 Manchester|21776 New Windsor|21787 Taneytown',
    intro: 'Carroll County is farmhouses, long lanes and dark rural nights, alongside the growing neighbourhoods around Eldersburg, Sykesville and Westminster.',
    homes: 'Older farmhouses and stone homes sit on open land, often with outbuildings, mature trees and a long approach from the road. In the newer neighbourhoods, homes are closer together with smaller front yards.',
    lighting: 'Where the night is truly dark, restraint matters more than anywhere: warm, low-glare fixtures aimed at the house and trees, and nothing pointed at the sky or the neighbours. Lighting the approach and the entry often does more for a farmhouse than lighting every wall.',
    holiday: 'On open land a house can be seen from a long way off, so a clean roofline outline carries further than a busy display. For long lanes we can also light the approach.',
    note: 'Rural properties often have power only at the house. We plan transformer and cable runs so fixtures can reach the lane and trees without trenching across the whole lawn.',
  },
  {
    slug: 'frederick-county',
    name: 'Frederick County',
    towns: ['Frederick', 'Urbana', 'Ijamsville', 'Monrovia', 'New Market', 'Middletown', 'Buckeystown', 'Myersville'],
    zips: '21701 Frederick|21702 Frederick|21703 Frederick|21704 Urbana|21770 Monrovia|21754 Ijamsville|21774 New Market|21769 Middletown|21717 Buckeystown|21714 Braddock Heights|21773 Myersville',
    intro: 'Frederick County spans the brick townhouses of downtown Frederick, the newer neighbourhoods of Urbana, Ijamsville and New Market, and the farms and orchards out toward Middletown and Myersville.',
    homes: 'Downtown homes are often historic brick with tall shuttered windows, close to the street. Around Urbana and Monrovia, newer homes on generous lots tend to have stone fronts and wide frontages; further west, farmhouses sit on open land.',
    lighting: 'Historic brick looks best with restrained light: a warm glow at the entry, with the lit windows doing the rest. Newer stone fronts take uplighting well, and on rural lots path and drive lights make dark nights safe without lighting up the countryside.',
    holiday: 'From a historic townhouse front to a long country roofline, the plan is sized to the house. Downtown, lights are fixed with clips that leave old brick and trim unharmed.',
    note: 'Downtown Frederick is a designated historic district, and exterior changes there go to the Historic Preservation Commission. We can prepare fixture details for your application.',
  },
];
