/*
  This component's purpose is to display a list of transactions for the 
  activeCoin, as set by the store. If transactions or balances are flagged
  as needing an update, it updates them upon mounting.
*/

import React, { Component } from "react";
import {
  AccessibilityInfo,
  View,
  FlatList,
  Platform,
  StyleSheet,
  Text as NativeText,
  TouchableOpacity
} from "react-native";
import { connect } from 'react-redux';
import { expireCoinData, expireServiceData, setActiveOverviewFilter } from '../../../actions/actionCreators';
import Styles from '../../../styles/index'
import { conditionallyUpdateService, conditionallyUpdateWallet } from "../../../actions/actionDispatchers";
import store from "../../../store";
import TxDetailsModal from '../../../components/TxDetailsModal/TxDetailsModal'
import SkeletonLoader, {
  SkeletonBlock,
  SkeletonText,
} from '../../../components/SkeletonLoader';
import {
  API_ABORTED,
  API_GET_FIATPRICE,
  API_GET_BALANCES,
  API_GET_INFO,
  API_GET_TRANSACTIONS,
  ETH,
  API_GET_SERVICE_ACCOUNT,
  API_GET_SERVICE_PAYMENT_METHODS,
  API_GET_SERVICE_TRANSFERS,
  API_GET_SERVICE_RATES,
  API_GET_SERVICE_NOTIFICATIONS,
  IS_PBAAS_ROOT,
  IS_PBAAS,
  ERC20
} from "../../../utils/constants/intervalConstants";
import { selectTransactions } from '../../../selectors/transactions';
import { DEFAULT_DECIMALS, ETHERS, VERUS_BRIDGE_DELEGATOR_GOERLI_CONTRACT, VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT } from "../../../utils/constants/web3Constants";
import { Portal } from "react-native-paper";
import BigNumber from "bignumber.js";
import { formatCurrency } from "react-native-format-currency";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Clock3,
  History,
} from "lucide-react-native";
import { TransactionLogos } from '../../../images/customIcons/index'
import { fontStyle } from "../../../globals/fonts";
import { useOnboardingTheme } from "../../../theme/onboarding";
import { OnboardingThemeContext } from "../../../theme/onboarding/OnboardingThemeProvider";
import { CoinDirectory } from "../../../utils/CoinData/CoinDirectory";
import { USD } from "../../../utils/constants/currencies";
import { scientificToDecimal } from "../../../utils/math";

const TX_LOGOS = {
  self: TransactionLogos.SelfArrow,
  out: TransactionLogos.OutArrow,
  in: TransactionLogos.InArrow,
  pending: TransactionLogos.PendingClock,
  unknown: TransactionLogos.Unknown,
  interest: TransactionLogos.InterestPlus,
}

const CONNECTION_ERROR = "Connection Error"
const TRANSACTION_LIST_BOTTOM_PADDING = 40;
const TRANSACTION_SKELETON_DELAY = 250;
const TRANSACTION_SKELETON_ROWS = 3;

const MONOSPACE_FONT = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

const truncateAddress = (address) => {
  if (typeof address !== "string") return "";
  if (address.length <= 15) return address;

  return `${address.slice(0, 6)}...${address.slice(-6)}`;
};

const formatTransactionTimestamp = (timestamp) => {
  if (timestamp == null) return null;

  const numericTimestamp = Number(timestamp);
  if (!Number.isFinite(numericTimestamp)) return null;

  const date = new Date(
    numericTimestamp < 1000000000000
      ? numericTimestamp * 1000
      : numericTimestamp,
  );
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const day = isToday
    ? "Today"
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
  const time = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${day}, ${time}`;
};

const FocusedTransactionRow = ({
  amount,
  amountSign,
  counterparty,
  counterpartyIsAddress,
  counterpartySuffix = "",
  fiatValue,
  incoming,
  onPress,
  pending,
  ticker,
  timestamp,
}) => {
  const theme = useOnboardingTheme();
  const StatusIcon = pending ? Clock3 : incoming ? ArrowDown : ArrowUp;
  const iconColor = pending
    ? theme.colors.warning
    : incoming
      ? theme.colors.success
      : theme.colors.primary;
  const iconBackground = pending
    ? theme.isDark
      ? "rgba(255, 178, 92, 0.16)"
      : "#FFF4E8"
    : incoming
      ? theme.colors.successBackground
      : "rgba(49, 101, 212, 0.16)";
  const accessibilityDirection = incoming ? "Received" : "Sent";
  const accessibilityStatus = pending ? "Pending" : "Confirmed";
  const displayCounterparty = counterpartyIsAddress
    ? `${truncateAddress(counterparty)}${counterpartySuffix}`
    : counterparty;

  return (
    <TouchableOpacity
      accessibilityLabel={`${accessibilityDirection} ${amountSign}${amount} ${ticker}. ${counterparty}${counterpartySuffix}. ${accessibilityStatus}.`}
      accessibilityRole="button"
      activeOpacity={0.72}
      onPress={onPress}
      style={transactionStyles.row}>
      <View
        style={[
          transactionStyles.statusIcon,
          {backgroundColor: iconBackground},
        ]}>
        <StatusIcon color={iconColor} size={16} strokeWidth={2.2} />
      </View>

      <View style={transactionStyles.descriptionColumn}>
        <NativeText
          numberOfLines={1}
          style={[
            transactionStyles.counterparty,
            counterpartyIsAddress && transactionStyles.addressCounterparty,
            {color: theme.colors.textPrimary},
          ]}>
          {displayCounterparty}
        </NativeText>
        {timestamp != null && (
          <NativeText
            numberOfLines={1}
            style={[
              transactionStyles.timestamp,
              {color: theme.colors.textSubtle},
            ]}>
            {timestamp}
          </NativeText>
        )}
      </View>

      <View style={transactionStyles.amountColumn}>
        <NativeText
          numberOfLines={1}
          style={[
            transactionStyles.amount,
            {
              color: incoming
                ? theme.colors.success
                : theme.colors.textPrimary,
            },
          ]}>
          {amountSign}{amount}
        </NativeText>
        <NativeText
          numberOfLines={1}
          style={[
            transactionStyles.ticker,
            {color: theme.colors.textSecondary},
          ]}>
          {ticker}
        </NativeText>
        <NativeText
          numberOfLines={1}
          style={[
            transactionStyles.fiatValue,
            {color: theme.colors.textSubtle},
          ]}>
          {fiatValue == null ? "—" : `≈ ${fiatValue}`}
        </NativeText>
      </View>

      <ChevronRight
        color={theme.colors.textSubtle}
        size={15}
        strokeWidth={2}
        style={transactionStyles.chevron}
      />
    </TouchableOpacity>
  );
};

const TransactionSkeleton = ({animated}) => (
  <SkeletonLoader
    accessibilityLabel="Loading transactions for this Card"
    animated={animated}
    style={transactionStyles.skeletonLoader}>
    {Array.from({length: TRANSACTION_SKELETON_ROWS}, (_, index) => (
      <View key={index} style={transactionStyles.skeletonRow}>
        <SkeletonBlock height={32} radius={16} width={32} />
        <View style={transactionStyles.skeletonDescription}>
          <SkeletonText height={13} width="68%" />
          <SkeletonText
            height={10}
            style={transactionStyles.skeletonLineSpacing}
            width="42%"
          />
        </View>
        <View style={transactionStyles.skeletonAmount}>
          <SkeletonText height={13} width={78} />
          <SkeletonText
            height={9}
            style={transactionStyles.skeletonLineSpacing}
            width={58}
          />
          <SkeletonText
            height={9}
            style={transactionStyles.skeletonLineSpacing}
            width={42}
          />
        </View>
        <SkeletonBlock
          height={14}
          radius={3}
          style={transactionStyles.skeletonChevron}
          width={7}
        />
      </View>
    ))}
  </SkeletonLoader>
);

const transactionStyles = StyleSheet.create({
  row: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  statusIcon: {
    width: 32,
    height: 32,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  descriptionColumn: {
    minWidth: 0,
    flex: 1,
    marginLeft: 12,
  },
  counterparty: {
    fontSize: 13,
    lineHeight: 17,
    ...fontStyle("semiBold"),
  },
  addressCounterparty: {
    fontFamily: MONOSPACE_FONT,
    fontWeight: "400",
  },
  timestamp: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
    ...fontStyle("regular"),
  },
  amountColumn: {
    minWidth: 94,
    flexShrink: 0,
    alignItems: "flex-end",
    marginLeft: 12,
  },
  amount: {
    fontSize: 13,
    lineHeight: 15,
    textAlign: "right",
    ...fontStyle("bold"),
  },
  ticker: {
    marginTop: 2,
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.7,
    textAlign: "right",
    ...fontStyle("semiBold"),
  },
  fiatValue: {
    marginTop: 2,
    fontSize: 9,
    lineHeight: 11,
    textAlign: "right",
    ...fontStyle("medium"),
  },
  chevron: {
    flexShrink: 0,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 64,
  },
  emptyStateTitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 20,
    textAlign: "center",
    ...fontStyle("semiBold"),
  },
  loadingPlaceholder: {
    flex: 1,
    width: "100%",
  },
  skeletonLoader: {
    flex: 1,
    width: "100%",
  },
  skeletonRow: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  skeletonDescription: {
    minWidth: 0,
    flex: 1,
    marginLeft: 12,
  },
  skeletonAmount: {
    width: 78,
    flexShrink: 0,
    alignItems: "flex-end",
    marginLeft: 12,
  },
  skeletonLineSpacing: {
    marginTop: 6,
  },
  skeletonChevron: {
    flexShrink: 0,
    marginLeft: 8,
  },
});

class Overview extends Component {
  static contextType = OnboardingThemeContext;

  constructor(props) {
    super(props);

    this.state = {
      parsedTxList: [],
      coinRates: {},
      loading: false,
      reduceMotionEnabled: false,
      refreshing: false,
      showTransactionSkeleton: false,
      transactionLoadBlocked: false,
      txDetailsModalOpen: false,
      txDetailProps: {
        parsedAmount: "0",
        txData: {},
        activeCoinID: null,
        activeCoinExplorerId: null,
        activeCoinDisplayTicker: null,
        TxLogo: TX_LOGOS.unknown
      }
    };
    this.transactionScrollMetrics = {
      contentHeight: 0,
      offsetY: 0,
      viewportHeight: 0,
    };
    this.lastScrollBoundaryState = null;
    this.transactionRequestChannel = null;
    this.transactionSkeletonTimer = null;
    this._isMounted = false;
    //this.updateProps = this.updateProps.bind(this);
    this.refresh = this.refresh.bind(this);
  }

  componentDidMount() {
    this._isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (this._isMounted) this.setState({reduceMotionEnabled: enabled});
      })
      .catch(() => {});
    this._reduceMotionSubscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      reduceMotionEnabled => this.setState({reduceMotionEnabled}),
    );

    this.syncTransactionLoadingState();
    this.ensureTransactionsForActiveCard();
    this.refresh();
    this._unsubscribeFocus = this.props.navigation.addListener('focus', () => {
      this.syncTransactionLoadingState();
      this.ensureTransactionsForActiveCard();
      this.refresh();
    });
  }

  componentDidUpdate(prevProps) {
    const previousChannel = prevProps.transactions?.channel;
    const transactions = this.props.transactions;

    if (previousChannel !== transactions?.channel) {
      this.clearTransactionSkeletonTimer();
      this.lastScrollBoundaryState = {
        showBottomFade: false,
        showTopFade: false,
      };
      this.props.onScrollBoundaryChange?.(this.lastScrollBoundaryState);
      this.setState(
        {
          showTransactionSkeleton: false,
          transactionLoadBlocked: false,
        },
        () => {
          this.syncTransactionLoadingState();
          this.ensureTransactionsForActiveCard();
        },
      );
      return;
    }

    this.syncTransactionLoadingState();
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.clearTransactionSkeletonTimer();
    this._reduceMotionSubscription?.remove();
    this._unsubscribeFocus?.();
  }

  clearTransactionSkeletonTimer = () => {
    if (this.transactionSkeletonTimer != null) {
      clearTimeout(this.transactionSkeletonTimer);
      this.transactionSkeletonTimer = null;
    }
  };

  scheduleTransactionSkeleton = () => {
    if (
      this.transactionSkeletonTimer != null ||
      this.state.showTransactionSkeleton ||
      this.state.transactionLoadBlocked
    ) {
      return;
    }

    this.transactionSkeletonTimer = setTimeout(() => {
      this.transactionSkeletonTimer = null;
      if (
        this._isMounted &&
        this.props.transactions?.isUnresolved &&
        !this.state.transactionLoadBlocked
      ) {
        this.lastScrollBoundaryState = {
          showBottomFade: false,
          showTopFade: false,
        };
        this.props.onScrollBoundaryChange?.(this.lastScrollBoundaryState);
        this.setState({showTransactionSkeleton: true});
      }
    }, TRANSACTION_SKELETON_DELAY);
  };

  syncTransactionLoadingState = () => {
    if (
      this.props.transactions?.isUnresolved &&
      !this.state.transactionLoadBlocked
    ) {
      this.scheduleTransactionSkeleton();
      return;
    }

    this.clearTransactionSkeletonTimer();
    if (this.state.showTransactionSkeleton) {
      this.setState({showTransactionSkeleton: false});
    }
  };

  ensureTransactionsForActiveCard = async () => {
    const transactions = selectTransactions(store.getState());
    const channel = transactions?.channel;

    if (
      channel == null ||
      !transactions.isUnresolved ||
      transactions.isLoading ||
      this.transactionRequestChannel === channel
    ) {
      return;
    }

    this.transactionRequestChannel = channel;
    this.props.dispatch(
      expireCoinData(this.props.activeCoin.id, API_GET_TRANSACTIONS),
    );

    let result = API_ABORTED;
    try {
      result = await conditionallyUpdateWallet(
        store.getState(),
        this.props.dispatch,
        this.props.activeCoin.id,
        API_GET_TRANSACTIONS,
      );
    } catch (error) {
      console.warn("Error updating transactions for the selected Card");
      console.warn(error);
    } finally {
      if (this.transactionRequestChannel === channel) {
        this.transactionRequestChannel = null;
      }
    }

    if (!this._isMounted) return;

    const latestTransactions = selectTransactions(store.getState());
    if (
      latestTransactions.channel === channel &&
      result === API_ABORTED &&
      latestTransactions.isUnresolved &&
      !latestTransactions.isLoading
    ) {
      this.clearTransactionSkeletonTimer();
      this.setState({
        showTransactionSkeleton: false,
        transactionLoadBlocked: true,
      });
    }
  };

  refresh = (showRefreshIndicator = false) => {
    if (this.state.loading) {
      if (showRefreshIndicator && !this.state.refreshing) {
        this.setState({refreshing: true});
      }
      return;
    }

    this.setState(
      {loading: true, refreshing: showRefreshIndicator},
      async () => {
        const serviceUpdates = [
          API_GET_SERVICE_ACCOUNT,
          API_GET_SERVICE_PAYMENT_METHODS,
          API_GET_SERVICE_TRANSFERS,
          API_GET_SERVICE_RATES,
          API_GET_SERVICE_NOTIFICATIONS,
        ];

        const coinUpdates = [
          API_GET_FIATPRICE,
          API_GET_BALANCES,
          API_GET_INFO,
          API_GET_TRANSACTIONS,
        ];

        const updates = [
          {
            keys: serviceUpdates,
            update: conditionallyUpdateService,
            params: [this.props.dispatch],
          },
          {
            keys: coinUpdates,
            update: conditionallyUpdateWallet,
            params: [this.props.dispatch, this.props.activeCoin.id],
          },
        ];

        for (const update of updates) {
          for (const key of update.keys) {
            try {
              await update.update(store.getState(), ...update.params, key);
            } catch (error) {
              console.warn("Error forcing update to " + key);
              console.warn(error);
            }
          }
        }

        if (this._isMounted) {
          this.setState({loading: false, refreshing: false});
        }
      },
    );
  };

  forceUpdate = () => {
    const coinObj = this.props.activeCoin;
    this.props.dispatch(expireCoinData(coinObj.id, API_GET_FIATPRICE));
    this.props.dispatch(expireCoinData(coinObj.id, API_GET_BALANCES));
    this.props.dispatch(expireCoinData(coinObj.id, API_GET_INFO));
    this.props.dispatch(expireCoinData(coinObj.id, API_GET_TRANSACTIONS));
    this.props.dispatch(expireServiceData(API_GET_SERVICE_ACCOUNT));
    this.props.dispatch(expireServiceData(API_GET_SERVICE_PAYMENT_METHODS));
    this.props.dispatch(expireServiceData(API_GET_SERVICE_TRANSFERS));
    this.props.dispatch(expireServiceData(API_GET_SERVICE_RATES));
    this.props.dispatch(expireServiceData(API_GET_SERVICE_NOTIFICATIONS));
    
    this.refresh(true);
  };

  _openDetails = item => {
    let navigation = this.props.navigation;
    navigation.navigate("TxDetails", {
      data: item
    });
  };

  formatFiatValue = (amount, ticker) => {
    const {activeCoin, displayCurrency, fiatRate} = this.props;

    if (
      amount == null ||
      fiatRate == null ||
      ticker !== activeCoin.display_ticker
    ) {
      return null;
    }

    const fiatValue = BigNumber(amount).abs().multipliedBy(BigNumber(fiatRate));
    if (!fiatValue.isFinite()) return null;

    return formatCurrency({
      amount: fiatValue.toFixed(2),
      code: displayCurrency,
    })[0];
  };

  updateScrollBoundaries = () => {
    const {contentHeight, offsetY, viewportHeight} =
      this.transactionScrollMetrics;
    const transactionContentHeight = Math.max(
      0,
      contentHeight - TRANSACTION_LIST_BOTTOM_PADDING,
    );
    const canScroll = transactionContentHeight > viewportHeight + 1;
    const nextBoundaryState = {
      showBottomFade:
        canScroll && offsetY + viewportHeight < contentHeight - 1,
      showTopFade: canScroll && offsetY > 1,
    };

    if (
      this.lastScrollBoundaryState?.showBottomFade ===
        nextBoundaryState.showBottomFade &&
      this.lastScrollBoundaryState?.showTopFade ===
        nextBoundaryState.showTopFade
    ) {
      return;
    }

    this.lastScrollBoundaryState = nextBoundaryState;
    this.props.onScrollBoundaryChange?.(nextBoundaryState);
  };

  handleTransactionContentSizeChange = (width, height) => {
    this.transactionScrollMetrics.contentHeight = height;
    this.updateScrollBoundaries();
  };

  handleTransactionLayout = ({nativeEvent}) => {
    this.transactionScrollMetrics.viewportHeight = nativeEvent.layout.height;
    this.updateScrollBoundaries();
  };

  handleTransactionScroll = ({nativeEvent}) => {
    this.transactionScrollMetrics = {
      contentHeight: nativeEvent.contentSize.height,
      offsetY: Math.max(0, nativeEvent.contentOffset.y),
      viewportHeight: nativeEvent.layoutMeasurement.height,
    };
    this.updateScrollBoundaries();
  };

  renderTransactionItem = ({ item, index }) => {
    const decimals =
      this.props.activeCoin.decimals != null
        ? this.props.activeCoin.decimals
        : DEFAULT_DECIMALS;
    let amount = BigNumber(0)
    let AvatarImg;
    let subtitle = "";
    let counterpartyIsAddress = false;
    let counterpartySuffix = "";
    let incoming = false;
    const gasFees = item.feeCurr === ETH.toUpperCase()

    if (Array.isArray(item)) {
      const txArray = item
      let toAddresses = [];
      const confirmed = txArray[0].confirmed
      
      amount = BigNumber(txArray[0].amount).minus(txArray[1].amount)

      if (txArray[1].interest) {
        let interest = txArray[1].interest * -1;

        amount = amount.plus(interest)
      }

      for (let i = 0; i < txArray[0].to.length; i++) {
        if (txArray[0].to[i] !== txArray[0].from[0]) {
          toAddresses.push(txArray[0].to[i]);
        }
      }

      if (toAddresses.length > 1) {
        subtitle = toAddresses[0];
        counterpartySuffix = " + " + (toAddresses.length - 1) + " more";
      } else {
        subtitle = toAddresses[0];
      }
      counterpartyIsAddress = subtitle != null;

      AvatarImg = !confirmed || txArray[0].status === "pending" ? TX_LOGOS.pending : TX_LOGOS.out;

      item = {
        address: toAddresses.join(' & '),
        amount,
        confirmed,
        fee: txArray[0].fee,
        from: txArray[0].from,
        status: txArray[0].status,
        timestamp: txArray[0].timestamp,
        to: toAddresses,
        txid: txArray[0].txid,
        type: "sent"
      }
    } else {
      amount = item.amount != null ? BigNumber(item.amount) : BigNumber(0);

      if (item.type === "received") {
        AvatarImg = TX_LOGOS.in;
        subtitle = "My transparent address";
        incoming = true;
      } else if (item.type === "sent") {
        AvatarImg = TX_LOGOS.out;
        subtitle = item.address == null ? "??" : item.address;
        counterpartyIsAddress = item.address != null;

        if (
          this.props.activeCoin.proto === ETH ||
          this.props.activeCoin.proto === ERC20
        ) {
          if (
            (!!(this.props.activeCoin.testnet) &&
              VERUS_BRIDGE_DELEGATOR_GOERLI_CONTRACT != null &&
              subtitle.toLowerCase() === VERUS_BRIDGE_DELEGATOR_GOERLI_CONTRACT.toLowerCase()) ||
            (!this.props.activeCoin.testnet &&
              VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT != null &&
              subtitle.toLowerCase() === VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT.toLowerCase())
          ) {
            subtitle = 'Verus-Ethereum Bridge Contract';
            counterpartyIsAddress = false;
          }
        }
      } else if (item.type === "self") {
        if (item.amount !== "??" && amount.isLessThan(0)) {
          subtitle = "Interest";
          AvatarImg = TX_LOGOS.interest;
          amount = amount.multipliedBy(-1);
          incoming = true;
        } else {
          AvatarImg = TX_LOGOS.self;
          subtitle = gasFees ? "Network gas fee" : "Network fee";
        }
      } else {
        AvatarImg = TX_LOGOS.unknown;
        subtitle = "Unknown transaction";
      }
    }

    if (!item.confirmed || item.status === "pending")
      AvatarImg = TX_LOGOS.pending;

    let displayAmount = null

    // Handle possible int overflows
    try { 
      if (!gasFees && item.fee && item.type !== "unknown") {
        displayAmount = amount.minus(item.fee).abs()
      } else displayAmount = amount
    }
    catch(e) { console.error(e) }

    let explorerId;

    try {
      explorerId = this.props.activeCoin.system_id && this.props.activeCoin.tags.includes(IS_PBAAS) && 
      !this.props.activeCoin.tags.includes(IS_PBAAS_ROOT)
        ? CoinDirectory.findSystemCoinObj(this.props.activeCoin.id).id
        : this.props.activeCoin.id;
    } catch(e) { console.warn(e) }

    const ticker =
      item.feeCurr != null && item.type === "self"
        ? item.feeCurr
        : this.props.activeCoin.display_ticker;
    const visibleAmount = displayAmount == null ? null : displayAmount.abs();
    const formattedAmount =
      visibleAmount != null
        ? visibleAmount.isLessThan(BigNumber(0.000001)) &&
          !visibleAmount.isEqualTo(BigNumber(0))
          ? visibleAmount.toExponential()
          : scientificToDecimal(visibleAmount.toString())
        : "??";
    const pending = !item.confirmed || item.status === "pending";
    const amountSign = incoming ? "+" : item.type === "unknown" ? "" : "−";
    const fiatValue = this.formatFiatValue(displayAmount, ticker);
    
    return (
      <FocusedTransactionRow
        amount={formattedAmount}
        amountSign={amountSign}
        counterparty={subtitle || "Unknown destination"}
        counterpartyIsAddress={counterpartyIsAddress}
        counterpartySuffix={counterpartySuffix}
        fiatValue={fiatValue}
        incoming={incoming}
        pending={pending}
        ticker={ticker}
        timestamp={formatTransactionTimestamp(item.timestamp)}
        onPress={() =>
          this.setState({
            txDetailProps: {
              displayAmount: displayAmount,
              txData: item,
              activeCoinID: this.props.activeCoin.id,
              activeCoinDisplayTicker: this.props.activeCoin.display_ticker,
              activeCoinExplorerId: explorerId,
              TxLogo: AvatarImg,
              decimals: decimals,
            },
            txDetailsModalOpen: true,
          })
        }
      />
    );
  };

  parseTransactionLists = () => {
    const { transactions } = this.props
    let txs =
      transactions != null && transactions.results != null
        ? transactions.results
        : [];

    return txs.sort((a, b) => {
      a = Array.isArray(a) ? a[0] : a
      b = Array.isArray(b) ? b[0] : b
      
      if (a.timestamp == null) return -1
      else if (b.timestamp == null) return 1
      else if (b.timestamp == a.timestamp) return 0
      else if (b.timestamp < a.timestamp) return -1
      else return 1
    })
  }

  renderTransactionList = () => {
    const waitingForTransactions =
      this.props.transactions?.isUnresolved &&
      !this.state.transactionLoadBlocked;

    if (waitingForTransactions) {
      return (
        <View
          accessibilityElementsHidden={!this.state.showTransactionSkeleton}
          importantForAccessibility={
            this.state.showTransactionSkeleton ? "auto" : "no-hide-descendants"
          }
          onLayout={this.handleTransactionLayout}
          style={[
            transactionStyles.loadingPlaceholder,
            {backgroundColor: this.context.colors.background},
          ]}>
          {this.state.showTransactionSkeleton && (
            <TransactionSkeleton animated={!this.state.reduceMotionEnabled} />
          )}
        </View>
      );
    }

    return (
      <FlatList
        style={Styles.fullWidth}
        contentContainerStyle={{
          flexGrow: 1,
          backgroundColor: this.context.colors.background,
          paddingBottom: TRANSACTION_LIST_BOTTOM_PADDING,
        }}
        data={this.parseTransactionLists()}
        scrollEnabled={true}
        ListEmptyComponent={
          <View
            style={[
              transactionStyles.emptyState,
              {backgroundColor: this.context.colors.background},
            ]}>
            <History
              color={this.context.colors.textSecondary}
              opacity={0.5}
              size={28}
              strokeWidth={1.8}
            />
            <NativeText
              style={[
                transactionStyles.emptyStateTitle,
                {color: this.context.colors.textPrimary},
              ]}>
              No transactions yet
            </NativeText>
          </View>
        }
        keyExtractor={(item, index) => index}
        refreshing={this.state.refreshing}
        onRefresh={this.forceUpdate}
        onContentSizeChange={this.handleTransactionContentSizeChange}
        onLayout={this.handleTransactionLayout}
        onScroll={this.handleTransactionScroll}
        renderItem={this.renderTransactionItem}
        scrollEventThrottle={16}
        //extraData={this.props.balances}
      />
    );
  };

  setOverviewFilter = (filter) => {
    this.props.dispatch(setActiveOverviewFilter(this.props.activeCoin.id, filter))
  }

  render() {
    return (
      <View
        style={[
          Styles.defaultRoot,
          {backgroundColor: this.context.colors.background},
        ]}>
        {this.state.txDetailsModalOpen && (
          <Portal>
            <TxDetailsModal
              {...this.state.txDetailProps}
              cancel={() =>
                this.setState({
                  txDetailsModalOpen: false,
                  txDetailProps: {
                    parsedAmount: "0",
                    txData: {},
                    activeCoinID: null,
                    activeCoinDisplayTicker: null,
                    activeCoinExplorerId: null,
                    TxLogo: TX_LOGOS.unknown,
                    decimals:
                      this.props.activeCoin.decimals != null
                        ? this.props.activeCoin.decimals
                        : ETHERS,
                  },
                })
              }
              jumpTo={this.props.jumpTo}
              visible={this.state.txDetailsModalOpen}
              animationType="slide"
            />
          </Portal>
        )}
        {this.renderTransactionList()}
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  const activeCoin = state.coins.activeCoin;
  const activeSubWallet = state.coinMenus.activeSubWallets[activeCoin.id];
  const displayCurrency =
    state.settings.generalWalletSettings.displayCurrency || USD;
  const fiatChannel = activeSubWallet?.api_channels?.[API_GET_FIATPRICE];

  return {
    activeCoin,
    transactions: selectTransactions(state),
    activeAccount: state.authentication.activeAccount,
    activeCoinsForUser: state.coins.activeCoinsForUser,
    generalWalletSettings: state.settings.generalWalletSettings,
    displayCurrency,
    fiatRate:
      fiatChannel == null
        ? null
        : state.ledger.rates?.[fiatChannel]?.[activeCoin.id]?.[
            displayCurrency
          ],
  }
};

export default connect(mapStateToProps)(Overview);
