import React from 'react';
import {ScrollView, TouchableOpacity, View} from 'react-native';
import {List, Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import signedInCopy from '../../copy/signedIn';
import {createSignedInStyles} from '../../styles';
import {useOnboardingTheme} from '../../theme/onboarding';
import {
  GIFT_CARD_SERVICE_ID,
  VERUSID_SERVICE_ID,
} from '../../utils/constants/services';

const SignedInServicesHome = ({navigation}) => {
  const theme = useOnboardingTheme();
  const styles = createSignedInStyles(theme);
  const services = [
    {
      key: 'gift-cards',
      title: signedInCopy.services.giftCards,
      description: 'Create and share a secure claim for funds or VerusIDs',
      icon: 'gift-outline',
      onPress: () => navigation.navigate('Service', {service: GIFT_CARD_SERVICE_ID}),
    },
    {
      key: 'address-book',
      title: signedInCopy.services.addressBook,
      description: 'Save labeled addresses for future transfers',
      icon: 'book-account-outline',
      onPress: () => navigation.navigate('AddressBook'),
    },
    {
      key: 'verusid',
      title: signedInCopy.services.verusIdSetup,
      description: 'Link a VerusID controlled by this wallet',
      icon: 'account-key-outline',
      onPress: () => navigation.navigate('Service', {service: VERUSID_SERVICE_ID}),
    },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeScreen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{signedInCopy.services.title}</Text>
        <Text style={styles.subtitle}>{signedInCopy.services.description}</Text>
        <View style={[styles.surface, {marginTop: theme.spacing.lg}]}>
          {services.map((service, index) => (
            <React.Fragment key={service.key}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={service.onPress}>
                <List.Item
                  title={service.title}
                  description={service.description}
                  titleStyle={styles.rowTitle}
                  descriptionStyle={styles.rowDescription}
                  style={styles.row}
                  left={props => (
                    <List.Icon
                      {...props}
                      icon={service.icon}
                      color={theme.colors.primary}
                    />
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
              {index < services.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignedInServicesHome;
