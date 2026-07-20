import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheetModal from '../../../components/BottomSheetModal';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {
  CURRENCY_NAMES,
  SUPPORTED_UNIVERSAL_DISPLAY_CURRENCIES,
} from '../../../utils/constants/currencies';

const SheetHeader = ({onClose, title}) => {
  const theme = useOnboardingTheme();

  return (
    <View style={styles.sheetHeader}>
      <View style={styles.headerSide} />
      <Text
        numberOfLines={1}
        style={[styles.sheetTitle, {color: theme.colors.textPrimary}]}>
        {title}
      </Text>
      <TouchableOpacity
        accessibilityLabel={`Close ${title}`}
        accessibilityRole="button"
        activeOpacity={0.7}
        onPress={onClose}
        style={styles.closeButton}>
        <MaterialCommunityIcons
          name="close"
          size={20}
          color={theme.colors.textPrimary}
        />
      </TouchableOpacity>
    </View>
  );
};

const CurrencyRow = ({currency, onPress, selected}) => {
  const theme = useOnboardingTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{selected}}
      activeOpacity={0.72}
      onPress={onPress}
      style={styles.currencyRow}>
      <View style={styles.currencyCopy}>
        <Text
          numberOfLines={1}
          style={[styles.currencyCode, {color: theme.colors.textPrimary}]}>
          {currency}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.currencyName, {color: theme.colors.textSecondary}]}>
          {CURRENCY_NAMES[currency]}
        </Text>
      </View>
      <View style={styles.currencyCheckLane}>
        {selected ? (
          <MaterialCommunityIcons
            name="check"
            size={22}
            color={theme.colors.primary}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export const DisplayCurrencySheet = ({
  displayCurrency,
  onClose,
  onSelect,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setSearchFocused(false);
    }
  }, [visible]);

  const currencies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return SUPPORTED_UNIVERSAL_DISPLAY_CURRENCIES;

    return SUPPORTED_UNIVERSAL_DISPLAY_CURRENCIES.filter(currency => {
      const currencyName = CURRENCY_NAMES[currency] || '';
      return (
        currency.toLowerCase().includes(normalizedQuery) ||
        currencyName.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query]);

  const selectCurrency = useCallback(
    currency => {
      onSelect(currency);
      onClose();
    },
    [onClose, onSelect],
  );

  return (
    <BottomSheetModal
      floating={false}
      maxHeight="80%"
      onClose={onClose}
      visible={visible}
      contentContainerStyle={styles.attachedSheet}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}>
        <SheetHeader title="Currencies" onClose={onClose} />
        <View style={styles.searchOuter}>
          <View
            style={[
              styles.searchField,
              {
                backgroundColor: searchFocused
                  ? theme.colors.inputFocused
                  : theme.colors.input,
                borderColor: searchFocused
                  ? theme.colors.primary
                  : 'transparent',
                shadowColor: theme.colors.primary,
              },
            ]}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onBlur={() => setSearchFocused(false)}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              placeholder="Search currencies"
              placeholderTextColor={theme.colors.textSubtle}
              returnKeyType="search"
              style={[styles.searchInput, {color: theme.colors.textPrimary}]}
              value={query}
            />
            <View style={styles.searchIcon}>
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color={theme.colors.textSubtle}
              />
            </View>
          </View>
        </View>
        <FlatList
          data={currencies}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          keyExtractor={currency => currency}
          renderItem={({item}) => (
            <CurrencyRow
              currency={item}
              selected={item === displayCurrency}
              onPress={() => selectCurrency(item)}
            />
          )}
          contentContainerStyle={styles.currencyList}
          style={styles.currencyListViewport}
        />
      </KeyboardAvoidingView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  attachedSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  sheetHeader: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerSide: {
    width: 34,
    height: 34,
  },
  sheetTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('semiBold'),
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchOuter: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchField: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
  },
  searchInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    lineHeight: 20,
    ...fontStyle('regular'),
  },
  searchIcon: {
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  currencyListViewport: {
    maxHeight: 500,
  },
  currencyList: {
    paddingBottom: 8,
  },
  currencyRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  currencyCopy: {
    flex: 1,
    minWidth: 0,
  },
  currencyCode: {
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('semiBold'),
  },
  currencyName: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    ...fontStyle('regular'),
  },
  currencyCheckLane: {
    width: 34,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
