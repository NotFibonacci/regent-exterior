// Live Maryland weather for the night scene, from the National Weather
// Service (free, no key, CORS-enabled). Station KBWI: BWI Marshall Airport,
// between Baltimore and Annapolis. Cached for 30 minutes per visit.
// Preview any condition with ?weather=clear|cloudy|fog|rain|storm|snow.

export type WeatherKind = 'clear' | 'cloudy' | 'fog' | 'rain' | 'storm' | 'snow';
export type Weather = { kind: WeatherKind; rain: number; snow: number; fog: number; cloud: number; text: string; tempF: number | null };

const STATION = 'KBWI';
const CACHE_KEY = 'regent-weather';
const CACHE_MS = 30 * 60 * 1000;

export function fromText(text: string, tempF: number | null = null): Weather {
  const s = text.toLowerCase();
  const level = /heavy/.test(s) ? 1 : /light|drizzle|flurr|patches|mist/.test(s) ? 0.5 : 0.75;
  const w: Weather = { kind: 'clear', rain: 0, snow: 0, fog: 0, cloud: 0, text: s || 'clear', tempF };
  if (/snow|flurr|sleet|ice pellets|wintry|freezing/.test(s)) Object.assign(w, { kind: 'snow', snow: Math.max(0.6, level), cloud: 0.8 });
  else if (/thunder|t-storm|tstorm/.test(s)) Object.assign(w, { kind: 'storm', rain: 1, cloud: 1 });
  else if (/rain|drizzle|shower/.test(s)) Object.assign(w, { kind: 'rain', rain: level, cloud: 0.9 });
  else if (/fog|mist|haze|smoke/.test(s)) Object.assign(w, { kind: 'fog', fog: /fog/.test(s) ? 0.85 : 0.5, cloud: 0.6 });
  else if (/overcast|cloud/.test(s)) Object.assign(w, { kind: 'cloudy', cloud: /partly|few|scattered/.test(s) ? 0.35 : /mostly/.test(s) ? 0.65 : 0.9 });
  return w;
}

export async function getWeather(): Promise<Weather | null> {
  const forced = new URLSearchParams(location.search).get('weather');
  if (forced) {
    const words: Record<string, string> = { clear: 'Clear', cloudy: 'Overcast', fog: 'Fog', rain: 'Rain', storm: 'Thunderstorm', snow: 'Snow' };
    return fromText(words[forced] ?? forced, null);
  }
  try {
    const hit = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.w as Weather;
  } catch { /* storage unavailable */ }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`https://api.weather.gov/stations/${STATION}/observations/latest`, { headers: { Accept: 'application/geo+json' }, signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const p = (await res.json()).properties ?? {};
    const c = p.temperature?.value;
    const w = fromText(String(p.textDescription ?? ''), typeof c === 'number' ? Math.round(c * 1.8 + 32) : null);
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), w })); } catch { /* ignore */ }
    return w;
  } catch {
    return null; // offline or blocked: the scene simply stays clear
  }
}
