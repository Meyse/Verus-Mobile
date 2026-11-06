import React from 'react';
import {Pressable, Text, View} from 'react-native';
import BigNumber from 'bignumber.js';
import {Check, CircleAlert, Clock, X} from 'lucide-react-native';
import {useAppTheme} from '../../../../../theme/app';
import AppStatusBadge from '../../../../../components/StatusBadge';
import TextAction from '../../../../../components/TextAction';
import CopyAction from '../../../../../components/CopyAction';
import {InfoSheetTopic} from '../../../../../components/InfoSheetSection';
import {formatRegistrationAmount} from '../../../../../utils/identityRegistration/costs';
import {VerusIdName} from '../VerusIdCard';
import {currencyLabel, identityLabel, RegistrationText, useRegistrationStyles} from './RegistrationDesign';
import {useRegistrationFiat} from './useRegistrationPrices';
import {registrationCurrencyBalance} from './fundingSources';

export const shortRegistrationAddress = address => address ? `${address.slice(0, 5)}…${address.slice(-4)}` : '';
export const registrationPayerName = source => source?.isIdentity ? identityLabel(source.address, {[source.address]: source.fundingName}) : 'Transparent';
export const registrationAmounts = (quote, names, second = false) => Object.entries(
  (second ? quote?.totalRequired : quote?.totalOperationRequired) || {},
).map(([id, amount]) => `${formatRegistrationAmount(amount)} ${currencyLabel(id, names)}`).join(' + ');

export const RegistrationInfo = ({name = 'your VerusID', payer, children, create = false}) => <>
  <InfoSheetTopic title="How registration works">First, pay a small fee to commit your name. After 1 block confirmation, pay to create the VerusID.</InfoSheetTopic>
  <InfoSheetTopic title="Keep your app data">Keep this wallet and its app data until you finish. Your seed alone cannot restore a pending commitment.</InfoSheetTopic>
  {!!payer && <InfoSheetTopic title="Pay from">Both payments use {payer}.</InfoSheetTopic>}
  {create && <>
    <InfoSheetTopic title="Referral">A referral lowers the price.</InfoSheetTopic>
    <InfoSheetTopic title="Recovery">Can restore your VerusID if it is revoked.</InfoSheetTopic>
    <InfoSheetTopic title="Revocation">Can revoke your VerusID. Leave both empty to use {name} for both.</InfoSheetTopic>
  </>}
  {children}
</>;

export const RegistrationChoice = ({title, subtitle, selected, disabled, onPress, children, identifier}) => {
  const theme = useAppTheme();
  const styles = useRegistrationStyles();
  return <View style={[styles.choice, {backgroundColor: selected ? theme.colors.successBackground : theme.colors.surfaceMuted,
    borderColor: selected ? theme.colors.successText : 'transparent'}]}>
    <Pressable accessibilityRole="radio" accessibilityLabel={[title, identifier, subtitle].filter(Boolean).join('. ')}
      accessibilityState={{checked: selected, disabled: !!disabled}} disabled={disabled} onPress={onPress}
      style={[styles.choiceHead, disabled && {opacity: 0.6}]}>
      <View style={styles.flexible}>
        <RegistrationText style={theme.typography.titleRow}>{title}</RegistrationText>
        {!!identifier && <Text style={styles.identifier}>{identifier}</Text>}
        {!!subtitle && <RegistrationText muted>{subtitle}</RegistrationText>}
      </View>
      {selected && <Check size={20} color={theme.colors.successText} />}
    </Pressable>
    {!!children && <View style={styles.choiceBody}>{children}</View>}
  </View>;
};

export const RegistrationFunds = ({data, source, coin, coins, balances, reads, showBalance, funding, referralOnly, onRetry, compact = false}) => {
  const styles = useRegistrationStyles();
  if (!data?.quote) return null;
  const {quote, referralQuote, currencyNames} = data;
  const priceId = quote.feePricingCurrencyID || quote.issuerID;
  const two = priceId !== quote.systemID;
  const price = quote.totalOperationRequired[priceId];
  const label = currencyLabel(funding?.currencyId || priceId, currencyNames);
  const enough = funding?.status === 'enough';
  const badge = enough ? referralOnly ? 'Enough with a referral' : 'Enough funds'
    : funding?.status === 'short' ? two ? `Not enough ${label}` : 'Not enough funds' : null;
  return <View style={styles.section}>
    <View style={styles.row}><Text style={styles.label}>Price</Text><Text style={styles.amount}>{formatRegistrationAmount(price)} {currencyLabel(priceId, currencyNames)}</Text></View>
    {!!referralQuote && <Text style={[styles.muted, {textAlign: 'right'}]}>{formatRegistrationAmount(referralQuote.totalOperationRequired[priceId])} {currencyLabel(priceId, currencyNames)} with a referral</Text>}
    {two && <View style={styles.row}><Text style={styles.label}>Network fees</Text><Text style={styles.amount}>{formatRegistrationAmount(quote.totalOperationRequired[quote.systemID])} {currencyLabel(quote.systemID, currencyNames)}</Text></View>}
    {!compact && <View style={styles.divider} />}
    {!compact && <>
    <View style={[styles.row, {alignItems: 'flex-start', flexWrap: 'wrap'}]}>
      <Text style={styles.label}>You have</Text>
      <View style={{alignItems: 'flex-end'}}>{[priceId, ...(two ? [quote.systemID] : [])].map(id => {
        const balance = registrationCurrencyBalance(id, source, coin, coins, balances, reads);
        return <Text key={id} style={styles.amount}>{!showBalance ? 'Balance hidden' : balance == null ? 'Checking…' : `${balance} ${currencyLabel(id, currencyNames)}`}</Text>;
      })}</View>
      {!two && badge && <AppStatusBadge label={badge} tone={enough ? 'success' : 'danger'} />}
    </View>
    {two && badge && <AppStatusBadge label={badge} tone={enough ? 'success' : 'danger'} />}
    </>}
    {compact && badge && <AppStatusBadge label={badge} tone={enough ? 'success' : 'danger'} />}
    {compact && funding?.status === 'checking' && <RegistrationText muted>Checking funds…</RegistrationText>}
    {!compact && referralOnly && enough && <RegistrationText muted>You choose a referral in the next step.</RegistrationText>}
    {!compact && funding?.status === 'short' && <RegistrationText muted>Add {label} to this wallet to continue.</RegistrationText>}
    {funding?.status === 'error' && <><RegistrationText style={styles.errorText}>Payer balances could not be checked.</RegistrationText><TextAction onPress={onRetry}>Try again</TextAction></>}
  </View>;
};

export const RegistrationSummary = ({name, referral, payer, recovery, revocation, onName, onReferral, onPayer, onRecovery, disabled = false}) => {
  const styles = useRegistrationStyles();
  const rows = [['Name', name, onName], ...(referral != null ? [['Referral', referral || 'None', onReferral]] : []),
    ['Pay from', registrationPayerName(payer), onPayer, !payer?.isIdentity ? shortRegistrationAddress(payer?.address) : null],
    ['Recovery', recovery || name, onRecovery], ['Revocation', revocation || name, onRecovery]];
  return <View>{rows.map(([label, value, change, address]) => <View key={label} style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text><View style={styles.flexible}>
      <RegistrationText style={styles.amount}>{value}</RegistrationText>
      {!!address && <Text style={styles.identifier}>{address}</Text>}
    </View>{change && <TextAction disabled={disabled} onPress={change}>Change</TextAction>}
  </View>)}</View>;
};

const quoteParts = (quote, names) => {
  const rows = [];
  const add = (label, id, amount, kind) => { if (new BigNumber(amount || 0).gt(0)) rows.push({label, id, amount, kind}); };
  if (quote.branch === 'native') add('Registration fee', quote.systemID, quote.nativeFee);
  else {
    add(quote.issuerPayment?.kind === 'burn' ? 'Namespace charge · Burned' : 'Namespace charge', quote.issuerPayment?.currencyID, quote.issuerPayment?.amount);
  }
  (quote.referralPayments || []).forEach((payment, i) => add(`${identityLabel(payment.recipient, names)}${i === 0 ? ' · Referral payment' : ''}`, payment.currencyID, payment.amount, 'referral'));
  if (quote.branch !== 'native') add('Network fee', quote.systemID, new BigNumber(quote.nativeFee).plus(quote.transferFee).toFixed(0), 'network');
  return rows;
};

export const RegistrationSplit = ({quote, names}) => {
  const styles = useRegistrationStyles();
  const theme = useAppTheme();
  const rows = quoteParts(quote, names);
  const colors = [theme.colors.textSubtle, theme.colors.primary, theme.colors.link, theme.colors.textSecondary];
  const price = new BigNumber(quote.registrationOffer);
  return <View style={styles.section}>
    <View style={styles.splitBar}>{rows.filter(row => row.kind !== 'network').map((row, i) => <View key={`${i}`} style={{
      flex: price.gt(0) ? new BigNumber(row.amount).div(price).toNumber() : 1, backgroundColor: colors[i % colors.length], marginRight: 1}} />)}</View>
    {rows.map((row, i) => <View key={`${i}`} style={[styles.row, {gap: 8, alignItems: 'flex-start'}]}>
      <View style={[styles.swatch, {backgroundColor: row.kind === 'network' ? theme.colors.background : colors[i % colors.length], borderColor: theme.colors.textSubtle}]} />
      <Text style={[styles.label, {color: theme.colors.textPrimary}]}>{row.label}</Text>
      <Text style={[styles.amount, theme.typography.labelMd]}>{formatRegistrationAmount(row.amount)}{quote.branch !== 'native' ? ` ${currencyLabel(row.id, names)}` : ''}</Text>
    </View>)}
  </View>;
};

export const RegistrationHero = ({quote, currencyNames, prices}) => {
  const styles = useRegistrationStyles();
  const fiat = useRegistrationFiat()(quote.totalOperationRequired, prices);
  const id = quote.feePricingCurrencyID || quote.issuerID;
  return <View style={styles.section}>
    <RegistrationText muted>You pay</RegistrationText>
    <Text style={styles.heroAmount}>{formatRegistrationAmount(quote.totalOperationRequired[id])} {currencyLabel(id, currencyNames)}</Text>
    {id !== quote.systemID ? <RegistrationText muted>+ {formatRegistrationAmount(quote.totalOperationRequired[quote.systemID])} {currencyLabel(quote.systemID, currencyNames)} in network fees</RegistrationText>
      : fiat && <RegistrationText muted>≈ {fiat}</RegistrationText>}
  </View>;
};

export const RegistrationTimeline = ({review, check = false, changed, oldPrice, commitmentText, registrationText, shortage}) => {
  const styles = useRegistrationStyles();
  const theme = useAppTheme();
  const {quote, currencyNames, identityNames, status} = review;
  const priceId = quote.feePricingCurrencyID || quote.issuerID;
  const firstDone = ['commitment_confirmed', 'registration_prepared', 'registration_expired', 'registration_broadcast', 'registered', 'complete'].includes(status) || status?.startsWith('registration_');
  const rows = [
    {title: 'Commitment', amount: quote.commitmentFee, id: quote.systemID, done: firstDone, text: check ? 'Hides the name. Does not reserve it.' : commitmentText},
    {title: 'Registration', amount: quote.totalRequired[priceId], id: priceId, done: ['registered', 'complete'].includes(status), text: registrationText},
  ];
  return <View style={styles.section}>{rows.map((row, i) => {
    const stage = i === 0 ? 'commitment' : 'registration';
    const failed = status === `${stage}_expired` || (i === 1 && review.registrationProblem === 'name_taken');
    const uncertain = [`${stage}_signed`, `${stage}_broadcast_unknown`].includes(status);
    const active = status === `${stage}_broadcast` || (i === 1 && ['commitment_confirmed', 'registration_prepared'].includes(status));
    const fill = row.done ? theme.colors.successText : failed ? theme.colors.destructive : uncertain ? theme.colors.warningText
      : check && i === 0 || active && status !== `${stage}_broadcast` ? theme.colors.primary : theme.colors.background;
    return <View key={row.title} style={[styles.row, {alignItems: 'stretch', gap: 12}]}>
    <View style={{width: check ? 14 : 24, alignItems: 'center'}}>
      <View style={[styles.timelineNode, check && {width: 14, height: 14, marginTop: 4}, {borderColor: active ? theme.colors.primary : fill !== theme.colors.background ? fill : theme.colors.textSubtle,
        backgroundColor: fill}]}>
        {row.done && <Check size={14} color={theme.colors.background} />}
        {failed && <X size={14} color={theme.colors.onDestructive} />}
        {uncertain && <CircleAlert size={14} color={theme.colors.background} />}
      </View>
      {i === 0 && <View style={[styles.timelineConnector, {backgroundColor: row.done ? theme.colors.successText : theme.colors.borderStrong}]} />}
    </View>
    <View style={[styles.flexible, {paddingBottom: i === 0 ? 10 : 0, gap: 4}]}>
      <View style={[styles.row, {flexWrap: 'wrap', gap: 8}]}><Text style={styles.amount}>{row.title}</Text>
        {check && <AppStatusBadge label={i === 0 ? 'Now' : 'After 1 block'} tone="neutral" />}
        {!check && i === 1 && changed && <AppStatusBadge label="Changed" tone="warning" />}
        <Text style={[styles.amount, {marginLeft: 'auto'}]}>{formatRegistrationAmount(row.amount)}{!check || quote.branch !== 'native' ? ` ${currencyLabel(row.id, currencyNames)}` : ''}</Text>
      </View>
      {!!row.text && <RegistrationText muted>{row.text}</RegistrationText>}
      {i === 1 && !shortage && !!oldPrice && <RegistrationText muted>The price was {oldPrice}.</RegistrationText>}
      {i === 1 && !!shortage && <View style={styles.section}>
        <RegistrationText muted>{shortage}</RegistrationText>
        <View style={styles.row}><Text style={{...theme.typography.labelMd, color: theme.colors.link}}>Copy address</Text><CopyAction value={review.fundingAddress} accessibilityLabel="Copy address" color={theme.colors.link} /></View>
      </View>}
      {i === 1 && !shortage && (check || status === 'registration_prepared') && <RegistrationSplit quote={quote} names={{...currencyNames, ...identityNames}} />}
    </View>
  </View>;
  })}</View>;
};

export const RegistrationStatusPill = ({label, tone = 'neutral', waiting = false}) => {
  const theme = useAppTheme();
  const Icon = waiting ? Clock : tone === 'success' ? Check : CircleAlert;
  const color = waiting ? theme.colors.link : theme.colors[`${tone}Text`] || theme.colors.textSecondary;
  const backgroundColor = waiting ? theme.colors.primaryBackground : theme.colors[`${tone}Background`] || theme.colors.surfaceMuted;
  return <View style={{alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingLeft: 8, borderRadius: 99, backgroundColor}}>
    <Icon size={14} color={color} /><AppStatusBadge label={label} tone={waiting ? 'info' : tone} />
  </View>;
};

export const RegistrationName = ({name}) => {
  const styles = useRegistrationStyles();
  const theme = useAppTheme();
  return <VerusIdName name={name} style={styles.title} leafColor={theme.colors.textPrimary} restColor={theme.colors.textSecondary} />;
};
