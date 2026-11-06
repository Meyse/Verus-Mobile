import {useCallback, useEffect, useMemo, useState} from 'react';
import BigNumber from 'bignumber.js';
import {CurrencyIdentityRegistration, resolveIdentityRegistrationName} from 'verus-typescript-primitives';
import {assertIdentityRegistrationAvailable, quoteIdentityRegistration} from 'verusid-ts-client/lib/identity/registrationPolicy';
import VrpcProvider from '../../../../../utils/vrpc/vrpcInterface';
import {getAddressBalances} from '../../../../../utils/api/channels/vrpc/requests/getAddressBalances';
import {registrationRpcResult} from '../../../../../utils/api/channels/verusid/requests/registerIdentity';
import {assertRegistrationContext, normalizeRegistrationRequest} from '../../../../../utils/identityRegistration/registration';

// Display-only policy quotes. No reservation, funding plan, or approval token
// is created here. Check details always resolves the actual referral through
// the engine before either hold can approve a payment.
export const readRegistrationName = async (request, context) => {
  assertRegistrationContext(context);
  const normalized = await normalizeRegistrationRequest({...request, referralID: '', recoveryAuthority: '', revocationAuthority: ''}, context);
  const resolvedName = resolveIdentityRegistrationName({...normalized, systemID: normalized.systemId});
  const rpc = VrpcProvider.getVerusIdInterface(request.systemId).interface;
  await assertIdentityRegistrationAvailable(rpc, resolvedName.identityID);
  const nativeDefinition = registrationRpcResult(await rpc.getCurrency(request.systemId), 'Get network');
  const parentDefinition = resolvedName.parent === request.systemId ? nativeDefinition
    : registrationRpcResult(await rpc.getCurrency(resolvedName.parent), 'Get namespace');
  const info = registrationRpcResult(await rpc.getInfo(), 'Get network height');
  assertRegistrationContext(context);
  const parent = CurrencyIdentityRegistration.fromJSON(parentDefinition);
  const branch = resolvedName.parent === request.systemId ? 'native'
    : parentDefinition.proofprotocol === 2 && (!parentDefinition.endblock || info.blocks + 1 < parentDefinition.endblock)
      ? 'token-payment' : 'token-burn';
  const policy = {resolvedName, nativeDefinition, parentDefinition, branch, candidateHeight: info.blocks + 1,
    issuerID: resolvedName.parent, feePricingCurrencyID: resolvedName.parent, referralRecipients: []};
  const quote = quoteIdentityRegistration(policy);
  const referralsAllowed = parent.getIDReferralLevels() > 0 || parent.IDReferralRequired();
  // The hypothetical recipient is only used by the SDK to quote the discount.
  // It is never displayed as a referral, persisted, or passed to preparation.
  const referralQuote = referralsAllowed ? quoteIdentityRegistration({...policy,
    referralID: resolvedName.parent, referralRecipients: [resolvedName.parent]}) : null;
  return {request: normalized, policy, quote, referralQuote, referralsAllowed,
    referralRequired: parent.IDReferralRequired(),
    currencyNames: {[request.systemId]: nativeDefinition.name, [resolvedName.parent]: parentDefinition.name}};
};

const balanceReads = new Map();
export const readRegistrationBalances = async (coin, source, context, fresh = false) => {
  assertRegistrationContext(context);
  const endpoint = VrpcProvider.getEndpoint(coin.system_id);
  const key = `${context.sessionScope.accountHash}:${context.sessionScope.sessionEpoch}:${endpoint.endpoint}:${coin.system_id}:${source.address}`;
  const old = balanceReads.get(key);
  if (!fresh && old && Date.now() < old.until) return old.promise;
  const entry = {until: Infinity};
  entry.promise = (async () => {
    const result = registrationRpcResult(await getAddressBalances(coin.system_id, [source.address], false, fresh), 'Get payer balance');
    assertRegistrationContext(context);
    const native = new BigNumber(result?.balance);
    const currencies = result?.currencybalance || {};
    if (result?.balance == null || !native.isFinite() || !native.isInteger() || native.isNegative() ||
        typeof currencies !== 'object' || Array.isArray(currencies))
      throw new Error('Payer balances could not be checked.');
    const amounts = {};
    for (const [id, value] of Object.entries(currencies)) {
      const amount = new BigNumber(value);
      if (value == null || !amount.isFinite() || amount.isNegative()) throw new Error('Payer balances could not be checked.');
      amounts[id] = amount.toFixed();
    }
    amounts[coin.system_id] = native.div('100000000').toFixed();
    entry.until = Date.now() + 5000;
    return {status: 'ready', amounts};
  })().catch(error => { if (balanceReads.get(key) === entry) balanceReads.delete(key); throw error; });
  balanceReads.set(key, entry);
  if (balanceReads.size > 64) balanceReads.delete(balanceReads.keys().next().value);
  return entry.promise;
};

export const useRegistrationBalances = (coin, sources, context, version = '') => {
  const [state, setState] = useState({key: '', reads: {}});
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([coin?.system_id, sources.map(source => source.address), context.sessionScope, version, attempt]);
  useEffect(() => {
    if (!coin || !sources.length) return undefined;
    let active = true;
    setState({key, reads: {}});
    sources.forEach(source => readRegistrationBalances(coin, source, context, attempt > 0).then(value => {
      if (active) setState(current => ({key, reads: {...current.reads, [source.address]: value}}));
    }, error => {
      if (active && error.code !== 'SESSION_CHANGED') setState(current => ({key,
        reads: {...current.reads, [source.address]: {status: 'error'}}}));
    }));
    return () => { active = false; };
  }, [key]);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  return useMemo(() => ({reads: state.key === key ? state.reads : {}, retry}), [key, state, retry]);
};
