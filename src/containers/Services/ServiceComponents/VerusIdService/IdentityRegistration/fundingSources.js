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
  balances[`vrpc.${source.address}.${coin?.system_id}`]?.[coin?.id]?.confirmed;

// Quote amounts are atomic integers. Ledger balances are decimal coins. Check
// every quoted currency on this source and chain, without rounding or treating
// a missing/loading balance as zero. The engine still checks spendable UTXOs.
export const registrationHasInsufficientFunds = (quote, source, systemCoin, coins, balances) => {
  if (!quote || !source || !systemCoin) return false;
  return Object.entries(quote.totalOperationRequired).some(([currencyId, required]) => {
    const coin = currencyId === systemCoin.currency_id ? systemCoin : coins.find(item =>
      item.system_id === systemCoin.system_id && item.currency_id === currencyId);
    if (!coin) return false;
    const balance = registrationFundingBalance(coin, source, balances);
    if (balance == null) return false;
    const amount = new BigNumber(balance);
    return amount.isFinite() && !amount.isNegative() && amount.times('100000000').lt(required);
  });
};

// Compare decimal balances without rounding. Missing balances cannot outrank
// a funded source; equal balances retain the stable source order.
export const preferredRegistrationFundingSource = (sources, coin, balances = {}) => {
  let preferred = sources[0];
  let greatest = new BigNumber(0);
  sources.forEach(source => {
    const balance = new BigNumber(registrationFundingBalance(coin, source, balances));
    if (balance.isFinite() && balance.gt(greatest)) {
      preferred = source;
      greatest = balance;
    }
  });
  return preferred;
};
