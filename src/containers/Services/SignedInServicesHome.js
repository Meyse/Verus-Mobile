import React, {useCallback, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import signedInCopy from '../../copy/signedIn';
import {fontStyle} from '../../globals/fonts';
import {useOnboardingTheme} from '../../theme/onboarding';
import {loadAddressBook} from '../../utils/addressBook/addressBook';
import {GIFT_CARD_SERVICE_ID} from '../../utils/constants/services';

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
  const services = [
    {
      key: 'gift-cards',
      title: signedInCopy.services.giftCards,
      description: signedInCopy.services.giftCardsDescription,
      icon: 'gift-outline',
      onPress: () =>
        navigation.navigate('Service', {service: GIFT_CARD_SERVICE_ID}),
    },
    {
      key: 'address-book',
      title: signedInCopy.services.addressBook,
      description: signedInCopy.services.addressBookDescription,
      icon: 'book-open-page-variant',
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
        {services.map((service, index) => {
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
                style={styles.serviceRow}>
                <View style={styles.iconLane}>
                  <MaterialCommunityIcons
                    accessible={false}
                    color={theme.colors.primary}
                    name={service.icon}
                    size={28}
                  />
                </View>
                <View style={styles.textContainer}>
                  <View style={styles.titleLine}>
                    <Text
                      style={[
                        styles.rowTitle,
                        {color: theme.colors.textPrimary},
                      ]}>
                      {service.title}
                    </Text>
                    {service.meta ? (
                      <View
                        style={[
                          styles.countBadge,
                          {
                            backgroundColor: theme.isDark
                              ? theme.colors.surface
                              : theme.colors.surfaceMuted,
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
                <MaterialCommunityIcons
                  accessible={false}
                  color={theme.colors.textSubtle}
                  name="chevron-right"
                  size={21}
                />
              </TouchableOpacity>
              {index < services.length - 1 ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.divider,
                    {backgroundColor: theme.colors.border},
                  ]}
                />
              ) : null}
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
  },
  rowContainer: {
    position: 'relative',
    width: '100%',
  },
  serviceRow: {
    minHeight: 116,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconLane: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    minWidth: 0,
    flex: 1,
    marginLeft: 16,
    paddingRight: 12,
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
  divider: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 60,
    height: StyleSheet.hairlineWidth,
  },
});

export default SignedInServicesHome;
