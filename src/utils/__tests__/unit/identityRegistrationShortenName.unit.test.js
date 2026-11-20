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
    expect(out.startsWith('averyvery…')).toBe(true);
    expect(out.endsWith('.VRSCTEST@')).toBe(true);
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
    expect(out.startsWith('sub.avery…')).toBe(true);
    expect(out.endsWith('.VRSCTEST@')).toBe(true);
  });
  it('shortens a long name without a dot', () => {
    const out = shortenNameForTitle('abcdefghijklmnopqrstuvwxyz@');
    expect(out).toHaveLength(NAME_TITLE_BUDGET);
    expect(out.endsWith('vwxyz@')).toBe(true);
  });
  it('falls back for an empty or missing name', () => {
    expect(shortenNameForTitle(undefined)).toBe('registration');
    expect(shortenNameForTitle('')).toBe('registration');
    expect(shortenNameForTitle(null)).toBe('registration');
  });
});
