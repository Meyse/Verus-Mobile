import BigNumber from 'bignumber.js';

// Linked IDs are payment candidates, not proof of spending authority. The
// registration builder verifies their current on-chain authority before payment.
export const registrationFundingSources = (coin, account, linkedIds = {}) => {
  const signingAddress = account?.keys?.[coin?.id]?.vrpc?.addresses?.[0];
  if (!coin || !signingAddress) return [];

  const identities = {
    ...(linkedIds[coin.testnet ? 'VRSCTEST' : 'VRSC'] || {}),
    ...(linkedIds[coin.id] || {}),
  };
  return [
    {address: signingAddress, signingAddress, fundingName: 'Wallet address', isIdentity: false},
    ...Object.entries(identities)
      .filter(([address, name]) => address !== signingAddress && typeof name === 'string')
      .map(([address, fundingName]) => ({address, signingAddress, fundingName, isIdentity: true}))
      .sort((left, right) => left.fundingName.localeCompare(right.fundingName)),
  ];
};

export const registrationFundingBalance = (coin, source, balances = {}) =>
  balances[`vrpc.${source?.address}.${coin?.system_id}`]?.[coin?.id]?.confirmed;

export const registrationCurrencyBalance = (currencyId, source, systemCoin, coins = [], balances = {}, reads = {}) => {
  const live = reads[source?.address];
  if (live?.status === 'ready') return live.amounts[currencyId] ?? '0';
  const coin = currencyId === systemCoin?.currency_id ? systemCoin : coins.find(item =>
    item.system_id === systemCoin?.system_id && item.currency_id === currencyId);
  return coin ? registrationFundingBalance(coin, source, balances) : undefined;
};

// Unknown is distinct from a zero balance. A single source must cover all
// currencies; balances from different addresses are never added together.
export const registrationFundingState = (quote, source, systemCoin, coins, balances, reads = {}, secondPayment = false) => {
  if (!quote || !source || !systemCoin) return {status: 'checking'};
  if (reads[source.address]?.status === 'error') return {status: 'error'};
  let unknown = false;
  const amounts = secondPayment ? quote.totalRequired : quote.totalOperationRequired;
  for (const [currencyId, required] of Object.entries(amounts)) {
    const value = registrationCurrencyBalance(currencyId, source, systemCoin, coins, balances, reads);
    const balance = value == null ? null : new BigNumber(value);
    if (!balance?.isFinite() || balance.isNegative()) { unknown = true; continue; }
    if (balance.times('100000000').lt(required)) return {status: 'short', currencyId,
      balance: balance.toFixed(), missing: new BigNumber(required).minus(balance.times('100000000')).toFixed(0)};
  }
  return {status: unknown ? 'checking' : 'enough'};
};

// Quote amounts are atomic integers. Ledger balances are decimal coins. Check
// every quoted currency on this source and chain. The separate funding state
// blocks unknown reads; this predicate identifies only a known shortfall.
export const registrationHasInsufficientFunds = (quote, source, systemCoin, coins, balances, reads) =>
  registrationFundingState(quote, source, systemCoin, coins, balances, reads).status === 'short';

// Compare decimal balances without rounding. Missing balances cannot outrank
// a funded source; equal balances retain the stable source order.
export const preferredRegistrationFundingSource = (sources, coin, balances = {}, quote, coins = [], reads = {}) => {
  const funded = quote && sources.find(source => registrationFundingState(quote, source, coin, coins, balances, reads).status === 'enough');
  if (funded) return funded;
  let preferred = sources[0];
  let greatest = new BigNumber(0);
  sources.forEach(source => {
    const balance = new BigNumber(quote
      ? registrationCurrencyBalance(quote.feePricingCurrencyID || quote.issuerID, source, coin, coins, balances, reads)
      : registrationFundingBalance(coin, source, balances));
    if (balance.isFinite() && balance.gt(greatest)) {
      preferred = source;
      greatest = balance;
    }
  });
  return preferred;
};
