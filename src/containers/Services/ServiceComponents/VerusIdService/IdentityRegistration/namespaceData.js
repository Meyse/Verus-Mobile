import BigNumber from 'bignumber.js';
import {formatCurrency} from 'react-native-format-currency';
import {CurrencyIdentityRegistration} from 'verus-typescript-primitives';
import {USD} from '../../../../../utils/constants/currencies';
import VrpcProvider from '../../../../../utils/vrpc/vrpcInterface';

// Public display data only. Funding, eligibility and every payable amount are
// checked again by the unchanged registration engine. Share in-flight reads.
const reads = new Map();
const cached = (key, read) => {
  const old = reads.get(key);
  if (old && Date.now() < old.until) return old.promise;
  const entry = {until: Infinity};
  entry.promise = Promise.resolve().then(read).then(value => {
    entry.until = Date.now() + 60000;
    return value;
  }, error => {
    if (reads.get(key) === entry) reads.delete(key);
    throw error;
  });
  reads.set(key, entry);
  return entry.promise;
};
const resultOf = response => {
  if (response?.error || !response?.result) throw new Error('Namespaces could not be loaded. Try again.');
  return response.result;
};
const currencyRecords = coin => {
  const endpoint = VrpcProvider.getEndpoint(coin.system_id);
  return cached(`${endpoint.endpoint}:namespaces`, async () =>
    resultOf(await endpoint.listCurrencies({systemtype: 'local'})));
};

export const loadRegistrationNamespaces = async (coin, signingAddress, nativeUsd) => {
  const endpoint = VrpcProvider.getEndpoint(coin.system_id);
  const records = await currencyRecords(coin);
  const namespaces = [];
  for (const record of records) {
    const definition = record.currencydefinition;
    if (!definition?.fullyqualifiedname || definition.systemid !== coin.system_id) continue;
    let policy;
    try { policy = CurrencyIdentityRegistration.fromJSON(definition); } catch (_) { continue; }
    if (policy.noIDs()) continue;
    const root = definition.currencyid === coin.system_id;
    let reason;
    if (policy.isFractional() || policy.isGateway() || policy.isGatewayConverter() || definition.gatewayconverterid)
      reason = 'Fractional and gateway VerusID pricing is not supported.';
    else if (!root && !policy.isToken()) reason = 'Only native and plain token namespaces are supported.';
    else if (![1, 2].includes(definition.proofprotocol)) reason = 'This currency proof protocol is not supported.';
    else if (root && definition.proofprotocol === 2 && !definition.endblock) reason = 'Native PROOF_CHAINID registration accounting is not supported.';
    namespaces.push({
      id: definition.currencyid,
      name: root ? coin.display_name || coin.display_ticker : definition.fullyqualifiedname.replace(/@$/, ''),
      parentName: definition.fullyqualifiedname,
      suffix: root ? '@' : `.${definition.fullyqualifiedname.replace(/@$/, '')}@`,
      amount: policy.IDFullRegistrationAmount().toString(),
      currency: root ? coin.display_ticker : definition.fullyqualifiedname.replace(/@$/, ''),
      // Only the chain's own coin has a market price (from the ledger).
      usd: root && nativeUsd ? nativeUsd : null,
      permission: policy.IDRequiresPermission(),
      referralRequired: policy.IDReferralRequired(),
      referralsAllowed: policy.getIDReferralLevels() > 0 || policy.IDReferralRequired(),
      reason,
    });
  }
  // Use the paced application RPC interface, sequentially, only for namespaces
  // that require the issuer's key. Linked status alone is not signing proof.
  for (const item of namespaces.filter(value => value.permission && !value.reason)) {
    try {
      const response = await cached(`${endpoint.endpoint}:authority:${item.id}`, async () => resultOf(await endpoint.getIdentity(item.id)));
      const identity = response.identity;
      if (identity?.identityaddress !== item.id || identity.minimumsignatures !== 1 ||
          !identity.primaryaddresses?.includes(signingAddress) || (identity.flags & 0x8000)) {
        item.reason = 'This wallet cannot provide the namespace signature.';
      }
    } catch (_) { item.reason = 'Namespace authorization could not be checked. Try again.'; }
  }
  // The chain itself first, then A–Z. The sheet has no priced group heading.
  return namespaces.sort((a, b) => Number(b.id === coin.system_id) - Number(a.id === coin.system_id) ||
    a.name.localeCompare(b.name));
};

export const registrationFiat = (amounts, prices, displayCurrency = USD, rates = {}) => {
  const entries = Object.entries(amounts || {}).filter(([, amount]) => new BigNumber(amount).gt(0));
  if (!entries.length || entries.some(([id]) => !prices?.[id])) return null;
  let total = entries.reduce((sum, [id, amount]) => sum.plus(new BigNumber(amount).div('100000000').times(prices[id])), new BigNumber(0));
  if (displayCurrency !== USD) {
    // Each GENERAL rate record shares one USD price and its fiat conversions.
    // Their ratio is the cached exchange rate.
    const pair = Object.values(rates || {}).find(record => [USD, displayCurrency].every(code => {
      const rate = new BigNumber(record?.[code]);
      return rate.isFinite() && rate.gt(0);
    }));
    if (!pair) return null;
    total = total.times(pair[displayCurrency]).div(pair[USD]);
  }
  const small = total.gt(0) && total.lt('0.01');
  return `${small ? '< ' : ''}${formatCurrency({amount: small ? '0.01' : total.toFixed(2), code: displayCurrency})[0]}`;
};
