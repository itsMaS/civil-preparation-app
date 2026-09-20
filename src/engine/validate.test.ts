import { describe, it, expect } from 'vitest';
import { validatePack } from './validate';
import { corePack, pack, allOverlays } from '@/content';
import { applyOverlay } from './content';

describe('content packs', () => {
  it('core pack is valid', () => {
    expect(validatePack(corePack)).toEqual([]);
  });
  it('every country overlay produces a valid pack', () => {
    for (const [country, overlay] of Object.entries(allOverlays)) {
      const merged = applyOverlay(corePack, overlay);
      expect(validatePack(merged), `overlay ${country}`).toEqual([]);
    }
  });
  it('served pack has 8 badges in a strict order', () => {
    const orders = [...pack.badges].sort((a, b) => a.order - b.order).map((b) => b.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('catches authoring mistakes', () => {
    const broken = structuredClone(corePack);
    broken.badges[0].requirements.push({ item: 'does.not.exist' });
    broken.badges[1].requirements[0].quantity = '3 * nope.fact';
    broken.items[0].why = { en: 'x', lt: '' };
    const errors = validatePack(broken);
    expect(errors.some((e) => e.includes("unknown item 'does.not.exist'"))).toBe(true);
    expect(errors.some((e) => e.includes("unknown identifier 'nope.fact'"))).toBe(true);
    expect(errors.some((e) => e.includes("missing 'lt' translation"))).toBe(true);
  });
});
