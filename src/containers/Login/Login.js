/*
  This component's purpose is to present the user with the option
  to log into their accounts, and will only be shown if at least on account
  exists on the mobile device. It uses the user-entered username and password
  to find and decrypt the wallet seed in asyncStorage. When mounted, it clears
  any detecting app update heartbeats located from before, and upon successfull
  login, creates a new update heartbeat interval.
*/

import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';
import {Text} from 'react-native-paper';
import Colors from '../../globals/colors';
import {fontStyle} from '../../globals/fonts';
import {VerusLogo} from '../../images/customIcons';
import {openAuthenticateUserModal} from '../../actions/actions/sendModal/dispatchers/sendModal';
import {
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_FORM_STEP_FORM,
  SEND_MODAL_USER_TO_AUTHENTICATE,
} from '../../utils/constants/sendModal';
import {useSelector} from 'react-redux';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import SafeBottomActionStack from '../../components/SafeBottomActionStack';
import WelcomeBackgroundVideo from '../../components/WelcomeBackgroundVideo';
import { useObjectSelector } from '../../hooks/useObjectSelector';
import { selectHasAuthenticatedSession } from '../../selectors/authentication';
import {readDeeplinkFromNfc} from '../../actions/actionDispatchers';
import StartSomethingNewSheet from './components/StartSomethingNewSheet';

const LOGO_ASPECT_RATIO = 464 / 1280;
const LOGO_TOP_MARGIN = 22;

const Login = props => {
  const {width} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const defaultAccount = useSelector(
    state => state.settings.generalWalletSettings.defaultAccount,
  );
  const authModalUsed = useSelector(
    state => state.authentication.authModalUsed,
  );

  const accounts = useObjectSelector(state => state.authentication.accounts);
  const hasAuthenticatedSession = useSelector(selectHasAuthenticatedSession);
  const autoOpenTimeoutRef = useRef(null);
  const [startSomethingNewVisible, setStartSomethingNewVisible] =
    useState(false);

  const clearAutoOpenTimeout = () => {
    if (autoOpenTimeoutRef.current != null) {
      clearTimeout(autoOpenTimeoutRef.current);
      autoOpenTimeoutRef.current = null;
    }
  };

  const openAuthModal = ignoreDefault => {
    if (hasAuthenticatedSession) {
      return;
    }

    if (ignoreDefault) {
      openAuthenticateUserModal();
    } else {
      openAuthenticateUserModal(
        {
          [SEND_MODAL_USER_TO_AUTHENTICATE]: defaultAccount,
        },
        defaultAccount != null &&
          !authModalUsed &&
          accounts.find(x => x.accountHash === defaultAccount) != null
          ? SEND_MODAL_FORM_STEP_CONFIRM
          : SEND_MODAL_FORM_STEP_FORM,
      );
    }
  };

  useEffect(() => {
    clearAutoOpenTimeout();

    if (
      !hasAuthenticatedSession &&
      !authModalUsed &&
      defaultAccount != null &&
      accounts.find(x => x.accountHash === defaultAccount) != null
    ) {
      autoOpenTimeoutRef.current = setTimeout(() => {
        openAuthModal();
      }, 700);
    }

    return () => {
      clearAutoOpenTimeout();
    };
  }, [accounts, authModalUsed, defaultAccount, hasAuthenticatedSession]);

  const handleStartSomethingNew = () => {
    clearAutoOpenTimeout();
    setStartSomethingNewVisible(true);
  };

  const handleAddUser = () => {
    props.navigation.navigate('CreateProfile');
  };

  const handleRevokeRecover = () => {
    props.navigation.navigate('RevokeRecover');
  };

  const handleRecoverSeed = () => {
    props.navigation.navigate('RecoverSeeds');
  };

  const handleProvisioningRequests = () => {
    props.navigation.navigate('ProvisioningDeeplinks');
  };

  const logoWidth = width * 0.3;

  return (
    <View style={styles.container}>
      <WelcomeBackgroundVideo />
      <View
        style={[
          styles.logoContainer,
          {
            paddingTop: insets.top + LOGO_TOP_MARGIN,
          },
        ]}>
        <VerusLogo
          width={logoWidth}
          height={logoWidth * LOGO_ASPECT_RATIO}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.headline}>
          {'With Verus you own your identity, data, and money'}
        </Text>
      </View>
      <SafeBottomActionStack>
        <AppButton
          onPress={() => openAuthModal()}
          variant="primary"
          height={56}>
          {'Unlock wallet'}
        </AppButton>
        <AppButton
          onPress={() => handleStartSomethingNew()}
          variant="text"
          height={52}
          textColor={Colors.secondaryColor}>
          {'Start something new'}
        </AppButton>
      </SafeBottomActionStack>
      <StartSomethingNewSheet
        visible={startSomethingNewVisible}
        onClose={() => setStartSomethingNewVisible(false)}
        onCreateWallet={handleAddUser}
        onInitializeFromNfc={readDeeplinkFromNfc}
        onRecoverProfileSeed={handleRecoverSeed}
        onRevokeRecoverVerusId={handleRevokeRecover}
        onProvisioningRequests={handleProvisioningRequests}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondaryColor,
  },
  logoContainer: {
    paddingHorizontal: 32,
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingRight: 48,
  },
  headline: {
    textAlign: 'left',
    color: Colors.quinaryColor,
    fontSize: 28,
    ...fontStyle('semiBold'),
    lineHeight: 36,
  },
});

export default Login;
