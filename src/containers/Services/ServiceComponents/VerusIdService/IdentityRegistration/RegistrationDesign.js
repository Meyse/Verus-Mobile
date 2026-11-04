import React, {useEffect, useMemo, useState} from 'react';
import {Keyboard, Pressable, RefreshControl, Text, View, useWindowDimensions} from 'react-native';
import {ChevronDown, ChevronRight, ChevronUp, Info, Trash2} from 'lucide-react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AppButton from '../../../../../components/AppButton';
import AppTextInput from '../../../../../components/AppTextInput';
import AppSearchField, {APP_SEARCH_MIN_ITEMS} from '../../../../../components/AppSearchField';
import GradientButton from '../../../../../components/GradientButton';
import HeaderCloseButton from '../../../../../components/HeaderCloseButton';
import ProgressHeader from '../../../../../components/ProgressHeader';
import KeyboardAvoidingForm from '../../../../../components/KeyboardAvoidingForm';
import SafeBottomActionStack from '../../../../../components/SafeBottomActionStack';
import SheetScrollView from '../../../../../components/SheetScrollView';
import SelectionSheet, {SelectionGroup, SelectionRow} from '../../../../../components/SelectionSheet';
import InfoSheet from '../../../../../components/InfoSheet';
import InfoSheetSection from '../../../../../components/InfoSheetSection';
import TextAction from '../../../../../components/TextAction';
import AppStatusBadge from '../../../../../components/StatusBadge';
import SkeletonLoader, {SkeletonBlock} from '../../../../../components/SkeletonLoader';
import useSheetDismissal from '../../../../../components/useSheetDismissal';
import {useAppTheme} from '../../../../../theme/app';
import {createIdentityRegistrationStyles} from '../../../../../styles';
import {PROGRESS_HEADER_METRICS} from '../../../../../styles/components/progressHeader.styles';
import {currencyLabel} from './RegistrationComponents';
import {formatRegistrationAmount, identityLabel as upstreamIdentityLabel, registrationCostRows, registrationState} from './presentation';
import {registrationFiat} from './namespaceData';

export {currencyLabel};
export const identityLabel = (...args) => upstreamIdentityLabel(...args).replace(/\bidentity\b/gi, 'VerusID');
export const useRegistrationStyles = () => {
  const theme = useAppTheme();
  return useMemo(() => createIdentityRegistrationStyles(theme), [theme]);
};
export const RegistrationText = ({children, muted = false, style, ...props}) => {
  const styles = useRegistrationStyles();
  return <Text {...props} style={[muted ? styles.muted : styles.body, style]}>{children}</Text>;
};
export const RegistrationSkeleton = ({label = 'Loading costs'}) => {
  const theme = useAppTheme();
  return <SkeletonLoader accessibilityLabel={label} style={{gap: 12}}>
    <SkeletonBlock color={theme.colors.border} height={24} width="70%" />
    <SkeletonBlock color={theme.colors.border} height={16} width="45%" />
  </SkeletonLoader>;
};

export const RegistrationPage = ({children, error, refreshing = false, onRefresh, footer,
  navigation, title = 'New VerusID', busy = false, busyRef, info, showHeader = true}) => {
  const theme = useAppTheme();
  const styles = useRegistrationStyles();
  const insets = useSafeAreaInsets();
  const {height} = useWindowDimensions();
  const [infoVisible, setInfoVisible] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  useEffect(() => navigation?.addListener('beforeRemove', event => {
    if (busyRef ? busyRef.current : busy) event.preventDefault();
  }), [navigation, busy, busyRef]);
  const close = () => { if (!busy && !busyRef?.current) navigation?.getParent()?.goBack(); };
  // The left action is absent in this combined task. Info and Close share the
  // header's right action slot. Existing ProgressHeader consumers are unchanged.
  const rightAction = <View style={{flexDirection: 'row', width: info ? 88 : 44, alignSelf: 'flex-end', justifyContent: 'flex-end'}}>
    {info && <Pressable accessibilityRole="button" accessibilityLabel="About this registration" disabled={busy}
      onPress={() => setInfoVisible(true)} style={styles.iconButton}>
      <Info size={23} strokeWidth={2.2} color={theme.colors.textSubtle} />
    </Pressable>}
    <HeaderCloseButton onPress={close} disabled={busy} />
  </View>;
  return <View style={styles.page}>
    {showHeader && <ProgressHeader showBack={false} showProgress={false} title={title} rightAction={rightAction} />}
    <KeyboardAvoidingForm style={styles.page} keyboardVerticalOffset={showHeader
      ? insets.top + PROGRESS_HEADER_METRICS.top + PROGRESS_HEADER_METRICS.action + PROGRESS_HEADER_METRICS.bottom : 0}>
      <SheetScrollView style={styles.scroll} scrollViewProps={{
        keyboardShouldPersistTaps: 'handled',
        refreshControl: onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={() => onRefresh(true)}
          tintColor={theme.colors.primary} colors={[theme.colors.primary]} /> : undefined,
      }} contentContainerStyle={[styles.content, !showHeader && {paddingTop: insets.top + 40}]}>
        {children}
      </SheetScrollView>
      {!!footer && <View testID="registration-footer"><SafeBottomActionStack gap={10} horizontalSpacing={20} bottomSpacing={height <= 667 ? 24 : 28}
        includeBottomInset={!keyboard} style={[styles.footer, height <= 667 && {paddingTop: 8}]}
        >
        {!!error && <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">
          <Text style={styles.errorText}>{String(error.message || error).replace(/\bidentities\b/g, 'VerusIDs').replace(/\bidentity\b/gi, 'VerusID')}</Text>
        </View>}
        {footer}
      </SafeBottomActionStack></View>}
    </KeyboardAvoidingForm>
    <InfoSheet visible={infoVisible} onClose={() => setInfoVisible(false)} title="About this registration">
      {info}
    </InfoSheet>
  </View>;
};

export const ActionButton = ({children, onPress, disabled, busy, secondary = false, accessibilityLabel, hold = false}) => {
  const theme = useAppTheme();
  return hold ? <GradientButton holdToConfirm disabled={disabled || busy} onPress={onPress}
    holdHint={children === 'Hold to start' ? 'Hold the button to start registration.' : 'Hold the button to create your VerusID.'}
    topColor={theme.colors.primary} bottomColor={theme.colors.primary}>
    {busy ? 'Preparing…' : children}
  </GradientButton> : <AppButton accessibilityLabel={accessibilityLabel || children} disabled={disabled || busy}
    loading={busy} onPress={onPress} variant={secondary ? 'secondary' : 'primary'}>{children}</AppButton>;
};

export const Disclosure = ({title, summary, children, initiallyOpen = false}) => {
  const [open, setOpen] = useState(initiallyOpen);
  const styles = useRegistrationStyles();
  const theme = useAppTheme();
  const Chevron = open ? ChevronUp : ChevronDown;
  return <View style={styles.section}>
    <Pressable accessibilityRole="button" accessibilityLabel={summary && !open ? `${title}. ${summary}` : title}
      accessibilityState={{expanded: open}} onPress={() => setOpen(!open)} style={[styles.row, styles.touchRow]}>
      <Text style={[styles.label, {flex: 1}]}>{title}</Text>
      {!open && !!summary && <Text style={styles.muted}>{summary}</Text>}
      <Chevron size={20} color={theme.colors.textSubtle} />
    </Pressable>
    {open && children}
  </View>;
};

export const SelectionField = ({label, value, description, options, onSelect, disabled}) => {
  const [open, setOpen] = useState(false);
  const styles = useRegistrationStyles();
  const theme = useAppTheme();
  const dismissal = useSheetDismissal({visible: open, onClose: () => setOpen(false)});
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} accessibilityState={{expanded: open, disabled: !!disabled}}
      disabled={disabled} onPress={() => { Keyboard.dismiss(); setOpen(true); }} style={[styles.row, styles.touchRow]}>
      <Text style={styles.label}>{label}</Text><View style={[styles.flexible, {alignItems: 'flex-end'}]}>
        <Text style={[styles.amount, {textAlign: 'right'}]}>{value}</Text>
        {!!description && <Text style={styles.identifier}>{description}</Text>}
      </View>
      <ChevronRight size={20} color={theme.colors.textSubtle} />
    </Pressable>
    <SelectionSheet title={label === 'Pay from' ? 'Choose an address' : label} visible={open} onClose={dismissal.close} onClosed={dismissal.onClosed}>
      {options.map(option => <SelectionRow key={option.value} title={option.label} subtitle={option.description}
        selected={option.selected} showChevron={false} accessibilityRole="radio" disabled={disabled}
        onPress={() => dismissal.dismiss(() => onSelect(option.value))} />)}
    </SelectionSheet>
  </>;
};

export const NameField = ({name, setName, namespace, onNamespace, busy, availability}) => {
  const styles = useRegistrationStyles();
  const theme = useAppTheme();
  return <View style={styles.section}>
    <Text style={[theme.typography.labelMd, {color: theme.colors.textPrimary}]}>Name</Text>
    <Text style={styles.muted}>You cannot change it later.</Text>
    <AppTextInput accessibilityLabel="Identity name" placeholder="Type a name" value={name} onChangeText={setName}
      editable={!busy} returnKeyType="done" invalid={availability === 'taken'} endAccessory={<>
        <View style={styles.namespaceDivider} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Choose a namespace: ${namespace?.name || 'Verus'}`} disabled={busy}
          onPress={onNamespace} style={styles.namespace}>
          <Text numberOfLines={1} style={styles.namespaceText}>{namespace?.suffix || '@'}</Text>
          <ChevronDown size={14} color={theme.colors.textSubtle} />
        </Pressable>
      </>} />
    <View style={[styles.row, {minHeight: 24}]} accessibilityLiveRegion="polite">
      {['available', 'taken', 'saved'].includes(availability)
        ? <AppStatusBadge tone={availability === 'taken' ? 'danger' : availability === 'saved' ? 'neutral' : 'success'} label={availability === 'taken' ? 'Taken' : availability === 'saved' ? 'Saved registration' : 'Available'} />
        : <Text style={styles.muted}>{availability === 'checking' ? 'Checking name…' : 'Tap @ to choose a namespace.'}</Text>}
      {availability === 'taken' && <Text style={styles.muted}>Try another name or namespace.</Text>}
    </View>
  </View>;
};

export const NamespaceSheet = ({visible, onClose, namespaces, selectedId, onSelect, loading, error, onRetry}) => {
  const [query, setQuery] = useState('');
  const styles = useRegistrationStyles();
  const showSearch = namespaces.length >= APP_SEARCH_MIN_ITEMS;
  useEffect(() => { if (!visible || !showSearch) setQuery(''); }, [visible, showSearch]);
  const dismissal = useSheetDismissal({visible, onClose});
  const matches = namespaces.filter(item => item.name.toLowerCase().includes(showSearch ? query.trim().toLowerCase() : ''));
  const groups = [matches.filter(item => item.usd), matches.filter(item => !item.usd)];
  const row = item => <SelectionRow key={item.id} title={item.name} selected={item.id === selectedId} showChevron={false}
    disabled={!!item.reason} subtitle={item.reason || (item.referralRequired ? 'Requires a referral signature.' : undefined)}
    value={item.reason ? undefined : `${formatRegistrationAmount(item.amount)} ${item.currency}`}
    valueLabel={!item.reason && item.usd ? registrationFiat({[item.id]: item.amount}, {[item.id]: item.usd}) : undefined}
    onPress={() => dismissal.dismiss(() => onSelect(item))} />;
  return <SelectionSheet title="Choose a namespace" visible={visible} onClose={dismissal.close} onClosed={dismissal.onClosed} avoidKeyboard
    footer={!loading && namespaces.some(item => item.reason?.includes('could not be checked'))
      ? <TextAction onPress={onRetry}>Try again</TextAction> : null}
    header={showSearch ? <AppSearchField accessibilityLabel="Search namespaces" placeholder="Search namespaces" value={query}
      onChangeText={setQuery} resultCount={matches.length} /> : null}>
    {loading ? <RegistrationSkeleton label="Loading namespaces" /> : error ? <View style={styles.section}>
      <Text style={styles.errorText}>{error}</Text><TextAction onPress={onRetry}>Try again</TextAction>
    </View> : !matches.length ? <Text style={styles.muted}>No matching namespaces.</Text> : <>
      {groups[0].map(row)}
      {!!groups[1].length && <SelectionGroup title="No market price">{groups[1].map(row)}</SelectionGroup>}
    </>}
  </SelectionSheet>;
};

export const AmountRows = ({amounts, label, total = false, currencyNames, badge}) => {
  const styles = useRegistrationStyles();
  return <View style={styles.section}>
    {Object.entries(amounts || {}).map(([id, amount], index) => <View key={id} style={[styles.row, {flexWrap: 'wrap'}]}>
      <Text style={styles.label}>{index === 0 ? label : ''}</Text>
      <Text style={[styles.amount, total && styles.total]}>{formatRegistrationAmount(amount)} {currencyLabel(id, currencyNames)}</Text>
      {index === 0 && badge}
    </View>)}
  </View>;
};

export const CostReview = ({quote, currencyNames, stage = 'commitment', prices = {}}) => {
  const styles = useRegistrationStyles();
  if (!quote) return <RegistrationSkeleton />;
  const amounts = stage === 'commitment' ? quote.totalOperationRequired : quote.totalRequired;
  const fiat = registrationFiat(amounts, prices);
  const later = Object.entries(quote.totalRequired).map(([id, amount]) => `${formatRegistrationAmount(amount)} ${currencyLabel(id, currencyNames)}`).join(' and ');
  const missing = Object.keys(amounts).filter(id => !prices[id] && id !== quote.systemID);
  return <View style={styles.section}>
    <Text style={styles.muted}>{stage === 'commitment' ? 'You pay' : 'Price'}</Text>
    {Object.entries(amounts).map(([id, amount]) => <Text key={id} style={styles.heroAmount}>
      {formatRegistrationAmount(amount)} {currencyLabel(id, currencyNames)}
    </Text>)}
    {fiat && <Text style={styles.muted}>≈ {fiat}</Text>}
    {missing.map(id => <Text key={id} style={styles.muted}>No market price for {currencyLabel(id, currencyNames)}</Text>)}
    {stage === 'commitment' && <Text style={styles.muted}>First {formatRegistrationAmount(quote.commitmentFee)} {currencyLabel(quote.systemID, currencyNames)}, then {later} about 1 minute later.</Text>}
  </View>;
};

export const IdentitySummary = ({review}) => {
  const styles = useRegistrationStyles();
  return <View style={styles.section}><Text style={styles.subtitle}>{review.displayName}</Text></View>;
};

// Read-only facts from the same resolved policy and normalized request that
// feed prepareCommitment. Keep the first hold's control and fee details
// inspectable before any job or payment exists.
export const RegistrationPreviewDetails = ({preview}) => {
  const styles = useRegistrationStyles();
  if (!preview?.policy || !preview.request) return null;
  const {request, policy, quote} = preview;
  const names = {...preview.currencyNames, ...preview.identityNames};
  const own = policy.resolvedName.identityID;
  const authority = id => !id || id === own ? 'This VerusID' : identityLabel(id, names);
  return <>
    <InfoSheetSection title="Addresses and control" rows={[
      {label: 'VerusID address', value: own, copy: true, valueStyle: styles.identifier},
      {label: 'Payment address', value: request.fundingAddress, copy: true, valueStyle: styles.identifier},
      {label: 'Control address', value: request.signingAddress, copy: true, valueStyle: styles.identifier},
      {label: 'Private address', value: request.privateAddress, copy: true, valueStyle: styles.identifier},
      {label: 'Namespace', value: identityLabel(policy.resolvedName.parent, names)},
      {label: 'Referral', value: request.referralID ? identityLabel(request.referralID, names) : 'None'},
      {label: 'Recovery', value: authority(request.recoveryAuthority)},
      {label: 'Revocation', value: authority(request.revocationAuthority)},
      {label: 'Registration authorized by', value: policy.requiredAuthorityID ? identityLabel(policy.requiredAuthorityID, names) : null},
    ]} />
    <InfoSheetSection title="Fee breakdown" rows={registrationCostRows(quote).map(row => ({label: row.label,
      value: `${formatRegistrationAmount(row.amount)} ${currencyLabel(row.currencyID, preview.currencyNames)}${row.recipient ? ` · To ${identityLabel(row.recipient, names)}` : ''}`,
    }))} />
  </>;
};

export const RegistrationDetails = ({review, children}) => {
  const styles = useRegistrationStyles();
  const [visible, setVisible] = useState(false);
  const dismissal = useSheetDismissal({visible, onClose: () => setVisible(false)});
  const names = {...review.currencyNames, ...review.identityNames, [review.identityAddress]: review.displayName};
  const authority = address => address === review.identityAddress ? 'This VerusID' : identityLabel(address, names);
  return <>
    <TextAction onPress={() => setVisible(true)}>Transaction details</TextAction>
    <InfoSheet visible={visible} onClose={dismissal.close} onClosed={dismissal.onClosed} title="Transaction details">
      <InfoSheetSection title="VerusID details" rows={[
        {label: 'Controlled by', value: 'This wallet'},
        {label: 'Private address', value: review.identity?.privateaddress, copy: true, valueStyle: styles.identifier},
        {label: 'Namespace', value: identityLabel(review.identity?.parent, names)},
        {label: 'Referral', value: review.referralID ? identityLabel(review.referralID, names) : 'None'},
        {label: 'Recovery', value: authority(review.identity?.recoveryauthority)},
        {label: 'Revocation', value: authority(review.identity?.revocationauthority)},
        {label: 'Required signatures', value: String(review.identity?.minimumsignatures || 1)},
        {label: 'Change returns to', value: review.fundingName || review.fundingAddress},
        {label: 'Registration authorized by', value: review.registrationAuthority ? identityLabel(review.registrationAuthority, names) : null},
      ]} />
      <InfoSheetSection title="Fees" rows={registrationCostRows(review.quote).map(row => ({
        label: row.label, value: `${formatRegistrationAmount(row.amount)} ${currencyLabel(row.currencyID, review.currencyNames)}${row.recipient ? ` · To ${identityLabel(row.recipient, names)}` : ''}`,
      }))} />
      <InfoSheetSection title="Addresses and transactions" rows={[
        ['VerusID address', review.identityAddress], ['Payment address', review.fundingAddress], ['Control address', review.signingAddress],
        ['Commitment transaction', review.commitmentTxid], ['Registration transaction', review.registrationTxid],
      ].filter(([, value]) => value).map(([label, value]) => ({label, value, copy: true, valueStyle: styles.identifier}))} />
      {typeof children === 'function' ? children(dismissal.dismiss) : children}
    </InfoSheet>
  </>;
};

export const RegistrationSteps = ({status, quote, currencyNames, prices, changed = false}) => {
  const state = registrationState(status);
  const styles = useRegistrationStyles();
  const uncertainCommitment = ['commitment_signed', 'commitment_broadcast_unknown', 'commitment_spent'].includes(status);
  const uncertainRegistration = ['registration_signed', 'registration_broadcast_unknown'].includes(status);
  const firstLabel = state.step > 0 || state.chainComplete ? 'Paid' : uncertainCommitment ? 'Check delivery' : status === 'commitment_broadcast' ? 'Sent' : 'Next';
  const secondLabel = state.chainComplete ? 'Paid' : uncertainRegistration ? 'Check delivery' : status === 'registration_broadcast' ? 'Sent'
    : status === 'registration_expired' ? 'Expired' : changed ? 'Changed' : state.step > 0 ? 'Ready' : 'Next';
  return <View style={styles.section} accessibilityLabel="Registration steps">
    <AmountRows label="Network fee" amounts={{[quote.systemID]: quote.commitmentFee}} currencyNames={currencyNames}
      badge={<AppStatusBadge label={firstLabel} tone={uncertainCommitment ? 'warning' : firstLabel === 'Next' ? 'neutral' : 'success'} />} />
    <View style={styles.divider} />
    <AmountRows label={state.step > 0 ? 'Price' : 'Estimated price'} amounts={quote.totalRequired} currencyNames={currencyNames}
      badge={<AppStatusBadge label={secondLabel}
        tone={changed || uncertainRegistration || status === 'registration_expired' ? 'warning' : state.step > 0 ? 'success' : 'neutral'} />} />
    {registrationFiat(quote.totalRequired, prices) && <Text style={[styles.muted, {textAlign: 'right'}]}>≈ {registrationFiat(quote.totalRequired, prices)}</Text>}
    <View style={styles.divider} />
  </View>;
};

export const StatusBadge = ({status}) => {
  const state = registrationState(status);
  return <AppStatusBadge label={state.title} tone={state.kind === 'attention' ? 'warning' : state.kind === 'complete' ? 'success' : 'neutral'} />;
};

export const RegistrationListItem = ({job, onPress, disabled, busy, onDelete, deleteDisabled, deleting}) => {
  const state = registrationState(job.status);
  const styles = useRegistrationStyles();
  const theme = useAppTheme();
  const actionable = state.kind !== 'waiting';
  const subtitle = job.status === 'commitment_prepared' ? 'Saved, not paid yet' : job.status === 'commitment_confirmed' || job.status === 'registration_prepared'
    ? 'Second payment is ready' : state.title;
  return <View style={styles.job}>
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${job.displayName || job.name}. ${state.title}. ${busy ? 'Opening registration' : state.action}`}
        disabled={disabled || deleting} accessibilityState={{disabled: !!disabled || !!deleting, busy: !!busy}} onPress={onPress} style={styles.flexible}>
        <Text style={[theme.typography.titleRow, {color: theme.colors.textPrimary}]}>{job.displayName || job.name}</Text>
        <Text style={styles.muted}>{busy ? 'Opening registration…' : subtitle}</Text>
      </Pressable>
      {actionable ? <TextAction disabled={disabled || deleting} onPress={onPress} style={styles.jobPill}>Continue</TextAction>
        : <ChevronRight size={20} color={theme.colors.textSubtle} />}
      {!!onDelete && <Pressable accessibilityRole="button" accessibilityLabel={`Delete saved registration for ${job.displayName || job.name}`}
        disabled={disabled || deleteDisabled || deleting} accessibilityState={{disabled: !!disabled || !!deleteDisabled || !!deleting}}
        onPress={onDelete} style={styles.iconButton}><Trash2 size={18} color={theme.colors.textSubtle} /></Pressable>}
    </View>
  </View>;
};
