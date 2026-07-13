/*
  This component's purpose is to display a tab bar of 
  all the different apps a specific coin has in the coinData file. 
*/

import React, { Component } from "react";
import {
  View,
} from "react-native";
import { connect } from 'react-redux';
import Overview from './Overview/Overview'
import SendCoin from './SendCoin/SendCoin'
import ReceiveCoin from './ReceiveCoin/ReceiveCoin'
import ConvertCoin from "./ConvertCoin/ConvertCoin";
import ManageCoin from "./ManageCoin/ManageCoin";
import { setActiveSection, setCoinSubWallet, setIsCoinMenuFocused } from "../../actions/actionCreators";
import { NavigationActions, withNavigationFocus } from '@react-navigation/compat';
import SubWalletSelectorModal from "../SubWalletSelect/SubWalletSelectorModal";
import DynamicHeader from "./DynamicHeader";
import { BottomNavigation } from "react-native-paper";
import { subWalletActivity } from "../../utils/subwallet/subWalletStatus";
import MissingInfoRedirect from "../../components/MissingInfoRedirect/MissingInfoRedirect";
import { WALLET_APP_CONVERT, WALLET_APP_MANAGE, WALLET_APP_OVERVIEW, WALLET_APP_RECEIVE, WALLET_APP_SEND } from "../../utils/constants/apps";
import { createAlert } from "../../actions/actions/alert/dispatchers/alert";
import SignedInActionBar from "../../components/SignedInActionBar";
import {ENABLE_SIGNED_IN_REDESIGN} from "../../../env/index";
import SignedInCoinDetail from './SignedInCoinDetail';

const SIGNED_IN_TRANSFER = "signed-in-transfer";
const TRANSFER_SECTION_KEYS = [WALLET_APP_SEND, WALLET_APP_CONVERT];

class CoinMenus extends Component {
  constructor(props) {
    super(props);
    let stateObj = this.generateTabs();
    const subWallets = Array.isArray(props.allSubWallets) ? props.allSubWallets : [];

    //CoinMenus can be passed data, which will be passed to
    //the app section components as props
    this.passthrough = this.props.route.params ? this.props.route.params.data : null;

    this.state = {
      tabs: stateObj.tabs,
      activeTab: stateObj.activeTab,
      activeTabIndex: stateObj.activeTabIndex,
      transferSections: stateObj.transferSections,
      transferMode: stateObj.transferMode,
      filteredTabKey: null,
    };

    if (subWallets.length == 1)
      props.dispatch(setCoinSubWallet(props.activeCoin.id, subWallets[0]));

    this.Routes = {
      [WALLET_APP_OVERVIEW]: Overview,
      [WALLET_APP_SEND]: SendCoin,
      [WALLET_APP_RECEIVE]: ReceiveCoin,
      [WALLET_APP_CONVERT]: ConvertCoin,
      [WALLET_APP_MANAGE]: ManageCoin
    };
  }

  componentDidMount() {
    this.props.dispatch(setIsCoinMenuFocused(true));
  }

  componentDidUpdate(lastProps) {
    if (lastProps.isFocused !== this.props.isFocused) {
      this.props.dispatch(setIsCoinMenuFocused(this.props.isFocused));
    }

    if (
      lastProps.allSubWallets !== this.props.allSubWallets ||
      lastProps.selectedSubWallet !== this.props.selectedSubWallet
    ) {
      this.selectOnlySubWallet();
    }

    if (
      lastProps.selectedSubWallet != this.props.selectedSubWallet &&
      this.state.filteredTabKey != null &&
      this.props.selectedSubWallet != null
    ) {
      this.setState({
        filteredTabKey: null,
      });
    }
  }

  getSubWallets = () => {
    return Array.isArray(this.props.allSubWallets) ? this.props.allSubWallets : [];
  };

  getSubWalletsForTab = (tabKey) => {
    return this.getSubWallets().filter((wallet) =>
      wallet.compatible_apps.includes(tabKey)
    );
  };

  selectOnlySubWallet = () => {
    const subWallets = this.getSubWallets();

    if (this.props.selectedSubWallet == null && subWallets.length == 1) {
      this.props.dispatch(setCoinSubWallet(this.props.activeCoin.id, subWallets[0]));
    }
  };

  generateTabs = () => {
    let tabArray = [];
    let activeTab;
    let activeTabIndex;
    let options = this.props.activeCoin.apps[this.props.activeApp].data;
    const transferSections = ENABLE_SIGNED_IN_REDESIGN
      ? options.filter(option => TRANSFER_SECTION_KEYS.includes(option.key))
      : [];
    let transferTabAdded = false;

    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const isTransferSection = transferSections.includes(option);

      if (ENABLE_SIGNED_IN_REDESIGN && isTransferSection && transferTabAdded) {
        continue;
      }

      const _tab = ENABLE_SIGNED_IN_REDESIGN && isTransferSection
        ? {
            key: SIGNED_IN_TRANSFER,
            focusedIcon: option.icon,
            unfocusedIcon: option.icon,
            title: "Transfer",
            activeSection: option,
          }
        : {
            key: option.key,
            focusedIcon: option.icon,
            unfocusedIcon: option.icon,
            title: option.name,
            activeSection: option,
          };

      if (ENABLE_SIGNED_IN_REDESIGN && isTransferSection) {
        transferTabAdded = true;
      }

      if (
        option.key === this.props.activeSection.key ||
        (ENABLE_SIGNED_IN_REDESIGN &&
          isTransferSection &&
          TRANSFER_SECTION_KEYS.includes(this.props.activeSection.key))
      ) {
        activeTab = _tab;
        activeTabIndex = tabArray.length;
      }

      tabArray.push(_tab);
    }

    if (!activeTab) {
      throw new Error("Tab not found for active section " + this.props.activeSection.key);
    }

    this.props.navigation.setOptions({
      title: ENABLE_SIGNED_IN_REDESIGN ? '' : activeTab.title,
    });

    return {
      tabs: tabArray,
      activeTab: activeTab,
      activeTabIndex,
      transferSections,
      transferMode: TRANSFER_SECTION_KEYS.includes(this.props.activeSection.key)
        ? this.props.activeSection.key
        : transferSections[0]?.key,
    };
  };

  goToServices() {
    this.props.navigation.navigate("Home", {
      screen: "ServicesHome",
      initial: false,
    });
  }

  renderScene = ({ route, jumpTo }) => {
    const routeKey = route.key === SIGNED_IN_TRANSFER
      ? this.state.transferMode
      : route.key;

    if (this.Routes[routeKey] == null) return null;
    else {
      const Route = this.Routes[routeKey];
      const { placeholder, active } = subWalletActivity(this.props.selectedSubWallet.id);

      return this.props.selectedSubWallet.compatible_apps.includes(routeKey) ? (
        active(this.props.services) ? (
          <Route navigation={this.props.navigation} data={this.passthrough} jumpTo={jumpTo} />
        ) : (
          <MissingInfoRedirect
            icon={placeholder.icon}
            label={placeholder.label}
            buttonLabel="configure services"
            onPress={() => this.goToServices()}
          />
        )
      ) : (
        <MissingInfoRedirect
          icon={"power-plug-off"}
          label={`This tab isn't accesible from the ${
            this.props.selectedSubWallet.name
          } card.`}
          buttonLabel="Switch cards"
          onPress={() => this.findCompatibleSubwallet(routeKey)}
        />
      );
    }
  };

  findCompatibleSubwallet = (tabKey) => {
    const subwalletsForTab = this.getSubWalletsForTab(tabKey);

    if (subwalletsForTab.length > 0) {
      this.setState(
        {
          filteredTabKey: tabKey,
        },
        () => this.props.dispatch(setCoinSubWallet(this.props.activeCoin.id, null))
      );
    } else {
      createAlert("Error", "No compatible cards found.");
    }
  };

  switchTab = (index) => {
    const newTab = this.state.tabs[index];
    const activeSection = newTab.key === SIGNED_IN_TRANSFER
      ? this.state.transferSections.find(
          section => section.key === this.state.transferMode,
        ) || this.state.transferSections[0]
      : newTab.activeSection;

    this.props.navigation.setOptions({ title: newTab.title });
    this.props.dispatch(setActiveSection(activeSection));
    this.setState({ activeTab: newTab, activeTabIndex: index });
  };

  switchToSection = (sectionKey) => {
    const tabKey = TRANSFER_SECTION_KEYS.includes(sectionKey)
      ? SIGNED_IN_TRANSFER
      : sectionKey;
    const index = this.state.tabs.findIndex(tab => tab.key === tabKey);

    if (index < 0) return;

    if (tabKey === SIGNED_IN_TRANSFER) {
      const activeSection = this.state.transferSections.find(
        section => section.key === sectionKey,
      );

      this.props.navigation.setOptions({title: "Transfer"});
      this.props.dispatch(setActiveSection(activeSection));
      this.setState({
        activeTab: this.state.tabs[index],
        activeTabIndex: index,
        transferMode: sectionKey,
      });
    } else {
      this.switchTab(index);
    }
  };

  openTransfer = (transferSections) => {
    const transferSection = transferSections.find(
      section => section.key === WALLET_APP_SEND,
    ) || transferSections[0];

    if (transferSection) this.switchToSection(transferSection.key);
  };

  goBack = () => {
    this.props.navigation.dispatch(NavigationActions.back());
  };

  //The rendering of overview, send and receive is temporary, we want to use
  //this.state.activeTab.screen, but the
  //"Cannot Add a child that doesn't have a YogaNode to a parent with out a measure function"
  //bug comes up and it seems like a bug in rn
  render() {
    if (ENABLE_SIGNED_IN_REDESIGN) {
      return (
        <SignedInCoinDetail
          navigation={this.props.navigation}
          route={this.props.route}
        />
      );
    }

    const { selectedSubWallet, activeCoin } = this.props;
    const subWallets = this.getSubWallets();
    const filteredSubWallets =
      this.state.filteredTabKey == null
        ? null
        : this.getSubWalletsForTab(this.state.filteredTabKey);
    const activeCardApps = selectedSubWallet?.compatible_apps || [];
    const tabKeys = this.state.tabs.map(tab => tab.key);
    const canReceive =
      activeCardApps.includes(WALLET_APP_RECEIVE) &&
      tabKeys.includes(WALLET_APP_RECEIVE);
    const transferSections = this.state.transferSections.filter(
      section => activeCardApps.includes(section.key),
    );

    return (
      <View style={{ flex: 1, display: "flex" }}>
          {selectedSubWallet == null && (
            <SubWalletSelectorModal
              visible={selectedSubWallet == null}
              cancel={this.goBack}
              animationType="slide"
              subWallets={filteredSubWallets == null ? subWallets : filteredSubWallets}
              chainTicker={activeCoin.id}
              displayTicker={activeCoin.display_ticker}
            />
          )}
          {selectedSubWallet != null && <DynamicHeader switchTab={this.switchTab} />}
          {selectedSubWallet != null && (
            <View style={{flex: 1}}>
              <BottomNavigation
                shifting={false}
                navigationState={{
                  index: this.state.activeTabIndex,
                  routes: this.state.tabs,
                }}
                onIndexChange={this.switchTab}
                renderScene={this.renderScene}
              />
              {ENABLE_SIGNED_IN_REDESIGN && (
                <SignedInActionBar
                  receiveDisabled={!canReceive}
                  sendOrConvertDisabled={transferSections.length === 0}
                  onReceive={() => this.switchToSection(WALLET_APP_RECEIVE)}
                  onSendOrConvert={() => this.openTransfer(transferSections)}
                />
              )}
            </View>
          )}
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeCoin: state.coins.activeCoin,
    activeApp: state.coins.activeApp,
    activeSection: state.coins.activeSection,
    coinMenuFocused: state.coins.coinMenuFocused,
    selectedSubWallet:
      state.coinMenus.activeSubWallets[state.coins.activeCoin.id],
    allSubWallets: state.coinMenus.allSubWallets[state.coins.activeCoin.id] || [],
    services: state.services
  };
};

export default connect(mapStateToProps)(withNavigationFocus(CoinMenus));
