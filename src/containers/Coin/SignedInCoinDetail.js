import React, {useCallback, useLayoutEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch, useSelector} from 'react-redux';
import {Layers} from 'lucide-react-native';
import BigNumber from 'bignumber.js';
import {CONVERSION_DISABLED} from '../../../env/index';
import {setCoinSubWallet} from '../../actions/actionCreators';
import MissingInfoRedirect from '../../components/MissingInfoRedirect/MissingInfoRedirect';
import SignedInActionBar, {
  SignedInEdgeFade,
} from '../../components/SignedInActionBar';
import {fontStyle} from '../../globals/fonts';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import {
  WALLET_APP_OVERVIEW,
  WALLET_APP_RECEIVE,
  WALLET_APP_SEND,
} from '../../utils/constants/apps';
import {
  API_GET_BALANCES,
  API_SEND,
} from '../../utils/constants/intervalConstants';
import {extractLedgerData} from '../../utils/ledger/extractLedgerData';
import {subWalletActivity} from '../../utils/subwallet/subWalletStatus';
import {
  isConversionChannel,
  SEND_WIZARD_MODE,
} from '../SendWizard/wizardUtils';
import CoinCardPickerSheet from './CoinCardPickerSheet';
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
  const selectedBalance = useObjectSelector(state =>
    selectedSubWallet == null
      ? '0'
      : extractLedgerData(state, 'balances', API_GET_BALANCES)?.[
          activeCoin.id
        ]?.[selectedSubWallet.id]?.total || '0',
  );
  const services = useSelector(state => state.services);
  const cardPickerTriggerRef = useRef(null);
  const restorePickerFocusRef = useRef(false);
  const [cardPickerVisible, setCardPickerVisible] = useState(false);
  const [transactionFades, setTransactionFades] = useState({
    showBottomFade: false,
    showTopFade: false,
    subWalletId: null,
  });
  const compatibleApps = selectedSubWallet?.compatible_apps || [];
  const hasOverview = compatibleApps.includes(WALLET_APP_OVERVIEW);
  const canReceive = compatibleApps.includes(WALLET_APP_RECEIVE);
  const sendChannel = selectedSubWallet?.api_channels?.[API_SEND];
  const canSend =
    compatibleApps.includes(WALLET_APP_SEND) &&
    Boolean(sendChannel) &&
    BigNumber(selectedBalance).isGreaterThan(0);
  const canConvert =
    canSend &&
    !CONVERSION_DISABLED &&
    isConversionChannel(sendChannel);

  const mainNavigation = navigation.getParent()?.getParent() || navigation;
  const sourceParams = {
    initialCoinId: activeCoin.id,
    initialSubWalletId: selectedSubWallet?.id,
  };
  const receiveParams = {
    coinId: activeCoin.id,
    subWalletId: selectedSubWallet?.id,
  };

  const openCardPicker = useCallback(() => {
    restorePickerFocusRef.current = true;
    setCardPickerVisible(true);
  }, []);

  const closeCardPicker = useCallback(() => {
    if (selectedSubWallet == null) {
      navigation.goBack();
      return;
    }

    setCardPickerVisible(false);
  }, [navigation, selectedSubWallet]);

  const selectCard = useCallback(
    subWallet => {
      if (subWallet.id !== selectedSubWallet?.id) {
        dispatch(setCoinSubWallet(activeCoin.id, subWallet));
      }

      setCardPickerVisible(false);
    },
    [activeCoin.id, dispatch, selectedSubWallet?.id],
  );

  const handleCardPickerClosed = useCallback(() => {
    if (!restorePickerFocusRef.current) return;

    restorePickerFocusRef.current = false;
    const triggerHandle = findNodeHandle(cardPickerTriggerRef.current);

    if (triggerHandle != null) {
      AccessibilityInfo.setAccessibilityFocus(triggerHandle);
    }
  }, []);

  const handleTransactionBoundariesChange = useCallback(nextFades => {
    setTransactionFades(currentFades => {
      const nextState = {
        ...nextFades,
        subWalletId: selectedSubWallet?.id || null,
      };

      return currentFades.showBottomFade === nextState.showBottomFade &&
        currentFades.showTopFade === nextState.showTopFade &&
        currentFades.subWalletId === nextState.subWalletId
        ? currentFades
        : nextState;
    });
  }, [selectedSubWallet?.id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackTitleVisible: false,
      headerTitleAlign: 'center',
      headerTitleStyle: {
        color: theme.colors.textPrimary,
        fontSize: 18,
        ...fontStyle('bold'),
      },
      title: activeCoin.display_name,
      headerLeft: ({onPress}) => (
        <View style={styles.headerLeft}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            accessibilityRole="button"
            activeOpacity={0.74}
            onPress={onPress || navigation.goBack}
            style={styles.headerBackButton}>
            <MaterialCommunityIcons
              color={theme.colors.textPrimary}
              name="arrow-left"
              size={24}
            />
          </TouchableOpacity>
        </View>
      ),
      headerRight:
        allSubWallets.length > 1
          ? () => (
              <View style={styles.headerRight}>
                <TouchableOpacity
                  ref={cardPickerTriggerRef}
                  accessibilityLabel={`Select card. ${allSubWallets.length} cards.`}
                  accessibilityRole="button"
                  activeOpacity={0.7}
                  onPress={openCardPicker}
                  style={styles.headerRightButton}>
                  <Layers
                    color={theme.colors.textSecondary}
                    size={20}
                    strokeWidth={2}
                  />
                  <View
                    style={[
                      styles.cardCountBadge,
                      {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.background,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.cardCountText,
                        {color: theme.colors.onPrimary},
                      ]}>
                      {allSubWallets.length}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )
          : undefined,
    });
  }, [
    activeCoin.display_name,
    allSubWallets.length,
    navigation,
    openCardPicker,
    theme.colors,
  ]);

  let overviewActive = false;
  let fadesMatchSelectedSubWallet = false;
  let overviewContent = null;

  if (selectedSubWallet != null) {
    const {placeholder, active} = subWalletActivity(selectedSubWallet.id);
    overviewActive = hasOverview && active(services);
    fadesMatchSelectedSubWallet =
      transactionFades.subWalletId === selectedSubWallet.id;
    overviewContent = !hasOverview ? (
      <MissingInfoRedirect
        icon="power-plug-off"
        label={`Transactions are not available from the ${selectedSubWallet.name} Card.`}
      />
    ) : overviewActive ? (
      <Overview
        navigation={navigation}
        data={route?.params?.data || null}
        onScrollBoundaryChange={handleTransactionBoundariesChange}
      />
    ) : (
      <MissingInfoRedirect icon={placeholder.icon} label={placeholder.label} />
    );
  }

  return (
    <View style={[styles.screen, {backgroundColor: theme.colors.background}]}>
      {selectedSubWallet != null ? (
        <>
          <SignedInAssetHeader />
          <View style={styles.transactions}>
            {overviewContent}
            <SignedInEdgeFade
              edge="top"
              height={32}
              style={styles.topFade}
              visible={
                overviewActive &&
                fadesMatchSelectedSubWallet &&
                transactionFades.showTopFade
              }
            />
          </View>
          <SignedInActionBar
            convertDisabled={!canConvert}
            receiveDisabled={!canReceive}
            sendDisabled={!canSend}
            showFade={
              overviewActive &&
              fadesMatchSelectedSubWallet &&
              transactionFades.showBottomFade
            }
            onReceive={() =>
              mainNavigation.navigate('ReceiveAssetDetails', receiveParams)
            }
            onSend={() =>
              mainNavigation.navigate('SendWizard', {
                ...sourceParams,
                mode: SEND_WIZARD_MODE.SEND,
              })
            }
            onConvert={() =>
              mainNavigation.navigate('SendWizard', {
                ...sourceParams,
                mode: SEND_WIZARD_MODE.CONVERT,
              })
            }
          />
        </>
      ) : null}
      <CoinCardPickerSheet
        coin={activeCoin}
        onClose={closeCardPicker}
        onClosed={handleCardPickerClosed}
        onSelect={selectCard}
        selectedSubWalletId={selectedSubWallet?.id || null}
        subWallets={allSubWallets}
        visible={selectedSubWallet == null || cardPickerVisible}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1},
  transactions: {flex: 1},
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  headerLeft: {paddingLeft: 16},
  headerBackButton: {
    width: 44,
    height: 44,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {paddingRight: 16},
  headerRightButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCountBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    position: 'absolute',
    top: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 9,
  },
  cardCountText: {
    fontSize: 9,
    lineHeight: 12,
    ...fontStyle('bold'),
  },
});

export default SignedInCoinDetail;
