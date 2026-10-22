/*
  This component allows the user to modify the general
  wallet settings. This includes things like maximum transaction
  display size.
*/

import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator} from 'react-native';
import AlertAsync from 'react-native-alert-async';
import {useDispatch} from 'react-redux';
import {saveGeneralSettings} from '../../../../actions/actionCreators';
import {switchTestnetEnvironment} from '../../../../actions/actions/testnetEnvironment';
import {
  createAlert,
  resolveAlert,
} from '../../../../actions/actions/alert/dispatchers/alert';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {MINIMUM_GAS_PRICE_GWEI} from '../../../../utils/constants/web3Constants';
import {
  TESTNET_ENVIRONMENT_PRIVATE,
  TESTNET_ENVIRONMENT_PUBLIC,
} from '../../../../utils/testnetEnvironment';
import {ENABLE_SIGNED_IN_REDESIGN} from '../../../../../env/index';
import {DisplayCurrencySheet} from '../../../Home/components/SignedInWalletSheets';
import {
  SettingsRow,
  SettingsScreen,
  SettingsSection,
  SettingsSwitchRow,
} from '../../components/SettingsScaffold';
import SettingsFieldSheet from '../../components/SettingsFieldSheet';

const NOT_SAVED = 'Not saved. Try again.';

// The value is a whole number: the ETH fee code reads the gas price with
// BigInt().
const NUMBER_SETTINGS = {
  minGasPriceGwei: {
    title: 'Min. ETH gas price',
    label: 'Gwei',
    helper: 'A whole number, 0 or higher.',
    error: 'Enter a whole number, 0 or higher.',
    min: 0,
    max: Number.MAX_SAFE_INTEGER,
  },
};

const hasSetting = (settings, key) =>
  Object.prototype.hasOwnProperty.call(settings, key);

const validateNumberSetting = (key, value) => {
  const config = NUMBER_SETTINGS[key];
  const text = value == null ? '' : value.toString().trim();

  if (!/^\d+$/.test(text)) return config.error;

  const number = Number(text);

  if (number < config.min || number > config.max) return config.error;

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
  const [rowErrors, setRowErrors] = useState({});
  const [numberSheet, setNumberSheet] = useState(null);
  const [numberSheetVisible, setNumberSheetVisible] = useState(false);
  const [displayCurrencySheetVisible, setDisplayCurrencySheetVisible] =
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

  const setRowError = (key, error) => {
    if (!isMounted.current) return;

    setRowErrors(current => {
      if (!error && !current[key]) return current;

      const next = {...current};
      if (error) {
        next[key] = error;
      } else {
        delete next[key];
      }
      return next;
    });
  };

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
    if (hasSetting(pendingSettingsRef.current, key)) return;

    setRowError(key, null);

    if (Object.is(generalWalletSettings[key], value)) return;

    setPendingSetting(key, value);

    try {
      dispatch(await saveGeneralSettings({[key]: value}));
    } catch (err) {
      // The row reverts to the stored value and shows a short error.
      setRowError(key, NOT_SAVED);
      console.warn(`Failed to save ${key}: ${err?.message || err}`);
    } finally {
      clearPendingSetting(key);
    }
  };

  const toggleTestnetEnvironment = async value => {
    const environment = value
      ? TESTNET_ENVIRONMENT_PRIVATE
      : TESTNET_ENVIRONMENT_PUBLIC;

    if (hasSetting(pendingSettingsRef.current, 'testnetEnvironment')) return;

    const confirmed = await AlertAsync(
      value ? 'Switch to private testnet?' : 'Switch to public testnet?',
      'The app reloads. Testnet currencies you added are removed and need to be added again.',
      [
        {text: 'Cancel', onPress: () => Promise.resolve(false), style: 'cancel'},
        {text: 'Switch', onPress: () => Promise.resolve(true)},
      ],
      {cancelable: false},
    );

    if (!confirmed || !isMounted.current) return;

    setRowError('testnetEnvironment', null);
    setPendingSetting('testnetEnvironment', environment);

    try {
      await switchTestnetEnvironment(environment, dispatch);
    } catch (err) {
      setRowError('testnetEnvironment', NOT_SAVED);
      console.warn(
        `Failed to switch testnet environment: ${err?.message || err}`,
      );
      clearPendingSetting('testnetEnvironment');
    }
  };

  const confirmSlippage = () =>
    createAlert(
      'Turn on invoice slippage?',
      "Maximum slippage is how far a payer's conversion may fall below its estimate. " +
        'It limits which currencies can pay, and a high value can leave you with less than the invoice amount.',
      [
        {text: 'Turn on', onPress: () => resolveAlert(true)},
        {text: 'Not now', style: 'cancel', onPress: () => resolveAlert(false)},
      ],
    );

  const toggleAllowSettingVerusPaySlippage = async value => {
    if (value) {
      const confirmed = await confirmSlippage();

      if (!confirmed) return;
    }

    if (isMounted.current) {
      persistSetting('allowSettingVerusPaySlippage', value);
    }
  };

  const openNumberSheet = key => {
    const currentValue =
      key === 'minGasPriceGwei' && displayedSetting(key) == null
        ? Number(MINIMUM_GAS_PRICE_GWEI)
        : Number(displayedSetting(key));

    setNumberSheet({
      key,
      value: isNaN(currentValue) ? '' : String(currentValue),
    });
    setNumberSheetVisible(true);
  };

  const closeNumberSheet = () => setNumberSheetVisible(false);

  const saveNumberSetting = value => {
    const key = numberSheet?.key;

    if (!key) return null;

    const error = validateNumberSetting(key, value);

    if (error) return error;

    closeNumberSheet();
    persistSetting(key, Number(value));
    return true;
  };

  const numberSheetConfig = numberSheet
    ? NUMBER_SETTINGS[numberSheet.key]
    : null;

  const savingIndicator = key =>
    isSaving(key) ? (
      <ActivityIndicator color={theme.colors.primary} size="small" />
    ) : null;

  return (
    <>
      <SettingsScreen
        safeAreaEdges={['left', 'right', 'bottom']}
        testID="settings.general">
        <SettingsSection title="Display">
          <SettingsRow
            accessibilityState={{busy: isSaving('displayCurrency')}}
            description="Currency used to display wallet value"
            disabled={isSaving('displayCurrency')}
            icon="currency-usd"
            onPress={() => setDisplayCurrencySheetVisible(true)}
            error={rowErrors.displayCurrency}
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
              error={rowErrors.homeCardDragDetection}
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
            error={rowErrors.allowSettingVerusPaySlippage}
            testID="settings.general.allowSettingVerusPaySlippage"
            title="Edit max VerusPay invoice slippage"
            value={displayedSetting('allowSettingVerusPaySlippage')}
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
            error={rowErrors.enableExperimentalGenericRequests}
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
            onPress={() => openNumberSheet('minGasPriceGwei')}
            error={rowErrors.minGasPriceGwei}
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

        {__DEV__ && (
          <SettingsSection title="Developer">
            <SettingsSwitchRow
              busy={isSaving('testnetEnvironment')}
              description="Use the private Verus API and bridge contract"
              icon="flask-outline"
              last
              onValueChange={toggleTestnetEnvironment}
              error={rowErrors.testnetEnvironment}
              testID="settings.general.testnetEnvironment"
              title="Private testnet"
              value={
                displayedSetting('testnetEnvironment') ===
                TESTNET_ENVIRONMENT_PRIVATE
              }
            />
          </SettingsSection>
        )}
      </SettingsScreen>
      {numberSheetConfig ? (
        <SettingsFieldSheet
          helperText={numberSheetConfig.helper}
          initialValue={numberSheet.value}
          keyboardType="number-pad"
          label={numberSheetConfig.label}
          onClose={closeNumberSheet}
          onClosed={() => setNumberSheet(null)}
          onSave={saveNumberSetting}
          saveAccessibilityLabel={`Save ${numberSheetConfig.title}`}
          title={numberSheetConfig.title}
          visible={numberSheetVisible}
        />
      ) : null}
      <DisplayCurrencySheet
        displayCurrency={displayedSetting('displayCurrency')}
        onClose={() => setDisplayCurrencySheetVisible(false)}
        onSelect={currency => persistSetting('displayCurrency', currency)}
        visible={displayCurrencySheetVisible}
      />
    </>
  );
};

export default GeneralWalletSettings;
