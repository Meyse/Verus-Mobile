/*
  This component's purpose is to present the user with the option
  to log into their accounts, and will only be shown if at least on account
  exists on the mobile device. It uses the user-entered username and password
  to find and decrypt the wallet seed in asyncStorage. When mounted, it clears
  any detecting app update heartbeats located from before, and upon successfull
  login, creates a new update heartbeat interval.
*/

import React, {useEffect, useMemo, useState} from 'react';
import {
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {fontStyle} from '../../globals/fonts';
import {VerusLogo} from '../../images/customIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import SafeBottomActionStack from '../../components/SafeBottomActionStack';
import WelcomeBackgroundVideo from '../../components/WelcomeBackgroundVideo';
import WalletAvatar from '../../components/WalletAvatar';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import ChooseWalletSheet from './components/ChooseWalletSheet';
import OtherOptionsSheet from './components/OtherOptionsSheet';
import SignedOutNetworkSelector from '../../components/SignedOutNetworkSelector';
import {
  formatLastOpenedLabel,
  normalizeLastOpenedAccountTimestamps,
  sortAccountsByLoginPriority,
} from '../../utils/account/accountActivity';
import {
  filterAccountsForNetwork,
  getDefaultAccountForNetwork,
  getWalletNetworkKey,
  getWalletNetworkLabel,
} from '../../utils/account/accountNetwork';
import UnlockWalletSheet from './components/UnlockWalletSheet';
import {normalizeWalletAvatar} from '../../utils/walletAvatar';
import OnboardingStartSheet from '../Onboard/Welcome/OnboardingStartSheet';
import {normalizeSetupSelection} from '../Onboard/onboardingSetupFlow';
import {useOnboardingTheme} from '../../theme/onboarding';

const LOGO_ASPECT_RATIO = 2084 / 7305;
const LOGO_TOP_MARGIN = 22;
const WALLET_PREVIEW_LIMIT = 3;
const WALLET_CARD_MIN_HEIGHT = 74;
const WALLET_CARD_SPACING = 10;

const Login = props => {
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const generalWalletSettings = useObjectSelector(
    state => state.settings.generalWalletSettings,
  );
  const [addWalletVisible, setAddWalletVisible] = useState(false);
  const [chooseWalletVisible, setChooseWalletVisible] = useState(false);
  const [otherOptionsVisible, setOtherOptionsVisible] = useState(false);
  const [unlockAccount, setUnlockAccount] = useState(null);
  const [pendingUnlockAccount, setPendingUnlockAccount] = useState(null);
  const logoVariant = theme.isDark ? 'monochrome' : 'default';

  const selectedNetworkKey = getWalletNetworkKey(props.testProfile === true);
  const selectedNetworkLabel = getWalletNetworkLabel(selectedNetworkKey);
  const networkAccounts = useMemo(
    () => filterAccountsForNetwork(accounts, selectedNetworkKey),
    [accounts, selectedNetworkKey],
  );
  const lastOpenedAccountTimestamps = useMemo(
    () =>
      normalizeLastOpenedAccountTimestamps(
        generalWalletSettings.lastOpenedAccountTimestamps,
      ),
    [generalWalletSettings.lastOpenedAccountTimestamps],
  );
  const defaultAccountForNetwork = useMemo(
    () =>
      getDefaultAccountForNetwork(
        accounts,
        generalWalletSettings,
        selectedNetworkKey,
      ),
    [accounts, generalWalletSettings, selectedNetworkKey],
  );
  const defaultAccountHash = defaultAccountForNetwork
    ? defaultAccountForNetwork.accountHash
    : null;
  const sortedDisplayNetworkAccounts = useMemo(
    () =>
      sortAccountsByLoginPriority(
        networkAccounts,
        defaultAccountHash,
        lastOpenedAccountTimestamps,
      ),
    [networkAccounts, defaultAccountHash, lastOpenedAccountTimestamps],
  );

  useEffect(() => {
    setAddWalletVisible(false);
    setChooseWalletVisible(false);
    setOtherOptionsVisible(false);
    setUnlockAccount(null);
    setPendingUnlockAccount(null);
  }, [selectedNetworkKey]);

  const handleSetupSelection = selection =>
    props.navigation.navigate(
      'CreateProfile',
      normalizeSetupSelection(selection),
    );

  const handleRevokeRecover = () => {
    props.navigation.navigate('RevokeRecover');
  };

  const handleRecoverSeed = () => {
    props.navigation.navigate('RecoverSeeds');
  };

  const handleProvisioningRequests = () => {
    props.navigation.navigate('ProvisioningDeeplinks');
  };

  const handleChooseWalletAccount = account => {
    setChooseWalletVisible(false);
    setPendingUnlockAccount(account);
  };

  const handleChooseWalletClosed = () => {
    if (pendingUnlockAccount != null) {
      setUnlockAccount(pendingUnlockAccount);
      setPendingUnlockAccount(null);
    }
  };

  const logoWidth = width * 0.3;

  const renderWalletContent = () => {
    if (sortedDisplayNetworkAccounts.length > 1) {
      return (
        <LoginWalletList
          accounts={sortedDisplayNetworkAccounts}
          defaultAccountHash={defaultAccountHash}
          lastOpenedAccountTimestamps={lastOpenedAccountTimestamps}
          onSelectAccount={setUnlockAccount}
          onOpenAllWallets={() => setChooseWalletVisible(true)}
          styles={styles}
          theme={theme}
        />
      );
    }

    if (sortedDisplayNetworkAccounts.length === 1) {
      const isDefault =
        sortedDisplayNetworkAccounts[0].accountHash === defaultAccountHash;

      return (
        <LoginWalletCard
          account={sortedDisplayNetworkAccounts[0]}
          isDefault={isDefault}
          lastOpenedAt={
            lastOpenedAccountTimestamps[
              sortedDisplayNetworkAccounts[0].accountHash
            ]
          }
          onPress={() => setUnlockAccount(sortedDisplayNetworkAccounts[0])}
          styles={styles}
          theme={theme}
        />
      );
    }

    return (
      <View style={styles.summaryBlock}>
        <View style={styles.summaryIcon}>
          <MaterialCommunityIcons
            name="wallet-plus-outline"
            size={30}
            color={theme.colors.primary}
          />
        </View>
        <Text style={styles.summaryTitle}>
          {`No ${selectedNetworkLabel} wallets yet`}
        </Text>
        <Text style={styles.summaryText}>
          {'Create a wallet for this network to continue.'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <WelcomeBackgroundVideo />
      <SignedOutNetworkSelector
        testProfile={props.testProfile}
        setTestProfile={props.setTestProfile}
      />
      <View
        style={[
          styles.logoContainer,
          {
            paddingTop: insets.top + LOGO_TOP_MARGIN,
          },
        ]}>
        <VerusLogo
          width={logoWidth}
          height={logoWidth * LOGO_ASPECT_RATIO}
          variant={logoVariant}
        />
      </View>
      <View style={styles.content}>{renderWalletContent()}</View>
      <SafeBottomActionStack gap={10}>
        <AppButton
          onPress={() => setAddWalletVisible(true)}
          variant={theme.isDark ? 'tonal' : 'secondary'}
          height={56}
          buttonColor={theme.isDark ? undefined : 'rgba(255, 255, 255, 0.72)'}>
          {'Add a new wallet'}
        </AppButton>
        <AppButton
          onPress={() => setOtherOptionsVisible(true)}
          variant="text"
          height={52}
          textColor={
            theme.isDark ? theme.colors.textPrimary : theme.colors.onPrimary
          }>
          {'Other options'}
        </AppButton>
      </SafeBottomActionStack>
      <OnboardingStartSheet
        visible={addWalletVisible}
        onClose={() => setAddWalletVisible(false)}
        onSelectSetup={handleSetupSelection}
      />
      <OtherOptionsSheet
        visible={otherOptionsVisible}
        onClose={() => setOtherOptionsVisible(false)}
        onRecoverProfileSeed={handleRecoverSeed}
        onRevokeRecoverVerusId={handleRevokeRecover}
        onProvisioningRequests={handleProvisioningRequests}
      />
      <ChooseWalletSheet
        visible={chooseWalletVisible}
        onClose={() => setChooseWalletVisible(false)}
        onClosed={handleChooseWalletClosed}
        accounts={sortedDisplayNetworkAccounts}
        defaultAccountHash={defaultAccountHash}
        lastOpenedAccountTimestamps={lastOpenedAccountTimestamps}
        networkLabel={selectedNetworkLabel}
        onSelectAccount={handleChooseWalletAccount}
      />
      <UnlockWalletSheet
        visible={unlockAccount != null}
        account={unlockAccount}
        isDefaultAccount={
          unlockAccount != null &&
          unlockAccount.accountHash === defaultAccountHash
        }
        onClose={() => setUnlockAccount(null)}
      />
    </View>
  );
};

const LoginWalletList = ({
  accounts,
  defaultAccountHash,
  lastOpenedAccountTimestamps,
  onSelectAccount,
  onOpenAllWallets,
  styles,
  theme,
}) => {
  const previewAccounts = accounts.slice(0, WALLET_PREVIEW_LIMIT);
  const hiddenWalletCount = Math.max(
    0,
    accounts.length - previewAccounts.length,
  );

  return (
    <View style={styles.walletPreviewList}>
      {previewAccounts.map((account, index) => {
        const isDefault = account.accountHash === defaultAccountHash;
        const isLastPreviewCard =
          hiddenWalletCount === 0 && index === previewAccounts.length - 1;

        return (
          <LoginWalletCard
            key={account.accountHash || account.id}
            account={account}
            isDefault={isDefault}
            lastOpenedAt={lastOpenedAccountTimestamps[account.accountHash]}
            onPress={() => onSelectAccount(account)}
            style={isLastPreviewCard && styles.walletCardLast}
            styles={styles}
            theme={theme}
          />
        );
      })}
      {hiddenWalletCount > 0 && (
        <ViewAllWalletsButton
          walletCount={accounts.length}
          onPress={onOpenAllWallets}
          styles={styles}
        />
      )}
    </View>
  );
};

const ViewAllWalletsButton = ({walletCount, onPress, styles}) => (
  <TouchableOpacity
    accessibilityRole="button"
    activeOpacity={0.78}
    onPress={onPress}
    style={styles.viewAllWalletsButton}>
    <Text numberOfLines={1} style={styles.viewAllWalletsText}>
      {`View all ${walletCount === 1 ? 'wallet' : 'wallets'} (${walletCount})`}
    </Text>
  </TouchableOpacity>
);

const LoginWalletCard = ({
  account,
  isDefault,
  lastOpenedAt,
  onPress,
  style,
  styles,
  theme,
}) => {
  const walletAvatar = normalizeWalletAvatar(account.walletAvatar);
  const lastOpenedLabel = formatLastOpenedLabel(lastOpenedAt);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.78}
      onPress={onPress}
      style={[styles.walletCard, style]}>
      <View style={styles.walletCardIcon}>
        {walletAvatar ? (
          <WalletAvatar
            walletAvatar={walletAvatar}
            size={36}
            emojiSize={19}
          />
        ) : (
          <MaterialCommunityIcons
            name="wallet-outline"
            size={26}
            color={theme.colors.textSubtle}
          />
        )}
      </View>
      <View style={styles.walletCardText}>
        <Text numberOfLines={1} style={styles.walletCardName}>
          {account.id}
        </Text>
        <Text numberOfLines={1} style={styles.walletCardMeta}>
          {lastOpenedLabel}
        </Text>
      </View>
      <MaterialCommunityIcons
        name={isDefault ? 'star' : 'chevron-right'}
        size={isDefault ? 22 : 24}
        color={isDefault ? theme.colors.star : theme.colors.textSubtle}
      />
    </TouchableOpacity>
  );
};

const createStyles = theme => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundVideo,
  },
  logoContainer: {
    paddingHorizontal: 32,
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    minHeight: 0,
  },
  walletPreviewList: {
    width: '100%',
  },
  walletCard: {
    minHeight: WALLET_CARD_MIN_HEIGHT,
    borderRadius: 18,
    backgroundColor: theme.colors.walletCard,
    borderWidth: theme.isDark ? StyleSheet.hairlineWidth : 0,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: WALLET_CARD_SPACING,
  },
  walletCardLast: {
    marginBottom: 0,
  },
  walletCardIcon: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  walletCardText: {
    flex: 1,
    paddingRight: 10,
  },
  walletCardName: {
    color: theme.colors.textPrimary,
    fontSize: 19,
    ...fontStyle('semiBold'),
  },
  walletCardMeta: {
    marginTop: 3,
    color: theme.colors.textSubtle,
    fontSize: 12,
    ...fontStyle('regular'),
  },
  viewAllWalletsButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  viewAllWalletsText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    ...fontStyle('semiBold'),
  },
  summaryBlock: {
    alignItems: 'center',
  },
  summaryIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.isDark
      ? theme.colors.surfaceMuted
      : 'rgba(255, 255, 255, 0.72)',
    marginBottom: 16,
  },
  summaryTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    textAlign: 'center',
    ...fontStyle('semiBold'),
  },
  summaryText: {
    marginTop: 8,
    maxWidth: 260,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    ...fontStyle('regular'),
  },
});

export default Login;
