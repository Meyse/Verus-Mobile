import React from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheetModal from '../../../components/BottomSheetModal';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {ADDRESS_TYPE} from '../wizardUtils';

const truncateAddress = address =>
  address?.length > 20
    ? `${address.slice(0, 10)}...${address.slice(-8)}`
    : address;

const SelfAddressSheet = ({addressType, addresses, onClose, onSelect, visible}) => {
  const theme = useOnboardingTheme();

  return (
    <BottomSheetModal floating={false} maxHeight="70%" onClose={onClose} visible={visible}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerSide}>
          <Text style={[styles.closeText, {color: theme.colors.primary}]}>Close</Text>
        </TouchableOpacity>
        <Text style={[styles.title, {color: theme.colors.textPrimary}]}>Your addresses</Text>
        <View style={styles.headerSide} />
      </View>
      <Text style={[styles.description, {color: theme.colors.textSecondary}]}>
        {`Select one of your ${
          addressType === ADDRESS_TYPE.ETHEREUM ? 'Ethereum' : 'Verus'
        } addresses to send to yourself.`}
      </Text>
      <ScrollView contentContainerStyle={styles.list}>
        {addresses.map(item => (
          <TouchableOpacity
            key={item.id || item.address}
            activeOpacity={0.7}
            onPress={() => onSelect(item)}
            style={[styles.card, {backgroundColor: theme.colors.surfaceMuted}]}>
            <View style={styles.copy}>
              <Text numberOfLines={1} style={[styles.primary, {color: theme.colors.textPrimary}]}>
                {item.verusIdName || truncateAddress(item.address)}
              </Text>
              {item.verusIdName ? (
                <Text numberOfLines={1} style={[styles.secondary, {color: theme.colors.textSecondary}]}>
                  {truncateAddress(item.address)}
                </Text>
              ) : null}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textSubtle} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  header: {minHeight: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center'},
  headerSide: {width: 64, height: 44, justifyContent: 'center'},
  closeText: {fontSize: 14, lineHeight: 20, ...fontStyle('semiBold')},
  title: {flex: 1, textAlign: 'center', fontSize: 16, lineHeight: 22, ...fontStyle('semiBold')},
  description: {paddingHorizontal: 20, paddingBottom: 16, fontSize: 14, lineHeight: 20, ...fontStyle('regular')},
  list: {paddingHorizontal: 16, paddingBottom: 20},
  card: {minHeight: 64, borderRadius: 12, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center'},
  copy: {flex: 1, minWidth: 0},
  primary: {fontSize: 15, lineHeight: 20, ...fontStyle('semiBold')},
  secondary: {fontSize: 13, lineHeight: 18, marginTop: 4, ...fontStyle('regular')},
});

export default SelfAddressSheet;
