import React, {useLayoutEffect} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch, useSelector} from 'react-redux';
import {setCoinSubWallet} from '../../actions/actionCreators';
import MissingInfoRedirect from '../../components/MissingInfoRedirect/MissingInfoRedirect';
import SignedInActionBar from '../../components/SignedInActionBar';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import {WALLET_APP_OVERVIEW, WALLET_APP_RECEIVE, WALLET_APP_SEND, WALLET_APP_CONVERT} from '../../utils/constants/apps';
import {subWalletActivity} from '../../utils/subwallet/subWalletStatus';
import SubWalletSelectorModal from '../SubWalletSelect/SubWalletSelectorModal';
import Overview from './Overview/Overview';
import SignedInAssetHeader from './SignedInAssetHeader';

const SignedInCoinDetail = ({navigation, route}) => {
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const activeCoin = useObjectSelector(state => state.coins.activeCoin);
  const selectedSubWallet = useObjectSelector(
    state => state.coinMenus.activeSubWallets[activeCoin.id],
  );
  const allSubWallets = useObjectSelector(
    state => state.coinMenus.allSubWallets[activeCoin.id] || [],
  );
  const services = useSelector(state => state.services);
  const compatibleApps = selectedSubWallet?.compatible_apps || [];
  const hasOverview = compatibleApps.includes(WALLET_APP_OVERVIEW);
  const canReceive = compatibleApps.includes(WALLET_APP_RECEIVE);
  const canTransfer =
    compatibleApps.includes(WALLET_APP_SEND) ||
    compatibleApps.includes(WALLET_APP_CONVERT);

  const mainNavigation = navigation.getParent()?.getParent() || navigation;
  const entryParams = {
    initialCoinId: activeCoin.id,
    initialSubWalletId: selectedSubWallet?.id,
  };
  const receiveParams = {
    coinId: activeCoin.id,
    subWalletId: selectedSubWallet?.id,
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight:
        allSubWallets.length > 1
          ? () => (
              <View style={styles.headerRight}>
                <TouchableOpacity
                  accessibilityLabel="Select Card"
                  accessibilityRole="button"
                  activeOpacity={0.7}
                  onPress={() => dispatch(setCoinSubWallet(activeCoin.id, null))}
                  style={styles.headerRightButton}>
                  <MaterialCommunityIcons
                    color={theme.colors.textSecondary}
                    name="tune-vertical"
                    size={24}
                  />
                </TouchableOpacity>
              </View>
            )
          : undefined,
    });
  }, [activeCoin.id, allSubWallets.length, dispatch, navigation, theme.colors.textSecondary]);

  if (!selectedSubWallet) {
    return (
      <View style={[styles.screen, {backgroundColor: theme.colors.background}]}>
        <SubWalletSelectorModal
          visible
          cancel={() => navigation.goBack()}
          animationType="slide"
          subWallets={allSubWallets}
          chainTicker={activeCoin.id}
          displayTicker={activeCoin.display_ticker}
        />
      </View>
    );
  }

  const {placeholder, active} = subWalletActivity(selectedSubWallet.id);
  const overviewContent = !hasOverview ? (
    <MissingInfoRedirect
      icon="power-plug-off"
      label={`Transactions are not available from the ${selectedSubWallet.name} Card.`}
    />
  ) : active(services) ? (
    <Overview navigation={navigation} data={route?.params?.data || null} />
  ) : (
    <MissingInfoRedirect icon={placeholder.icon} label={placeholder.label} />
  );

  return (
    <View style={[styles.screen, {backgroundColor: theme.colors.background}]}>
      <SignedInAssetHeader />
      <View style={styles.transactions}>{overviewContent}</View>
      <SignedInActionBar
        sendOrConvertLabel="Send / convert"
        receiveDisabled={!canReceive}
        sendOrConvertDisabled={!canTransfer}
        onReceive={() =>
          mainNavigation.navigate('ReceiveAssetDetails', receiveParams)
        }
        onSendOrConvert={() => mainNavigation.navigate('SendWizard', entryParams)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1},
  transactions: {flex: 1},
  headerRight: {flexDirection: 'row', alignItems: 'center', paddingRight: 8},
  headerRightButton: {paddingHorizontal: 10, paddingVertical: 8},
});

export default SignedInCoinDetail;
