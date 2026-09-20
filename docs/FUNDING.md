# Funding plan

Status: volunteer project, no legal entity yet. This document lays out the
routes that were designed for, in the order they become realistic.

## 1. Donations (day one)

Zero infrastructure. Add a link on the About screen (Buy Me a Coffee, GitHub
Sponsors, Contribee for LT). Expect little; it signals that the project accepts
support.

## 2. Affiliate links (when there are users)

The data model is ready: `items[].buy.links[]` with `affiliate: true`. The UI
rule agreed for v1 is a collapsed "Where to buy" per acquire item, never
required to tick the box, with this disclosure next to every link:

> We earn a small commission. You do not need to buy from these - any
> equivalent item counts.

Lithuanian retailers (Pigu, Varle, Senukai, Topo Centras) run programs through
networks such as Admitad and TradeDoubler; apply once traffic exists. Amazon is
a poor fit for LT delivery. Keep the checklist commercially clean: links live
behind a tap, item state never depends on them.

## 3. Grants (needs an entity)

Most public money requires a legal entity: a VšĮ (public institution) or an MB,
or partnering with an existing NGO that holds the entity. Options to pursue:

- **PAGD / VRM** civil-protection communication and public education calls.
- **EU Civil Protection Mechanism** (DG ECHO) prevention and preparedness projects - usually via a consortium.
- **Municipal** (savivaldybė) resilience and community programmes.
- **NGO and foundation** funds interested in civic tech and open source.

What they ask for, and what the app already supports:
- Sourced, official guidance -> `sources.json`, cited per item.
- Accessibility -> baseline built in; WCAG AA is a reachable next step.
- Open licensing -> MIT code, CC BY 4.0 content.
- Impact metrics -> **not yet**: v1 ships without analytics. Roadmap item 3 adds opt-in anonymous counters (badge started/earned) so impact can be reported without personal data.

## 4. B2B (later)

Municipalities, employers and schools may pay for a branded deployment with
aggregate (never individual) readiness statistics. This needs the opt-in
counters and a backend; the country-overlay model already supports a
customised content pack per customer.

## Principles that do not change

- Users never need to spend money to earn a badge; knowledge and action items keep free users progressing.
- Any commercial element is disclosed where it appears, in plain words.
- Personal data stays on the device by default.
