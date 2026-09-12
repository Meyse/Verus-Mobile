import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Share,
  TouchableOpacity,
  View,
} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import RNFS from 'react-native-fs';
import QRCode from 'react-native-qrcode-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Checkbox, Text} from 'react-native-paper';
import AppButton from '../../components/AppButton';
import AppTextInput from '../../components/AppTextInput';
import FadedScrollView from '../../components/FadedScrollView';
import ProgressHeader from '../../components/ProgressHeader';
import SafeBottomActionStack from '../../components/SafeBottomActionStack';
import {useOnboardingTheme} from '../../theme/onboarding';
import {truncateDecimal} from '../../utils/math';
import {
  generateReceiveInvoice,
  sanitizeNumericInput,
  validateAmountInput,
  validateSlippageInput,
} from './receiveInvoice';
import {createReceiveDetailsStyles} from './receive.styles';

const DEFAULT_SLIPPAGE = '0.5';
const KEYBOARD_FOOTER_SPACING = 8;

const STEP_AMOUNT = 'amount';
const STEP_SUBJECT = 'subject';
const STEP_SETTINGS = 'settings';
const STEP_RESULT = 'result';

// Messages the invoice pipeline already writes for people. Anything else is
// a technical failure and is replaced with recoverable guidance.
const USER_FACING_MESSAGES = [
  'Enter an amount.',
  'Please enter a valid number.',
  'Enter an amount greater than 0.',
  'Enter a maximum slippage.',
  'Please enter a valid percentage.',
  'Slippage must be greater than 0 and not exceed 100%.',
  'Missing Asset, Card, or address.',
  'Unsupported address format for this payment request.',
];

// The amount is now a normal editable field with the system decimal keypad, so
// a paste can introduce characters the retired on-screen keypad could never
// produce. `isNumber` accepts "1e5" and "0x10" as numbers, so a plain decimal
// guard keeps such text from validating into an unintended invoice, and
// `MAX_AMOUNT_LENGTH` keeps the previous 18-character ceiling.
export const MAX_AMOUNT_LENGTH = 18;

const PLAIN_AMOUNT_PATTERN = /^\d*[.,]?\d*$/;

export const isPlainAmountInput = value =>
  typeof value === 'string' && PLAIN_AMOUNT_PATTERN.test(value);

export const getAmountInputError = value => {
  if (!isPlainAmountInput(value)) return 'Please enter a valid number.';
  return validateAmountInput(sanitizeNumericInput(value));
};

const getStepTitle = step =>
  ({
    [STEP_AMOUNT]: 'Enter amount',
    [STEP_SUBJECT]: 'Add a subject',
    [STEP_SETTINGS]: 'Conversion settings',
    [STEP_RESULT]: 'Payment request ready',
  })[step] || 'Payment request';

const getStepProgress = (step, conversionEligible) => {
  if (step === STEP_RESULT) return 1;
  if (step === STEP_AMOUNT) return conversionEligible ? 0.25 : 0.5;
  if (step === STEP_SUBJECT) return 0.5;
  return 0.75;
};

// Keep raw RPC, endpoint and file-system failures out of the UI. Only the
// recoverable messages the invoice pipeline writes for people pass through.
export const getRequestErrorMessage = error => {
  const message = error && error.message;
  if (typeof message === 'string') {
    if (USER_FACING_MESSAGES.includes(message)) return message;
    if (message.startsWith('Unable to convert ')) return message;
  }
  return 'We could not create this payment request. Try again.';
};

const ReceivePaymentRequestFlow = ({
  address,
  allowSlippageSetting,
  card,
  cardContextLabel,
  coinObj,
  contextKey,
  conversionEligible,
  displayCurrency,
  isSmall,
  navigation,
  onExit,
  price,
  priceMap,
}) => {
  const theme = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createReceiveDetailsStyles(theme), [theme]);

  const [step, setStep] = useState(STEP_AMOUNT);
  const [amount, setAmount] = useState('');
  const [amountFiat, setAmountFiat] = useState(false);
  const [subject, setSubject] = useState('');
  const [allowConversion, setAllowConversion] = useState(true);
  const [maxSlippage, setMaxSlippage] = useState(DEFAULT_SLIPPAGE);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [qrSaved, setQrSaved] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const qrRef = useRef(null);
  const mountedRef = useRef(true);
  const activeRunRef = useRef(0);
  const loadingRef = useRef(false);
  const savingRef = useRef(false);
  const saveSeqRef = useRef(0);
  const qrSavedRef = useRef(false);
  const handleBackRef = useRef(() => {});

  const isActiveRun = useCallback(runId => activeRunRef.current === runId, []);

  // Move to a fresh operation. Every async completion captures this id, so a
  // late result belongs to the operation that started it and can never touch a
  // newer request, a newer save or a screen the person already left.
  const advanceRun = useCallback(() => {
    const next = activeRunRef.current + 1;
    activeRunRef.current = next;
    return next;
  }, []);

  // Invalidate everything that could still call back into the screen.
  const invalidateOperations = useCallback(() => {
    activeRunRef.current += 1;
    loadingRef.current = false;
    savingRef.current = false;
    qrSavedRef.current = false;
  }, []);

  const resetFlow = useCallback(() => {
    // Invalidate any in-flight generation before clearing visible state.
    invalidateOperations();
    setStep(STEP_AMOUNT);
    setAmount('');
    setAmountFiat(false);
    setSubject('');
    setAllowConversion(true);
    setMaxSlippage(DEFAULT_SLIPPAGE);
    setError(null);
    setLoading(false);
    setSnapshot(null);
    setQrSaved(false);
  }, [invalidateOperations]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      invalidateOperations();
    };
  }, [invalidateOperations]);

  // A different Asset, Card, address or account cancels the pending request.
  // The key is a string so unrelated store updates cannot reset the form.
  useEffect(() => {
    resetFlow();
  }, [contextKey, resetFlow]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const normalizedAmount = sanitizeNumericInput(amount);
  const amountValid = getAmountInputError(amount) == null;
  const amountPreview = useMemo(() => {
    if (!amountValid || !price) return null;
    return amountFiat
      ? `≈ ${truncateDecimal(Number(normalizedAmount) / Number(price), 8)} ${coinObj.display_ticker}`
      : `≈ ${truncateDecimal(Number(normalizedAmount) * Number(price), 2)} ${displayCurrency}`;
  }, [amountFiat, amountValid, coinObj, displayCurrency, normalizedAmount, price]);

  const currencyTicker = amountFiat
    ? displayCurrency
    : coinObj?.display_ticker || '';

  const createInvoice = useCallback(async () => {
    if (loadingRef.current) return;

    const amountError = getAmountInputError(amount);
    const slippageError =
      conversionEligible && allowConversion && allowSlippageSetting
        ? validateSlippageInput(sanitizeNumericInput(maxSlippage))
        : null;

    if (amountError || slippageError) {
      setError(amountError || slippageError);
      return;
    }

    const runId = advanceRun();
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await generateReceiveInvoice({
        address,
        allowConversion: conversionEligible && allowConversion,
        amountFiat,
        amountValue: normalizedAmount,
        coinObj,
        displayCurrency,
        maxSlippageValue: sanitizeNumericInput(maxSlippage),
        memo: subject,
        priceMap,
        subWallet: card,
      });

      if (!isActiveRun(runId) || !mountedRef.current) return;

      // The result is bound to the values that produced it so later rate,
      // store or prop changes cannot rewrite a generated request.
      setSnapshot({
        qrString: result.qrString,
        showVerusIcon: result.showVerusIcon,
        amountText: normalizedAmount,
        currency: currencyTicker,
        subject,
        address,
        conversion: conversionEligible,
      });
      setQrSaved(false);
      qrSavedRef.current = false;
      setStep(STEP_RESULT);
    } catch (e) {
      if (!isActiveRun(runId) || !mountedRef.current) return;
      setError(getRequestErrorMessage(e));
    } finally {
      if (isActiveRun(runId)) {
        loadingRef.current = false;
        if (mountedRef.current) setLoading(false);
      }
    }
  }, [
    address,
    advanceRun,
    allowConversion,
    allowSlippageSetting,
    amount,
    amountFiat,
    card,
    coinObj,
    conversionEligible,
    currencyTicker,
    displayCurrency,
    maxSlippage,
    normalizedAmount,
    priceMap,
    subject,
    isActiveRun,
  ]);

  const shareInvoice = useCallback(async () => {
    if (!snapshot || !snapshot.qrString) return;
    const runId = activeRunRef.current;
    const message = `Please pay me ${snapshot.amountText} ${snapshot.currency}${
      snapshot.subject ? ` for '${snapshot.subject}'` : ''
    } with ${snapshot.qrString}`;

    try {
      await Share.share({message});
      if (isActiveRun(runId) && mountedRef.current) setError(null);
    } catch (e) {
      if (isActiveRun(runId) && mountedRef.current) {
        setError('We could not open the share sheet. Try again.');
      }
    }
  }, [isActiveRun, snapshot]);

  const saveQr = useCallback(() => {
    if (!qrRef.current || savingRef.current || qrSaved) return;
    const runId = activeRunRef.current;
    // The save belongs to this exact request and this exact save operation. The
    // token is a comparable value so it survives re-renders: a delayed CameraRoll
    // completion may only touch the request it started for, and may only release
    // the guard while it is still the active save.
    const saveToken = saveSeqRef.current + 1;
    saveSeqRef.current = saveToken;
    savingRef.current = saveToken;

    qrRef.current.toDataURL(async data => {
      if (savingRef.current !== saveToken || qrSavedRef.current) return;
      const path = `${RNFS.CachesDirectoryPath}/VerusPayQR_${Date.now()}.png`;
      try {
        await RNFS.writeFile(path, data, 'base64');
        await CameraRoll.save(path, {type: 'photo'});
        await RNFS.unlink(path);
        if (savingRef.current !== saveToken) return;
        if (!isActiveRun(runId) || !mountedRef.current) return;
        qrSavedRef.current = true;
        setQrSaved(true);
        setError(null);
      } catch (e) {
        if (!isActiveRun(runId) || !mountedRef.current) return;
        setError('We could not save the QR image. Try again.');
      } finally {
        if (savingRef.current === saveToken) savingRef.current = false;
      }
    });
  }, [isActiveRun, qrSaved]);

  // Cancel a generation that is still in flight without leaving the task. The
  // creation call does not submit a payment, so this only stops waiting.
  const cancelGeneration = useCallback(
    (clearError = true) => {
      if (!loadingRef.current) return false;
      invalidateOperations();
      if (mountedRef.current) {
        setLoading(false);
        if (clearError) setError(null);
      }
      return true;
    },
    [invalidateOperations],
  );

  const handleBack = useCallback(() => {
    // Back is never trapped. While generation is pending it cancels the request
    // and leaves instead of stranding the person on a disabled screen.
    if (cancelGeneration(false)) {
      onExit();
      return;
    }

    if (step === STEP_RESULT) {
      // Editing a previous step recreates the request on the next submit. Leave
      // the operation boundary at the same time: a save started from this result
      // must not keep the save guard, attach a late error, or block the next
      // request's save. Amount, subject and settings are left untouched.
      invalidateOperations();
      setSnapshot(null);
      setQrSaved(false);
      setError(null);
      setStep(conversionEligible ? STEP_SETTINGS : STEP_AMOUNT);
      return;
    }
    if (step === STEP_SETTINGS) {
      setError(null);
      setStep(STEP_SUBJECT);
      return;
    }
    if (step === STEP_SUBJECT) {
      setStep(STEP_AMOUNT);
      return;
    }
    onExit();
  }, [cancelGeneration, conversionEligible, invalidateOperations, onExit, step]);

  useEffect(() => {
    handleBackRef.current = handleBack;
  }, [handleBack]);

  // System back and the native removal gesture follow the same path as the
  // header back control instead of tearing the whole screen down.
  useEffect(() => {
    if (!navigation || typeof navigation.addListener !== 'function') {
      return undefined;
    }
    const unsubscribe = navigation.addListener('beforeRemove', event => {
      // Route removal runs the exact handler the header control uses, once. The
      // handler itself detects a pending generation, invalidates it and only then
      // leaves, so this listener must not pre-cancel it (that would make the
      // handler see loading=false and step back instead of exiting).
      event.preventDefault();
      handleBackRef.current();
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [navigation]);

  useEffect(() => {
    if (loading) {
      AccessibilityInfo.announceForAccessibility(
        'Creating payment request.',
      );
      return;
    }
    if (step === STEP_RESULT) return;
    const title = getStepTitle(step);
    AccessibilityInfo.announceForAccessibility(`${title}.`);
  }, [loading, step]);

  const handleAmountNext = useCallback(() => {
    if (conversionEligible) {
      setError(null);
      setStep(STEP_SUBJECT);
      return;
    }
    createInvoice();
  }, [conversionEligible, createInvoice]);

  const startNewRequest = useCallback(() => {
    resetFlow();
  }, [resetFlow]);

  const cancelAndExit = useCallback(() => {
    cancelGeneration(false);
    onExit();
  }, [cancelGeneration, onExit]);

  const renderAmountStep = () => (
    <>
      <View style={styles.amountRow}>
        <AppTextInput
          accessibilityLabel={`Amount in ${currencyTicker}`}
          autoFocus
          containerStyle={styles.amountField}
          inputMode="decimal"
          keyboardType="decimal-pad"
          maxLength={MAX_AMOUNT_LENGTH}
          onChangeText={setAmount}
          placeholder="0"
          returnKeyType="done"
          value={amount}
        />
        <Text style={styles.currency}>{currencyTicker}</Text>
      </View>
      <View style={styles.estimateWrap}>
        {amountPreview ? <Text style={styles.estimate}>{amountPreview}</Text> : null}
      </View>
      {price ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => {
            if (amountValid && price && Number(price) > 0) {
              const current = Number(sanitizeNumericInput(amount));
              const converted = amountFiat
                ? truncateDecimal(current / Number(price), 8)
                : truncateDecimal(current * Number(price), 2);
              setAmount(String(converted));
            }
            setAmountFiat(value => !value);
          }}
          style={styles.switch}>
          <MaterialCommunityIcons
            color={theme.colors.textSecondary}
            name="swap-vertical"
            size={16}
          />
          <Text style={styles.switchText}>
            Switch to {amountFiat ? coinObj.display_ticker : displayCurrency}
          </Text>
        </TouchableOpacity>
      ) : null}
      {error ? <Text style={[styles.error, styles.amountError]}>{error}</Text> : null}
    </>
  );

  const renderSubjectStep = () => (
    <>
      <Text style={styles.stepHelper}>
        Optional. Added to the share message.
      </Text>
      <AppTextInput
        accessibilityLabel="Subject"
        autoCapitalize="sentences"
        autoFocus
        onChangeText={setSubject}
        placeholder="e.g. Dinner"
        returnKeyType="done"
        value={subject}
      />
    </>
  );

  const renderSettingsStep = () => (
    <>
      <TouchableOpacity
        accessibilityRole="checkbox"
        accessibilityState={{checked: allowConversion}}
        activeOpacity={0.7}
        disabled={loading}
        onPress={() => setAllowConversion(value => !value)}
        style={styles.settingRow}>
        <View style={styles.settingCopy}>
          <Text style={styles.settingTitle}>Allow conversions</Text>
          <Text style={styles.settingSubtitle}>
            Senders can pay with currencies that convert to{' '}
            {coinObj.display_ticker}.
          </Text>
        </View>
        <View pointerEvents="none">
          <Checkbox.Android
            color={theme.colors.primary}
            status={allowConversion ? 'checked' : 'unchecked'}
            uncheckedColor={theme.colors.textSubtle}
          />
        </View>
      </TouchableOpacity>
      {allowConversion && allowSlippageSetting ? (
        <View style={styles.slippageField}>
          <AppTextInput
            accessibilityLabel="Maximum slippage percentage"
            keyboardType="decimal-pad"
            label="Max slippage (%)"
            onChangeText={setMaxSlippage}
            value={maxSlippage}
          />
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>
  );

  const renderResultStep = () => (
    <>
      <View style={styles.resultWrap}>
        <View style={styles.resultQr}>
          <QRCode
            getRef={ref => {
              qrRef.current = ref;
            }}
            logo={
              snapshot.showVerusIcon
                ? require('../../images/customIcons/Verus.png')
                : undefined
            }
            logoBackgroundColor="#FFFFFF"
            logoBorderRadius={80}
            logoSize={snapshot.showVerusIcon ? 48 : undefined}
            size={isSmall ? 180 : 220}
            value={snapshot.qrString}
          />
        </View>
        <Text style={styles.resultAmount}>
          {snapshot.amountText} {snapshot.currency}
        </Text>
        {snapshot.address ? (
          <Text
            ellipsizeMode="middle"
            numberOfLines={1}
            style={[styles.resultAddress, styles.identifier]}>
            {snapshot.address}
          </Text>
        ) : null}
        {cardContextLabel ? (
          <Text style={styles.resultAddress}>{cardContextLabel}</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </>
  );

  const getStepContent = () => {
    if (step === STEP_SUBJECT) return renderSubjectStep();
    if (step === STEP_SETTINGS) return renderSettingsStep();
    if (step === STEP_RESULT && snapshot) return renderResultStep();
    return renderAmountStep();
  };

  const renderActions = () => {
    const actions = {
      bottomSpacing: keyboardVisible ? KEYBOARD_FOOTER_SPACING : 30,
      gap: 8,
      horizontalSpacing: 20,
      includeBottomInset: !keyboardVisible,
      safeAreaSpacing: 0,
    };

    if (step === STEP_AMOUNT) {
      if (loading) {
        return (
          <SafeBottomActionStack {...actions}>
            <AppButton
              accessibilityLabel="Cancel payment request"
              accessibilityState={{busy: true}}
              onPress={cancelAndExit}
              variant="secondary">
              Cancel
            </AppButton>
          </SafeBottomActionStack>
        );
      }
      return (
        <SafeBottomActionStack {...actions}>
          <AppButton
            accessibilityLabel="Next"
            accessibilityState={{disabled: !amountValid}}
            disabled={!amountValid}
            onPress={handleAmountNext}>
            Next
          </AppButton>
        </SafeBottomActionStack>
      );
    }

    if (step === STEP_SUBJECT) {
      return (
        <SafeBottomActionStack {...actions}>
          <AppButton onPress={() => setStep(STEP_SETTINGS)}>Next</AppButton>
        </SafeBottomActionStack>
      );
    }

    if (step === STEP_SETTINGS) {
      if (loading) {
        return (
          <SafeBottomActionStack {...actions}>
            <AppButton
              accessibilityLabel="Cancel payment request"
              accessibilityState={{busy: true}}
              onPress={cancelAndExit}
              variant="secondary">
              Cancel
            </AppButton>
          </SafeBottomActionStack>
        );
      }
      return (
        <SafeBottomActionStack {...actions}>
          <AppButton
            accessibilityLabel="Create payment request"
            onPress={createInvoice}>
            Create payment request
          </AppButton>
        </SafeBottomActionStack>
      );
    }

    if (!snapshot) {
      return <SafeBottomActionStack {...actions} />;
    }

    const savedNonConversion = !snapshot.conversion && qrSaved;
    return (
      <SafeBottomActionStack {...actions}>
        <AppButton
          accessibilityLabel={
            snapshot.conversion
              ? 'Share payment link'
              : savedNonConversion
                ? 'QR image saved'
                : 'Save QR to camera roll'
          }
          accessibilityState={{disabled: savedNonConversion}}
          disabled={savedNonConversion}
          onPress={snapshot.conversion ? shareInvoice : saveQr}
          style={savedNonConversion ? {backgroundColor: theme.colors.success} : undefined}>
          {snapshot.conversion
            ? 'Share payment link'
            : savedNonConversion
              ? 'QR image saved'
              : 'Save QR to camera roll'}
        </AppButton>
        <AppButton onPress={startNewRequest} variant="secondary">
          New payment request
        </AppButton>
        <AppButton onPress={onExit} variant="secondary">
          Done
        </AppButton>
      </SafeBottomActionStack>
    );
  };

  return (
    <View style={[styles.wizardRoot, {backgroundColor: theme.colors.background}]}>
      <ProgressHeader
        onBack={handleBack}
        progress={getStepProgress(step, conversionEligible)}
        title={getStepTitle(step)}
      />
      <KeyboardAvoidingView
        // iOS already insets the window for the keyboard, so padding is the
        // right reaction. Android runs with adjustPan in the production
        // manifest: the window keeps its size, so nothing lifts the footer and
        // the keyboard covers it. Shrinking the viewport reserves the keyboard
        // height instead, keeping the action row reachable on the subject and
        // slippage steps.
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.wizardViewport}>
        <FadedScrollView
          bounces={false}
          containerStyle={styles.wizardViewport}
          contentContainerStyle={[
            styles.wizardContent,
            {
              paddingLeft: 20 + insets.left,
              paddingRight: 20 + insets.right,
            },
          ]}
          fadeBackgroundColor={theme.colors.background}
          fadeLength={42}
          key={step}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showStartFade={false}>
          {getStepContent()}
        </FadedScrollView>
        {renderActions()}
      </KeyboardAvoidingView>
    </View>
  );
};

export default ReceivePaymentRequestFlow;
