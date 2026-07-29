/*
  This component allows the user to modify the general
  wallet settings. This includes things like maximum transaction
  display size.
*/

import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert} from 'react-native';
import {Portal} from 'react-native-paper';
import {useDispatch} from 'react-redux';
import {saveGeneralSettings} from '../../../../actions/actionCreators';
import {createAlert} from '../../../../actions/actions/alert/dispatchers/alert';
import ListSelectionModal from '../../../../components/ListSelectionModal/ListSelectionModal';
import NumberPadModal from '../../../../components/NumberPadModal/NumberPadModal';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {
  CURRENCY_NAMES,
  SUPPORTED_UNIVERSAL_DISPLAY_CURRENCIES,
} from '../../../../utils/constants/currencies';
import {MINIMUM_GAS_PRICE_GWEI} from '../../../../utils/constants/web3Constants';
import {ENABLE_SIGNED_IN_REDESIGN} from '../../../../../env/index';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
  SettingsSwitchRow,
} from '../../components/SettingsScaffold';

const SETTING_LABELS = {
  allowSettingVerusPaySlippage: 'VerusPay slippage preference',
  displayCurrency: 'display currency',
  enableExperimentalGenericRequests: 'experimental deeplinks preference',
  enableSendCoinCameraToggle: 'QR scanner preference',
  homeCardDragDetection: 'automatic drag detection',
  maxTxCount: 'maximum displayed transactions',
  minGasPriceGwei: 'minimum ETH gas price',
};

const hasSetting = (settings, key) =>
  Object.prototype.hasOwnProperty.call(settings, key);

const validateNumberSetting = (key, value) => {
  const stringValue = value == null ? '' : value.toString();

  if (
    key === 'maxTxCount' &&
    (!value ||
      stringValue.length === 0 ||
      isNaN(value) ||
      Number(value) < 10 ||
      Number(value) > 100)
  ) {
    return 'Please enter a valid number from 10 to 100';
  }

  if (
    key === 'minGasPriceGwei' &&
    value != null &&
    (stringValue.length === 0 || isNaN(value))
  ) {
    return 'Please enter a valid minimum gas price in Gwei';
  }

  return null;
};

const GeneralWalletSettings = () => {
  const generalWalletSettings = useObjectSelector(
    state => state.settings.generalWalletSettings,
  );
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const isMounted = useRef(true);
  const pendingSettingsRef = useRef({});

  const [pendingSettings, setPendingSettings] = useState({});
  const [currentNumberInputModal, setCurrentNumberInputModal] = useState(null);
  const [displayCurrencyModalOpen, setDisplayCurrencyModalOpen] =
    useState(false);

  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  const displayedSetting = key =>
    hasSetting(pendingSettings, key)
      ? pendingSettings[key]
      : generalWalletSettings[key];
  const isSaving = key => hasSetting(pendingSettings, key);

  const setPendingSetting = (key, value) => {
    const nextPendingSettings = {
      ...pendingSettingsRef.current,
      [key]: value,
    };
    pendingSettingsRef.current = nextPendingSettings;

    if (isMounted.current) {
      setPendingSettings(nextPendingSettings);
    }
  };

  const clearPendingSetting = key => {
    const nextPendingSettings = {...pendingSettingsRef.current};
    delete nextPendingSettings[key];
    pendingSettingsRef.current = nextPendingSettings;

    if (isMounted.current) {
      setPendingSettings(nextPendingSettings);
    }
  };

  const persistSetting = async (key, value) => {
    if (
      hasSetting(pendingSettingsRef.current, key) ||
      Object.is(generalWalletSettings[key], value)
    ) {
      return;
    }

    setPendingSetting(key, value);

    try {
      dispatch(await saveGeneralSettings({[key]: value}));
    } catch (err) {
      const errorMessage =
        err && err.message ? err.message : 'The settings store was unavailable.';
      createAlert(
        `Unable to save ${SETTING_LABELS[key]}`,
        `${errorMessage}\n\nYour previous value is still active. Please try again.`,
      );
      console.warn(`Failed to save ${key}: ${errorMessage}`);
    } finally {
      clearPendingSetting(key);
    }
  };

  const describeSlippage = () =>
    createAlert(
      'Slippage',
      'Before editing maximum slippage on your VerusPay invoices, ensure you are aware of the risks. ' +
        'The maximum slippage value is used to limit which currencies others will be allowed to pay your invoice with.' +
        " The percentage value you set is the maximum allowed difference between the estimated conversion outcome of the payee's chosen " +
        'conversion path, and the real outcome. This value is calculated for each currency using factors that determine their' +
        ' respective volatilites, like the amount of currency in their respective reserves. Setting a high slippage value introduces ' +
        ' the risk of receiving an amount of currency unexpectedly lower than what you set as the invoice amount.',
    );

  const toggleAllowSettingVerusPaySlippage = async value => {
    if (value) {
      await describeSlippage();
    }

    if (isMounted.current) {
      persistSetting('allowSettingVerusPaySlippage', value);
    }
  };

  const openNumberInputModal = key => {
    const currentValue =
      key === 'minGasPriceGwei' && displayedSetting(key) == null
        ? Number(MINIMUM_GAS_PRICE_GWEI)
        : Number(displayedSetting(key));

    setCurrentNumberInputModal({
      key,
      value: isNaN(currentValue) ? 0 : currentValue,
    });
  };

  const closeNumberInputModal = () => setCurrentNumberInputModal(null);

  const commitNumberInput = (key, value) => {
    const error = validateNumberSetting(key, value);

    if (error) {
      Alert.alert(error);
      return false;
    }

    closeNumberInputModal();
    persistSetting(key, Number(value));
    return true;
  };

  const savingIndicator = key =>
    isSaving(key) ? (
      <ActivityIndicator color={theme.colors.primary} size="small" />
    ) : null;

  return (
    <>
      <Portal>
        {currentNumberInputModal != null && (
          <NumberPadModal
            cancel={closeNumberInputModal}
            decimals={0}
            submit={value =>
              commitNumberInput(currentNumberInputModal.key, value)
            }
            value={currentNumberInputModal.value}
            visible
          />
        )}
        {displayCurrencyModalOpen && (
          <ListSelectionModal
            cancel={() => setDisplayCurrencyModalOpen(false)}
            data={SUPPORTED_UNIVERSAL_DISPLAY_CURRENCIES.map(key => ({
              key,
              title: key,
              description: CURRENCY_NAMES[key],
            }))}
            onSelect={item => persistSetting('displayCurrency', item.key)}
            selectedKey={displayedSetting('displayCurrency')}
            title="Currencies"
            visible
          />
        )}
      </Portal>
      <SettingsScreen
        safeAreaEdges={['left', 'right', 'bottom']}
        testID="settings.general">
        <SettingsSection title="Display">
          <SettingsRow
            accessibilityState={{busy: isSaving('maxTxCount')}}
            description="Maximum displayed Electrum transactions"
            disabled={isSaving('maxTxCount')}
            icon="format-list-numbered"
            onPress={() => openNumberInputModal('maxTxCount')}
            testID="settings.general.maxTxCount"
            title="Max. display TXs"
            trailing={savingIndicator('maxTxCount')}
            value={displayedSetting('maxTxCount')}
          />
          <SettingsRow
            accessibilityState={{busy: isSaving('displayCurrency')}}
            description="Currency used to display wallet value"
            disabled={isSaving('displayCurrency')}
            icon="currency-usd"
            onPress={() => setDisplayCurrencyModalOpen(true)}
            testID="settings.general.displayCurrency"
            title="Universal display currency"
            trailing={savingIndicator('displayCurrency')}
            value={displayedSetting('displayCurrency')}
          />
          {!ENABLE_SIGNED_IN_REDESIGN && (
            <SettingsSwitchRow
              busy={isSaving('homeCardDragDetection')}
              description="Move home screen cards when dragged"
              icon="gesture-swipe"
              onValueChange={value =>
                persistSetting('homeCardDragDetection', value)
              }
              testID="settings.general.homeCardDragDetection"
              title="Automatic drag detection"
              value={displayedSetting('homeCardDragDetection')}
            />
          )}
          <SettingsSwitchRow
            busy={isSaving('allowSettingVerusPaySlippage')}
            description="Show maximum slippage when creating a converted VerusPay invoice"
            icon="chart-bell-curve"
            onValueChange={toggleAllowSettingVerusPaySlippage}
            testID="settings.general.allowSettingVerusPaySlippage"
            title="Edit max VerusPay invoice slippage"
            value={displayedSetting('allowSettingVerusPaySlippage')}
          />
          <SettingsSwitchRow
            busy={isSaving('enableSendCoinCameraToggle')}
            description="Keep the send QR scanner off until its toggle is pressed"
            icon="qrcode-scan"
            onValueChange={value =>
              persistSetting('enableSendCoinCameraToggle', value)
            }
            testID="settings.general.enableSendCoinCameraToggle"
            title="Add toggle button for QR scanner"
            value={displayedSetting('enableSendCoinCameraToggle')}
          />
          <SettingsSwitchRow
            busy={isSaving('enableExperimentalGenericRequests')}
            description="Allow deeplinks that include experimental features (identity update, app encryption, credentials, data packets, etc.)"
            descriptionNumberOfLines={100}
            icon="link-variant"
            last
            onValueChange={value =>
              persistSetting('enableExperimentalGenericRequests', value)
            }
            testID="settings.general.enableExperimentalGenericRequests"
            title="Enable experimental deeplinks"
            value={displayedSetting('enableExperimentalGenericRequests')}
          />
        </SettingsSection>

        <SettingsSection title="Ethereum">
          <SettingsRow
            accessibilityState={{busy: isSaving('minGasPriceGwei')}}
            description="Minimum Gwei used for simple ETH and ERC20 transfers"
            descriptionNumberOfLines={3}
            disabled={isSaving('minGasPriceGwei')}
            icon="gas-station-outline"
            last
            onPress={() => openNumberInputModal('minGasPriceGwei')}
            testID="settings.general.minGasPriceGwei"
            title="Min. ETH gas price"
            trailing={savingIndicator('minGasPriceGwei')}
            value={
              displayedSetting('minGasPriceGwei') == null
                ? Number(MINIMUM_GAS_PRICE_GWEI)
                : displayedSetting('minGasPriceGwei')
            }
          />
        </SettingsSection>
      </SettingsScreen>
    </>
  );
};

export default GeneralWalletSettings;
