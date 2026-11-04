import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import {Gift, Wallet} from 'lucide-react-native';
import BigNumber from 'bignumber.js';
import {SafeAreaView} from 'react-native-safe-area-context';
import AppButton from '../../../components/AppButton';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {SelectionRow} from '../../../components/SelectionSheet';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import StepGlyph from '../../../components/StepGlyph';
import {createSignedOutFlowStyles} from '../../../styles';
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
        const name = currency.currencyId === system.systemId
          ? getAssetPresentation(system.coinObj).ticker
          : currency.display?.name;
        if (name && name !== currency.currencyId && active) {
          setPreview({loading: false, amount: `${BigNumber(currency.amount).toFormat()}\u00a0${name}`});
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
  cancel,
  choice = false,
  onBackup,
  onClaim,
  onCreate,
  requestIsTestnet,
  spendableKeyDetail,
}) {
  const theme = useOnboardingTheme();
  const flow = useMemo(() => createSignedOutFlowStyles(theme), [theme]);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  const preview = useGiftTitle(spendableKeyDetail, requestIsTestnet);
  const [selection, setSelection] = useState('claim');
  const [busy, setBusy] = useState(false);
  const title = spendableKeyDetail
    ? `This card holds ${preview.amount || 'a gift'}`
    : 'Create a wallet';
  const continueFlow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!choice) await onCreate();
      else if (selection === 'claim') await onClaim();
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
              <SelectionRow
                disabled={busy}
                onPress={() => setSelection('claim')}
                selected={selection === 'claim'}
                showChevron={false}
                subtitle="This card stays as it is."
                title="Claim to existing wallet"
              />
              <SelectionRow
                disabled={busy}
                onPress={() => setSelection('backup')}
                selected={selection === 'backup'}
                showChevron={false}
                subtitle="Writes a wallet backup over this card. The gift stays on this phone."
                title="Back up a wallet first"
              />
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
      <SafeBottomActionStack gap={10} horizontalSpacing={choice ? 24 : theme.spacing.screenPadding}>
        <AppButton disabled={busy} onPress={continueFlow} variant="primary">
          {choice ? 'Continue' : 'Create wallet'}
        </AppButton>
        <AppButton disabled={busy} onPress={cancel} variant="secondary">Cancel</AppButton>
      </SafeBottomActionStack>
    </SafeAreaView>
  );
}

const createStyles = theme => StyleSheet.create({
  content: {flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24},
  introContent: {paddingHorizontal: theme.spacing.screenPadding},
  skeleton: {marginBottom: theme.spacing.stepTitleMargin},
  skeletonLine: {marginTop: 8},
});
