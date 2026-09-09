/*
  The purpose of this component is to be the first screen a user is
  met with after login. This screen should have all necessary or
  essential wallet components available at the press of one button.
  This includes VerusPay, adding coins, and coin menus. Keeping this
  screen clean is also essential, as users will spend a lot of time with
  it in their faces. It updates the balances and the rates upon loading
  if they are flagged to be updated in the redux store.
*/

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  setActiveCoin,
  setActiveApp,
  setActiveSection,
  expireCoinData,
  setCoinSubWallet,
  expireServiceData,
  saveGeneralSettings,
} from '../../actions/actionCreators';
import { CommonActions, useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  API_GET_FIATPRICE,
  API_GET_BALANCES,
  API_GET_INFO,
  GENERAL,
  WYRE_SERVICE,
  API_GET_SERVICE_ACCOUNT,
  API_GET_SERVICE_PAYMENT_METHODS,
  API_GET_SERVICE_RATES,
  API_GET_SERVICE_NOTIFICATIONS,
  API_SEND,
} from '../../utils/constants/intervalConstants';
import { USD } from '../../utils/constants/currencies';
import {
  conditionallyUpdateService,
  conditionallyUpdateWallet,
  dispatchAddWidget,
} from '../../actions/actionDispatchers';
import BigNumber from 'bignumber.js';
import {
  extractLedgerData,
} from '../../utils/ledger/extractLedgerData';
import { HomeRender, HomeRenderCoinsList, HomeRenderWidget } from './Home.render';
import { extractDisplaySubWallets } from '../../utils/subwallet/extractSubWallets';
import {
  CURRENCY_WIDGET_TYPE,
  TOTAL_UNI_BALANCE_WIDGET_TYPE,
  VERUSID_WIDGET_TYPE,
} from '../../utils/constants/widgets';
import { createAlert } from '../../actions/actions/alert/dispatchers/alert';
import { VERUSID_SERVICE_ID } from '../../utils/constants/services';
import { dragDetectionEnabled } from '../../utils/dragDetection';
import { useSelector, useDispatch } from 'react-redux';
import store from '../../store';
import { useObjectSelector } from '../../hooks/useObjectSelector';
import SignedInWalletHome from './SignedInWalletHome';
import {
  getManagedAssetBalance,
  isAssetShown,
  isTestnetAccount,
  uniqueAssets,
} from '../../utils/assets/assetIdentity';
import {
  CONVERSION_DISABLED,
  ENABLE_SIGNED_IN_REDESIGN,
} from '../../../env/index';
import {
  WALLET_APP_RECEIVE,
  WALLET_APP_SEND,
} from '../../utils/constants/apps';
import {
  isConversionChannel,
  SEND_WIZARD_MODE,
} from '../SendWizard/wizardUtils';

const getAssetStatusDescription = coin => {
  if (coin.mapped_to) return `Mapped · ${coin.display_ticker}`;
  if (coin.testnet) return 'Testnet';
  return coin.display_ticker;
};

const Home = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const activeCoinsForUser = useObjectSelector((state) => state.coins.activeCoinsForUser);

  const activeAccount = useObjectSelector((state) => state.authentication.activeAccount);
  const assetManagement = useObjectSelector(state => state.assetManagement);
  const ledgerBalances = useObjectSelector(state => state.ledger.balances);
  const balances = useObjectSelector((state) =>
    extractLedgerData(state, 'balances', API_GET_BALANCES),
  );
  const rates = useObjectSelector((state) => state.ledger.rates);
  const allSubWallets = useObjectSelector((state) => extractDisplaySubWallets(state));
  const activeSubWallets = useObjectSelector((state) => state.coinMenus.activeSubWallets);
  const widgetOrder = useObjectSelector((state) => state.widgets.order);

  const homeCardDragDetection = useSelector(
    (state) => state.settings.generalWalletSettings.homeCardDragDetection,
  );
  const displayCurrency = useSelector(
    (state) => state.settings.generalWalletSettings.displayCurrency || USD,
  );
  const showBalance = useSelector(state => state.coins.showBalance);

  const [totalFiatBalance, setTotalFiatBalance] = useState(null);
  const [totalCryptoBalances, setTotalCryptoBalances] = useState({});
  const [loading, setLoading] = useState(false);
  const [listItemHeights, setListItemHeights] = useState({});
  const [widgets, setWidgets] = useState([]);
  const [displayCurrencyModalOpen, setDisplayCurrencyModalOpen] = useState(false);
  const [editingCards, setEditingCards] = useState(false);
  const [expandedListItems, setExpandedListItems] = useState({});

  const LIST_ITEM_INITIAL_HEIGHT = 58;
  const LIST_ITEM_MARGIN = 8;
  const LIST_ITEM_ANIMATION_DURATION = 250;

  const isDragDetectionEnabled = () => {
    return dragDetectionEnabled(homeCardDragDetection);
  };

  const handleSetEditingCards = (editing) => {
    setEditingCards(editing);
  };

  const sortWidgets = useCallback(() => {
    setWidgets((prevWidgets) => {
      const sortedWidgets = [...prevWidgets].sort((a, b) => {
        return widgetOrder[a] <= widgetOrder[b] ? -1 : 1;
      });
      return sortedWidgets;
    });
  }, [widgetOrder]);

  const getWidgets = useCallback(async () => {
    setWidgets([]);
    let widgetsList = [...Object.keys(widgetOrder)].sort((a, b) => {
      return widgetOrder[a] <= widgetOrder[b] ? -1 : 1;
    });

    const widgetsToRemove = [];

    // Remove currency widgets for coins that aren't active
    for (let i = 0; i < widgetsList.length; i++) {
      const widgetId = widgetsList[i];
      const widgetSplit = widgetId.split(':');
      const widgetType = widgetSplit[0];

      if (
        widgetType === CURRENCY_WIDGET_TYPE &&
        !activeCoinsForUser.some((x) => x.id === widgetSplit[1])
      ) {
        widgetsToRemove.unshift(i);
      }
    }

    for (const widgetIndex of widgetsToRemove) {
      widgetsList.splice(widgetIndex, 1);
    }

    // Add the balance widget if not present
    if (!widgetsList.includes(TOTAL_UNI_BALANCE_WIDGET_TYPE)) {
      widgetsList.push(TOTAL_UNI_BALANCE_WIDGET_TYPE);
      dispatchAddWidget(TOTAL_UNI_BALANCE_WIDGET_TYPE, activeAccount.accountHash);
    }

    // Add currency widgets for active coins
    for (const coinObj of activeCoinsForUser) {
      const currencyWidgetId = `${CURRENCY_WIDGET_TYPE}:${coinObj.id}`;

      if (!widgetsList.includes(currencyWidgetId)) {
        widgetsList.push(currencyWidgetId);
        dispatchAddWidget(currencyWidgetId, activeAccount.accountHash);
      }
    }

    // Add the VerusID widget if not present
    if (!widgetsList.includes(VERUSID_WIDGET_TYPE)) {
      widgetsList.push(VERUSID_WIDGET_TYPE);
      dispatchAddWidget(VERUSID_WIDGET_TYPE, activeAccount.accountHash);
    }

    setWidgets(widgetsList);
  }, [activeAccount.accountHash, activeCoinsForUser, widgetOrder]);

  const handleWidgetPress = (widgetId) => {
    const widgetSplit = widgetId.split(':');
    const widgetType = widgetSplit[0];

    const widgetOnPress = {
      [CURRENCY_WIDGET_TYPE]: () => {
        const coinId = widgetSplit[1];
        const coinObj = activeCoinsForUser.find((x) => x.id === coinId);

        if (coinObj) {
          const subWallets = allSubWallets[coinId];

          openCoin(
            coinObj,
            activeSubWallets[coinId] ? activeSubWallets[coinId] : subWallets[0],
          );
        }
      },
      [TOTAL_UNI_BALANCE_WIDGET_TYPE]: () => {
        setDisplayCurrencyModalOpen(true);
      },
      [VERUSID_WIDGET_TYPE]: () => {
        navigation.navigate('Service', {
          service: VERUSID_SERVICE_ID,
        });
      },
    };

    if (widgetOnPress[widgetType]) {
      widgetOnPress[widgetType]();
    }
  };

  const setDisplayCurrencyFunc = async (currency) => {
    try {
      dispatch(await saveGeneralSettings({ displayCurrency: currency }));
    } catch (e) {
      createAlert('Error setting display currency', e.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refresh(false);
      return () => {};
    }, []),
  );

  useEffect(() => {
    getWidgets();
  }, [getWidgets]);

  useEffect(() => {
    const totalBalances = getTotalBalances();
    setTotalFiatBalance(totalBalances.fiat);
    setTotalCryptoBalances(totalBalances.crypto);
  }, [balances, ledgerBalances, assetManagement.snapshots, displayCurrency, activeCoinsForUser, allSubWallets, rates]);

  useEffect(() => {
    getWidgets();
  }, [activeCoinsForUser, getWidgets]);

  useEffect(() => {
    sortWidgets();
  }, [widgetOrder, sortWidgets]);

  const refresh = useCallback(
    async (showLoading = true) => {
      setLoading(showLoading);

      const serviceUpdates = [
        API_GET_SERVICE_ACCOUNT,
        API_GET_SERVICE_PAYMENT_METHODS,
        API_GET_SERVICE_RATES,
        API_GET_SERVICE_NOTIFICATIONS,
      ];

      const coinUpdates = [API_GET_FIATPRICE, API_GET_BALANCES, API_GET_INFO];

      const updates = [
        {
          keys: serviceUpdates,
          update: conditionallyUpdateService,
          params: [[dispatch]],
        },
        {
          keys: coinUpdates,
          update: conditionallyUpdateWallet,
          params: activeCoinsForUser.map((coinObj) => {
            return [dispatch, coinObj.id];
          }),
        },
      ];

      for (const update of updates) {
        for (const key of update.keys) {
          try {
            for (const paramList of update.params) {
              await update.update(store.getState(), ...paramList, key);
            }
          } catch (e) {
            console.warn('Error forcing update to ' + key);
            console.warn(e);
          }
        }
      }

      setLoading(false);
    },
    [activeCoinsForUser, dispatch],
  );

  const resetToScreen = (route, title, data) => {
    if (ENABLE_SIGNED_IN_REDESIGN) {
      if (route === 'CoinMenus') {
        navigation.navigate(route, {title, data});
        return;
      }

      const mainNavigation = navigation.getParent()?.getParent();
      (mainNavigation || navigation).navigate(route, {title, data});
      return;
    }

    const resetAction = CommonActions.reset({
      index: 1,
      routes: [
        { name: 'Home' },
        { name: route, params: { title: title, data: data } },
      ],
    });

    if (navigation.closeDrawer) navigation.closeDrawer();
    navigation.dispatch(resetAction);
  };

  const forceUpdate = () => {
    activeCoinsForUser.forEach((coinObj) => {
      dispatch(expireCoinData(coinObj.id, API_GET_FIATPRICE));
      dispatch(expireCoinData(coinObj.id, API_GET_BALANCES));
      dispatch(expireCoinData(coinObj.id, API_GET_INFO));
    });

    dispatch(expireServiceData(API_GET_SERVICE_ACCOUNT));
    dispatch(expireServiceData(API_GET_SERVICE_PAYMENT_METHODS));
    dispatch(expireServiceData(API_GET_SERVICE_RATES));
    dispatch(expireServiceData(API_GET_SERVICE_NOTIFICATIONS));

    refresh();
  };

  const getTotalBalances = () => {
    let _totalFiatBalance = BigNumber(0);
    let fiatComplete = true;
    let coinBalances = {};

    uniqueAssets(activeCoinsForUser).filter(coin =>
      Boolean(coin.testnet) === isTestnetAccount(activeAccount)).forEach((coinObj) => {
      const key = coinObj.id;
      const balance = getManagedAssetBalance(coinObj, allSubWallets[key], ledgerBalances, assetManagement.snapshots);
      coinBalances[key] = balance.total;

      const rate = getRate(key, displayCurrency);

      if (rate != null) {
        const price = BigNumber(rate);
        if (!balance.complete) fiatComplete = false;
        if (balance.total != null) _totalFiatBalance = _totalFiatBalance.plus(balance.total.multipliedBy(price));
      }
    });

    return {
      fiat: fiatComplete ? _totalFiatBalance.toNumber() : null,
      crypto: coinBalances,
    };
  };

  const getRate = (coinId, currency) => {
    return rates[WYRE_SERVICE] &&
      rates[WYRE_SERVICE][coinId] &&
      rates[WYRE_SERVICE][coinId][currency]
      ? rates[WYRE_SERVICE][coinId][currency]
      : rates[GENERAL] &&
        rates[GENERAL][coinId] &&
        rates[GENERAL][coinId][currency]
      ? rates[GENERAL][coinId][currency]
      : null;
  };

  const _verusPay = () => {
    navigation.navigate('VerusPay');
  };

  const openCoin = (coinObj, subWallet) => {
    if (subWallet != null) {
      dispatch(setCoinSubWallet(coinObj.id, subWallet));
    }
    dispatch(setActiveCoin(coinObj));
    dispatch(setActiveApp(coinObj.default_app));
    dispatch(setActiveSection(coinObj.apps[coinObj.default_app].data[0]));

    resetToScreen('CoinMenus', 'Overview');
  };

  const findSection = (coinObj, sectionKey) => {
    for (const [appKey, app] of Object.entries(coinObj.apps || {})) {
      const section = (app.data || []).find(item => item.key === sectionKey);

      if (section) return {appKey, section};
    }

    return null;
  };

  const actionSources = useCallback(
    action => {
      const sectionKey =
        action === 'wallet-receive' ? WALLET_APP_RECEIVE : WALLET_APP_SEND;

      return activeCoinsForUser.flatMap(coinObj => {
        return (allSubWallets[coinObj.id] || [])
          .map(card => {
            const channel = card.api_channels?.[API_SEND];
            const hasBalance = BigNumber(
              balances?.[coinObj.id]?.[card.id]?.total || 0,
            ).isGreaterThan(0);
            const compatible = card.compatible_apps.includes(sectionKey);
            const actionAvailable =
              action === 'wallet-receive'
                ? compatible
                : compatible &&
                  Boolean(channel) &&
                  hasBalance &&
                  (action !== 'wallet-convert' ||
                    (!CONVERSION_DISABLED && isConversionChannel(channel)));
            const section = actionAvailable
              ? findSection(coinObj, sectionKey)
              : null;

            if (!section) return null;

            return {
              key: `${coinObj.id}:${card.id}`,
              title: `${coinObj.display_name} · ${card.name}`,
              description: card.network
                ? `${coinObj.display_ticker} on ${card.network}`
                : coinObj.display_ticker,
              coinObj,
              card,
              ...section,
            };
          })
          .filter(Boolean);
      });
    },
    [activeCoinsForUser, allSubWallets, balances],
  );

  const openActionSource = (source) => {
    dispatch(setCoinSubWallet(source.coinObj.id, source.card));
    dispatch(setActiveCoin(source.coinObj));
    dispatch(setActiveApp(source.appKey));
    dispatch(setActiveSection(source.section));
    resetToScreen('CoinMenus', source.section.name);
  };

  const signedInAssets = useMemo(() => {
    if (!assetManagement.ready) return [];
    return uniqueAssets(activeCoinsForUser)
      .filter(coin => Boolean(coin.testnet) === isTestnetAccount(activeAccount) &&
        isAssetShown(coin, assetManagement.preferences))
      .map(coin => {
        const cards = allSubWallets[coin.id] || [];
        const holding = getManagedAssetBalance(coin, cards, ledgerBalances, assetManagement.snapshots);
        const balance = holding.total;
        const rate = getRate(coin.id, displayCurrency);
        const fiatValue = rate == null || balance == null || !holding.complete ? null : balance.multipliedBy(rate).toNumber();
        const preferredCard =
          activeSubWallets[coin.id] || cards.find(card => {
            const cardBalance = balances[coin.id]?.[card.id]?.total;
            return cardBalance != null && BigNumber(cardBalance).isGreaterThan(0);
          }) || cards[0];
        const statusDescription = getAssetStatusDescription(coin);

        return {
          coin,
          balance,
          balanceComplete: holding.complete,
          rate,
          fiatValue,
          cardCount: cards.length,
          preferredCard,
          statusDescription,
        };
      })
      .sort((a, b) => {
        const fundedOrder = Number(b.balance?.isGreaterThan(0) || false) - Number(a.balance?.isGreaterThan(0) || false);
        if (fundedOrder !== 0) return fundedOrder;
        if (a.fiatValue != null && b.fiatValue != null && a.fiatValue !== b.fiatValue) {
          return b.fiatValue - a.fiatValue;
        }
        if (a.fiatValue != null && b.fiatValue == null) return -1;
        if (a.fiatValue == null && b.fiatValue != null) return 1;
        return a.coin.display_name.localeCompare(b.coin.display_name);
      });
  }, [
    activeCoinsForUser,
    activeSubWallets,
    allSubWallets,
    balances,
    displayCurrency,
    rates,
    totalCryptoBalances,
    activeAccount,
    assetManagement,
    ledgerBalances,
  ]);

  const _addCoin = () => {
    navigation.navigate('AddCoin', { refresh: refresh });
  };

  const _addAssetByIdentifier = () => {
    const mainNavigation = navigation.getParent()?.getParent();
    (mainNavigation || navigation).navigate('AddAssetByIdentifier');
  };

  if (ENABLE_SIGNED_IN_REDESIGN) {
    const mainNavigation = navigation.getParent()?.getParent();
    const receiveAvailable = actionSources('wallet-receive').length > 0;
    const sendAvailable = actionSources('wallet-send').length > 0;
    const convertAvailable = actionSources('wallet-convert').length > 0;

    return (
      <SignedInWalletHome
        assets={signedInAssets}
        assetsReady={assetManagement.ready}
        assetsLoadError={assetManagement.loadError}
        displayCurrency={displayCurrency}
        loading={loading}
        showBalance={showBalance}
        totalFiatBalance={totalFiatBalance}
        onToggleBalance={() => dispatch({type: 'SET_BALANCE_SHOW'})}
        onSelectDisplayCurrency={setDisplayCurrencyFunc}
        onRefresh={forceUpdate}
        onOpenAsset={openCoin}
        convertAvailable={convertAvailable}
        receiveAvailable={receiveAvailable}
        sendAvailable={sendAvailable}
        onReceive={() => (mainNavigation || navigation).navigate('ReceiveAssetsList')}
        onSend={() =>
          (mainNavigation || navigation).navigate('SendWizard', {
            mode: SEND_WIZARD_MODE.SEND,
          })
        }
        onConvert={() =>
          (mainNavigation || navigation).navigate('SendWizard', {
            mode: SEND_WIZARD_MODE.CONVERT,
          })
        }
        onManageAssets={() =>
          (mainNavigation || navigation).navigate('ManageAssets')
        }
      />
    );
  }

  return (
    <HomeRender
      dragDetectionEnabled={isDragDetectionEnabled}
      displayCurrencyModalOpen={displayCurrencyModalOpen}
      displayCurrency={displayCurrency}
      setDisplayCurrency={setDisplayCurrencyFunc}
      setDisplayCurrencyModalOpen={setDisplayCurrencyModalOpen}
      editingCards={editingCards}
      setEditingCards={handleSetEditingCards}
      _addCoin={_addCoin}
      _verusPay={_verusPay}
      _addAssetByIdentifier={_addAssetByIdentifier}
      forceUpdate={forceUpdate}
      loading={loading}
      HomeRenderCoinsList={() =>
        HomeRenderCoinsList({
          widgets,
          dragDetectionEnabled: isDragDetectionEnabled,
          editingCards,
          loading,
          forceUpdate,
          handleWidgetPress,
          dispatch,
          navigation,
          activeAccount,
          totalCryptoBalances,
          totalFiatBalance,
          HomeRenderWidget: (widgetId) =>
            HomeRenderWidget({
              widgetId,
              totalCryptoBalances,
              totalFiatBalance,
            }),
        })
      }
    />
  );
};

export default Home;
