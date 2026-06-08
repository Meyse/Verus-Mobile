import React, {useEffect, useState} from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import BottomSheetModal from '../../../components/BottomSheetModal';
import WalletAvatar from '../../../components/WalletAvatar';
import Colors from '../../../globals/colors';
import {fontStyle} from '../../../globals/fonts';
import {signedOutSheetStyles} from '../../../styles';
import {formatLastOpenedLabel} from '../../../utils/account/accountActivity';
import {normalizeWalletAvatar} from '../../../utils/walletAvatar';

const WALLET_ROW_HEIGHT = 72;
const LIST_CONTENT_VERTICAL_PADDING = 4;
const MIN_VISIBLE_WALLET_ROWS = 4;
const SCROLL_CUE_HEIGHT = 54;
const SCROLL_END_THRESHOLD = 8;

const ChooseWalletSheet = ({
  visible,
  onClose,
  onClosed,
  accounts,
  defaultAccountHash,
  lastOpenedAccountTimestamps = {},
  networkLabel,
  onSelectAccount,
  onSetDefaultAccount,
}) => {
  const {height} = useWindowDimensions();
  const [showScrollCue, setShowScrollCue] = useState(false);
  const walletCount = Array.isArray(accounts) ? accounts.length : 0;
  const walletListMaxHeight = Math.max(260, height * 0.52);
  const visibleWalletRows = Math.max(
    MIN_VISIBLE_WALLET_ROWS,
    Math.floor(walletListMaxHeight / WALLET_ROW_HEIGHT),
  );
  const walletListScrollable = walletCount > visibleWalletRows;
  const walletListHeight =
    Math.min(walletCount, visibleWalletRows) * WALLET_ROW_HEIGHT +
    LIST_CONTENT_VERTICAL_PADDING;

  useEffect(() => {
    setShowScrollCue(visible && walletListScrollable);
  }, [visible, walletListScrollable]);

  const handleListScroll = event => {
    const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;
    const isScrolledToEnd =
      contentOffset.y + layoutMeasurement.height >=
      contentSize.height - SCROLL_END_THRESHOLD;
    const nextShowScrollCue = walletListScrollable && !isScrolledToEnd;

    setShowScrollCue(current =>
      current === nextShowScrollCue ? current : nextShowScrollCue,
    );
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      maxHeight="76%">
      <View style={[signedOutSheetStyles.body, signedOutSheetStyles.bodyList]}>
        <Text style={signedOutSheetStyles.title}>{'Choose wallet'}</Text>
        <Text style={signedOutSheetStyles.subtitle}>
          {`${walletCount} ${networkLabel} ${
            walletCount === 1 ? 'wallet' : 'wallets'
          }`}
        </Text>
        <View style={[styles.listFrame, {height: walletListHeight}]}>
          <FlatList
            data={accounts}
            keyExtractor={item => item.accountHash}
            scrollEnabled={walletListScrollable}
            showsVerticalScrollIndicator={walletListScrollable}
            onScroll={handleListScroll}
            scrollEventThrottle={16}
            contentContainerStyle={signedOutSheetStyles.listContent}
            renderItem={({item}) => (
              <WalletRow
                account={item}
                isDefault={item.accountHash === defaultAccountHash}
                lastOpenedAt={lastOpenedAccountTimestamps[item.accountHash]}
                onSelect={() => onSelectAccount(item)}
                onSetDefault={
                  typeof onSetDefaultAccount === 'function'
                    ? () => onSetDefaultAccount(item)
                    : null
                }
              />
            )}
          />
          {showScrollCue && <ScrollCue />}
        </View>
      </View>
    </BottomSheetModal>
  );
};

const ScrollCue = () => (
  <View pointerEvents="none" style={styles.scrollCue}>
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient id="walletScrollCue" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="0.72" stopColor="#FFFFFF" stopOpacity="0.92" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#walletScrollCue)" />
    </Svg>
  </View>
);

const WalletRow = ({
  account,
  isDefault,
  lastOpenedAt,
  onSelect,
  onSetDefault,
}) => {
  const walletAvatar = normalizeWalletAvatar(account.walletAvatar);
  const showDefaultAction = typeof onSetDefault === 'function';
  const lastOpenedLabel = formatLastOpenedLabel(lastOpenedAt);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.74}
        onPress={onSelect}
        style={styles.rowMain}>
        <View style={styles.walletIcon}>
          {walletAvatar ? (
            <WalletAvatar
              walletAvatar={walletAvatar}
              size={38}
              emojiSize={20}
            />
          ) : (
            <MaterialCommunityIcons
              name="wallet-outline"
              size={22}
              color={Colors.primaryColor}
            />
          )}
        </View>
        <View style={styles.rowText}>
          <Text numberOfLines={1} style={styles.walletName}>
            {account.id}
          </Text>
          <View style={styles.walletMetaRow}>
            {isDefault && !showDefaultAction && (
              <Text style={styles.defaultText}>{'Default'}</Text>
            )}
            <Text numberOfLines={1} style={styles.lastOpenedText}>
              {lastOpenedLabel}
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={Colors.tertiaryColor}
        />
      </TouchableOpacity>
      {showDefaultAction && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{selected: isDefault}}
          activeOpacity={isDefault ? 1 : 0.74}
          disabled={isDefault}
          onPress={onSetDefault}
          style={[
            styles.defaultButton,
            isDefault && styles.defaultButtonActive,
          ]}>
          <MaterialCommunityIcons
            name={isDefault ? 'star' : 'star-outline'}
            size={17}
            color={isDefault ? Colors.secondaryColor : Colors.primaryColor}
          />
          <Text
            style={[
              styles.defaultButtonText,
              isDefault && styles.defaultButtonTextActive,
            ]}>
            {isDefault ? 'Default' : 'Set default'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  listFrame: {
    overflow: 'hidden',
  },
  scrollCue: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCROLL_CUE_HEIGHT,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowMain: {
    flex: 1,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  walletIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3FF',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
    paddingRight: 8,
  },
  walletName: {
    color: Colors.quinaryColor,
    fontSize: 16,
    ...fontStyle('semiBold'),
  },
  defaultText: {
    color: Colors.primaryColor,
    fontSize: 12,
    ...fontStyle('semiBold'),
  },
  walletMetaRow: {
    marginTop: 3,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lastOpenedText: {
    minWidth: 0,
    flexShrink: 1,
    color: Colors.verusDarkGray,
    fontSize: 12,
    ...fontStyle('regular'),
  },
  defaultButton: {
    minWidth: 104,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#D9E3FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 5,
  },
  defaultButtonActive: {
    backgroundColor: Colors.primaryColor,
    borderColor: Colors.primaryColor,
  },
  defaultButtonText: {
    color: Colors.primaryColor,
    fontSize: 12,
    ...fontStyle('semiBold'),
  },
  defaultButtonTextActive: {
    color: Colors.secondaryColor,
  },
});

export default ChooseWalletSheet;
