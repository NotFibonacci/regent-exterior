export type County = {
  slug: string;
  name: string;
  towns: string[];
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
    intro: 'From the older streets around Towson and Ruxton to the newer neighbourhoods out toward Owings Mills and Perry Hall, Baltimore County homes cover almost every style built in Maryland over the last century.',
    homes: 'Many of the homes we see here are stone and brick colonials, Tudors and Cape Cods on mature lots, often with large trees close to the house. Those trees shape everything: where light can reach, how much leaf litter ends up in the gutters, and which walls stay in shadow at night.',
    lighting: 'On older stone and brick fronts, grazing the wall from close to its base brings out the texture of the masonry. Under mature trees we often light the canopy from below instead of adding more light to the house, which keeps the street side calm and the house itself the focus.',
    holiday: 'Steep rooflines and tall gables are common, so many installs here involve second-storey and peak work. We measure and plan those runs before install day, and the estimate reflects the height.',
    note: 'If your home sits in a historic district or under covenants, we can prepare fixture details for your review before anything is installed.',
  },
  {
    slug: 'anne-arundel-county',
    name: 'Anne Arundel County',
    towns: ['Annapolis', 'Severna Park', 'Arnold', 'Crofton', 'Davidsonville', 'Edgewater', 'Pasadena', 'Millersville'],
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
    intro: 'Howard County mixes the stone and frame homes of historic Ellicott City with planned neighbourhoods in Columbia and larger estate lots in Clarksville, Fulton, Highland and Glenelg.',
    homes: 'In planned communities, exterior changes often need approval from a village board or HOA, including lighting and colours. Out west, homes on larger lots tend to be newer, with long drives, open lawns and wide frontages.',
    lighting: 'Where a review board is involved, we put together the fixture types, finishes, colour temperature and a simple plan of where each light goes, which is usually what an application asks for. On larger lots, a few well-placed lights on the house and drive do more than lighting the whole lawn.',
    holiday: 'Wide frontages mean long roofline runs, and the estimate is driven mainly by that footage. Our estimator gives you a range before we visit, and we confirm it on site.',
    note: 'Older properties in Ellicott City may be under historic preservation review. Ask us, and we will help you check before choosing fixtures.',
  },
  {
    slug: 'prince-georges-county',
    name: "Prince George's County",
    towns: ['Bowie', 'Upper Marlboro', 'Mitchellville', 'Laurel', 'Greenbelt', 'College Park', 'Brandywine', 'Fort Washington'],
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
    intro: 'Carroll County is farmhouses, long lanes and dark rural nights, alongside the growing neighbourhoods around Eldersburg, Sykesville and Westminster.',
    homes: 'Older farmhouses and stone homes sit on open land, often with outbuildings, mature trees and a long approach from the road. In the newer neighbourhoods, homes are closer together with smaller front yards.',
    lighting: 'Where the night is truly dark, restraint matters more than anywhere: warm, low-glare fixtures aimed at the house and trees, and nothing pointed at the sky or the neighbours. Lighting the approach and the entry often does more for a farmhouse than lighting every wall.',
    holiday: 'On open land a house can be seen from a long way off, so a clean roofline outline carries further than a busy display. For long lanes we can also light the approach.',
    note: 'Rural properties often have power only at the house. We plan transformer and cable runs so fixtures can reach the lane and trees without trenching across the whole lawn.',
  },
];
