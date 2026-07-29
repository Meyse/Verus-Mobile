import React, {useCallback, useState} from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import signedInCopy from '../../copy/signedIn';
import {fontStyle} from '../../globals/fonts';
import {useOnboardingTheme} from '../../theme/onboarding';
import {loadAddressBook} from '../../utils/addressBook/addressBook';
import {GIFT_CARD_SERVICE_ID} from '../../utils/constants/services';

const giftCardIcon = require('../../images/customIcons/services-gift-card-folded.png');
const addressBookIcon = require('../../images/customIcons/services-address-book-folded.png');
const SERVICE_ICON_SIZE = 68;
const SERVICE_ICON_LEFT = -17;

const SignedInServicesHome = ({navigation}) => {
  const theme = useOnboardingTheme();
  const [addressCount, setAddressCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadAddressBook()
        .then(records => {
          if (active) setAddressCount(records.length);
        })
        .catch(() => {
          if (active) setAddressCount(0);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const addressCountLabel = addressCount > 0 ? `${addressCount} saved` : null;
  const serviceBackgroundColor = theme.isDark
    ? theme.colors.surfaceMuted
    : '#EEF2F8';
  const serviceLabelColor = theme.colors.textPrimary;
  const services = [
    {
      key: 'gift-cards',
      title: signedInCopy.services.giftCards,
      description: signedInCopy.services.giftCardsDescription,
      icon: giftCardIcon,
      onPress: () =>
        navigation.navigate('Service', {service: GIFT_CARD_SERVICE_ID}),
    },
    {
      key: 'address-book',
      title: signedInCopy.services.addressBook,
      description: signedInCopy.services.addressBookDescription,
      icon: addressBookIcon,
      meta: addressCountLabel,
      onPress: () => navigation.navigate('AddressBook'),
    },
  ];

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, {backgroundColor: theme.colors.background}]}>
      <View style={[styles.header, {backgroundColor: theme.colors.background}]}>
        <Text
          style={[
            theme.typography.headlineMd,
            {color: theme.colors.textPrimary},
          ]}>
          {signedInCopy.services.title}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {services.map(service => {
          const accessibilityLabel = service.meta
            ? `${service.title}. ${service.description} ${service.meta}.`
            : `${service.title}. ${service.description}`;

          return (
            <View key={service.key} style={styles.rowContainer}>
              <TouchableOpacity
                accessibilityLabel={accessibilityLabel}
                accessibilityRole="button"
                activeOpacity={0.8}
                onPress={service.onPress}
                style={[
                  styles.serviceRow,
                  {backgroundColor: serviceBackgroundColor},
                ]}>
                <View
                  pointerEvents="none"
                  style={styles.serviceIconFrame}>
                  <Image
                    accessible={false}
                    resizeMode="contain"
                    source={service.icon}
                    style={styles.serviceIcon}
                  />
                </View>
                <View style={styles.textContainer}>
                  <View style={styles.titleLine}>
                    <Text
                      style={[
                        styles.rowTitle,
                        {color: serviceLabelColor},
                      ]}>
                      {service.title}
                    </Text>
                    {service.meta ? (
                      <View
                        style={[
                          styles.countBadge,
                          {
                            backgroundColor: theme.colors.surface,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.countBadgeText,
                            {color: theme.colors.textSecondary},
                          ]}>
                          {service.meta}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.rowDescription,
                      {color: theme.colors.textSecondary},
                    ]}>
                    {service.description}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1},
  header: {paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16},
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 40,
    gap: 12,
  },
  rowContainer: {
    width: '100%',
  },
  serviceRow: {
    position: 'relative',
    width: '100%',
    minHeight: 108,
    overflow: 'hidden',
    borderRadius: 18,
    paddingTop: 18,
    paddingRight: 16,
    paddingBottom: 18,
    paddingLeft: 72,
  },
  serviceIconFrame: {
    position: 'absolute',
    zIndex: 0,
    left: SERVICE_ICON_LEFT,
    top: 0,
    bottom: 0,
    width: SERVICE_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIcon: {
    width: SERVICE_ICON_SIZE,
    height: SERVICE_ICON_SIZE,
  },
  textContainer: {
    zIndex: 1,
    minWidth: 0,
    flex: 1,
  },
  titleLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  rowTitle: {
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    ...fontStyle('semiBold'),
  },
  rowDescription: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    ...fontStyle('regular'),
  },
  countBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontSize: 11,
    lineHeight: 14,
    ...fontStyle('medium'),
  },
});

export default SignedInServicesHome;
