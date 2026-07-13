import React from 'react';
import {ScrollView, TouchableOpacity, View} from 'react-native';
import {List, Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import signedInCopy from '../../copy/signedIn';
import {createSignedInStyles} from '../../styles';
import {useOnboardingTheme} from '../../theme/onboarding';

const SETTINGS_ROWS = [
  {
    key: 'ProfileSettings',
    title: signedInCopy.settings.profileAndSecurity,
    icon: 'account-lock-outline',
  },
  {
    key: 'WalletSettings',
    title: signedInCopy.settings.wallet,
    icon: 'wallet-cog-outline',
  },
  {
    key: 'Appearance',
    title: signedInCopy.settings.appearance,
    icon: 'theme-light-dark',
  },
  {
    key: 'AppInfo',
    title: signedInCopy.settings.appInformation,
    icon: 'information-outline',
  },
];

const SignedInSettingsHome = ({navigation}) => {
  const theme = useOnboardingTheme();
  const styles = createSignedInStyles(theme);

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeScreen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{signedInCopy.settings.title}</Text>
        <View style={[styles.surface, {marginTop: theme.spacing.lg}]}>
          {SETTINGS_ROWS.map((row, index) => (
            <React.Fragment key={row.key}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => navigation.navigate(row.key)}>
                <List.Item
                  title={row.title}
                  titleStyle={styles.rowTitle}
                  style={styles.row}
                  left={props => (
                    <List.Icon {...props} icon={row.icon} color={theme.colors.primary} />
                  )}
                  right={props => (
                    <List.Icon
                      {...props}
                      icon="chevron-right"
                      color={theme.colors.textSubtle}
                    />
                  )}
                />
              </TouchableOpacity>
              {index < SETTINGS_ROWS.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignedInSettingsHome;
