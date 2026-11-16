// Creates a Stripe Checkout session for a holiday lighting deposit.
// The price is recomputed here from the visitor's choices, so the amount
// charged can't be edited in the browser. Needs STRIPE_SECRET_KEY set in
// Netlify (Site configuration > Environment variables). Without it this
// returns 503 and the page falls back to "we'll email your deposit link".
import { estimate, depositFor } from '../../src/config/estimate.ts';
import { pricing } from '../../src/config/pricing.ts';

const int = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
const text = (v, max = 120) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return Response.json({ error: 'payments-not-configured' }, { status: 503 });

  let b;
  try { b = await req.json(); } catch { return Response.json({ error: 'bad-request' }, { status: 400 }); }
  const offer = ['single', 'seasonal', 'annual'].includes(b.offer) ? b.offer : 'seasonal';
  const input = {
    roofline: int(b.roofline, 2000), stories: Math.max(1, int(b.stories, 3)), steep: !!b.steep,
    treesSmall: int(b.treesSmall, 20), treesMedium: int(b.treesMedium, 20), shrubs: int(b.shrubs, 40),
    wreaths: int(b.wreaths, 20), windows: int(b.windows, 40), garland: int(b.garland, 1000),
    offer, rush: !!b.rush,
  };
  const email = text(b.email, 200);
  if (!input.roofline || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Response.json({ error: 'bad-request' }, { status: 400 });

  const e = estimate(input);
  const deposit = depositFor(e);
  if (deposit < 1) return Response.json({ error: 'no-deposit' }, { status: 400 });

  const origin = process.env.URL || new URL(req.url).origin;
  const label = pricing.offers[offer].label;
  const p = new URLSearchParams({
    mode: 'payment',
    customer_email: email,
    success_url: `${origin}/booking-confirmed/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/holiday-lighting/?deposit=cancelled#estimate`,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(deposit * 100),
    'line_items[0][price_data][product_data][name]': `Holiday lighting deposit: ${label}`,
    'line_items[0][price_data][product_data][description]': `Applied to your total. Estimate $${Math.round(e.lo)} to $${Math.round(e.hi)}, confirmed on site.`,
    'payment_intent_data[description]': `Holiday lighting deposit, ${text(b.name)}, ${text(b.address)} ${text(b.town)}`,
    'metadata[name]': text(b.name),
    'metadata[address]': text(`${text(b.address)} ${text(b.town)}`, 200),
    'metadata[plan]': label,
    'metadata[install_window]': text(b.window),
    'metadata[estimate]': `$${Math.round(e.lo)}-$${Math.round(e.hi)}`,
    'metadata[roofline_ft]': String(input.roofline),
    'metadata[signed_by]': text(b.signature),
    'metadata[agreement_version]': pricing.agreementVersion,
  });
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: p,
  });
  const data = await res.json();
  if (!res.ok || !data.url) return Response.json({ error: 'stripe', detail: data?.error?.message }, { status: 502 });
  return Response.json({ url: data.url, deposit });
};

