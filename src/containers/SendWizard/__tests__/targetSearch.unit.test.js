/*
  "Convert to" search (orchestrator decision 2026-11-22): names, tickers and
  network names match anywhere, in any case. A currency id matches only when
  the query equals it or is a case-sensitive prefix of it.
*/
const {matchesTargetQuery} = require('../wizardUtils');

const factory = {
  id: 'iRbRuAmQ9TqmAiPU7S7Yh8kYZ4xLLDDEUr',
  name: 'Token🏭Factory',
  ticker: 'Token🏭Factory',
  fullyqualifiedname: 'Token🏭Factory',
};
const eur = {
  id: 'iGqFLHLx1bF2Tt7TfV4QNwN7wTUyG3PGRx',
  name: 'EURC',
  ticker: 'EURC',
  fullyqualifiedname: 'EURC.vETH',
  networkOptions: [{id: 'iGqFLHLx1bF2Tt7TfV4QNwN7wTUyG3PGRx', name: 'EURC', ticker: 'EURC', networkName: 'Ethereum'}],
};

describe('matchesTargetQuery', () => {
  it('does not find a currency whose id only contains the query', () => {
    expect(matchesTargetQuery(factory, 'EUR')).toBe(false);
    expect(matchesTargetQuery(factory, 'eur')).toBe(false);
    expect(matchesTargetQuery(factory, 'DDEUr')).toBe(false);
  });

  it('keeps name and ticker matches anywhere, in any case', () => {
    expect(matchesTargetQuery(eur, 'EUR')).toBe(true);
    expect(matchesTargetQuery(eur, 'urc')).toBe(true);
    expect(matchesTargetQuery(factory, 'factory')).toBe(true);
    expect(matchesTargetQuery(eur, 'veth')).toBe(true);
    expect(matchesTargetQuery(eur, 'ethereum')).toBe(true);
  });

  it('finds an id from the full id or a case-sensitive prefix', () => {
    expect(matchesTargetQuery(factory, 'iRbRuAmQ9TqmAiPU7S7Yh8kYZ4xLLDDEUr')).toBe(true);
    expect(matchesTargetQuery(factory, 'iRbRuA')).toBe(true);
    expect(matchesTargetQuery(factory, '  iRbRuA  ')).toBe(true);
    expect(matchesTargetQuery(factory, 'irbrua')).toBe(false);
    expect(matchesTargetQuery(factory, 'IRBRUA')).toBe(false);
    expect(matchesTargetQuery(factory, 'RbRuA')).toBe(false);
  });

  it('matches a network id the same way', () => {
    const onlyNetworkId = {...eur, id: 'iOther', name: 'X', ticker: 'X', fullyqualifiedname: 'X'};
    expect(matchesTargetQuery(onlyNetworkId, 'iGqFLH')).toBe(true);
    expect(matchesTargetQuery(onlyNetworkId, 'qFLH')).toBe(false);
  });

  it('matches everything for an empty query', () => {
    expect(matchesTargetQuery(factory, '')).toBe(true);
    expect(matchesTargetQuery(factory, '   ')).toBe(true);
  });
});
