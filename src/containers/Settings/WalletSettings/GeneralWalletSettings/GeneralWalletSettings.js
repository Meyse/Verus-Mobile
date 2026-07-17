/*
  This component allows the user to modify the general
  wallet settings. This includes things like maximum transaction
  display size.
*/

import React, {useState, useEffect, useRef} from 'react';
import {Keyboard, Alert} from 'react-native';
import {useDispatch} from 'react-redux';
import {
  CURRENCY_NAMES,
  SUPPORTED_UNIVERSAL_DISPLAY_CURRENCIES,
} from '../../../../utils/constants/currencies';
import NumberPadModal from '../../../../components/NumberPadModal/NumberPadModal';
import {Portal} from 'react-native-paper';
import ListSelectionModal from '../../../../components/ListSelectionModal/ListSelectionModal';
import {saveGeneralSettings} from '../../../../actions/actionCreators';
import {createAlert} from '../../../../actions/actions/alert/dispatchers/alert';
import {NavigationActions} from '@react-navigation/compat';
import { ADDRESS_BLOCKLIST_FROM_WEBSERVER } from '../../../../utils/constants/constants';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';
import { MINIMUM_GAS_PRICE_GWEI } from '../../../../utils/constants/web3Constants';
import {ENABLE_SIGNED_IN_REDESIGN} from '../../../../../env/index';
import {
  SettingsActionFooter,
  SettingsRow,
  SettingsScreen,
  SettingsSection,
  SettingsSwitchRow,
} from '../../components/SettingsScaffold';

const NO_DEFAULT = 'None';

const WalletSettings = props => {
  const isMounted = useRef(false);
  const generalWalletSettings = useObjectSelector(
    state => state.settings.generalWalletSettings,
  );
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const dispatch = useDispatch();

  const [settings, setSettings] = useState({...generalWalletSettings});
  const [homeCardDragDetection, setHomeCardDragDetection] = useState(
    generalWalletSettings.homeCardDragDetection != null
      ? generalWalletSettings.homeCardDragDetection
      : false,
  );
  const [allowSettingVerusPaySlippage, setAllowSettingVerusPaySlippage] = useState(
    !!generalWalletSettings.allowSettingVerusPaySlippage
  );
  const [enableSendCoinCameraToggle, setEnableSendCoinCameraToggle] = useState(
    !!generalWalletSettings.enableSendCoinCameraToggle
  );
  const [enableExperimentalGenericRequests, setEnableExperimentalGenericRequests] = useState(
    !!generalWalletSettings.enableExperimentalGenericRequests
  );

  const [errors, setErrors] = useState({
    maxTxCount: false,
    minGasPriceGwei: false,
    displayCurrency: false,
  });
  const [loading, setLoading] = useState(false);
  const [currentNumberInputModal, setCurrentNumberInputModal] = useState(null);
  const [displayCurrencyModalOpen, setDisplayCurrencyModalOpen] =
    useState(false);
  const [defaultProfileModalOpen, setDefaultProfileModalOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const openNumberInputModal = inputKey => setCurrentNumberInputModal(inputKey);
  const closeNumberInputModal = () => setCurrentNumberInputModal(null);
  const openDisplayCurrencyModal = () => setDisplayCurrencyModalOpen(true);
  const closeDisplayCurrencyModal = () => setDisplayCurrencyModalOpen(false);
  const openDefaultProfileModal = () => setDefaultProfileModalOpen(true);
  const closeDefaultProfileModal = () => setDefaultProfileModalOpen(false);

  const handleSubmit = () => {
    Keyboard.dismiss();
    validateFormData();
  };

  useEffect(() => {
    if (isMounted.current) {
      setSettings({
        ...settings,
        homeCardDragDetection,
        allowSettingVerusPaySlippage,
        enableSendCoinCameraToggle,
        enableExperimentalGenericRequests
      });
      setHasChanges(true);
    } else {
      isMounted.current = true;
    }
  }, [homeCardDragDetection, allowSettingVerusPaySlippage, enableSendCoinCameraToggle, enableExperimentalGenericRequests]);

  const describeSlippage = () => {
    createAlert(
      "Slippage", 
      "Before editing maximum slippage on your VerusPay invoices, ensure you are aware of the risks. " +
      "The maximum slippage value is used to limit which currencies others will be allowed to pay your invoice with." + 
      " The percentage value you set is the maximum allowed difference between the estimated conversion outcome of the payee's chosen " + 
      "conversion path, and the real outcome. This value is calculated for each currency using factors that determine their" + 
      " respective volatilites, like the amount of currency in their respective reserves. Setting a high slippage value introduces " + 
      " the risk of receiving an amount of currency unexpectedly lower than what you set as the invoice amount."
    )
  }

  const toggleAllowSettingVerusPaySlippage = () => {
    if (!allowSettingVerusPaySlippage) {
      describeSlippage()
    }

    setAllowSettingVerusPaySlippage(!allowSettingVerusPaySlippage);
  }

  const toggleEnableSendCoinCameraToggle = () => {
    setEnableSendCoinCameraToggle(!enableSendCoinCameraToggle);
  }

  const toggleEnableExperimentalGenericRequests = () => {
    setEnableExperimentalGenericRequests(!enableExperimentalGenericRequests);
  }

  const saveSettings = async () => {
    setLoading(true);
    try {
      const stateToSave = {
        maxTxCount: Number(settings.maxTxCount),
        minGasPriceGwei: settings.minGasPriceGwei == null || isNaN(settings.minGasPriceGwei) ? undefined : Number(settings.minGasPriceGwei),
        displayCurrency: settings.displayCurrency,
        defaultAccount:
          settings.defaultAccount === NO_DEFAULT ? null : settings.defaultAccount,
        homeCardDragDetection,
        allowSettingVerusPaySlippage,
        enableSendCoinCameraToggle,
        enableExperimentalGenericRequests,
        ackedCurrencyDisclaimer: settings.ackedCurrencyDisclaimer,
        addressBlocklistDefinition:
          settings.addressBlocklistDefinition == null
            ? {
                type: ADDRESS_BLOCKLIST_FROM_WEBSERVER,
                data: null,
              }
            : settings.addressBlocklistDefinition,
        addressBlocklist:
          settings.addressBlocklist == null ? [] : settings.addressBlocklist,
        vrpcOverrides: settings.vrpcOverrides == null ? {} : settings.vrpcOverrides,
      };
      const res = await saveGeneralSettings(stateToSave);
      dispatch(res);
      createAlert('Success', 'General wallet settings saved.');
      setSettings({...stateToSave});
      setLoading(false);
    } catch (err) {
      createAlert('Error', err.message);
      console.warn(err.message);
      setLoading(false);
    }
  };

  const handleError = (error, field) => {
    Alert.alert(error);
  };

  const back = () => {
    props.navigation.dispatch(NavigationActions.back());
  };

  const validateFormData = () => {
    setErrors({maxTxCount: null, minGasPriceGwei: null, displayCurrency: null});
    let _errors = false;
    const _maxTxCount = settings.maxTxCount;
    const _minGasPriceGwei = settings.minGasPriceGwei;

    if (
      !_maxTxCount ||
      _maxTxCount.length === 0 ||
      isNaN(_maxTxCount) ||
      Number(_maxTxCount) < 10 ||
      Number(_maxTxCount) > 100
    ) {
      handleError('Please enter a valid number from 10 to 100', 'maxTxCount');
      _errors = true;
    } else if (
      _minGasPriceGwei != null && (_minGasPriceGwei.length === 0 || isNaN(_minGasPriceGwei))
    ) {
      handleError('Please enter a valid minimum gas price in Gwei', '_minGasPriceGwei');
      _errors = true;
    }

    if (!_errors) {
      saveSettings();
    }
  };

  const defaultAccount =
    settings.defaultAccount == null
      ? null
      : accounts.find(item => item.accountHash === settings.defaultAccount);
  const defaultAccountName = defaultAccount == null ? null : defaultAccount.id;

  return (
    <>
      <Portal>
        {currentNumberInputModal != null && (
          <NumberPadModal
            value={
              settings[currentNumberInputModal] == null || isNaN(settings[currentNumberInputModal]) ? 
                0
                : 
                Number(settings[currentNumberInputModal])
            }
            visible={currentNumberInputModal != null}
            onChange={(number) => {
              setSettings({
                ...settings,
                [currentNumberInputModal]: number.toString(),
              });
              setHasChanges(true);
            }}
            cancel={() => closeNumberInputModal()}
            decimals={0}
          />
        )}
        {displayCurrencyModalOpen && (
          <ListSelectionModal
            title="Currencies"
            selectedKey={settings.displayCurrency}
            visible={displayCurrencyModalOpen}
            onSelect={(item) => {
              setSettings({
                ...settings,
                displayCurrency: item.key,
              });
              setHasChanges(true);
            }}
            data={SUPPORTED_UNIVERSAL_DISPLAY_CURRENCIES.map(key => ({
              key,
              title: key,
              description: CURRENCY_NAMES[key],
            }))}
            cancel={() => closeDisplayCurrencyModal()}
          />
        )}
        {defaultProfileModalOpen && (
          <ListSelectionModal
            title="Profiles"
            selectedKey={settings.defaultAccount}
            visible={defaultProfileModalOpen}
            onSelect={(item) => {
              setSettings({
                ...settings,
                defaultAccount: item.key,
              });
              setHasChanges(true);
            }}
            data={[
              {
                key: NO_DEFAULT,
                title: 'None',
                description: 'Manually select profile on app start',
              },
              ...accounts.map(item => ({
                key: item.accountHash,
                title: item.id,
                description:
                  item.id === activeAccount.id ? 'Currently logged in' : null,
              })),
            ]}
            cancel={() => closeDefaultProfileModal()}
          />
        )}
      </Portal>
      <SettingsScreen
        footer={
          <SettingsActionFooter
            busy={loading}
            busyLabel="Saving wallet settings…"
            primaryDisabled={!hasChanges}
            primaryLabel="Confirm"
            primaryOnPress={handleSubmit}
            primaryTestID="settings.general.confirm"
            secondaryDisabled={loading}
            secondaryLabel="Back"
            secondaryOnPress={back}
          />
        }
        testID="settings.general">
        <SettingsSection title="Display">
          <SettingsRow
            description="Maximum displayed Electrum transactions"
            icon="format-list-numbered"
            onPress={() => openNumberInputModal('maxTxCount')}
            title="Max. display TXs"
            value={settings.maxTxCount}
          />
          <SettingsRow
            description="Currency used to display wallet value"
            icon="currency-usd"
            onPress={openDisplayCurrencyModal}
            title="Universal display currency"
            value={settings.displayCurrency}
          />
          {!ENABLE_SIGNED_IN_REDESIGN && (
            <SettingsSwitchRow
              description="Move home screen cards when dragged"
              icon="gesture-swipe"
              onValueChange={setHomeCardDragDetection}
              title="Automatic drag detection"
              value={homeCardDragDetection}
            />
          )}
          <SettingsSwitchRow
            description="Show maximum slippage when creating a converted VerusPay invoice"
            icon="chart-bell-curve"
            onValueChange={toggleAllowSettingVerusPaySlippage}
            title="Edit max VerusPay invoice slippage"
            value={allowSettingVerusPaySlippage}
          />
          <SettingsSwitchRow
            description="Keep the send QR scanner off until its toggle is pressed"
            icon="qrcode-scan"
            onValueChange={toggleEnableSendCoinCameraToggle}
            title="Add toggle button for QR scanner"
            value={enableSendCoinCameraToggle}
          />
          <SettingsSwitchRow
            description="Allow deeplinks for identity update, app encryption, and other experimental features"
            icon="link-variant"
            last
            onValueChange={toggleEnableExperimentalGenericRequests}
            title="Enable experimental deeplinks"
            value={enableExperimentalGenericRequests}
          />
        </SettingsSection>

        <SettingsSection title="Startup">
          <SettingsRow
            description="Automatically selected profile on app start"
            icon="account-arrow-right-outline"
            last
            onPress={openDefaultProfileModal}
            title="Default profile"
            value={defaultAccountName == null ? NO_DEFAULT : defaultAccountName}
          />
        </SettingsSection>

        <SettingsSection title="Ethereum">
          <SettingsRow
            description="Minimum Gwei used for simple ETH and ERC20 transfers"
            descriptionNumberOfLines={3}
            icon="gas-station-outline"
            last
            onPress={() => openNumberInputModal('minGasPriceGwei')}
            title="Min. ETH gas price"
            value={
              settings.minGasPriceGwei == null
                ? Number(MINIMUM_GAS_PRICE_GWEI)
                : settings.minGasPriceGwei
            }
          />
        </SettingsSection>
      </SettingsScreen>
    </>
  );
};

export default WalletSettings;
