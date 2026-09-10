import React, {useMemo, useState} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Checkbox, Text} from 'react-native-paper';
import {Check} from 'lucide-react-native';
import AppButton from '../../../../components/AppButton';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import SkeletonLoader, {
  SkeletonBlock,
} from '../../../../components/SkeletonLoader';
import CopyAction from '../../../../components/CopyAction';
import {dataRequestInfoStyles as createStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {getGenericRequestDeliveryInfo} from '../../../../utils/deeplink/genericRequestDelivery';
import {unixToDate} from '../../../../utils/math';
import IdentityPickerSheet from '../VerusIdIdentityPickerSheet/IdentityPickerSheet';
import DeepLinkRequestSourceCard from './DeepLinkRequestSourceCard';
import DeepLinkRequestDetailsSheet from './DeepLinkRequestDetailsSheet';
import DeepLinkRequestSheetScaffold from './DeepLinkRequestSheetScaffold';
import DeepLinkReviewScrollView from './DeepLinkReviewScrollView';

export const formatReviewValue = value => {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2) ?? String(value);
};

export const DataReviewLoading = ({label}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <SkeletonLoader accessibilityLabel={label} style={styles.loading}>
      <SkeletonBlock width="62%" height={22} />
      <SkeletonBlock height={16} />
      <SkeletonBlock width="82%" height={16} />
    </SkeletonLoader>
  );
};

export const DataReviewNotice = ({title, children}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.notice} accessibilityLiveRegion="polite">
      <Text style={styles.noticeTitle}>{title}</Text>
      {children ? <Text style={styles.body}>{children}</Text> : null}
    </View>
  );
};

// Values remain selectable in full. A field structure makes ordinary credential
// data readable without inventing a semantic summary of arbitrary JSON.
export const DataReviewValue = ({value}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).map(([label, item]) => (
      <View key={label} style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text selectable style={styles.value}>
          {formatReviewValue(item)}
        </Text>
      </View>
    ));
  }
  return (
    <Text selectable style={styles.value}>
      {formatReviewValue(value)}
    </Text>
  );
};

export const DataReviewItem = ({
  title,
  children,
  details,
  consentLabel,
  checked,
  onToggle,
  disabled,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [detailsVisible, setDetailsVisible] = useState(false);
  return (
    <View style={styles.item}>
      <Text style={styles.itemTitle}>{title}</Text>
      {children}
      {details?.length > 0 && (
        <>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`View details for ${title}`}
            onPress={() => setDetailsVisible(true)}
            style={styles.detailsLink}>
            <Text style={styles.detailsLinkText}>View details</Text>
          </TouchableOpacity>
          <DeepLinkRequestSheetScaffold
            visible={detailsVisible}
            onClose={() => setDetailsVisible(false)}
            maxHeight="78%"
            title={title}>
            {details
              .filter(row => row.value != null)
              .map((row, index) => (
                <View key={index} style={styles.detailField}>
                  <View style={styles.detailLabelRow}>
                    <Text style={styles.detailLabel}>{row.label}</Text>
                    {row.copy && (
                      <CopyAction
                        accessibilityLabel={`Copy ${row.label}`}
                        value={formatReviewValue(row.value)}
                      />
                    )}
                  </View>
                  <Text
                    selectable
                    style={
                      row.technical ? styles.technicalValue : styles.value
                    }>
                    {formatReviewValue(row.value)}
                  </Text>
                </View>
              ))}
          </DeepLinkRequestSheetScaffold>
        </>
      )}
      <TouchableOpacity
        accessibilityRole="checkbox"
        accessibilityLabel={consentLabel}
        accessibilityState={{checked, disabled}}
        disabled={disabled}
        onPress={onToggle}
        style={styles.consentRow}>
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <Checkbox.Android
            status={checked ? 'checked' : 'unchecked'}
            color={theme.colors.success}
            uncheckedColor={theme.colors.textSecondary}
          />
        </View>
        <Text style={styles.consentText}>{consentLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function DataRequestReview({
  title,
  description,
  props,
  identity,
  children,
  onContinue,
  primaryLabel,
  disabled,
  processing,
  error,
  detailsSections = [],
}) {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const delivery = getGenericRequestDeliveryInfo(props.request);
  const selected = identity.selectedIdentity;
  const metadataRows = [
    {label: 'Network', value: props.signerSystemName || props.signerSystemID},
    delivery.destinationHost
      ? {label: 'Response destination', value: delivery.destinationHost}
      : null,
  ].filter(Boolean);
  const sections = [
    {
      title: 'Request',
      rows: [
        {label: 'Requester', value: props.signerFqn || props.signerIdentityID},
        {label: 'Requester address', value: props.signerIdentityID},
        {
          label: 'Network',
          value: props.signerSystemName || props.signerSystemID,
        },
        {
          label: 'Signed',
          value: props.sigtime ? unixToDate(props.sigtime) : null,
        },
        {
          label: 'Delivery',
          value:
            delivery.type === 'post'
              ? 'POST response'
              : delivery.type === 'redirect'
              ? 'Browser handoff'
              : 'No callback requested',
        },
        {label: 'Response URI', value: delivery.uriString},
        {label: 'Responding VerusID', value: selected?.iAddress},
        {label: 'Required VerusID', value: identity.requiredIdentity},
      ],
    },
    ...detailsSections,
  ];
  const actionLabel = !identity.walletReady
    ? identity.signedIn
      ? 'Switch wallet'
      : 'Unlock wallet'
    : identity.lookupStatus === 'error'
    ? 'Retry VerusID lookup'
    : identity.lookupStatus === 'loading'
    ? 'Loading VerusIDs'
    : identity.signerConflict
    ? 'Cannot use this VerusID'
    : identity.requiredSignerUnavailable
    ? 'Switch wallet'
    : !selected
    ? 'Choose VerusID'
    : primaryLabel;
  const action = () => {
    if (!identity.walletReady || identity.requiredSignerUnavailable)
      return identity.unlock();
    if (identity.lookupStatus === 'error') return identity.retry();
    if (!selected) return identity.setIdentitySheetVisible(true);
    return onContinue();
  };
  const actionDisabled =
    processing ||
    identity.unlocking ||
    identity.signerConflict ||
    (identity.walletReady && identity.lookupStatus === 'loading') ||
    (identity.walletReady && !!selected && disabled);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <IdentityPickerSheet
        visible={
          identity.walletReady && identity.identitySheetVisible && !processing
        }
        linkingEnabled={false}
        provisioningEnabled={false}
        linkedIds={identity.linkedIds}
        sortedIds={identity.sortedIds}
        isIdentityAllowed={identity.isIdentityAllowed}
        selectedIdentity={selected}
        onClose={() => identity.setIdentitySheetVisible(false)}
        onSelect={identity.selectIdentity}
      />
      <DeepLinkRequestDetailsSheet
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        sections={sections}
      />
      <DeepLinkReviewScrollView showScrollCue>
        <View style={styles.header}>
          <Text style={styles.mainTitle}>{title}</Text>
          <Text style={styles.mainSubtitle}>{description}</Text>
        </View>
        <DeepLinkRequestSourceCard
          requesterLabel={
            props.signerFqn || props.signerIdentityID || 'Requester'
          }
          metadataRows={metadataRows}
          showRequestDetailsLink
          onPressRequestDetails={() => setDetailsVisible(true)}
        />
        <View style={styles.section}>
          {identity.signerConflict ? (
            <DataReviewNotice title="Different VerusID required">
              An earlier step used a different VerusID. Cancel and restart this
              request with the required VerusID.
            </DataReviewNotice>
          ) : !identity.walletReady ? (
            <DataReviewNotice
              title={
                identity.signedIn
                  ? 'Switch wallet to review'
                  : 'Unlock wallet to review'
              }>
              {`Use a ${
                props.request?.isTestnet() ? 'Testnet' : 'Mainnet'
              } wallet to choose the responding VerusID.`}
            </DataReviewNotice>
          ) : identity.lookupStatus === 'loading' ? (
            <DataReviewLoading label="Loading VerusIDs" />
          ) : identity.lookupStatus === 'error' ? (
            <DataReviewNotice title="Unable to load VerusIDs">
              Retry to load the VerusIDs in this wallet.
            </DataReviewNotice>
          ) : identity.requiredSignerUnavailable ? (
            <DataReviewNotice title="Required VerusID unavailable">
              Switch to a wallet with the required VerusID linked. Its full
              address is in request details.
            </DataReviewNotice>
          ) : !selected ? (
            <DataReviewNotice title="No linked VerusIDs">
              Link a VerusID from Identity in your wallet, then reopen this
              request.
            </DataReviewNotice>
          ) : (
            children
          )}
        </View>
      </DeepLinkReviewScrollView>
      <SafeBottomActionStack
        gap={10}
        horizontalSpacing={24}
        style={styles.footer}>
        {selected && (
          <View>
            <Text style={styles.selectedIdentityLabel}>Respond as</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Respond as ${selected.friendlyName}`}
              accessibilityHint="Choose a different VerusID"
              disabled={processing}
              onPress={() => identity.setIdentitySheetVisible(true)}
              style={styles.selectedIdentityCard}>
              <View style={styles.selectedIdentityText}>
                <Text numberOfLines={1} style={styles.selectedIdentityName}>
                  {selected.friendlyName}
                </Text>
              </View>
              <Check color={theme.colors.success} size={22} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}
        {error ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.error}>
            {error}
          </Text>
        ) : null}
        <AppButton
          height={56}
          variant="primary"
          themeMode={theme.mode}
          disabled={actionDisabled}
          onPress={action}>
          {processing ? 'Preparing response' : actionLabel}
        </AppButton>
        <AppButton
          height={56}
          variant="secondary"
          themeMode={theme.mode}
          buttonColor={theme.colors.surfaceMuted}
          textColor={
            theme.isDark ? theme.colors.textPrimary : theme.colors.primary
          }
          disabled={processing}
          onPress={props.cancel}>
          Cancel
        </AppButton>
      </SafeBottomActionStack>
    </SafeAreaView>
  );
}
