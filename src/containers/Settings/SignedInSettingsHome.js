import React, {useCallback} from 'react';
import {CommonActions} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {signOut} from '../../actions/actionCreators';
import signedInCopy from '../../copy/signedIn';
import {APP_VERSION} from '../../../env/index';
import {ONBOARDING_THEME_MODE} from '../../theme/onboarding';
import {
  SettingsLockAction,
  SettingsRow,
  SettingsScreen,
  SettingsSection,
  SettingsTitle,
} from './components/SettingsScaffold';

const SETTINGS_ROWS = [
  {
    key: 'ProfileSettings',
    title: signedInCopy.settings.securityAndRecovery,
    icon: 'shield-lock-outline',
    section: 'Account',
  },
  {
    key: 'GeneralWalletSettings',
    title: signedInCopy.settings.general,
    icon: 'tune',
    section: 'Preferences',
  },
  {
    key: 'Appearance',
    title: signedInCopy.settings.appearance,
    icon: 'palette-outline',
    section: 'Preferences',
  },
  {
    key: 'WalletSettings',
    title: signedInCopy.settings.networkAndStorage,
    icon: 'network-outline',
    section: 'Advanced',
  },
  {
    key: 'AppInfo',
    title: signedInCopy.settings.appInformation,
    icon: 'information-outline',
    section: 'About',
  },
];

const SignedInSettingsHome = ({navigation}) => {
  const dispatch = useDispatch();
  const activeProfile = useSelector(state => state.authentication.activeAccount);
  const appearance = useSelector(
    state =>
      state.settings.generalWalletSettings.appearance ||
      ONBOARDING_THEME_MODE.SYSTEM,
  );
  const appearanceLabel =
    appearance === ONBOARDING_THEME_MODE.DARK
      ? 'Dark'
      : appearance === ONBOARDING_THEME_MODE.LIGHT
      ? 'Light'
      : 'System';

  const lockWallet = useCallback(() => {
    const resetAction = CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'SecureLoading',
          params: {
            data: {
              task: () =>
                new Promise(resolve => {
                  setTimeout(() => {
                    dispatch(signOut());
                    resolve();
                  }, 1000);
                }),
              message: 'Signing out...',
              route: 'Home',
              successMsg: 'Signed out',
              errorMsg: 'Failed to sign out',
            },
          },
        },
      ],
    });

    navigation.dispatch(resetAction);
  }, [dispatch, navigation]);

  const rowValue = key => {
    if (key === 'Appearance') return appearanceLabel;
    if (key === 'AppInfo') return APP_VERSION;

    return null;
  };

  const rowDescription = key =>
    key === 'ProfileSettings' ? activeProfile?.id : null;

  const sections = ['Account', 'Preferences', 'Advanced', 'About'];

  return (
    <SettingsScreen home testID="settings.home">
      <SettingsTitle>{signedInCopy.settings.title}</SettingsTitle>
      {sections.map(section => {
        const rows = SETTINGS_ROWS.filter(row => row.section === section);

        return (
          <SettingsSection compact key={section} title={section}>
            {rows.map((row, index) => (
              <SettingsRow
                description={rowDescription(row.key)}
                icon={row.icon}
                key={row.key}
                last={index === rows.length - 1}
                onPress={() => navigation.navigate(row.key)}
                testID={`settings.home.${row.key}`}
                title={row.title}
                value={rowValue(row.key)}
              />
            ))}
          </SettingsSection>
        );
      })}
      <SettingsLockAction onPress={lockWallet} />
    </SettingsScreen>
  );
};

export default SignedInSettingsHome;
