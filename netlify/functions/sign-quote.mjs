// Owner-only: turns a measured quote into a signed booking link.
// Protected by OWNER_KEY (a password set in Netlify environment variables).
import { timingSafeEqual } from 'node:crypto';
import { sign, secret } from '../lib/quote.mjs';

const text = (v, max = 160) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const owner = process.env.OWNER_KEY || '';
  let b;
  try { b = await req.json(); } catch { return Response.json({ error: 'bad-request' }, { status: 400 }); }
  const given = Buffer.from(String(b.key ?? '')), want = Buffer.from(owner);
  if (!owner || given.length !== want.length || !timingSafeEqual(given, want)) {
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: 'wrong-key' }, { status: 401 });
  }
  if (!secret()) return Response.json({ error: 'no-secret' }, { status: 503 });
  const price = Math.round(Number(b.price) || 0);
  const plan = ['single', 'seasonal', 'annual'].includes(b.plan) ? b.plan : 'seasonal';
  if (price < 100 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text(b.email))) return Response.json({ error: 'bad-request' }, { status: 400 });
  const q = { n: text(b.name, 80), e: text(b.email, 120), a: text(b.address, 160), o: plan, p: String(price), w: text(b.window, 60), x: String(Date.now() + 30 * 86400000) };
  const s = sign(q);
  const origin = process.env.URL || new URL(req.url).origin;
  const url = `${origin}/holiday-lighting/book/?${new URLSearchParams({ ...q, s })}`;
  return Response.json({ url });
};
