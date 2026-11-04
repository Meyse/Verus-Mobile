import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AppState, View} from 'react-native';
import {Text} from 'react-native-paper';
import {useSelector} from 'react-redux';
import {useFocusEffect} from '@react-navigation/native';
import {DLIGHT_PRIVATE, VRPC} from '../../../../../utils/constants/intervalConstants';
import {
  createRegistrationContext,
  prepareCommitment,
  deleteRegistration,
  getRegistrationReview,
  approveCommitment,
  prepareRegistration,
  approveRegistration,
  retryBroadcast,
  reconcileRegistration,
  refreshRegistrationReview,
  linkRegisteredIdentity,
  resolveRegistration,
  findExistingRegistration,
  registrationQuotesEqual,
} from '../../../../../utils/identityRegistration';
import {
  RegistrationPage,
  CostReview,
  IdentitySummary,
  AmountRows,
  ActionButton,
  Disclosure,
  RegistrationDetails,
  RegistrationSteps,
  RegistrationListItem,
  SelectionField,
  StatusBadge,
  currencyLabel,
  identityLabel,
  useRegistrationStyles,
  RegistrationSkeleton,
  RegistrationText,
  NameField,
  NamespaceSheet,
  RegistrationPreviewDetails,
} from './RegistrationDesign';
import {registrationState} from './presentation';
import {
  preferredRegistrationFundingSource,
  registrationFundingBalance,
  registrationFundingSources,
} from './fundingSources';
import {formatRegistrationAmount} from '../../../../../utils/identityRegistration/costs';
import {
  clearRegistrationJobs,
  publishRegistrationJobs,
} from '../../../../../actions/actions/services/dispatchers/verusid/registration';
import AppTextInput from '../../../../../components/AppTextInput';
import InfoSheetSection from '../../../../../components/InfoSheetSection';
import TransactionResult from '../../../../../components/TransactionResult';
import TextAction from '../../../../../components/TextAction';
import {createAlert, resolveAlert} from '../../../../../actions/actions/alert/dispatchers/alert';
import {loadRegistrationNamespaces} from './namespaceData';
import useRegistrationPrices from './useRegistrationPrices';
import VerusIdCard from '../VerusIdCard';
import EmptyState from '../../../../../components/EmptyState';
import {AtSign} from 'lucide-react-native';

// The app alert calls each action only after its confirmation sheet closes.
const registrationAlert = (title, message, buttons, options) => createAlert(
  title.replace(/\bidentity\b/gi, 'VerusID'),
  message.replace(/\bidentities\b/gi, 'VerusIDs').replace(/\bidentity\b/gi, 'VerusID'),
  buttons.map(button => ({...button, text: button.text.replace(/\bidentity\b/gi, 'VerusID'), onPress: () => {
    resolveAlert(button.style !== 'cancel');
    button.onPress?.();
  }})), options,
);

const registrationInfo = stage => <>
  <InfoSheetSection title="Two payments" rows={[
    {label: 'How registration works', value: 'First, pay a small fee to commit your name. After a block confirmation, review a separate payment to create the VerusID.'},
    {label: 'Commitment', value: 'A commitment hides your name on-chain until registration, but doesn’t reserve it. The RPC server sees the name when checking availability. Sub-VerusIDs require an eligible currency namespace.'},
    {label: 'Keep your app data', value: 'The commitment fee is non-refundable. It does not reserve your name. Keep this wallet and its app data until you finish. Your seed alone cannot restore a pending commitment.'},
    {label: 'Your approval', value: stage === 'registration' ? 'I approve this VerusID and registration payment.' : 'I approve the commitment fee shown above.'},
    {label: 'Next payment', value: 'You approve the registration payment separately after confirmation. Its price may change.'},
    {label: 'Registration', value: 'This payment creates your VerusID after confirmation.'},
  ]} />
  <InfoSheetSection title="Payment and control" rows={[
    {label: 'Pay from', value: 'Both payments use this source. Change returns here.'},
    {label: 'Private payments', value: 'Your VerusID will use this wallet’s private address for private payments when available.'},
    {label: 'Referral', value: 'An eligible VerusID referral discounts your registration cost. You’ll see the discounted price before paying.'},
    {label: 'Recovery', value: 'Can restore your VerusID if it is revoked.'},
    {label: 'Revocation', value: 'Can revoke your VerusID. Leave both empty to manage it yourself.'},
  ]} />
</>;

const priorQuotes = new Map();
const rememberQuote = review => {
  if (!priorQuotes.has(review.jobId)) priorQuotes.set(review.jobId, review.quote);
  if (priorQuotes.size > 32) priorQuotes.delete(priorQuotes.keys().next().value);
};

// A ref closes the double-tap window before React renders a disabled button.
const useRegistrationAction = () => {
  const context = useMemo(() => createRegistrationContext(), []);
  const mounted = useRef(true);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (operation, onSuccess) => {
    if (running.current) return;

    running.current = true;
    setBusy(true);
    setError(null);

    try {
      const result = await operation(context);
      if (mounted.current && onSuccess) {
        // The operation has settled. Its own navigation may now leave the busy
        // screen; user Back remains blocked while the awaited work runs.
        running.current = false;
        setBusy(false);
        onSuccess(result);
      }
    } catch (e) {
      if (mounted.current && e.code !== 'SESSION_CHANGED') {
        // A new object makes every failure visible, even when a fast retry
        // returns the same message before the cleared state renders.
        setError({
          message: (e.message || 'Unable to complete this step. Your saved registration is preserved.')
            .replace(/\bi[1-9A-HJ-NP-Za-km-z]{20,40}\b/g, address => identityLabel(address)),
        });
      }
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [context]);

  return {context, busy, error, run, running, setError};
};

const confirmRegistrationDeletion = (record, remove, close) => {
  const kind = record.deletionKind;

  if (!kind) {
    close();
    return;
  }

  let message = kind === 'completed'
    ? 'Remove this finished registration from the list? Your identity stays registered and linked wallets are kept.'
    : 'Remove this saved draft? No payment has been sent.';

  if (kind === 'commitment') {
    const fee = record.commitmentFee || record.quote?.commitmentFee;
    let amount;

    try {
      amount = formatRegistrationAmount(fee);
    } catch (_) {
      close();
      return;
    }

    const systemId = record.systemId || record.quote?.systemID;
    const currency = currencyLabel(systemId, {
      [systemId]: record.chainTicker,
      ...record.currencyNames,
    });
    message = `Deleting permanently removes the saved commitment secret. The ${amount} ${currency} commitment fee will be lost forever, and you cannot finish this registration. This cannot be undone.`;
  }

  registrationAlert(`Delete ${record.displayName}?`, message, [
    {text: 'Keep registration', style: 'cancel', onPress: close},
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => {
        close();
        return remove();
      },
    },
  ], {cancelable: true, onDismiss: close});
};

export function IdentityRegistrationStart({navigation, route}) {
  const styles = useRegistrationStyles();
  const jobs = useSelector(state => state.channelStore_verusid.registrationJobs || {});
  const [loaded, setLoaded] = useState(false);
  const [openingJobId, setOpeningJobId] = useState(null);
  const [deletingJobId, setDeletingJobId] = useState(null);
  const deletePromptOpen = useRef(false);
  const {busy, error, run, running} = useRegistrationAction();

  const refresh = useCallback(() => {
    if (running.current) return;
    setLoaded(false);

    return run(async context => {
      try {
        // Login can proceed without these optional summaries. Read them again
        // here so a storage failure cannot masquerade as an empty registration list.
        return await publishRegistrationJobs(context);
      } catch (failure) {
        if (failure?.code === 'SESSION_CHANGED') throw failure;
        throw new Error('Saved registrations could not be loaded. Your registration data has not been changed. Please try again.');
      }
    }, () => setLoaded(true));
  }, [run, running]);

  useFocusEffect(useCallback(() => {
    refresh();
  }, [refresh]));

  const visible = Object.values(jobs)
    .sort((left, right) => (right.updatedAt || right.createdAt) - (left.updatedAt || left.createdAt));
  const active = visible.filter(job => registrationState(job.status).kind !== 'complete');
  const completed = visible.filter(job => registrationState(job.status).kind === 'complete');

  const open = job => {
    const jobId = job.id;

    if (job.status === 'commitment_prepared')
      navigation.navigate('IdentityCommitmentReview', {jobId});
    else if (job.status === 'registration_prepared')
      navigation.navigate('IdentityRegistrationReview', {jobId});
    else if (['commitment_confirmed', 'registration_expired'].includes(job.status)) {
      setOpeningJobId(jobId);
      run(
        context => prepareRegistration({jobId}, context),
        () => navigation.navigate('IdentityRegistrationReview', {jobId}),
      ).finally(() => setOpeningJobId(null));
    } else navigation.navigate('IdentityRegistrationProgress', {jobId});
  };

  const confirmDelete = job => {
    if (busy || deletePromptOpen.current) return;

    deletePromptOpen.current = true;
    confirmRegistrationDeletion(job, () => {
      setDeletingJobId(job.id);
      return run(context => deleteRegistration(job.id, job.deletionKind, context))
        .finally(() => setDeletingJobId(null));
    }, () => {
      deletePromptOpen.current = false;
    });
  };

  const confirmClearRegistrations = () => {
    if (running.current || loaded || !error || deletePromptOpen.current) return;

    deletePromptOpen.current = true;
    const close = () => {
      deletePromptOpen.current = false;
    };

    registrationAlert(
      'Clear all registration data?',
      'Are you sure? This permanently deletes all saved registration records and commitment secrets for this profile. ' +
        'Unfinished registrations may become impossible to complete, and fees already paid will not be refunded. ' +
        'Registered identities and linked wallets are kept. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel', onPress: close},
        {
          text: 'Clear all registration data',
          style: 'destructive',
          onPress: () => {
            close();
            // The captured profile context is checked again by the storage
            // writer. Only show the fresh state after the reset is saved.
            return run(clearRegistrationJobs, () => setLoaded(true));
          },
        },
      ],
      {cancelable: true, onDismiss: close},
    );
  };

  const renderJob = job => <RegistrationListItem
    key={job.id}
    job={job}
    disabled={busy || !loaded}
    busy={busy && openingJobId === job.id}
    onPress={() => open(job)}
    onDelete={job.deletionKind ? () => confirmDelete(job) : undefined}
    deleting={busy && deletingJobId === job.id}
  />;

  return <RegistrationPage
    navigation={navigation}
    title="Registrations"
    busy={busy}
    busyRef={running}
    error={error}
    onRefresh={refresh}
    refreshing={busy && !loaded && visible.length > 0}
    footer={
      <ActionButton
        disabled={busy || !loaded}
        onPress={() => navigation.navigate(
          'IdentityRegistrationCreate',
          route.params?.coinId ? {coinId: route.params.coinId} : undefined,
        )}
      >Create a VerusID</ActionButton>
    }
  >
    <View style={styles.section}>
      <Text style={styles.muted}>Create a VerusID or continue where you left off.</Text>
    </View>
    {!loaded && !error && visible.length === 0 && <RegistrationSkeleton label="Loading registrations" />}
    {!loaded && !!error && <View style={styles.section}>
      <ActionButton secondary disabled={busy} onPress={refresh}>
        Retry loading registrations
      </ActionButton>
      <ActionButton secondary disabled={busy} onPress={confirmClearRegistrations}>
        Clear all registration data
      </ActionButton>
    </View>}
    {loaded && !busy && !error && !active.length && !completed.length && <EmptyState icon={AtSign}
      title="A name that’s yours" message="Commit a name, then register it after confirmation. You review and approve each payment." />}
    {['Needs you', 'In progress'].map(group => {
      const items = active.filter(job => registrationState(job.status).group === group);
      return items.length > 0 && <View key={group} style={styles.section}>
        <Text style={styles.body}>{group}</Text>
        {items.map(renderJob)}
      </View>;
    })}
    {!!completed.length && <Disclosure title={`Completed (${completed.length})`}>
      {completed.map(renderJob)}
    </Disclosure>}
  </RegistrationPage>;
}

export function IdentityRegistrationCreate({navigation, route}) {
  const styles = useRegistrationStyles();
  const coins = useSelector(state => state.coins.activeCoinsForUser);
  const account = useSelector(state => state.authentication.activeAccount);
  const linkedIds = useSelector(state => state.channelStore_verusid.watchedVerusIds || {});
  const balances = useSelector(state => state.ledger?.balances || {});
  const showBalance = useSelector(state => state.coins.showBalance !== false);
  const wallets = useMemo(() => (coins || []).filter(coin =>
    coin.system_id === coin.currency_id && account?.keys?.[coin.id]?.[VRPC]?.addresses?.length > 0,
  ), [coins, account]);
  const [coinId, setCoinId] = useState(route.params?.coinId || wallets[0]?.id);
  const selected = wallets.find(coin => coin.id === coinId);
  const privateAddress = account?.keys?.[selected?.id]?.[DLIGHT_PRIVATE]?.addresses?.[0];
  const fundingSources = useMemo(() => registrationFundingSources(selected, account, linkedIds), [selected, account, linkedIds]);
  const [manualFunding, setManualFunding] = useState({});
  const fundingSource = fundingSources.find(source => source.address === manualFunding[coinId]) ||
    preferredRegistrationFundingSource(fundingSources, selected, balances);
  const [name, setName] = useState('');
  const [referralID, setReferralID] = useState('');
  const [recoveryAuthority, setRecoveryAuthority] = useState('');
  const [revocationAuthority, setRevocationAuthority] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [availability, setAvailability] = useState(null);
  const [namespace, setNamespace] = useState(null);
  const [namespaces, setNamespaces] = useState([]);
  const [namespaceVisible, setNamespaceVisible] = useState(false);
  const [namespaceLoading, setNamespaceLoading] = useState(false);
  const [namespaceError, setNamespaceError] = useState(null);
  const [namespaceAttempt, setNamespaceAttempt] = useState(0);
  const prices = useRegistrationPrices(selected, (estimate || preview)?.quote);
  const nativeUsd = prices[selected?.system_id];
  const {busy, error, run, context, running, setError} = useRegistrationAction();
  const requestKeyRef = useRef(null);

  useEffect(() => {
    if (wallets.length && !wallets.some(coin => coin.id === coinId)) setCoinId(wallets[0].id);
  }, [wallets, coinId]);
  useEffect(() => {
    setNamespace(null);
    setNamespaces([]);
  }, [coinId]);
  useEffect(() => {
    if (!namespaceVisible || !selected) return undefined;
    let active = true;
    setNamespaceLoading(true);
    setNamespaceError(null);
    loadRegistrationNamespaces(selected, fundingSource?.signingAddress, nativeUsd).then(items => {
      if (active) setNamespaces(items);
    }, () => { if (active) setNamespaceError('Namespaces could not be loaded. Try again.'); })
      .finally(() => { if (active) setNamespaceLoading(false); });
    return () => { active = false; };
  }, [namespaceVisible, selected, fundingSource?.signingAddress, nativeUsd, namespaceAttempt]);

  const request = useMemo(() => selected && fundingSource ? {
    systemId: selected.system_id,
    chainTicker: selected.id,
    rootSystemName: selected.testnet ? 'VRSCTEST' : 'VRSC',
    fundingAddress: fundingSource.address,
    signingAddress: fundingSource.signingAddress,
    fundingName: fundingSource.fundingName,
    keyChannel: VRPC,
    name: name.trim(),
    ...(namespace ? {parent: namespace.id, parentName: namespace.parentName} : {}),
    ...(privateAddress ? {privateAddress} : {}),
    ...(referralID.trim() ? {referralID: referralID.trim()} : {}),
    ...(recoveryAuthority.trim() ? {recoveryAuthority: recoveryAuthority.trim()} : {}),
    ...(revocationAuthority.trim() ? {revocationAuthority: revocationAuthority.trim()} : {}),
  } : null, [selected, fundingSource, name, namespace, privateAddress, referralID, recoveryAuthority, revocationAuthority]);
  const requestKey = JSON.stringify(request);
  requestKeyRef.current = requestKey;
  useEffect(() => {
    let active = true;
    setEstimate(null);
    setError(null);
    setPreview(null);
    setPreviewError(null);
    setAvailability(request?.name ? 'checking' : null);
    if (!request?.name) return undefined;
    // Availability and the live total are read-only. No salt, job, funding
    // transaction, key request or payment is created by typing.
    const timer = setTimeout(() => {
      (async () => {
        const savedReview = await findExistingRegistration(request, context);
        return savedReview ? {...savedReview, savedReview} : resolveRegistration(request, context);
      })().then(value => {
        if (!active || requestKeyRef.current !== requestKey) return;
        setPreview({...value, requestKey});
        setAvailability(value.savedReview ? 'saved' : 'available');
      }, failure => {
        if (!active || requestKeyRef.current !== requestKey || failure?.code === 'SESSION_CHANGED') return;
        setAvailability(failure.code === 'IDENTITY_EXISTS' ? 'taken' : null);
        if (failure.code !== 'IDENTITY_EXISTS') setPreviewError({message: failure.message});
      });
    }, 650);
    return () => { active = false; clearTimeout(timer); };
  }, [requestKey, context, previewAttempt]);

  const prepare = async requestContext => {
    setEstimate(null);
    try {
      return await prepareCommitment({request}, requestContext);
    } catch (failure) {
      if (failure.code !== 'SESSION_CHANGED' && failure.registrationEstimate) setEstimate(failure.registrationEstimate);
      throw failure;
    }
  };
  const openReview = review => navigation.navigate(
    review.status === 'commitment_prepared' ? 'IdentityCommitmentReview'
      : review.status === 'registration_prepared' ? 'IdentityRegistrationReview' : 'IdentityRegistrationProgress',
    {jobId: review.jobId},
  );
  const start = () => run(async requestContext => {
    const prepared = await prepare(requestContext);
    rememberQuote(prepared);
    if (preview?.savedReview) return prepared;
    if (prepared.status !== 'commitment_prepared') return prepared;
    const normalized = preview?.request;
    // A same-name saved draft can have different funding or authorities. A
    // changed quote or saved intent gets a fresh visible review, never payment.
    const sameReview = preview && registrationQuotesEqual(preview.quote, prepared.quote) &&
      prepared.identityAddress === preview.policy.resolvedName.identityID &&
      prepared.fundingAddress === normalized.fundingAddress && prepared.signingAddress === normalized.signingAddress &&
      (prepared.referralID || null) === (normalized.referralID || null) &&
      prepared.identity.recoveryauthority === (normalized.recoveryAuthority || prepared.identityAddress) &&
      prepared.identity.revocationauthority === (normalized.revocationAuthority || prepared.identityAddress) &&
      (prepared.identity.privateaddress || null) === (normalized.privateAddress || null);
    if (!sameReview) return prepared;
    return approveCommitment(prepared.jobId, prepared.approvalToken, requestContext);
  }, review => {
    if (review.status === 'commitment_prepared') openReview(review);
    else navigation.replace('IdentityRegistrationProgress', {jobId: review.jobId});
  });
  const save = () => run(prepare, () => navigation.getParent().goBack());
  const quoteData = estimate || (preview?.requestKey === requestKey ? preview : null);
  const ready = preview?.requestKey === requestKey && ['available', 'saved'].includes(availability) && !busy;
  const ownIdentity = preview?.policy?.resolvedName?.identityID;
  const externalAuthorities = [...new Set(['recoveryAuthority', 'revocationAuthority'].filter(field =>
    preview?.request?.[field] && preview.request[field] !== ownIdentity,
  ).map(field => preview.identityNames?.[preview.request[field]] || request[field]))];
  const networkName = coin => `${coin.display_ticker}${coin.testnet ? ' · Testnet' : ''}`;

  return <RegistrationPage navigation={navigation} busy={busy} busyRef={running} error={error || previewError}
    info={<>{registrationInfo('commitment')}<RegistrationPreviewDetails preview={preview} /></>}
    footer={<>
      <ActionButton hold={!preview?.savedReview} disabled={!ready} busy={busy} onPress={start}>{preview?.savedReview ? 'Continue registration' : 'Hold to start'}</ActionButton>
      <ActionButton secondary disabled={!ready} onPress={save}>Save for later</ActionButton>
    </>}>
    <NameField name={name} setName={value => { if (!running.current) setName(value); }} namespace={namespace}
      availability={availability} busy={busy} onNamespace={() => setNamespaceVisible(true)} />
    {!!previewError && <TextAction disabled={busy} onPress={() => setPreviewAttempt(value => value + 1)}>Try again</TextAction>}
    {!!quoteData && (preview?.savedReview && preview.status !== 'commitment_prepared'
      ? <View style={styles.section}><StatusBadge status={preview.status} /><RegistrationText muted>Continue where you left off.</RegistrationText></View>
      : <CostReview {...quoteData} prices={prices} stage="commitment" />)}
    {!quoteData && availability === 'checking' && <RegistrationSkeleton />}
    <View>
      {wallets.length !== 1 && <SelectionField label="Network" value={selected ? networkName(selected) : 'Add a network wallet to continue'} disabled={busy}
        options={wallets.map(coin => ({value: coin.id, label: networkName(coin), selected: coin.id === coinId}))} onSelect={setCoinId} />}
      <SelectionField label="Pay from" value={fundingSource?.isIdentity
        ? identityLabel(fundingSource.address, {[fundingSource.address]: fundingSource.fundingName}) : 'Transparent'} disabled={busy}
        description={!fundingSource?.isIdentity && fundingSource?.address ? `${fundingSource.address.slice(0, 5)}…${fundingSource.address.slice(-4)}` : undefined}
        options={fundingSources.map(source => {
          const balance = registrationFundingBalance(selected, source, balances);
          return {value: source.address, label: source.isIdentity ? identityLabel(source.address, {[source.address]: source.fundingName}) : 'Transparent',
            selected: source.address === fundingSource?.address,
            description: balance != null && showBalance ? `${String(balance)} ${selected.display_ticker} confirmed` : source.isIdentity ? 'Linked VerusID' : source.address};
        })} onSelect={address => setManualFunding(current => ({...current, [coinId]: address}))} />
      <Disclosure title="More options" summary="Referral, recovery">
        <AppTextInput label="Referral (optional)" accessibilityLabel="Referral identity, optional" placeholder="Optional"
          helperText="Lowers the price." value={referralID} onChangeText={setReferralID} editable={!busy} />
        <AppTextInput label="Revocation VerusID (optional)" accessibilityLabel="Revocation identity, optional" placeholder="This VerusID"
          helperText="Can revoke your VerusID. Leave both empty to manage it yourself." value={revocationAuthority} onChangeText={setRevocationAuthority} editable={!busy} />
        <AppTextInput label="Recovery VerusID (optional)" accessibilityLabel="Recovery identity, optional" placeholder="This VerusID"
          helperText="Can restore your VerusID if it is revoked." value={recoveryAuthority} onChangeText={setRecoveryAuthority} editable={!busy} />
        {externalAuthorities.map(authority => <View key={authority} style={styles.notice}>
          <Text style={styles.warningText}>{identityLabel(authority)} can take control of this VerusID.</Text>
        </View>)}
        <TextAction disabled={busy} onPress={() => navigation.navigate('IdentityRegistrationStart')}>All registrations</TextAction>
      </Disclosure>
    </View>
    <NamespaceSheet visible={namespaceVisible} onClose={() => setNamespaceVisible(false)} namespaces={namespaces}
      selectedId={namespace?.id || selected?.system_id} onSelect={setNamespace} loading={namespaceLoading} error={namespaceError}
      onRetry={() => setNamespaceAttempt(value => value + 1)} />
  </RegistrationPage>;
}

const PaymentReview = ({navigation, route, stage}) => {
  const {jobId} = route.params;
  const [review, setReview] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [approving, setApproving] = useState(false);
  const {busy, error, run, running} = useRegistrationAction();
  const coins = useSelector(state => state.coins.activeCoinsForUser || []);
  const coin = coins.find(item => item.id === review?.chainTicker);
  const prices = useRegistrationPrices(coin, review?.quote);
  useFocusEffect(useCallback(() => {
    run(context => getRegistrationReview(jobId, context), value => { rememberQuote(value); setReview(value); });
  }, [jobId, run]));
  const isCommitment = stage === 'commitment';
  const ready = review?.status === `${stage}_prepared`;
  const refresh = async (fromPull = false) => {
    if (running.current) return;
    setRefreshing(fromPull);
    try { await run(context => refreshRegistrationReview(jobId, context), setReview); }
    finally { setRefreshing(false); }
  };
  const approve = () => {
    if (running.current || !ready || !review) return;
    setApproving(true);
    return run(context => isCommitment ? approveCommitment(jobId, review.approvalToken, context)
      : approveRegistration(jobId, review.approvalToken, context), result => {
      navigation.replace('IdentityRegistrationProgress', {jobId: result.jobId});
    }).finally(() => setApproving(false));
  };
  const previous = priorQuotes.get(jobId);
  const changed = !!review && !!previous && JSON.stringify(Object.entries(previous.totalRequired).sort()) !== JSON.stringify(Object.entries(review.quote.totalRequired).sort());
  const oldPrice = changed ? Object.entries(previous.totalRequired).map(([id, amount]) => `${formatRegistrationAmount(amount)} ${currencyLabel(id, review.currencyNames)}`).join(' and ') : null;
  return <RegistrationPage navigation={navigation} busy={busy} busyRef={running} error={error} info={registrationInfo(stage)}
    onRefresh={refresh} refreshing={refreshing} footer={<>
      {changed && <RegistrationText muted>The price was {oldPrice}.</RegistrationText>}
      {!review && error ? <ActionButton disabled={busy} onPress={() => run(context => getRegistrationReview(jobId, context), setReview)}>Try again</ActionButton>
        : <ActionButton hold onPress={approve} disabled={busy || !ready || !!error} busy={approving}>{isCommitment ? 'Hold to start' : 'Hold to create'}</ActionButton>}
      {isCommitment && <ActionButton secondary disabled={busy} onPress={() => navigation.getParent().goBack()}>Save for later</ActionButton>}
    </>}>
    {!review ? <RegistrationSkeleton /> : <>
      <IdentitySummary review={review} />
      {isCommitment ? <CostReview {...review} prices={prices} stage={stage} /> : <RegistrationSteps status={review.status} quote={review.quote} currencyNames={review.currencyNames} prices={prices} changed={changed} />}
      <RegistrationDetails review={review}>{dismiss => !isCommitment &&
        <TextAction disabled={busy} onPress={() => dismiss(() => navigation.getParent().goBack())}>Save for later</TextAction>
      }</RegistrationDetails>
      {!!error && <TextAction disabled={busy} onPress={() => refresh()}>Refresh review</TextAction>}
    </>}
  </RegistrationPage>;
};

export const IdentityCommitmentReview = props => <PaymentReview {...props} stage="commitment" />;
export const IdentityRegistrationReview = props => <PaymentReview {...props} stage="registration" />;

export function IdentityRegistrationProgress({navigation, route}) {
  const styles = useRegistrationStyles();
  const {jobId} = route.params;
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const promptOpen = useRef(false);
  const focused = useRef(false);
  const resultVersion = useRef(0);
  const background = useRef(null);
  const currentReview = useRef(null);
  const {context, busy, error, run, running} = useRegistrationAction();
  const coins = useSelector(state => state.coins.activeCoinsForUser || []);
  const prices = useRegistrationPrices(coins.find(coin => coin.id === review?.chainTicker), review?.quote);

  useEffect(() => navigation.addListener('beforeRemove', event => {
    if (running.current) event.preventDefault();
  }), [navigation, running]);

  const updateReview = useCallback(value => {
    rememberQuote(value);
    currentReview.current = value;
    setReview(value);
    setLoadError(null);
  }, []);

  const refreshBackground = useCallback(() => {
    if (!focused.current || running.current || promptOpen.current || background.current) return;

    const version = resultVersion.current;
    const controller = new AbortController();
    const task = {controller};
    background.current = task;

    task.promise = (async () => {
      try {
        const result = await reconcileRegistration(jobId, {
          ...context,
          registrationBackground: true,
          signal: controller.signal,
        });

        if (focused.current && !controller.signal.aborted && version === resultVersion.current)
          updateReview(result);
      } catch (failure) {
        if (
          focused.current &&
          !controller.signal.aborted &&
          version === resultVersion.current &&
          failure.code !== 'SESSION_CHANGED' &&
          !currentReview.current
        ) {
          setLoadError({message: failure.message || 'Unable to check registration. Try again.'});
        }
      } finally {
        if (background.current === task) background.current = null;
        if (focused.current && version === resultVersion.current) setLoading(false);
      }
    })();

    return task.promise;
  }, [context, jobId, running, updateReview]);

  const runForeground = useCallback((operation, onSuccess = updateReview) => {
    if (running.current) return;

    const version = ++resultVersion.current;
    const pending = background.current;
    pending?.controller.abort();

    return run(async requestContext => {
      // Let an aborted passive read release the job lock before a foreground
      // action starts. Its result can no longer replace the action's state.
      await pending?.promise;

      try {
        return await operation(requestContext);
      } finally {
        if (focused.current && version === resultVersion.current) setLoading(false);
      }
    }, result => {
      if (focused.current && version === resultVersion.current) onSuccess(result);
    });
  }, [run, running, updateReview]);

  const refresh = useCallback(
    () => runForeground(requestContext => reconcileRegistration(jobId, requestContext)),
    [jobId, runForeground],
  );

  useFocusEffect(useCallback(() => {
    focused.current = true;
    const version = ++resultVersion.current;
    const start = async () => {
      await background.current?.promise;
      if (focused.current && version === resultVersion.current) refreshBackground();
    };
    start();

    // Poll only while this screen owns the active registration view.
    const poll = () => {
      if (AppState.currentState !== 'active' || ![
        'commitment_signed',
        'commitment_broadcast',
        'commitment_broadcast_unknown',
        'registration_signed',
        'registration_broadcast',
        'registration_broadcast_unknown',
      ].includes(currentReview.current?.status)) return;
      refreshBackground();
    };
    const timer = setInterval(poll, 20000);
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') poll();
    });

    return () => {
      focused.current = false;
      ++resultVersion.current;
      background.current?.controller.abort();
      clearInterval(timer);
      listener.remove();
    };
  }, [refreshBackground]));

  const continueRegistration = () => runForeground(
    requestContext => prepareRegistration({jobId}, requestContext),
    () => navigation.replace('IdentityRegistrationReview', {jobId}),
  );

  const status = review?.status;
  const state = registrationState(status);
  const canContinue = ['commitment_confirmed', 'registration_prepared', 'registration_expired'].includes(status);
  const canRetry = [
    'commitment_signed',
    'commitment_broadcast_unknown',
    'registration_signed',
    'registration_broadcast_unknown',
  ].includes(status);

  useEffect(() => {
    // Preparation is read-only with respect to payment. Only the next hold
    // can approveRegistration. A failed preparation keeps the retry action.
    if (status === 'commitment_confirmed') continueRegistration();
  }, [status]);

  const confirmLink = () => {
    if (running.current || promptOpen.current) return;

    promptOpen.current = true;
    const closePrompt = () => {
      promptOpen.current = false;
    };

    registrationAlert('Link identity to this wallet?',
      `${review.displayName} will appear in your wallet cards and addresses. Your wallets will refresh. Linking is free.`, [
        {text: 'Not now', style: 'cancel', onPress: closePrompt},
        {
          text: 'Link identity',
          onPress: () => {
            closePrompt();
            // Linking finishes and removes the saved registration.
            return runForeground(requestContext => linkRegisteredIdentity(jobId, requestContext), openOverview);
          },
        },
      ], {cancelable: true, onDismiss: closePrompt});
  };

  const openOverview = () => navigation.getParent().goBack();
  const openLinkedIdentities = () => navigation.getParent().reset({
    index: 0,
    routes: [{name: 'Identity'}],
  });

  const confirmDelete = () => {
    if (running.current || promptOpen.current) return;

    promptOpen.current = true;
    confirmRegistrationDeletion(review,
      () => runForeground(requestContext => deleteRegistration(jobId, review.deletionKind, requestContext), openOverview),
      () => {
        promptOpen.current = false;
      });
  };

  let action = state.kind === 'complete'
    ? {label: 'Done', onPress: openLinkedIdentities}
    : {label: 'Done for now', onPress: openOverview};

  if (status === 'commitment_prepared') action = {
    label: 'Review commitment',
    onPress: () => navigation.navigate('IdentityCommitmentReview', {jobId}),
  };
  else if (status === 'commitment_expired') action = {
    label: 'Review replacement',
    onPress: () => runForeground(
      requestContext => refreshRegistrationReview(jobId, requestContext),
      () => navigation.navigate('IdentityCommitmentReview', {jobId}),
    ),
  };
  else if (canContinue) action = {label: 'Continue registration', onPress: continueRegistration};
  else if (status === 'registered') action = {label: 'Link to wallet', onPress: confirmLink};
  else if (canRetry) action = {
    label: 'Retry sending',
    onPress: () => runForeground(requestContext => retryBroadcast(jobId, requestContext)),
  };
  else if (state.kind === 'attention') action = {label: 'Check status', onPress: refresh};

  const details = review && <RegistrationDetails review={review}>{dismiss => <>
    <RegistrationText muted>{state.detail.replace(/\bidentity\b/gi, 'VerusID')}</RegistrationText>
    <TextAction disabled={busy} onPress={refresh}>Check status</TextAction>
    <TextAction disabled={busy} onPress={() => dismiss(() => navigation.navigate('IdentityRegistrationStart'))}>All registrations</TextAction>
    {!!review.deletionKind && <TextAction disabled={busy} onPress={confirmDelete}>Delete saved registration</TextAction>}
  </>}</RegistrationDetails>;
  if (review && state.chainComplete) return <TransactionResult title="VerusID created" success
    description={status === 'registered' ? 'It is not in this wallet yet.' : null}
    amount={<VerusIdCard name={review.displayName} networkName={currencyLabel(review.systemId, review.currencyNames)} />}
    details={<View style={styles.section}>
      <AmountRows label="You paid" amounts={review.quote.totalOperationRequired} currencyNames={review.currencyNames} />
      {details}
    </View>}
    above={(error || loadError) ? <RegistrationText style={styles.errorText}>{(error || loadError).message}</RegistrationText> : null}
    actions={[{label: action.label, onPress: action.onPress, disabled: busy},
      ...(status === 'registered' ? [{label: 'Not now', onPress: openOverview, disabled: busy}] : [])]} />;

  return <RegistrationPage navigation={navigation} busy={busy} busyRef={running} error={error || loadError} info={registrationInfo(review?.stage)}
    footer={review ? <>
      {state.kind === 'waiting' && <Text style={[styles.muted, {textAlign: 'center'}]}>
        {status === 'commitment_broadcast' ? 'Ready in about 1 minute. You can close this screen.' : 'You can leave this screen. Follow progress from your home screen.'}
      </Text>}
      {state.kind === 'waiting' ? status === 'commitment_broadcast' ? <ActionButton hold disabled>Hold to create</ActionButton>
        : <ActionButton disabled>Waiting for confirmation</ActionButton>
        : <ActionButton disabled={busy} busy={busy} onPress={action.onPress}>{action.label}</ActionButton>}
    </> : <ActionButton disabled={busy || !loadError} busy={busy} onPress={refresh}>Check status</ActionButton>}>
    {!review && loading && <RegistrationSkeleton label="Loading registration" />}
    {review && <>
      <IdentitySummary review={review} />
      {state.kind === 'attention' && <StatusBadge status={status} />}
      {review.quote && <RegistrationSteps status={status} quote={review.quote} currencyNames={review.currencyNames} prices={prices} />}
      {state.kind === 'attention' && <RegistrationText>{state.detail.replace(/\bidentity\b/gi, 'VerusID')}</RegistrationText>}
      {canRetry && <Text style={styles.muted}>Retry sends the saved transaction. It does not create another payment.</Text>}
      {details}
      {!!review.lastError && <View style={styles.notice}>
        <RegistrationText muted>{(typeof review.lastError === 'string' ? review.lastError : review.lastError.message)
          ?.replace(/\bi[1-9A-HJ-NP-Za-km-z]{20,40}\b/g, address => identityLabel(address, review.identityNames)).replace(/\bidentity\b/gi, 'VerusID')}</RegistrationText>
      </View>}
    </>}
  </RegistrationPage>;
}
