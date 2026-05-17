/** Exact make+model -> GLB path */
const EXACT: Record<string, string> = {
  'mclaren p1':          '/models/mclaren_p1.glb',
  'porsche 911 gt3':     '/models/porsche911gt3.glb',
  'porsche 911':         '/models/porsche911gt3.glb',
  'bmw m4 competition':  '/models/vehicles/bmw_m4_competition.glb',
  'bmw m4':              '/models/vehicles/bmw_m4_competition.glb',
  'bmw m3':              '/models/vehicles/bmw_m3_2024.glb',
  'mclaren 720s':        '/models/vehicles/mclaren_720s.glb',
  'toyota camry':        '/models/vehicles/toyota_camry_2024.glb',
  'tesla model 3':       '/models/vehicles/tesla_model3_2024.glb',
  'honda civic':         '/models/vehicles/honda_civic_2024.glb',
  'toyota land cruiser': '/models/vehicles/toyota_land_cruiser_2024.glb',
  'mercedes-amg g63':    '/models/vehicles/mercedes_amg_g63.glb',
  'mercedes amg g63':    '/models/vehicles/mercedes_amg_g63.glb',
  'ferrari 488':         '/models/vehicles/ferrari_488.glb',
  'lamborghini urus':    '/models/vehicles/lamborghini_urus.glb',
}

/**
 * Generic category fallback models.
 * High-fidelity exact matches use branded GLBs; category fallbacks use
 * Kenney.nl CC0 models (kenney_*) which are lightweight and license-free.
 */
const CATEGORY: Readonly<Record<string, string>> = {
  sports:   '/models/vehicles/ferrari_488.glb',
  suv:      '/models/vehicles/kenney_suv_luxury.glb',
  truck:    '/models/vehicles/kenney_truck.glb',
  van:      '/models/vehicles/kenney_van.glb',
  electric: '/models/vehicles/tesla_model3_2024.glb',
  coupe:    '/models/vehicles/bmw_m4_competition.glb',
  hatch:    '/models/vehicles/kenney_hatchback.glb',
  sedan:    '/models/vehicles/kenney_sedan.glb',
  race:     '/models/vehicles/kenney_race.glb',
  default:  '/models/mclaren_p1.glb',
}

const SUV_KW = ['suv','land cruiser','land rover','4runner','sequoia','tahoe','suburban','expedition','navigator','escalade','rav4','cr-v','pilot','passport','x5','x3','x1','q7','q5','q3','gla','gle','glb','glc','glk','gls','g-class','g63','g550','range rover','defender','discovery','cherokee','grand cherokee','wrangler','blazer','equinox','traverse','highlander','pathfinder','murano','rogue','armada','mdx','rdx','qx80','gx','lx','rx','nx','model x','model y','f-pace','e-pace','sport utility','xterra','terrain','acadia','atlas','tiguan','touareg','cayenne','macan','urus','edge','explorer','escape','bronco sport','seltos','sportage','sorento','telluride','palisade','santa fe','tucson','venue','kona','cx-5','cx-9','cx-50','cx-90','outlander','eclipse cross','asx','forester','outback','crosstrek','xv','hr-v','zr-v','be-1']
const TRUCK_KW = ['pickup','f-150','f150','f-250','f250','silverado','ram 1500','ram 2500','tacoma','tundra','colorado','canyon','ridgeline','titan','frontier','ranger','maverick','santa cruz','gladiator','sierra','cybertruck']
const SPORTS_KW = ['cayman','boxster','718','gt3','gt4','spyder','turbo s','amg gt','c63','e63','s63','gt63','sl63','mustang','corvette','camaro','challenger','charger','hellcat','488','458','f8','sf90','portofino','roma','812','296','720s','600lt','570s','artura','senna','765lt','huracan','gallardo','aventador','sian','lotus','pagani','koenigsegg','bugatti','mclaren','ferrari','r8','tt','i8','gr86','86','brz','370z','400z','nsx','aston martin','db11','vantage','dbs','wraith','dawn','ghost','continental gt','flying spur']
const ELECTRIC_KW = ['model 3','model s','model x','model y','ioniq 5','ioniq 6','ev6','ev9','bolt ev','bolt euv','leaf','ariya','id.4','id.3','id.6','id.7','e-tron','taycan','i4','i7','lyriq','hummer ev','rivian','lucid','polestar','mustang mach-e','lightning','electric']
const HATCH_KW = ['golf','gti','clio','polo','yaris','fit','jazz','swift','veloster','i20','i30','208','308','megane','a1','a3 sportback']
const COUPE_KW = ['coupe','m2','m4','m8','4 series','8 series','2 series','lc500','rc','accord coupe']
const VAN_KW = ['minivan','odyssey','sienna','carnival','pacifica','grand caravan','transit','sprinter','metris','promaster','nv200','nv cargo','econoline','express','savana','van','mpv']

function detectCategory(key: string): string {
  if (ELECTRIC_KW.some((k) => key.includes(k))) return 'electric'
  if (SPORTS_KW.some((k) => key.includes(k))) return 'sports'
  if (SUV_KW.some((k) => key.includes(k))) return 'suv'
  if (TRUCK_KW.some((k) => key.includes(k))) return 'truck'
  if (VAN_KW.some((k) => key.includes(k))) return 'van'
  if (COUPE_KW.some((k) => key.includes(k))) return 'coupe'
  if (HATCH_KW.some((k) => key.includes(k))) return 'hatch'
  return 'sedan'
}

/**
 * Returns the best-match GLB path for a vehicle.
 * Priority: exact make+model > DB bodyType > keyword heuristic > default
 */
export function getModelPath(make: string, model: string, bodyType?: string | null): string {
  const key = (make + ' ' + model).toLowerCase().trim()
  if (EXACT[key]) return EXACT[key]

  if (bodyType) {
    const bt = bodyType.toLowerCase()
    if (bt.includes('sport utility') || bt.includes('suv') || bt.includes('crossover')) return CATEGORY['suv']!
    if (bt.includes('truck') || bt.includes('pickup')) return CATEGORY['truck']!
    if (bt.includes('van') || bt.includes('minivan') || bt.includes('mpv')) return CATEGORY['van']!
    if (bt.includes('two seater') || bt.includes('sports car')) return CATEGORY['sports']!
    if (bt.includes('electric')) return CATEGORY['electric']!
    if (bt.includes('hatchback')) return CATEGORY['hatch']!
    if (bt.includes('coupe')) return CATEGORY['coupe']!
    if (bt.includes('sedan') || bt.includes('car')) return CATEGORY['sedan']!
  }

  return CATEGORY[detectCategory(key)] ?? CATEGORY['default']!
}
