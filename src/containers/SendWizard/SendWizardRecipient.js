import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  BackHandler,
  Clipboard,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {ethers} from 'ethers';
import {fromBase58Check} from 'verus-typescript-primitives';
import BarcodeReader from '../../components/BarcodeReader/BarcodeReader';
import {fontStyle} from '../../globals/fonts';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import QrScanner from '../../utils/QrScanner/QrScanner';
import {addressIsBlocked} from '../../utils/addressBlocklist';
import {selectAddressBlocklist} from '../../selectors/settings';
import {
  I_ADDRESS_VERSION,
  R_ADDRESS_VERSION,
} from '../../utils/constants/constants';
import {ERC20, ETH} from '../../utils/constants/intervalConstants';
import {
  addressBookRecordMatchesContext,
  loadAddressBook,
  saveAddressBook,
} from '../../utils/addressBook/addressBook';
import {getIdentity} from '../../utils/api/channels/verusid/requests/getIdentity';
import {timeout} from '../../utils/promises';
import AddressBookEditSheet from '../Services/AddressBook/AddressBookEditSheet';
import {useSendWizard} from './SendWizardContext';
import AddressBookSheet from './components/AddressBookSheet';
import SelfAddressSheet from './components/SelfAddressSheet';
import {
  WizardFormLayout,
  WIZARD_CONTENT_TOP_INSET,
  WizardScreen,
} from './components/WizardUI';
import {ADDRESS_TYPE} from './wizardUtils';

const SendWizardRecipient = () => {
  const navigation = useNavigation();
  const theme = useOnboardingTheme();
  const {state, setRecipient} = useSendWizard();
  const {channel, sourceCoin, target, route} = state;
  const blocklist = useSelector(selectAddressBlocklist);
  const activeAccount = useObjectSelector(
    stateValue => stateValue.authentication.activeAccount,
  );
  const allSubWallets = useObjectSelector(
    stateValue => stateValue.coinMenus.allSubWallets,
  );
  const [input, setInput] = useState(state.recipientAddress || '');
  const [error, setError] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [addressBookOpen, setAddressBookOpen] = useState(false);
  const [saveAddressOpen, setSaveAddressOpen] = useState(false);
  const [selfAddressOpen, setSelfAddressOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [inputFocused, setInputFocused] = useState(false);
  const [resolving, setResolving] = useState(false);
  const lookup = useRef({generation: 0, pending: false});

  const cancelLookup = useCallback(() => {
    lookup.current.generation += 1;
    lookup.current.pending = false;
    setResolving(false);
  }, []);

  useEffect(cancelLookup, [cancelLookup, channel, input, route]);
  useFocusEffect(useCallback(() => cancelLookup, [cancelLookup]));

  useEffect(() => {
    let active = true;

    loadAddressBook()
      .then(records => {
        if (active) setSavedAddresses(records);
      })
      .catch(() => {
        if (active) setSavedAddresses([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const ownAddresses = useMemo(() => {
    const addresses = [];
    const seen = new Set();

    if (route?.addressType === ADDRESS_TYPE.ETHEREUM) {
      Object.entries(activeAccount?.keys || {}).forEach(([coinId, coinKeys]) => {
        const values = [
          ...(coinKeys?.[ETH]?.addresses || []),
          ...(coinKeys?.[ERC20]?.addresses || []),
        ];
        values.forEach(address => {
          if (!ethers.isAddress(address) || seen.has(address)) return;
          seen.add(address);
          addresses.push({id: `${coinId}:${address}`, address});
        });
      });
    } else if (route?.addressType === ADDRESS_TYPE.VERUS) {
      Object.values(allSubWallets || {})
        .flat()
        .forEach(card => {
          const channelParts = String(card?.channel || '').split('.');
          const address = channelParts.length > 2 ? channelParts[1] : null;
          if (!address || seen.has(address)) return;
          seen.add(address);
          addresses.push({
            id: card.id || address,
            address,
            verusIdName: card.name?.endsWith('@') ? card.name : null,
          });
        });
    }

    return addresses;
  }, [activeAccount, allSubWallets, route?.addressType]);

  const validation = useMemo(() => {
    const address = input.trim();
    if (!address) return {valid: false, message: null};
    if (addressIsBlocked(address, blocklist)) {
      return {valid: false, message: 'This destination is in your blocked-address list.'};
    }
    try {
      if (route?.addressType === ADDRESS_TYPE.ETHEREUM) {
        return ethers.isAddress(address)
          ? {valid: true, message: null}
          : {valid: false, message: 'Enter a valid Ethereum address.'};
      }
      if (route?.addressType === ADDRESS_TYPE.GENERIC) {
        return address.length >= 20 &&
          address.length <= 256 &&
          !/\s/.test(address)
          ? {valid: true, message: null}
          : {
              valid: false,
              message: 'Enter an address supported by this network.',
            };
      }
      if (address.endsWith('@')) return {valid: true, message: null};
      const {version} = fromBase58Check(address);
      return version === R_ADDRESS_VERSION || version === I_ADDRESS_VERSION
        ? {valid: true, message: null}
        : {valid: false, message: 'Enter a valid Verus address or VerusID.'};
    } catch (validationError) {
      return {valid: false, message: 'Enter a valid Verus address or VerusID.'};
    }
  }, [blocklist, input, route?.addressType]);

  const paste = async () => {
    try {
      const value = await Clipboard.getString();
      if (value) {
        setInput(value.trim());
        setError(null);
      }
    } catch (pasteError) {
      setError('Clipboard content could not be read.');
    }
  };

  const openScanner = () => {
    Keyboard.dismiss();
    setScannerOpen(true);
  };

  const closeScanner = useCallback(() => setScannerOpen(false), []);

  // While the camera is open the header names it, and Back returns to the
  // address field instead of the previous step.
  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: !scannerOpen,
      wizardOnBack: scannerOpen ? closeScanner : undefined,
      wizardTitle: scannerOpen ? 'Scan address' : undefined,
    });
  }, [closeScanner, navigation, scannerOpen]);

  useFocusEffect(
    useCallback(() => {
      if (!scannerOpen) return undefined;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        closeScanner();
        return true;
      });
      return () => subscription.remove();
    }, [closeScanner, scannerOpen]),
  );

  const handleScan = codes => {
    const raw = codes?.[0]?.value;
    setScannerOpen(false);
    if (typeof raw !== 'string' || raw.length > 5000) {
      setError('Could not read this QR code.');
      return;
    }

    try {
      const request = QrScanner.processGenericPaymentRequest(raw);
      if (
        request.coinObj &&
        !target?.isConversion &&
        request.coinObj.id !== sourceCoin.id
      ) {
        throw new Error(`This request is for ${request.coinObj.display_ticker}, not ${sourceCoin.display_ticker}.`);
      }
      setInput(String(request.address || '').trim());
      setError(null);
    } catch (scanError) {
      setError(scanError.message || 'This QR code is not a supported payment destination.');
    }
  };

  const continueToReview = async () => {
    if (lookup.current.pending) return;
    if (!validation.valid) {
      setError(validation.message || 'Enter a recipient.');
      return;
    }
    const address = input.trim();
    if (route?.addressType === ADDRESS_TYPE.VERUS && address.endsWith('@')) {
      const generation = ++lookup.current.generation;
      lookup.current.pending = true;
      setResolving(true);
      setError(null);
      try {
        // Match preflight: resolve on the source system's existing endpoint.
        const systemId = channel?.split('.')[2] || sourceCoin?.system_id;
        const result = await timeout(15000, getIdentity(systemId, address));
        if (generation !== lookup.current.generation) return;
        if (result?.error || !result?.result?.identity?.identityaddress) {
          setError(
            result?.error?.code === -5
              ? 'VerusID not found. Check the name and try again.'
              : 'Could not verify this VerusID. Try again.',
          );
          return;
        }
      } catch (lookupError) {
        if (generation !== lookup.current.generation) return;
        setError('Could not verify this VerusID. Try again.');
        return;
      } finally {
        if (generation === lookup.current.generation) {
          lookup.current.pending = false;
          setResolving(false);
        }
      }
    }
    setRecipient(address);
    navigation.navigate('SendWizardConfirm');
  };

  const selectOwnAddress = item => {
    setInput(item.verusIdName || item.address);
    setError(null);
    setSelfAddressOpen(false);
  };

  const openOwnAddresses = () => {
    if (ownAddresses.length === 1) selectOwnAddress(ownAddresses[0]);
    else if (ownAddresses.length > 1) setSelfAddressOpen(true);
  };

  const context = {
    asset: target?.ticker,
    network:
      route?.exportToFqn ||
      channel?.split('.')[2] ||
      sourceCoin?.system_id ||
      sourceCoin?.id,
    addressType: route?.addressType,
  };
  const matchingSavedAddresses = savedAddresses.filter(record =>
    addressBookRecordMatchesContext(record, context),
  );
  const inputAlreadySaved = savedAddresses.some(
    record => record.address.toLowerCase() === input.trim().toLowerCase(),
  );
  const showSaveOption = validation.valid && !error && !inputAlreadySaved;

  const saveNewAddress = async record => {
    try {
      const nextRecords = await saveAddressBook(
        [
          ...savedAddresses,
          {
            ...record,
            id: `${Date.now()}`,
            asset: context.asset,
            network: context.network,
          },
        ],
        activeAccount?.accountHash,
      );
      setSavedAddresses(nextRecords);
      setSaveAddressOpen(false);
    } catch (saveError) {
      setError(saveError.message || 'Could not save this address.');
      throw saveError;
    }
  };

  if (scannerOpen) {
    return (
      <View style={[styles.scanner, {backgroundColor: theme.colors.background}]}>
        <BarcodeReader
          horizontalInset={16}
          noCameraAction={{label: 'Enter address', onPress: closeScanner}}
          noCameraHint="Paste or type the address instead."
          onScan={handleScan}
          style={styles.scannerContent}
        />
      </View>
    );
  }

  return (
    <WizardScreen scroll={false}>
      <WizardFormLayout
        contentContainerStyle={styles.content}
        error={error || validation.message}
        disabled={!validation.valid}
        loading={resolving}
        loadingText="Checking VerusID…"
        onPress={continueToReview}>
        {errorMessage => <>
          <View
            style={[
              styles.inputShell,
              (error || validation.message) && styles.inputWithError,
              {
                backgroundColor: inputFocused
                  ? theme.colors.inputFocused
                  : theme.colors.input,
                borderColor:
                  error || validation.message
                    ? theme.colors.danger
                    : inputFocused
                    ? theme.colors.primary
                    : 'transparent',
              },
            ]}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              onBlur={() => setInputFocused(false)}
              onChangeText={value => {
                setInput(value);
                setError(null);
              }}
              onFocus={() => setInputFocused(true)}
              placeholder={
                route?.addressType === ADDRESS_TYPE.ETHEREUM
                  ? 'Ethereum address'
                  : route?.addressType === ADDRESS_TYPE.VERUS
                  ? 'Verus address or VerusID'
                  : 'Recipient address'
              }
              placeholderTextColor={theme.colors.textSubtle}
              style={[styles.input, {color: theme.colors.textPrimary}]}
              value={input}
            />
            <View style={styles.inputActions}>
              <Pressable accessibilityLabel="Paste address" accessibilityRole="button" onPress={paste} style={styles.inputAction}>
                <MaterialCommunityIcons name="content-paste" size={20} color={theme.colors.textSubtle} />
              </Pressable>
              <Pressable accessibilityLabel="Scan address QR" accessibilityRole="button" onPress={openScanner} style={styles.inputAction}>
                <MaterialCommunityIcons name="qrcode-scan" size={20} color={theme.colors.textSubtle} />
              </Pressable>
            </View>
          </View>
          {errorMessage}
          {showSaveOption ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setSaveAddressOpen(true)}
              style={[styles.saveAddress, {backgroundColor: theme.colors.surfaceMuted}]}>
              <MaterialCommunityIcons name="account-plus" size={18} color={theme.colors.primary} />
              <Text style={[styles.saveAddressText, {color: theme.colors.primary}]}>Save to address book</Text>
            </Pressable>
          ) : null}
          {matchingSavedAddresses.length > 0 || ownAddresses.length > 0 ? (
            <View style={[styles.actionRows, {borderTopColor: theme.colors.border}]}>
              {matchingSavedAddresses.length > 0 ? (
                <RecipientActionRow
                  count={`${matchingSavedAddresses.length}`}
                  label="Saved addresses"
                  onPress={() => setAddressBookOpen(true)}
                />
              ) : null}
              {ownAddresses.length > 0 ? (
                <RecipientActionRow
                  count={`${ownAddresses.length}`}
                  label="Send to self"
                  onPress={openOwnAddresses}
                />
              ) : null}
            </View>
          ) : null}
        </>}
      </WizardFormLayout>
      <AddressBookSheet
        visible={addressBookOpen}
        context={context}
        onRecordsLoaded={setSavedAddresses}
        onClose={() => setAddressBookOpen(false)}
        onSelect={record => {
          setInput(record.address);
          setError(null);
          setAddressBookOpen(false);
        }}
      />
      <SelfAddressSheet
        addressType={route?.addressType}
        addresses={ownAddresses}
        onClose={() => setSelfAddressOpen(false)}
        onSelect={selectOwnAddress}
        visible={selfAddressOpen}
      />
      <AddressBookEditSheet
        initialAddress={input.trim()}
        onClose={() => setSaveAddressOpen(false)}
        onSave={saveNewAddress}
        visible={saveAddressOpen}
      />
    </WizardScreen>
  );
};

// Flat list action under the address field; the list container draws the top
// hairline.
const RecipientActionRow = ({count, label, onPress}) => {
  const theme = useOnboardingTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.actionRow,
        {borderBottomColor: theme.colors.border},
        pressed && styles.actionPressed,
      ]}>
      <Text style={[styles.actionLabel, {color: theme.colors.textPrimary}]}>{label}</Text>
      <Text style={[styles.actionCount, {color: theme.colors.textSecondary}]}>{count}</Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textSubtle} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  content: {flexGrow: 1, paddingHorizontal: 16, paddingTop: WIZARD_CONTENT_TOP_INSET, paddingBottom: 20},
  inputShell: {minHeight: 56, marginBottom: 12, borderRadius: 12, borderWidth: 1, position: 'relative', flexDirection: 'row', alignItems: 'center'},
  inputWithError: {marginBottom: 0},
  input: {flex: 1, minHeight: 56, maxHeight: 96, paddingLeft: 16, paddingRight: 90, paddingTop: 19, paddingBottom: 16, fontSize: 16, lineHeight: 22, ...fontStyle('regular')},
  inputActions: {position: 'absolute', right: 8, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center'},
  inputAction: {width: 36, height: 36, alignItems: 'center', justifyContent: 'center'},
  saveAddress: {alignSelf: 'flex-start', borderRadius: 20, marginTop: 8, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center'},
  saveAddressText: {fontSize: 13, lineHeight: 18, marginLeft: 6, ...fontStyle('semiBold')},
  actionRows: {marginTop: 8, marginBottom: 24, borderTopWidth: StyleSheet.hairlineWidth},
  actionPressed: {opacity: 0.7},
  actionRow: {minHeight: 62, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center'},
  actionLabel: {flex: 1, fontSize: 16, lineHeight: 22, ...fontStyle('semiBold')},
  actionCount: {fontSize: 14, lineHeight: 20, marginRight: 6, ...fontStyle('regular')},
  scanner: {flex: 1},
  scannerContent: {paddingTop: WIZARD_CONTENT_TOP_INSET},
});

export default SendWizardRecipient;
