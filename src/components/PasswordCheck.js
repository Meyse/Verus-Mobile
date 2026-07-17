import * as React from 'react';
import { Button, Dialog, Portal } from 'react-native-paper';
import {ActivityIndicator, ScrollView, StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import { checkPinForUser } from '../utils/asyncStore/asyncStore';
import { getSupportedBiometryType } from '../utils/keychain/keychain';
import PasswordInput from './PasswordInput';
import { getBiometricPassword } from '../utils/keychain/biometrics';
import AppButton from './AppButton';
import AppTextInput from './AppTextInput';
import BottomSheetModal from './BottomSheetModal';
import {fontStyle} from '../globals/fonts';
import {useOnboardingTheme} from '../theme/onboarding';

const PasswordCheck = (props) => {
  const {
    visible,
    title,
    submit,
    cancel,
    userName,
    account,
    allowBiometry,
    redesigned = false,
  } = props;
  const theme = useOnboardingTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [password, setPassword] = React.useState({
    text: "",
    usingBiometry: false
  });
  const [freeze, setFreeze] = React.useState(false);
  const [biometryType, setBiometryType] = React.useState(null);

  async function setSupportedBiometry() {
    if (allowBiometry && account.biometry) {
      setBiometryType(await getSupportedBiometryType())
    }
  }

  async function clearPasswordIfAppropriate() {
    if (visible == false) {
      setPassword({
        text: "",
        usingBiometry: false,
      });
    }
  }

  async function submitBiometricIfAble() {
    if (password.usingBiometry) {      
      submit(await validatePassword())
      setPassword({
        text: password.text,
        usingBiometry: false,
      });
    }
  }

  React.useEffect(() => {
    setSupportedBiometry()
  }, [account, allowBiometry]);

  React.useEffect(() => {
    clearPasswordIfAppropriate()
  }, [visible]);

  const validatePassword = async () => {
    setFreeze(true)

    try {
      await checkPinForUser(password.text, userName, false)
      setFreeze(false)
      return {
        password: password.text,
        valid: true
      }
    } catch(e) {
      setFreeze(false)
      return {
        password: password.text,
        valid: false
      }
    }
  }

  React.useEffect(() => {
    submitBiometricIfAble();
  }, [password.text]);

  const tryBiometricAuth = async () => {
    if (biometryType != null && biometryType.biometry) {
      try {
        setPassword({
          text: await getBiometricPassword(account.accountHash, "Authenticate to unlock"),
          usingBiometry: true
        });
      } catch (e) {
        console.warn(e);
      }
    }
  };

  if (redesigned) {
    return (
      <BottomSheetModal
        avoidKeyboard
        closeDisabled={freeze}
        contentContainerStyle={styles.sheet}
        maxHeight="86%"
        onClose={cancel}
        visible={visible}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.body}>
            Authenticate before continuing with this security-sensitive action.
          </Text>
          <AppTextInput
            autoComplete="off"
            autoCorrect={false}
            importantForAutofill="no"
            label="Profile password"
            onChangeText={text =>
              setPassword({text, usingBiometry: password.usingBiometry})
            }
            placeholder="Enter password"
            secureTextEntry
            testID="settings.passwordCheck.password"
            textContentType="none"
            value={password.text}
          />
          {freeze ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
              <Text style={styles.loadingText}>Authenticating…</Text>
            </View>
          ) : null}
          <View style={styles.actions}>
            <AppButton
              disabled={freeze}
              height={52}
              onPress={cancel}
              style={styles.action}
              variant="secondary">
              Cancel
            </AppButton>
            {allowBiometry && biometryType != null && biometryType.biometry ? (
              <AppButton
                disabled={freeze}
                height={52}
                onPress={tryBiometricAuth}
                style={styles.action}
                variant="secondary">
                {biometryType.display_name}
              </AppButton>
            ) : null}
            <AppButton
              disabled={freeze}
              height={52}
              onPress={async () => submit(await validatePassword())}
              style={styles.action}
              testID="settings.passwordCheck.submit"
              variant="primary">
              Continue
            </AppButton>
          </View>
        </ScrollView>
      </BottomSheetModal>
    );
  }

  return (
    <Portal>
      <Dialog dismissable={!freeze} visible={visible} onDismiss={cancel}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <PasswordInput
            value={password.text}
            onChangeText={(text) => setPassword({ text, usingBiometry: password.usingBiometry })}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button disabled={freeze} onPress={cancel}>
            Cancel
          </Button>
          {allowBiometry && biometryType != null && biometryType.biometry && (
            <Button disabled={freeze} onPress={() => tryBiometricAuth()}>
              {biometryType.display_name}
            </Button>
          )}
          <Button disabled={freeze} onPress={async () => submit(await validatePassword())}>
            Done
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    sheet: {
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 20,
    },
    content: {
      width: '100%',
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      lineHeight: 26,
      ...fontStyle('semiBold'),
    },
    body: {
      marginTop: 6,
      marginBottom: 20,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      ...fontStyle('regular'),
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 22,
    },
    action: {
      minWidth: 96,
      flexGrow: 1,
    },
  });

export default PasswordCheck;
