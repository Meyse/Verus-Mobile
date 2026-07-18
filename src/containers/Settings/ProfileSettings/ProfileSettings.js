/*
  This component is meant to be the overview screen for 
  the user profile settings menu. It provides the user
  with all configurable settings they have access to for 
  their user account. This includes changing passwords, 
  deleting accounts etc.
*/

import React, { Component } from "react";
import { CommonActions } from '@react-navigation/native';
import {ActivityIndicator, Portal} from 'react-native-paper';
import { connect } from 'react-redux';
import {
  getSupportedBiometryType
} from "../../../utils/keychain/keychain";
import {
  addEncryptedKey,
  setBiometry,
  setDisabledServices,
  setHideSeedWarnings,
  setKeyDerivationVersion,
  signOut,
} from "../../../actions/actionCreators";
import PasswordCheck from "../../../components/PasswordCheck";
import BiometricAffordanceIcon, {
  getBiometryPresentation,
} from '../../../components/BiometricAffordanceIcon';
import {
  canShowSeed,
} from "../../../actions/actions/channels/dlight/dispatchers/AlertManager";
import { createAlert, resolveAlert } from "../../../actions/actions/alert/dispatchers/alert";
import { checkPinForUser } from "../../../utils/asyncStore/asyncStore";
import {ENABLE_DLIGHT, WYRE_ACCESSIBLE} from '../../../../env/index';
import { dlightEnabled } from "../../../utils/enabledChannels";
import SetupSeedModal from "../../../components/SetupSeedModal/SetupSeedModal";
import { DLIGHT_PRIVATE, ELECTRUM } from "../../../utils/constants/intervalConstants";
import ListSelectionModal from "../../../components/ListSelectionModal/ListSelectionModal";
import { WYRE_SERVICE_ID } from "../../../utils/constants/services";
import { removeBiometricPassword, storeBiometricPassword } from "../../../utils/keychain/biometrics";
import { requestSeeds } from "../../../utils/auth/authBox";
import { isSeedPhrase } from "../../../utils/keys";
import {
  SettingsNotice,
  SettingsProfileSummary,
  SettingsRow,
  SettingsScreen,
  SettingsSection,
  SettingsSwitchRow,
} from '../components/SettingsScaffold';

const RESET_PWD = "ResetPwd"
const REMOVE_PROFILE = "DeleteProfile"

class ProfileSettings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      totalFiatBalance: 0,
      coinRates: {},
      loading: false,
      passwordDialogOpen: false,
      passwordDialogTitle: "",
      supportedBiometryType: null,
      biometryCheckComplete: false,
      privateSeedModalOpen: false,
      keyDerivationVersionModalOpen: false,
      checkingNfcBackupSeed: false,
      onPasswordCorrect: () => {},
    };

    this.KEY_DERIVATION_VERSION_LABELS = {
      [0]: "Legacy",
      [1]: "Latest"
    }
  }

  _openSettings = (screen) => {
    let navigation = this.props.navigation;

    navigation.navigate(screen);
  };

  componentDidMount() {
    this._isMounted = true;
    this._unsubscribeFocus = this.props.navigation.addListener(
      'focus',
      this.refreshSupportedBiometryType,
    );
    this.refreshSupportedBiometryType();
  }

  componentWillUnmount() {
    this._isMounted = false;
    this._unsubscribeFocus?.();
  }

  refreshSupportedBiometryType = async () => {
    try {
      const supportedBiometryType = await getSupportedBiometryType();

      if (this._isMounted) {
        this.setState({
          supportedBiometryType,
          biometryCheckComplete: true,
        });
      }
    } catch (e) {
      console.warn(e);
    }
  };

  closePasswordDialog = (cb) => {
    this.setState(
      {
        passwordDialogOpen: false,
        onPasswordCorrect: () => {},
      },
      cb
    );
  };

  resetToScreen = (route, title, data, fullReset) => {
    let resetAction

    if (fullReset) {
      resetAction = CommonActions.reset({
        index: 0, // <-- currect active route from actions array
        routes: [
          { name: route, params: { data: data } },
        ],
      })
    } else {
      resetAction = CommonActions.reset({
        index: 1, // <-- currect active route from actions array
        routes: [
          { name: "Home" },
          { name: route, params: { title: title, data: data } },
        ],
      })
    }

    if (this.props.navigation.closeDrawer) this.props.navigation.closeDrawer();
    this.props.navigation.dispatch(resetAction)
  }

  toggleBiometry = async (passwordCheck) => {
    if (passwordCheck.valid) {
      const { activeAccount } = this.props;
      const { supportedBiometryType } = this.state;
      const { biometry, accountHash, id } = activeAccount;
      const biometryTitle =
        getBiometryPresentation(supportedBiometryType).settingsTitle;

      this.closePasswordDialog(async () => {
        try {
          if (accountHash == null)
            throw new Error("No account hash for wallet: " + id);

          if (biometry) {
            await removeBiometricPassword(accountHash);
            this.props.dispatch(await setBiometry(accountHash, false));
            createAlert(
              "Success",
              `${biometryTitle} disabled for wallet "${id}".`
            );
          } else {
            await storeBiometricPassword(accountHash, passwordCheck.password);
            this.props.dispatch(await setBiometry(accountHash, true));
            createAlert(
              "Success",
              `${biometryTitle} enabled for wallet "${id}".`
            );
          }
        } catch (e) {
          console.warn(e);
          createAlert(
            "Error",
            `Failed to ${
              biometry ? "disable" : "enable"
            } ${biometryTitle}.`
          );
        }
      });
    } else {
      createAlert("Authentication Error", "Incorrect password.");
    }
  };

  toggleSeedCorruptionWarning = async () => {
    const { activeAccount } = this.props;
    const { hideSeedWarnings, accountHash, id } = activeAccount;

    try {
      if (accountHash == null)
        throw new Error("No account hash for wallet: " + id);

      if (hideSeedWarnings) {
        this.props.dispatch(await setHideSeedWarnings(accountHash, false));
      } else {
        this.props.dispatch(await setHideSeedWarnings(accountHash, true));
      }
    } catch (e) {
      console.warn(e);
      createAlert(
        "Error",
        `Failed to ${hideSeedWarnings ? "enable" : "disable"
        } recovery data integrity warning.`
      );
    }
  };

  canSetUserKeyDerivationVersion = () => {
    return createAlert(
      'Change key derivation version?',
      "Changing the key derivation version will change how your addresses are derived from your " + 
      "stored recovery secret for this wallet. This will log you out.",
      [
        {
          text: 'No',
          onPress: () => resolveAlert(false),
          style: 'cancel',
        },
        {text: 'Yes', onPress: () => resolveAlert(true)},
      ],
      {
        cancelable: true,
      },
    )
  }

  setUserKeyDerivationVersion = async (keyDerivationVersion) => {
    if (
      keyDerivationVersion !== this.props.activeAccount.keyDerivationVersion &&
      (await this.canSetUserKeyDerivationVersion())
    ) {
      const { activeAccount } = this.props;
      const { accountHash } = activeAccount;

      this.props.dispatch(
        await setKeyDerivationVersion(accountHash, keyDerivationVersion)
      );
      this.resetToScreen(
        "SecureLoading",
        null,
        {
          task: () => {
            // Hack to prevent crash on screens that require activeAccount not to be null
            // TODO: Find a more elegant solution
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                this.props.dispatch(signOut());
                resolve();
              }, 1000);
            });
          },
          message: "Signing out...",
          route: "Home",
          successMsg: "Signed out",
          errorMsg: "Failed to sign out",
        },
        true
      );
    }
  };

  canEnableWyre = () => {
    return createAlert(
      'Enable deprecated Wyre features?',
      "Wyre wallet features are no longer supported. Only enable them if you already have a Wyre account you would like to access.",
      [
        {
          text: 'Cancel',
          onPress: () => resolveAlert(false),
          style: 'cancel',
        },
        {text: 'Continue', onPress: () => resolveAlert(true)},
      ],
      {
        cancelable: true,
      },
    )
  }

  canDisableWyre = () => {
    return createAlert(
      'Disable deprecated Wyre features?',
      "Wyre wallet features are no longer supported. Disabling them will hide Wyre features from your wallet.",
      [
        {
          text: 'Cancel',
          onPress: () => resolveAlert(false),
          style: 'cancel',
        },
        {text: 'Continue', onPress: () => resolveAlert(true)},
      ],
      {
        cancelable: true,
      },
    )
  }

  toggleWyreEnabled = async () => {
    if ((this.props.wyreEnabled && await this.canDisableWyre()) || (!this.props.wyreEnabled && await this.canEnableWyre())) {
      const { activeAccount } = this.props;
      const { accountHash, disabledServices } = activeAccount;

      this.props.dispatch(
        await setDisabledServices(
          accountHash, 
          {...disabledServices, 
            [WYRE_SERVICE_ID]: disabledServices[WYRE_SERVICE_ID] ? false : true
          }
        )
      );
    }
  };

  showSeed = async (passwordCheck) => {
    if (passwordCheck.valid) {
      const { activeAccount } = this.props;
      const { id } = activeAccount;

      this.closePasswordDialog(async () => {
        checkPinForUser(passwordCheck.password, id)
          .then((seeds) => {
            this.setState({ password: null }, () => {
              this.props.navigation.navigate("DisplaySeed", {
                data: { seeds, showDerivedKeys: true, keyDerivationVersion: this.props.activeAccount.keyDerivationVersion },
              });
            });
          })
          .catch((e) => {
            console.warn(e);
          });
      });
    } else {
      createAlert("Authentication Error", "Incorrect password");
    }
  };

  openKeyDerivationVersionModal = () => {
    this.setState({
      keyDerivationVersionModalOpen: true
    })
  }

  closeKeyDerivationVersionModal = () => {
    this.setState({
      keyDerivationVersionModalOpen: false
    })
  }

  addZSeed = (seed, channel) => {
    this.openPasswordCheck((result) => {
      if (result.valid) {
        this.closePasswordDialog(async () => {
          try {
            await addEncryptedKey(
              this.props.activeAccount.accountHash,
              channel,
              seed,
              result.password
            );
  
            createAlert(
              "Success",
              `Z recovery secret saved for ${
                this.props.activeAccount.id
              }. Restart Verus Mobile and sign in to start using Z cards.`
            );
          } catch(e) {
            createAlert("Error", e.message);
          }
        })
      } else {
        createAlert("Authentication Error", "Incorrect password");
      }
    })
  }

  canUseCurrentSeedForZ = () => {
    return createAlert(
      "Use existing Secret Recovery Phrase for Z?",
      "Your current Secret Recovery Phrase is a valid 24-word BIP39 phrase. Would you like to use it as your Z recovery secret?",
      [
        {
          text: "No",
          onPress: () => resolveAlert(false),
          style: "cancel",
        },
        { text: "Yes", onPress: () => resolveAlert(true) },
      ],
      {
        cancelable: true,
      }
    );
  }

  canBackupCurrentProfileToNfc = () => {
    return createAlert(
      "Back up wallet to NFC?",
      "This will write an NFC wallet backup containing this wallet's Secret Recovery Phrase. If you set up a different Z recovery secret, it will not be included.\n\n" +
        "If you choose an unencrypted backup on the next screen, anyone with the NFC card can access this wallet. Keep the card secure.\n\n" +
        "Would you like to proceed?",
      [
        {
          text: "No",
          onPress: () => resolveAlert(false),
          style: "cancel",
        },
        { text: "Yes", onPress: () => resolveAlert(true) },
      ],
      {
        cancelable: false,
      }
    );
  }

  is24WordMnemonic = (seed) => {
    if (seed == null || typeof seed !== "string") return false;
    const wordCount = seed.trim().split(/\s+/g).length;
    return wordCount === 24 && isSeedPhrase(seed, 24);
  }

  handleZSeedSetup = async () => {
    try {
      const seeds = await requestSeeds();
      const primarySeed = seeds[ELECTRUM];

      if (this.is24WordMnemonic(primarySeed)) {
        const useExisting = await this.canUseCurrentSeedForZ();
        if (useExisting) {
          this.addZSeed(primarySeed, DLIGHT_PRIVATE);
          return;
        }
      }
    } catch (e) {
      console.warn(e);
    }

    this.setState({ privateSeedModalOpen: true });
  }

  startNfcBackup = async (passwordCheck) => {
    if (!passwordCheck.valid) {
      createAlert("Authentication Error", "Incorrect password");
      return;
    }

    const { activeAccount } = this.props;
    const { id } = activeAccount;

    this.closePasswordDialog(async () => {
      this.setState({ checkingNfcBackupSeed: true });

      try {
        const seeds = await checkPinForUser(passwordCheck.password, id);
        const primarySeed = seeds[ELECTRUM];

        if (!this.is24WordMnemonic(primarySeed)) {
          createAlert(
            "NFC Backup Unavailable",
            "The current wallet does not contain a valid 24-word BIP39 Secret Recovery Phrase and cannot be written as an NFC wallet backup.",
          );
          return;
        }

        this.props.navigation.navigate("NfcBackup");
      } catch (e) {
        createAlert(
          "Error",
          e.message || "Unable to check whether this wallet can be backed up.",
        );
      } finally {
        this.setState({ checkingNfcBackupSeed: false });
      }
    });
  }

  openNfcBackup = async () => {
    if (await this.canBackupCurrentProfileToNfc()) {
      this.openPasswordCheck(this.startNfcBackup);
    }
  }

  openPasswordCheck = (onPasswordCorrect) =>
    this.setState({
      passwordDialogOpen: true,
      passwordDialogTitle: `Enter password for "${
        this.props.activeAccount.id
      }"`,
      onPasswordCorrect,
    });

  showBiometryDeviceSetupAlert = () =>
    createAlert(
      'Set up biometrics on this device',
      'Set up biometric authentication in your device settings, then return to Verus Mobile to use biometric unlock again.',
    );

  renderSettingsList = () => {
    const zSetupComplete = dlightEnabled();
    const biometryEnabled = !!this.props.activeAccount.biometry;
    const biometrySupported = !!this.state.supportedBiometryType?.biometry;
    const biometryNeedsDeviceSetup =
      biometryEnabled &&
      this.state.biometryCheckComplete &&
      !biometrySupported;
    const showBiometry =
      biometryEnabled || biometrySupported;
    const biometryPresentation = getBiometryPresentation(
      this.state.supportedBiometryType,
    );
    let biometryTitle = biometryPresentation.settingsSetupTitle;
    let biometryValue = 'Off';

    if (biometryNeedsDeviceSetup) {
      biometryTitle = 'Biometric unlock';
      biometryValue = 'Needs device setup';
    } else if (biometryEnabled) {
      biometryTitle = biometryPresentation.settingsTitle;
      biometryValue = 'On';
    }
    const showSeedWarning =
      this.props.activeAccount.hideSeedWarnings ||
      this.props.showHideSeedCorruptionSetting;

    return (
      <SettingsScreen testID="settings.profile">
        <Portal>
          {this.state.privateSeedModalOpen ? (
            <SetupSeedModal
              animationType="slide"
              channel={DLIGHT_PRIVATE}
              cancel={() => {
                this.setState({privateSeedModalOpen: false});
              }}
              redesigned
              setSeed={(seed, channel) => this.addZSeed(seed, channel)}
              transparent={false}
              visible
            />
          ) : null}
          {this.state.keyDerivationVersionModalOpen && (
            <ListSelectionModal
              flexHeight={1}
              title="Key derivation versions"
              selectedKey={this.props.activeAccount.keyDerivationVersion}
              visible={this.state.keyDerivationVersionModalOpen}
              onSelect={(item) => this.setUserKeyDerivationVersion(item.key)}
              data={Object.keys(this.KEY_DERIVATION_VERSION_LABELS).map(
                (key) => {
                  return {
                    key: Number(key),
                    title: this.KEY_DERIVATION_VERSION_LABELS[key]
                  };
                }
              )}
              cancel={() => this.closeKeyDerivationVersionModal()}
            />
          )}
        </Portal>
        <SettingsProfileSummary
          name={this.props.activeAccount.id}
          subtitle={this.props.testAccount ? 'Testnet wallet' : null}
          walletAvatar={this.props.activeAccount.walletAvatar}
        />
        {this.props.testAccount ? (
          <SettingsSection title="Wallet information">
            <SettingsNotice
              body="All testnet coins/currencies have no value and will disappear whenever their testnet is reset."
              icon="alert-outline"
              title="Testnet wallet information"
            />
          </SettingsSection>
        ) : null}
        <SettingsSection title="Security">
          <SettingsRow
            description="View your Secret Recovery Phrase and derived keys"
            icon="key-outline"
            onPress={async () => {
              if (await canShowSeed()) this.openPasswordCheck(this.showSeed);
            }}
            testID="settings.profile.recoverSeed"
            title="View recovery secrets"
          />
          <SettingsRow
            icon="lock-reset"
            last={!showBiometry && !showSeedWarning}
            onPress={() => this._openSettings(RESET_PWD)}
            testID="settings.profile.changePassword"
            title="Change password"
          />
          {showBiometry ? (
            <SettingsRow
              accessibilityLabel={`${biometryTitle}, ${biometryValue}`}
              last={!showSeedWarning}
              leading={
                <BiometricAffordanceIcon
                  showFallback={biometryEnabled}
                  size={19}
                  supportedBiometryType={this.state.supportedBiometryType}
                />
              }
              onPress={() => {
                if (biometryNeedsDeviceSetup) {
                  this.showBiometryDeviceSetupAlert();
                } else {
                  this.openPasswordCheck(this.toggleBiometry);
                }
              }}
              title={biometryTitle}
              value={biometryValue}
            />
          ) : null}
          {showSeedWarning ? (
            <SettingsSwitchRow
              description="Alert on sign-in when non-standard characters may indicate damaged recovery data"
              icon="alert-circle-outline"
              last
              onValueChange={() => this.toggleSeedCorruptionWarning()}
              title="Recovery data integrity warnings"
              value={!this.props.activeAccount.hideSeedWarnings}
            />
          ) : null}
        </SettingsSection>
        <SettingsSection title="Keys & backup">
          <SettingsRow
            icon="source-branch"
            onPress={() => this.openKeyDerivationVersionModal()}
            title="Key derivation version"
            value={
              this.KEY_DERIVATION_VERSION_LABELS[
                this.props.activeAccount.keyDerivationVersion
              ]
            }
          />
          <SettingsRow
            description="Requires a 24-word BIP39 Secret Recovery Phrase"
            disabled={this.state.checkingNfcBackupSeed}
            icon="credit-card-wireless-outline"
            last={!ENABLE_DLIGHT}
            onPress={this.openNfcBackup}
            testID="settings.profile.nfcBackup"
            title="Back up this wallet to NFC"
            trailing={
              this.state.checkingNfcBackupSeed ? (
                <ActivityIndicator size="small" />
              ) : null
            }
          />
          {ENABLE_DLIGHT ? (
            <SettingsRow
              description={
                zSetupComplete
                  ? undefined
                  : 'Adds private-transaction support after restart and login'
              }
              disabled={zSetupComplete}
              icon="shield-key-outline"
              last
              onPress={this.handleZSeedSetup}
              testID="settings.profile.zSeed"
              title={
                zSetupComplete
                  ? 'Z recovery secret setup complete'
                  : 'Set up Z recovery secret'
              }
              value={zSetupComplete ? 'Complete' : null}
            />
          ) : null}
        </SettingsSection>
        <PasswordCheck
          cancel={() => this.closePasswordDialog()}
          redesigned
          submit={(result) => this.state.onPasswordCorrect(result)}
          visible={this.state.passwordDialogOpen}
          title={this.state.passwordDialogTitle}
          userName={this.props.activeAccount.id}
          account={this.props.activeAccount}
          allowBiometry={true}
        />
        {WYRE_ACCESSIBLE && !this.props.testAccount ? (
          <SettingsSection title="Deprecated services">
            <SettingsRow
              description={
                this.props.wyreEnabled
                  ? 'Existing Wyre account access is visible in Services'
                  : 'Enable access to an existing Wyre account in Services'
              }
              icon="account-cash-outline"
              last
              onPress={() => this.toggleWyreEnabled()}
              title={
                this.props.wyreEnabled
                  ? 'Wyre enabled'
                  : 'Enable deprecated Wyre features'
              }
              value={this.props.wyreEnabled ? 'On' : 'Off'}
            />
          </SettingsSection>
        ) : null}
        <SettingsSection title="Wallet actions">
          <SettingsRow
            danger
            icon="trash-can-outline"
            last
            onPress={() => this._openSettings(REMOVE_PROFILE)}
            testID="settings.profile.delete"
            title="Delete wallet"
          />
        </SettingsSection>
      </SettingsScreen>
    );
  };

  render() {
    return this.renderSettingsList();
  }
}

const mapStateToProps = state => {
  return {
    testAccount: Object.keys(state.authentication.activeAccount.testnetOverrides).length > 0,
    activeAccount: state.authentication.activeAccount,
    showHideSeedCorruptionSetting: state.authentication.showHideSeedCorruptionSetting,
    wyreEnabled:
      state.authentication.activeAccount != null &&
      state.authentication.activeAccount.disabledServices[WYRE_SERVICE_ID] != true,
  };
};


export default connect(mapStateToProps)(ProfileSettings);
