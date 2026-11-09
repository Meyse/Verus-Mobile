import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import {Gift, LockOpen, Nfc, Wallet} from 'lucide-react-native';
import BigNumber from 'bignumber.js';
import {SafeAreaView} from 'react-native-safe-area-context';
import AppButton from '../../../components/AppButton';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {SelectionCheckbox} from '../../../components/SelectionSheet';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import StepGlyph from '../../../components/StepGlyph';
import {createSelectionSheetStyles, createSignedOutFlowStyles} from '../../../styles';
import {useOnboardingSmallDeviceLayout} from '../../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {getAssetPresentation} from '../../../utils/assets/assetPresentation';
import {
  discoverSpendableKeyClaims,
  spendableKeyDetailsOrdinalToMnemonic,
  spendableKeyDetailsRequiresPassword,
} from '../../../utils/spendableKey/spendableKey';

// This preview uses only the root chain. The claim screen still performs its
// full discovery after unlock. Do not retain the mnemonic or private scan data.
const useGiftTitle = (detail, requestIsTestnet) => {
  const [preview, setPreview] = useState({loading: !!detail, amount: null});
  useEffect(() => {
    let active = true;
    setPreview({loading: !!detail, amount: null});
    if (!detail) return undefined;
    const discover = async () => {
      try {
        if (spendableKeyDetailsRequiresPassword(detail)) return;
        const mnemonic = spendableKeyDetailsOrdinalToMnemonic({spendableKeyOrdinal: detail});
        const result = await discoverSpendableKeyClaims({
          mnemonic,
          requestIsTestnet,
          activeCoinsForUser: [],
        });
        const currencies = result.systems.flatMap(system => system.currencies);
        const identities = result.systems.flatMap(system => system.identities);
        if (currencies.length !== 1 || identities.length !== 0) return;
        const currency = currencies[0];
        const system = result.systems.find(item => item.currencies.includes(currency));
        const isSystemCurrency = currency.currencyId === system.systemId;
        const name = isSystemCurrency
          ? getAssetPresentation(system.coinObj).ticker
          : currency.display?.name;
        // Discovery takes the claim fee off the system currency. The title
        // states what the card holds, as the claim review does.
        const amount = BigNumber(currency.amount).plus(
          isSystemCurrency ? system.feeAmount || 0 : 0,
        );
        if (name && name !== currency.currencyId && active) {
          setPreview({loading: false, amount: `${amount.toFormat()}\u00a0${name}`});
        }
      } catch {
        // A title must never block setup or expose a network error.
      } finally {
        if (active) setPreview(value => ({...value, loading: false}));
      }
    };
    discover();
    return () => { active = false; };
  }, [detail, requestIsTestnet]);
  return preview;
};

export default function WalletBackupEntry({
  activeAccountMatchesRequest,
  activeWalletName,
  cancel,
  choice = false,
  onBackup,
  onClaim,
  onCreate,
  requestIsTestnet,
  signedIn,
  spendableKeyDetail,
}) {
  const theme = useOnboardingTheme();
  const flow = useMemo(() => createSignedOutFlowStyles(theme), [theme]);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const selectionStyles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  const preview = useGiftTitle(spendableKeyDetail, requestIsTestnet);
  const [backupSelected, setBackupSelected] = useState(false);
  const [busy, setBusy] = useState(false);
  const title = spendableKeyDetail
    ? `This card holds ${preview.amount || 'a gift'}`
    : 'Create a wallet';
  const unlockStep = activeAccountMatchesRequest ? null : {
    icon: LockOpen,
    text: signedIn
      ? `Switch to your ${requestIsTestnet ? 'testnet' : 'mainnet'} wallet`
      : 'Unlock your wallet on this phone',
  };
  const steps = [
    unlockStep,
    backupSelected && {icon: Nfc, text: 'Write the backup. It replaces the gift on the card.'},
    {icon: Wallet, text: unlockStep
      ? 'Claim the gift into that wallet'
      : `Claim the gift into ${activeWalletName}`},
  ].filter(Boolean);
  const continueFlow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!choice) await onCreate();
      else if (!backupSelected) await onClaim();
      else await onBackup();
    } finally {
      setBusy(false);
    }
  };
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={flow.container}>
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.content,
          choice && smallDevice && styles.choiceContentSmallDevice,
          !choice && styles.introContent,
          !choice && flow.scrollContent,
          !choice && smallDevice && flow.scrollContentSmallDevice,
        ]}>
        <View style={!choice && flow.form}>
          {!choice && <StepGlyph icon={spendableKeyDetail ? Gift : Wallet} />}
          {preview.loading ? (
            <SkeletonLoader accessibilityLabel="Reading gift amount" style={styles.skeleton}>
              <SkeletonBlock height={36} width="90%" />
              <SkeletonBlock height={36} width="65%" style={styles.skeletonLine} />
            </SkeletonLoader>
          ) : (
            <Text accessibilityRole="header" style={[flow.title, smallDevice && flow.titleSmallDevice]}>
              {title}
            </Text>
          )}
          {choice ? (
            <>
              <TouchableOpacity
                accessibilityLabel="Also back up my wallet to this card"
                accessibilityRole="checkbox"
                accessibilityState={{checked: backupSelected, disabled: busy}}
                activeOpacity={0.74}
                disabled={busy}
                onPress={() => setBackupSelected(value => !value)}
                style={[
                  selectionStyles.row,
                  styles.backupChoice,
                  backupSelected && selectionStyles.selectedRow,
                ]}>
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={[selectionStyles.leading, busy && selectionStyles.disabledContent]}>
                  <SelectionCheckbox checked={backupSelected} />
                </View>
                <Text style={[
                  selectionStyles.rowTitle,
                  selectionStyles.copy,
                  busy && selectionStyles.disabledContent,
                ]}>
                  Also back up my wallet to this card
                </Text>
              </TouchableOpacity>
              <View style={[styles.steps, smallDevice && styles.stepsSmallDevice]}>
                {steps.map(({icon: Icon, text}, index) => (
                  <View key={text} style={styles.step}>
                    <View
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      style={styles.stepTrack}>
                      <View style={styles.stepCircle}>
                        <Icon color={theme.colors.textPrimary} size={18} strokeWidth={1.8} />
                      </View>
                      {index < steps.length - 1 && <View style={styles.stepConnector} />}
                    </View>
                    <Text style={[styles.stepText, index < steps.length - 1 && styles.stepTextSpacing]}>
                      {text}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={flow.body}>
              {spendableKeyDetail
                ? 'Create a wallet to receive it. The card then holds a backup of that wallet.'
                : 'Create a wallet, then write its backup to an NFC card.'}
            </Text>
          )}
        </View>
      </ScrollView>
      <SafeBottomActionStack
        bottomSpacing={choice && !smallDevice ? 36 : 30}
        gap={10}
        horizontalSpacing={choice ? 24 : theme.spacing.screenPadding}>
        <AppButton disabled={busy} onPress={continueFlow} variant="primary">
          {choice ? backupSelected ? 'Back up and claim' : 'Claim gift' : 'Create wallet'}
        </AppButton>
        <AppButton disabled={busy} onPress={cancel} variant="secondary">Cancel</AppButton>
      </SafeBottomActionStack>
    </SafeAreaView>
  );
}

const createStyles = theme => StyleSheet.create({
  content: {flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24},
  choiceContentSmallDevice: {paddingTop: theme.spacing.stepTopSmallDevice},
  introContent: {paddingHorizontal: theme.spacing.screenPadding},
  backupChoice: {marginVertical: 0},
  steps: {marginTop: 40},
  stepsSmallDevice: {marginTop: 32},
  step: {flexDirection: 'row', gap: 12},
  stepTrack: {width: 32, alignItems: 'center'},
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepConnector: {flex: 1, width: 1.5, marginVertical: 4, backgroundColor: theme.colors.border},
  stepText: {...theme.typography.bodyMd, color: theme.colors.textPrimary, flex: 1, minWidth: 0, paddingTop: 4},
  stepTextSpacing: {paddingBottom: 24},
  skeleton: {marginBottom: theme.spacing.stepTitleMargin},
  skeletonLine: {marginTop: 8},
});
