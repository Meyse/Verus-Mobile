import React, {useEffect, useMemo, useState} from 'react';
import {FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheetModal from '../../../components/BottomSheetModal';
import SkeletonLoader, {SkeletonRow} from '../../../components/SkeletonLoader';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {
  addressBookRecordMatchesContext,
  loadAddressBook,
} from '../../../utils/addressBook/addressBook';

const AddressBookSheet = ({context, onClose, onSelect, visible}) => {
  const navigation = useNavigation();
  const theme = useOnboardingTheme();
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) return undefined;
    let active = true;
    setLoading(true);
    setError(null);

    loadAddressBook()
      .then(result => {
        if (active) setRecords(result);
      })
      .catch(loadError => {
        if (active) setError(loadError.message || 'Could not load Address Book.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter(record => {
      if (!addressBookRecordMatchesContext(record, context)) return false;
      if (!normalizedQuery) return true;
      return [record.label, record.address, record.verusId]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(normalizedQuery));
    });
  }, [context, query, records]);

  const manageAddresses = () => {
    onClose();
    const mainStack = navigation.getParent?.();
    mainStack?.navigate('Home', {
      screen: 'ServicesHome',
      params: {screen: 'AddressBook'},
    });
  };

  return (
    <BottomSheetModal floating={false} maxHeight="80%" onClose={onClose} visible={visible}>
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <Text style={[styles.title, {color: theme.colors.textPrimary}]}>Saved Addresses</Text>
        <TouchableOpacity
          accessibilityLabel="Close Address Book"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.close}>
          <MaterialCommunityIcons name="close" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={[styles.search, {backgroundColor: theme.colors.input}]}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder="Search saved addresses"
          placeholderTextColor={theme.colors.textSubtle}
          style={[styles.searchInput, {color: theme.colors.textPrimary}]}
          value={query}
        />
        <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textSubtle} />
      </View>
      {loading ? (
        <SkeletonLoader accessibilityLabel="Loading Address Book">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </SkeletonLoader>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="book-open-page-variant" size={34} color={theme.colors.textSubtle} />
              <Text style={[styles.emptyTitle, {color: error ? theme.colors.danger : theme.colors.textPrimary}]}>{error || 'No saved addresses'}</Text>
              <Text style={[styles.emptyBody, {color: theme.colors.textSecondary}]}>Add an address in Address Book to use it here.</Text>
              <TouchableOpacity onPress={manageAddresses} style={[styles.emptyAction, {backgroundColor: theme.colors.surfaceMuted}]}>
                <Text style={[styles.emptyActionText, {color: theme.colors.primary}]}>Add address</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({item}) => (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.72}
              onPress={() => onSelect(item)}
              style={[styles.row, {backgroundColor: theme.colors.surfaceMuted}]}>
              <View style={styles.rowIcon}>
                <MaterialCommunityIcons name="account-outline" size={24} color={theme.colors.textPrimary} />
              </View>
              <View style={styles.rowCopy}>
                <View style={styles.rowTitleLine}>
                  <Text style={[styles.rowTitle, {color: theme.colors.textPrimary}]}>{item.label}</Text>
                  <View style={[styles.typeBadge, {backgroundColor: theme.colors.surface}]}>
                    <Text style={[styles.typeBadgeText, {color: theme.colors.textSecondary}]}>{item.verusId ? 'VerusID' : 'Address'}</Text>
                  </View>
                </View>
                <Text numberOfLines={1} ellipsizeMode="middle" style={[styles.address, {color: theme.colors.textSecondary}]}>
                  {item.verusId || item.address}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.textSubtle} />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      )}
      <TouchableOpacity onPress={manageAddresses} style={[styles.manage, {borderTopColor: theme.colors.border}]}>
        <Text style={[styles.manageText, {color: theme.colors.primary}]}>Manage addresses</Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.primary} />
      </TouchableOpacity>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  header: {minHeight: 54, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center'},
  headerSide: {width: 34, height: 34},
  title: {flex: 1, textAlign: 'center', fontSize: 16, lineHeight: 22, ...fontStyle('semiBold')},
  close: {width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center'},
  search: {height: 44, borderRadius: 12, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center'},
  searchInput: {flex: 1, height: 44, padding: 0, fontSize: 15, lineHeight: 20, ...fontStyle('regular')},
  list: {paddingHorizontal: 16, paddingBottom: 20},
  row: {minHeight: 72, borderRadius: 12, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center'},
  rowIcon: {width: 28, marginRight: 12, alignItems: 'center'},
  rowCopy: {flex: 1, minWidth: 0},
  rowTitleLine: {flexDirection: 'row', alignItems: 'center'},
  rowTitle: {fontSize: 16, lineHeight: 22, ...fontStyle('semiBold')},
  typeBadge: {borderRadius: 8, marginLeft: 8, paddingHorizontal: 7, paddingVertical: 2},
  typeBadgeText: {fontSize: 10, lineHeight: 14, ...fontStyle('semiBold')},
  address: {fontSize: 14, lineHeight: 19, marginTop: 3, ...fontStyle('regular')},
  empty: {paddingHorizontal: 28, paddingVertical: 32, alignItems: 'center'},
  emptyTitle: {fontSize: 16, lineHeight: 22, marginTop: 12, textAlign: 'center', ...fontStyle('semiBold')},
  emptyBody: {fontSize: 13, lineHeight: 18, marginTop: 4, textAlign: 'center', ...fontStyle('regular')},
  emptyAction: {borderRadius: 18, marginTop: 14, paddingHorizontal: 14, paddingVertical: 8},
  emptyActionText: {fontSize: 13, lineHeight: 18, ...fontStyle('semiBold')},
  manage: {minHeight: 52, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center'},
  manageText: {fontSize: 14, lineHeight: 19, ...fontStyle('semiBold')},
});

export default AddressBookSheet;
