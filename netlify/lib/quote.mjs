// Signed quote links. The owner's quote (price, plan, customer) is signed
// with a server secret, so the price in a booking link can't be edited.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const secret = () => process.env.QUOTE_SECRET || process.env.STRIPE_SECRET_KEY || '';
const canon = (q) => [q.n, q.e, q.a, q.o, q.p, q.w, q.x].map((v) => String(v ?? '')).join('\u001f');

export function sign(q) {
  return createHmac('sha256', secret()).update(canon(q)).digest('base64url');
}

export function verify(q) {
  if (!secret() || !q?.s) return false;
  const a = Buffer.from(sign(q)), b = Buffer.from(String(q.s));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(q.x) > Date.now();
}
