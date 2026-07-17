/*
  This component's purpose is to display the user seeds in 
  plaintext upon authorization. It uses the users password 
  to decrypt it from their userData stored in AsyncStorage.
*/

import React, {Component, useMemo} from "react";
import {ActivityIndicator, StyleSheet, View} from "react-native";
import { NavigationActions } from '@react-navigation/compat';
import { connect } from 'react-redux';
import QRCode from 'react-native-qrcode-svg';
import { CommonActions } from '@react-navigation/native';
import { DLIGHT_PRIVATE, ELECTRUM, ETH, WYRE_SERVICE } from "../../utils/constants/intervalConstants";
import {Text} from 'react-native-paper'
import { deriveKeyPair, dlightSeedToBytes, isDlightSpendingKey } from "../../utils/keys";
import { createAlert } from "../../actions/actions/alert/dispatchers/alert";
import { coinsList } from "../../utils/CoinData/CoinsList";
import { MAX_SEED_CHARS_FOR_QR_DISPLAY } from "../../utils/constants/constants";
import AppButton from '../../components/AppButton';
import {fontStyle} from '../../globals/fonts';
import {useOnboardingTheme} from '../../theme/onboarding';
import {
  SettingsActionFooter,
  SettingsNotice,
  SettingsScreen,
  SettingsSection,
} from '../Settings/components/SettingsScaffold';

const createSeedStyles = theme =>
  StyleSheet.create({
    card: {
      marginBottom: 14,
      padding: 16,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.rounded.md,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 20,
      ...fontStyle('semiBold'),
    },
    sensitiveLabel: {
      color: theme.colors.warning,
      fontSize: 11,
      lineHeight: 15,
      ...fontStyle('semiBold'),
    },
    secret: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
      ...fontStyle('regular'),
    },
    qrShell: {
      alignSelf: 'center',
      marginTop: 18,
      padding: 12,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
    },
    actions: {
      gap: 8,
      marginTop: 14,
    },
  });

const SeedCard = ({children, name, value}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSeedStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{name}</Text>
        <Text style={styles.sensitiveLabel}>Sensitive</Text>
      </View>
      <Text selectable style={styles.secret}>
        {value}
      </Text>
      {value.length < MAX_SEED_CHARS_FOR_QR_DISPLAY ? (
        <View
          accessible
          accessibilityLabel={`${name} QR code`}
          accessibilityRole="image"
          style={styles.qrShell}>
          <QRCode value={value} size={210} />
        </View>
      ) : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
};

class DisplaySeed extends Component {
  constructor() {
    super();
    this.state = {
      seeds: {},
      fromDeleteAccount: false,
      selectedSeedType: ELECTRUM,
      dualSameSeed: false,
      derivedKeys: {},
      toggleDerivedKey: {},
      fetchingDerivedKey: {},
      completeOnBack: false,
    };

    this.SEED_NAMES = {
      [DLIGHT_PRIVATE]: "Secondary (Z-address)",
      [ELECTRUM]: "Primary",
      [ETH]: "Ethereum/ERC20",
      [WYRE_SERVICE]: "Wyre account"
    }
  }

  componentDidMount() {
    const { data } = this.props.route.params
    if (
      data &&
      data.seeds
    ) {
      const seedsArray = Object.values(data.seeds)

      this.setState({ 
        seeds: {...data.seeds, [ETH]: data.seeds[ELECTRUM]},
        dualSameSeed: seedsArray.every(s => seedsArray.length > 1 && s === seedsArray[0])
      });
    }

    if (
      data &&
      data.fromDeleteAccount
    ) {
      this.setState({
        fromDeleteAccount: data
          .fromDeleteAccount,
      });
    }

    if (
      data &&
      data.completeOnBack
    ) {
      this.setState({
        completeOnBack: data.completeOnBack,
      });
    }
  }

  resetToScreen = () => {
    const route = this.state.fromDeleteAccount ? "DeleteProfile" : "Home";

    const resetAction = CommonActions.reset({
      index: 0, // <-- currect active route from actions array
      routes: [{ name: route }],
    });

    if (this.props.navigation.closeDrawer) this.props.navigation.closeDrawer();
    this.props.navigation.dispatch(resetAction);
  };

  handleError = (error, field) => {
    let _errors = this.state.errors;
    _errors[field] = error;

    this.setState({ errors: _errors });
  };

  back = () => {
    this.props.navigation.dispatch(NavigationActions.back());
  };

  toggleDerived = async (key, coinObj) => {
    if (!this.state.toggleDerivedKey[key]) {
      try {
        this.setState({ fetchingDerivedKey: { ...this.state.fetchingDerivedKey, [key]: true } });
        const derivedKey = await this.deriveKeyFromSeed(this.state.seeds[key], key, coinObj);
        this.setState({ 
          derivedKeys: { ...this.state.derivedKeys, [key]: derivedKey }, 
          fetchingDerivedKey: { ...this.state.fetchingDerivedKey, [key]: false },
          toggleDerivedKey: { ...this.state.toggleDerivedKey, [key]: true } 
        });
      } catch(e) {
        createAlert("Failed to fetch derived key", e.message);
        this.setState({ fetchingDerivedKey: { ...this.state.fetchingDerivedKey, [key]: false } });
      }
    } else {
      this.setState(prevState => ({
        toggleDerivedKey: {
          ...prevState.toggleDerivedKey,
          [key]: !prevState.toggleDerivedKey[key]
        }
      }));
    }
  }

  deriveKeyFromSeed = async (seed, key, coinObj) => {
    const { data } = this.props.route.params;

    switch (key) {
      case DLIGHT_PRIVATE:
        return (await dlightSeedToBytes(seed));
      case ETH:
        return (await deriveKeyPair(
          seed,
          coinsList.ETH,
          key,
          data.keyDerivationVersion,
        )).privKey;
      case ELECTRUM:
        return (await deriveKeyPair(
          seed,
          coinObj,
          key,
          data.keyDerivationVersion,
        )).privKey;
      default:
        return seed
    }
  }

  render() {
    const { seeds, toggleDerivedKey, fetchingDerivedKey, derivedKeys, completeOnBack } = this.state;
    const { data } = this.props.route.params;

    return (
      <SettingsScreen
        footer={
          completeOnBack ? (
            <SettingsActionFooter
              primaryLabel="Done"
              primaryOnPress={this.back}
            />
          ) : (
            <SettingsActionFooter
              primaryLabel={this.state.fromDeleteAccount ? 'Continue' : 'Home'}
              primaryOnPress={this.resetToScreen}
              secondaryLabel="Back"
              secondaryOnPress={this.back}
            />
          )
        }
        testID="settings.displaySeed">
        <SettingsNotice
          body="Anyone who sees these recovery secrets or private keys can control the associated funds. Keep this screen private and store backups offline."
                icon="eye-off-outline"
          title="Private recovery information"
        />
        <SettingsSection title="Recovery secrets">
          {Object.keys(seeds).map((key, index) => {
            const isToggleOn = toggleDerivedKey[key];
            const displayedValue = isToggleOn ? derivedKeys[key] : seeds[key];

            return seeds[key] == null ? null : (
              <SeedCard
                key={key}
                name={this.SEED_NAMES[key]}
                value={displayedValue}>
                    {data.showDerivedKeys && <>
                      {
                        ((key === DLIGHT_PRIVATE && !isDlightSpendingKey(seeds[key])) ||
                          key === ETH ||
                          key === ELECTRUM) && (
                          <AppButton
                            disabled={fetchingDerivedKey[key]}
                            height={44}
                            onPress={() => this.toggleDerived(key, coinsList.VRSC)}
                            variant="secondary">
                            {fetchingDerivedKey[key] ? (
                              <ActivityIndicator size="small" />
                            ) : isToggleOn ? (
                              'Show recovery secret'
                            ) : key === ELECTRUM ? (
                              'Show derived key (VRSC)'
                            ) : (
                              'Show derived key'
                            )}
                          </AppButton>
                        )
                      }
                      {
                        !isToggleOn && !fetchingDerivedKey[key] && key === ELECTRUM && (
                          <AppButton
                            height={44}
                            onPress={() => this.toggleDerived(key, coinsList.BTC)}
                            variant="secondary">
                            Show derived key (BTC)
                          </AppButton>
                        )
                      }
                    </>}
              </SeedCard>
            );
          })}
        </SettingsSection>
      </SettingsScreen>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(DisplaySeed);
