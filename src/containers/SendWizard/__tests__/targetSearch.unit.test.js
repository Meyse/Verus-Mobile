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

  it('keeps the id rule for an id that stands in for a missing name', () => {
    const id = 'iRbRuAmQ9TqmAiPU7S7Yh8kYZ4xLLDDEUr';
    // A destination with only its currency id: the name fields hold the id.
    const unnamed = {id, name: id, ticker: 'TF', fullyqualifiedname: id};
    expect(matchesTargetQuery(unnamed, 'EUR')).toBe(false);
    expect(matchesTargetQuery(unnamed, 'ddeur')).toBe(false);
    expect(matchesTargetQuery(unnamed, 'iRbRuA')).toBe(true);
    expect(matchesTargetQuery(unnamed, 'tf')).toBe(true);
    // A bridged id from another currency in the name field, same rule.
    const mapped = {id: 'iOther', name: 'X', ticker: 'X', fullyqualifiedname: id};
    expect(matchesTargetQuery(mapped, 'EUR')).toBe(false);
    expect(matchesTargetQuery(mapped, 'iRbRu')).toBe(true);
  });

  it('keeps name matching for a grouped target whose id is its ticker', () => {
    // A target on several networks uses its ticker as its id.
    const usdc = {
      id: 'USDC',
      name: 'USDC',
      ticker: 'USDC',
      fullyqualifiedname: 'USDC',
      networkOptions: [
        {id: 'USDC', name: 'USDC', ticker: 'USDC', networkName: 'Verus'},
        {id: 'USDC', name: 'USDC', ticker: 'USDC', networkName: 'Ethereum'},
      ],
    };
    expect(matchesTargetQuery(usdc, 'sdc')).toBe(true);
    expect(matchesTargetQuery(usdc, 'usdc')).toBe(true);
    expect(matchesTargetQuery(usdc, 'USD')).toBe(true);
  });

  it('keeps the id rule for an Ethereum address in a name field', () => {
    const address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const unnamed = {id: address, name: address, ticker: 'T', fullyqualifiedname: address};
    expect(matchesTargetQuery(unnamed, 'eb48')).toBe(false);
    expect(matchesTargetQuery(unnamed, '0xA0b8')).toBe(true);
    expect(matchesTargetQuery(unnamed, '0xa0b8')).toBe(false);
  });

  it('ignores an upper-cased copy of an unnamed id on a grouped target', () => {
    const id = 'iRbRuAmQ9TqmAiPU7S7Yh8kYZ4xLLDDEUr';
    const upper = id.toUpperCase();
    // Two networks, no name: grouping gives the group the upper-cased id as
    // its id, name and ticker; each network keeps the real id.
    const grouped = {
      id: upper,
      name: upper,
      ticker: upper,
      networkOptions: [
        {id, name: id, ticker: upper, fullyqualifiedname: id, networkName: 'Verus'},
        {id, name: upper, ticker: upper, fullyqualifiedname: id, networkName: 'Ethereum'},
      ],
    };
    expect(matchesTargetQuery(grouped, 'EUR')).toBe(false);
    expect(matchesTargetQuery(grouped, 'ddeur')).toBe(false);
    expect(matchesTargetQuery(grouped, 'IRBRU')).toBe(false);
    expect(matchesTargetQuery(grouped, 'iRbRu')).toBe(true);
    expect(matchesTargetQuery(grouped, 'ethereum')).toBe(true);
  });
});
