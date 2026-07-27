import React, {useCallback, useState} from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import {fontStyle} from '../../globals/fonts';
import {useOnboardingTheme} from '../../theme/onboarding';
import {loadAddressBook} from '../../utils/addressBook/addressBook';
import {GIFT_CARD_SERVICE_ID} from '../../utils/constants/services';

const CARD_HEIGHT = 108;

const ServiceCardBackground = ({emphasized, theme}) => {
  const width = Dimensions.get('window').width - 32;
  return (
    <View pointerEvents="none" style={styles.background}>
      <Svg height={CARD_HEIGHT} width={width}>
        <Defs>
          <SvgLinearGradient
            id={emphasized ? 'giftCardGradient' : 'addressBookGradient'}
            x1="0"
            x2="1"
            y1="0"
            y2="1">
            <Stop
              offset="0"
              stopColor={emphasized ? theme.colors.primary : theme.colors.surface}
            />
            <Stop
              offset="0.6"
              stopColor={emphasized ? theme.colors.primary : theme.colors.surfaceRaised}
            />
            <Stop
              offset="1"
              stopColor={emphasized ? theme.colors.primaryPressed : theme.colors.surfaceMuted}
            />
          </SvgLinearGradient>
          {!emphasized ? (
            <SvgRadialGradient id="addressBookHighlight" cx="0.92" cy="0.88" r="0.85">
              <Stop offset="0" stopColor={theme.colors.primary} stopOpacity="0.18" />
              <Stop offset="0.6" stopColor={theme.colors.primary} stopOpacity="0.08" />
              <Stop offset="1" stopColor={theme.colors.primary} stopOpacity="0" />
            </SvgRadialGradient>
          ) : null}
        </Defs>
        <Rect
          fill={`url(#${emphasized ? 'giftCardGradient' : 'addressBookGradient'})`}
          height={CARD_HEIGHT}
          rx={16}
          ry={16}
          width={width}
          x={0}
          y={0}
        />
        {!emphasized ? (
          <Rect
            fill="url(#addressBookHighlight)"
            height={CARD_HEIGHT}
            rx={16}
            ry={16}
            width={width}
            x={0}
            y={0}
          />
        ) : null}
      </Svg>
    </View>
  );
};

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

  const services = [
    {
      key: 'gift-cards',
      title: 'Gift Cards',
      description: 'Create and share a secure claim for funds or VerusIDs',
      emphasized: true,
      onPress: () => navigation.navigate('Service', {service: GIFT_CARD_SERVICE_ID}),
    },
    {
      key: 'address-book',
      title: 'Address book',
      description:
        addressCount === 0
          ? 'Save addresses for easy access'
          : `${addressCount} saved address${addressCount === 1 ? '' : 'es'}`,
      emphasized: false,
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
          Services
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {services.map(service => (
          <TouchableOpacity
            key={service.key}
            accessibilityLabel={service.title}
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={service.onPress}
            style={[
              styles.serviceCard,
              {
                backgroundColor: service.emphasized
                  ? theme.colors.primaryPressed
                  : theme.colors.surfaceMuted,
                borderColor: service.emphasized
                  ? theme.colors.primary
                  : theme.colors.border,
              },
            ]}>
            <ServiceCardBackground emphasized={service.emphasized} theme={theme} />
            <View style={styles.textContainer}>
              <Text
                style={[
                  styles.cardTitle,
                  {
                    color: service.emphasized
                      ? theme.colors.onPrimary
                      : theme.colors.primary,
                  },
                ]}>
                {service.title}
              </Text>
              <Text
                style={[
                  styles.cardSubtitle,
                  {
                    color: service.emphasized
                      ? 'rgba(255, 255, 255, 0.85)'
                      : theme.colors.textSecondary,
                  },
                ]}>
                {service.description}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1},
  header: {paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16},
  scrollContent: {padding: 16, paddingBottom: 40},
  serviceCard: {
    width: '100%',
    minHeight: CARD_HEIGHT,
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 16,
  },
  background: {...StyleSheet.absoluteFillObject},
  textContainer: {gap: 2},
  cardTitle: {
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.2,
    ...fontStyle('semiBold'),
  },
  cardSubtitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 19,
    ...fontStyle('medium'),
  },
});

export default SignedInServicesHome;
