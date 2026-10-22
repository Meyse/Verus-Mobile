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
import {
  ENABLE_DLIGHT,
  ENABLE_SIGNED_IN_REDESIGN,
  WYRE_ACCESSIBLE,
} from '../../../../env/index';
import { dlightEnabled } from "../../../utils/enabledChannels";
import SetupSeedModal from "../../../components/SetupSeedModal/SetupSeedModal";
import { DLIGHT_PRIVATE, ELECTRUM } from "../../../utils/constants/intervalConstants";
import SelectionSheet, { SelectionRow } from "../../../components/SelectionSheet";
import useSheetDismissal from "../../../components/useSheetDismissal";
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
import KeychainEncryptionSettingRow from '../components/KeychainEncryptionSettingRow';

const RESET_PWD = "ResetPwd"
const REMOVE_PROFILE = "DeleteProfile"

const KEY_DERIVATION_VERSION_OPTIONS = [
  { value: 1, title: "Latest" },
  { value: 0, title: "Legacy" },
];

const SETTING_NOT_SAVED = "Not saved. Try again.";

// The same inline copy as the View recovery secrets password sheet.
const getPasswordCheckError = (error) =>
  error?.message === "Incorrect password"
    ? "Password not recognized. Try again."
    : "Unable to access this wallet. Try again.";

// The choice applies after the sheet has closed, so the confirmation that
// follows presents cleanly.
const KeyDerivationVersionSheet = ({ visible, selectedVersion, onClose, onSelect }) => {
  const dismissal = useSheetDismissal({ visible, onClose });

  return (
    <SelectionSheet
      title="Key derivation version"
      visible={visible}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}>
      {KEY_DERIVATION_VERSION_OPTIONS.map((option) => (
        <SelectionRow
          key={option.value}
          title={option.title}
          selected={option.value === selectedVersion}
          onPress={() => dismissal.dismiss(() => onSelect(option.value))}
        />
      ))}
    </SelectionSheet>
  );
};

class ProfileSettings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      totalFiatBalance: 0,
      coinRates: {},
      loading: false,
      passwordDialogOpen: false,
      passwordDialogTitle: "",
      passwordError: null,
      seedWarningError: null,
      supportedBiometryType: null,
      biometryCheckComplete: false,
      privateSeedModalOpen: false,
      keyDerivationVersionModalOpen: false,
      checkingNfcBackupSeed: false,
      nfcBackupEligible: null,
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
      this.refreshProfileSettingsState,
    );
    this.refreshProfileSettingsState();
  }

  componentWillUnmount() {
    this._isMounted = false;
    this._unsubscribeFocus?.();
  }

  refreshProfileSettingsState = () => {
    this.refreshSupportedBiometryType();
    this.refreshNfcBackupEligibility();
  };

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

  refreshNfcBackupEligibility = async () => {
    const accountHash = this.props.activeAccount?.accountHash;

    try {
      const seeds = await requestSeeds();
      const nfcBackupEligible = this.is24WordMnemonic(seeds[ELECTRUM]);

      if (
        this._isMounted &&
        this.props.activeAccount?.accountHash === accountHash
      ) {
        this.setState({nfcBackupEligible});
      }
    } catch (e) {
      console.warn(e);
    }
  };

  closePasswordDialog = (cb) => {
    this.setState(
      {
        passwordDialogOpen: false,
        passwordError: null,
        onPasswordCorrect: () => {},
      },
      cb
    );
  };

  // A wrong password keeps the sheet open and shows the error in it.
  showPasswordError = (passwordCheck) => {
    this.setState({ passwordError: getPasswordCheckError(passwordCheck.error) });
  };

  clearPasswordError = () => {
    if (this.state.passwordError != null) this.setState({ passwordError: null });
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
          } else {
            await storeBiometricPassword(accountHash, passwordCheck.password);
            this.props.dispatch(await setBiometry(accountHash, true));
          }
        } catch (e) {
          console.warn(e);
          createAlert(
            `${biometryTitle} not turned ${biometry ? "off" : "on"}`,
            `The wallet could not save ${biometryTitle}. Try again.`
          );
        }
      });
    } else {
      this.showPasswordError(passwordCheck);
    }
  };

  toggleSeedCorruptionWarning = async () => {
    const { activeAccount } = this.props;
    const { hideSeedWarnings, accountHash, id } = activeAccount;

    this.setState({ seedWarningError: null });

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
      if (this._isMounted) this.setState({ seedWarningError: SETTING_NOT_SAVED });
    }
  };

  canSetUserKeyDerivationVersion = () => {
    return createAlert(
      "Change key derivation version?",
      "This changes how the wallet derives addresses from its recovery secret. The wallet then signs out.",
      [
        {
          text: "Not now",
          onPress: () => resolveAlert(false),
          style: "cancel",
        },
        { text: "Change and sign out", onPress: () => resolveAlert(true) },
      ]
    );
  }

  setUserKeyDerivationVersion = async (keyDerivationVersion) => {
    const sessionScope = {
      sessionScoped: true,
      accountHash: this.props.activeAccount?.accountHash || null,
      sessionEpoch: this.props.sessionEpoch,
    };
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
                this.props.dispatch(signOut(sessionScope));
                resolve();
              }, 1000);
            });
          },
          message: "Signing out",
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
      "Turn on Wyre features?",
      "Wyre is no longer supported, so use this only to reach an existing Wyre account.",
      [
        {
          text: "Not now",
          onPress: () => resolveAlert(false),
          style: "cancel",
        },
        { text: "Turn on", onPress: () => resolveAlert(true) },
      ]
    );
  }

  canDisableWyre = () => {
    return createAlert(
      "Turn off Wyre features?",
      "This hides the unsupported Wyre features from the wallet.",
      [
        {
          text: "Not now",
          onPress: () => resolveAlert(false),
          style: "cancel",
        },
        { text: "Turn off", onPress: () => resolveAlert(true) },
      ]
    );
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
      this.showPasswordError(passwordCheck);
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
              "Z recovery secret saved",
              "Restart the app and sign in to use private (Z) cards."
            );
          } catch(e) {
            console.warn(e);
            createAlert(
              "Z recovery secret not saved",
              "The wallet could not save the secret. Try again."
            );
          }
        })
      } else {
        this.showPasswordError(result);
      }
    })
  }

  // The way out of this question opens the setup for another secret, so an
  // outside tap does not answer it.
  canUseCurrentSeedForZ = () => {
    return createAlert(
      "Use your Secret Recovery Phrase for Z?",
      "It is a valid 24-word BIP39 phrase, so it can also be the Z recovery secret.",
      [
        {
          text: "Use another secret",
          onPress: () => resolveAlert(false),
          style: "cancel",
        },
        { text: "Use this phrase", onPress: () => resolveAlert(true) },
      ],
      {
        cancelable: false,
      }
    );
  }

  canBackupCurrentProfileToNfc = () => {
    return createAlert(
      "Back up to an NFC card?",
      "The card holds this wallet’s Secret Recovery Phrase. A separate Z recovery secret is not included. Without a password on the next step, anyone with the card can open this wallet.",
      [
        {
          text: "Not now",
          onPress: () => resolveAlert(false),
          style: "cancel",
        },
        { text: "Continue", onPress: () => resolveAlert(true) },
      ]
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
      this.showPasswordError(passwordCheck);
      return;
    }

    const { activeAccount } = this.props;
    const { id } = activeAccount;

    this.closePasswordDialog(async () => {
      this.setState({ checkingNfcBackupSeed: true });

      try {
        const seeds = await checkPinForUser(passwordCheck.password, id);
        const primarySeed = seeds[ELECTRUM];

        // The row then shows as disabled with its reason.
        if (!this.is24WordMnemonic(primarySeed)) {
          this.setState({nfcBackupEligible: false});
          return;
        }

        this.setState({nfcBackupEligible: true});
        this.props.navigation.navigate("NfcBackup");
      } catch (e) {
        console.warn(e);
        createAlert(
          "NFC backup not started",
          "The wallet could not read its Secret Recovery Phrase. Try again.",
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
      passwordError: null,
      onPasswordCorrect,
    });

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
    let biometryDescription;

    if (biometryNeedsDeviceSetup) {
      biometryTitle = 'Biometric unlock';
      biometryValue = 'Needs device setup';
      biometryDescription = 'Set up biometrics in device settings to use it again';
    } else if (biometryEnabled) {
      biometryTitle = biometryPresentation.settingsTitle;
      biometryValue = 'On';
    }
    const showSeedWarning =
      this.props.activeAccount.hideSeedWarnings ||
      this.props.showHideSeedCorruptionSetting;
    const showKeychainEncryption = ENABLE_SIGNED_IN_REDESIGN;

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
            last={!showBiometry && !showKeychainEncryption && !showSeedWarning}
            onPress={() => this._openSettings(RESET_PWD)}
            testID="settings.profile.changePassword"
            title="Change password"
          />
          {showBiometry ? (
            <SettingsRow
              accessibilityLabel={`${biometryTitle}, ${biometryValue}`}
              description={biometryDescription}
              last={!showKeychainEncryption && !showSeedWarning}
              leading={
                <BiometricAffordanceIcon
                  showFallback={biometryEnabled}
                  size={19}
                  supportedBiometryType={this.state.supportedBiometryType}
                />
              }
              onPress={
                biometryNeedsDeviceSetup
                  ? undefined
                  : () => this.openPasswordCheck(this.toggleBiometry)
              }
              title={biometryTitle}
              value={biometryValue}
            />
          ) : null}
          {showKeychainEncryption ? (
            <KeychainEncryptionSettingRow
              last={!showSeedWarning}
              navigation={this.props.navigation}
            />
          ) : null}
          {showSeedWarning ? (
            <SettingsSwitchRow
              description="Alert on sign-in when non-standard characters may indicate damaged recovery data"
              error={this.state.seedWarningError}
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
            description={
              this.state.nfcBackupEligible === false
                ? 'Unavailable: this wallet does not use a 24-word BIP39 Secret Recovery Phrase'
                : undefined
            }
            disabled={
              this.state.checkingNfcBackupSeed ||
              this.state.nfcBackupEligible === false
            }
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
        <KeyDerivationVersionSheet
          onClose={this.closeKeyDerivationVersionModal}
          onSelect={this.setUserKeyDerivationVersion}
          selectedVersion={this.props.activeAccount.keyDerivationVersion}
          visible={this.state.keyDerivationVersionModalOpen}
        />
        <PasswordCheck
          cancel={() => this.closePasswordDialog()}
          errorMessage={this.state.passwordError}
          onInputChange={this.clearPasswordError}
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
    sessionEpoch: state.authentication.sessionEpoch,
    showHideSeedCorruptionSetting: state.authentication.showHideSeedCorruptionSetting,
    wyreEnabled:
      state.authentication.activeAccount != null &&
      state.authentication.activeAccount.disabledServices[WYRE_SERVICE_ID] != true,
  };
};


export default connect(mapStateToProps)(ProfileSettings);
