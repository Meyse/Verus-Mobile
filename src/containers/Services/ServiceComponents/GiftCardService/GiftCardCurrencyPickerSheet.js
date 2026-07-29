import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../../../components/AppButton';
import AppSearchField from '../../../../components/AppSearchField';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import {fontStyle} from '../../../../globals/fonts';
import {useOnboardingTheme} from '../../../../theme/onboarding';

const ROW_HEIGHT = 68;
const SHEET_MAX_HEIGHT_RATIO = 0.76;
const SHEET_CHROME_HEIGHT = 222;

const GiftCardCurrencyPickerSheet = ({
  onApply,
  onClose,
  onClosed,
  options,
  selectedKeys,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const {height: screenHeight} = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const wasVisibleRef = useRef(false);
  const [query, setQuery] = useState('');
  const [draftSelectedKeys, setDraftSelectedKeys] = useState([]);

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      setDraftSelectedKeys(selectedKeys);
      setQuery('');
    }

    wasVisibleRef.current = visible;
  }, [selectedKeys, visible]);

  const selectedKeySet = useMemo(
    () => new Set(draftSelectedKeys),
    [draftSelectedKeys],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredOptions = useMemo(
    () =>
      options.filter(
        option =>
          !normalizedQuery || option.searchText.includes(normalizedQuery),
      ),
    [normalizedQuery, options],
  );
  const maximumListHeight = Math.max(
    ROW_HEIGHT,
    screenHeight * SHEET_MAX_HEIGHT_RATIO - SHEET_CHROME_HEIGHT,
  );
  const listHeight = Math.min(
    Math.max(filteredOptions.length, 1) * ROW_HEIGHT,
    maximumListHeight,
  );
  const subtitle = normalizedQuery
    ? `${filteredOptions.length} of ${options.length} currencies`
    : `${options.length} ${
        options.length === 1 ? 'currency' : 'currencies'
      } available`;
  const applyLabel =
    draftSelectedKeys.length === 0
      ? 'Done'
      : `Add ${draftSelectedKeys.length} ${
          draftSelectedKeys.length === 1 ? 'currency' : 'currencies'
        }`;

  const toggleCurrency = useCallback(key => {
    setDraftSelectedKeys(current =>
      current.includes(key)
        ? current.filter(currentKey => currentKey !== key)
        : [...current, key],
    );
  }, []);

  const handleApply = useCallback(() => {
    Keyboard.dismiss();
    onApply(draftSelectedKeys);
    onClose();
  }, [draftSelectedKeys, onApply, onClose]);

  const handleClosed = useCallback(() => {
    setQuery('');
    setDraftSelectedKeys([]);

    if (typeof onClosed === 'function') onClosed();
  }, [onClosed]);

  const renderOption = useCallback(
    ({item}) => {
      const selected = selectedKeySet.has(item.key);
      const accessibilityLabel = [
        item.ticker,
        item.name,
        item.systemName,
        `Balance ${item.balanceText} ${item.ticker}`,
      ].join('. ');

      return (
        <TouchableOpacity
          accessibilityHint="Toggles this currency for the gift card."
          accessibilityLabel={`${accessibilityLabel}.`}
          accessibilityRole="checkbox"
          accessibilityState={{checked: selected}}
          activeOpacity={0.74}
          onPress={() => toggleCurrency(item.key)}
          style={styles.currencyRow}>
          <View style={styles.currencyCopy}>
            <View style={styles.currencyNameRow}>
              <Text numberOfLines={1} style={styles.currencyTicker}>
                {item.ticker}
              </Text>
              {item.name !== item.ticker ? (
                <Text numberOfLines={1} style={styles.currencyName}>
                  {item.name}
                </Text>
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.currencySystem}>
              {item.systemName}
            </Text>
          </View>
          <View style={styles.balanceCopy}>
            <Text numberOfLines={1} style={styles.balance}>
              {item.balanceText}
            </Text>
            <Text numberOfLines={1} style={styles.balanceTicker}>
              {item.ticker}
            </Text>
          </View>
          <MaterialCommunityIcons
            color={selected ? theme.colors.primary : theme.colors.textSubtle}
            name={
              selected
                ? 'checkbox-marked-circle'
                : 'checkbox-blank-circle-outline'
            }
            size={23}
          />
        </TouchableOpacity>
      );
    },
    [selectedKeySet, styles, theme.colors.primary, theme.colors.textSubtle, toggleCurrency],
  );

  return (
    <BottomSheetModal
      avoidKeyboard
      maxHeight="76%"
      onClose={onClose}
      onClosed={handleClosed}
      visible={visible}>
      <View
        accessibilityViewIsModal
        onAccessibilityEscape={onClose}
        style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          Choose currencies
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <AppSearchField
          accessibilityLabel="Search currencies"
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder="Search currencies"
          resultCount={filteredOptions.length}
          style={styles.search}
          themeMode={theme.mode}
          value={query}
        />

        {filteredOptions.length > 0 ? (
          <FlatList
            alwaysBounceVertical={false}
            bounces={false}
            contentContainerStyle={styles.listContent}
            data={filteredOptions}
            getItemLayout={(_, index) => ({
              index,
              length: ROW_HEIGHT,
              offset: ROW_HEIGHT * index,
            })}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            keyExtractor={item => item.key}
            renderItem={renderOption}
            showsVerticalScrollIndicator={filteredOptions.length * ROW_HEIGHT > listHeight}
            style={[styles.list, {height: listHeight}]}
          />
        ) : (
          <View style={[styles.emptyState, {height: listHeight}]}>
            <Text style={styles.emptyText}>
              No currencies match your search.
            </Text>
          </View>
        )}
      </View>

      <SafeBottomActionStack
        bottomSpacing={18}
        horizontalSpacing={20}
        includeBottomInset={false}
        safeAreaSpacing={0}>
        <AppButton
          accessibilityLabel={applyLabel}
          height={56}
          onPress={handleApply}
          themeMode={theme.mode}>
          {applyLabel}
        </AppButton>
      </SafeBottomActionStack>
    </BottomSheetModal>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    body: {
      flexGrow: 0,
      flexShrink: 1,
      minHeight: 0,
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      lineHeight: 26,
      ...fontStyle('semiBold'),
    },
    subtitle: {
      marginTop: 4,
      color: theme.colors.textSubtle,
      fontSize: 13,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
    search: {
      marginTop: 14,
      marginBottom: 10,
    },
    list: {
      flexGrow: 0,
      flexShrink: 1,
    },
    listContent: {
      paddingBottom: 2,
    },
    currencyRow: {
      height: ROW_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    currencyCopy: {
      minWidth: 0,
      flex: 1,
      paddingRight: 10,
    },
    currencyNameRow: {
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    currencyTicker: {
      flexShrink: 0,
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 21,
      ...fontStyle('semiBold'),
    },
    currencyName: {
      minWidth: 0,
      flexShrink: 1,
      marginLeft: 6,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      ...fontStyle('regular'),
    },
    currencySystem: {
      marginTop: 2,
      color: theme.colors.textSubtle,
      fontSize: 12,
      lineHeight: 17,
      ...fontStyle('regular'),
    },
    balanceCopy: {
      maxWidth: 96,
      marginRight: 12,
      alignItems: 'flex-end',
    },
    balance: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      lineHeight: 18,
      ...fontStyle('semiBold'),
    },
    balanceTicker: {
      marginTop: 1,
      color: theme.colors.textSubtle,
      fontSize: 11,
      lineHeight: 16,
      ...fontStyle('regular'),
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      color: theme.colors.textSubtle,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      ...fontStyle('regular'),
    },
  });

export default GiftCardCurrencyPickerSheet;
