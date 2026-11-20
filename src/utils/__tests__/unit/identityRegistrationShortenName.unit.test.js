import {NAME_TITLE_BUDGET, shortenNameForTitle} from '../../identityRegistration/shortenName';

describe('shortenNameForTitle', () => {
  it('keeps a short name and the exactly-at-budget name', () => {
    expect(shortenNameForTitle('saved@')).toBe('saved@');
    const exact = `${'a'.repeat(NAME_TITLE_BUDGET - 10)}.VRSCTEST@`;
    expect(exact).toHaveLength(NAME_TITLE_BUDGET);
    expect(shortenNameForTitle(exact)).toBe(exact);
  });
  it('shortens a long root name in the middle and keeps the ending', () => {
    const out = shortenNameForTitle('averyveryverylongregistrationname.VRSCTEST@');
    expect(out).toHaveLength(NAME_TITLE_BUDGET);
    expect(out).toBe('averyve…me.VRSCTEST@');
    expect(out.match(/…/g)).toHaveLength(1);
  });
  it('keeps the parent of a long subname', () => {
    const out = shortenNameForTitle('averylongsubnamehere.parent@');
    expect(out).toHaveLength(NAME_TITLE_BUDGET);
    expect(out.endsWith('.parent@')).toBe(true);
  });
  it('keeps only the end of a long parent', () => {
    const out = shortenNameForTitle('sub.averyveryverylongparentname.VRSCTEST@');
    expect(out).toHaveLength(NAME_TITLE_BUDGET);
    expect(out).toBe('sub.ave…me.VRSCTEST@');
  });
  it('shortens a long name without a dot', () => {
    const out = shortenNameForTitle('abcdefghijklmnopqrstuvwxyz@');
    expect(out).toHaveLength(NAME_TITLE_BUDGET);
    expect(out.endsWith('vwxyz@')).toBe(true);
  });
  // QA 2026-11-20: "n4x6pro11….VRSCTEST@" read as four dots.
  it('keeps two characters between the ellipsis and a dot', () => {
    expect(shortenNameForTitle('n4x6pro11abcdef11.VRSCTEST@')).toBe('n4x6pro…11.VRSCTEST@');
    // A one-letter part before the ending.
    expect(shortenNameForTitle('abcdefghi.j.VRSCTEST@')).toBe('abcde…hi.j.VRSCTEST@');
    // A cut just after a dot of the start.
    expect(shortenNameForTitle('xyz.ab.cdefghijklmnopqrst@')).toBe('xyz.ab…jklmnopqrst@');
    expect(shortenNameForTitle('abcdefghijklmn.op.qrstuv@')).toBe('abcdefghi…op.qrstuv@');
  });
  it('never puts the ellipsis next to a dot, even with one-letter parts', () => {
    const names = [
      'a.b.c.d.e.f.g.h.VRSCTEST@',
      'abcdefgh.ij.klmnopqrst.VRSCTEST@',
      'abcdefghijklmnopqrstu.r@',
      'abcdefghijklmnopqrs.@',
    ];
    for (const name of names) {
      const out = shortenNameForTitle(name);
      expect(out.length).toBeLessThanOrEqual(NAME_TITLE_BUDGET);
      expect(out).not.toMatch(/\.…|…\./);
      expect(out.match(/…/g)).toHaveLength(1);
    }
  });
  it('falls back for an empty or missing name', () => {
    expect(shortenNameForTitle(undefined)).toBe('registration');
    expect(shortenNameForTitle('')).toBe('registration');
    expect(shortenNameForTitle(null)).toBe('registration');
  });
});
