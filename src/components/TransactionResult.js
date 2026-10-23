import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ExternalLink} from 'lucide-react-native';
import AnimatedSuccessCheckmark from './AnimatedSuccessCheckmark';
import AppButton from './AppButton';
import CopyAction from './CopyAction';
import FadedScrollView from './FadedScrollView';
import SafeBottomActionStack from './SafeBottomActionStack';
import {fontStyle} from '../globals/fonts';
import {useOnboardingSmallDeviceLayout} from '../hooks/useOnboardingSmallDeviceLayout';
import {copyActionStyles} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';
import {openUrl} from '../utils/linking';

// The screen after the wallet sends one or more transactions: Send, Convert,
// invoice payments, gift card funding and card claims. It follows the Send
// flow's Sent step: no header, the check beside the title, the amounts, one
// row per transaction, one caption, and the actions.
//
// Say each fact once. The title states the outcome. There is no section label
// and no count line: the rows show the transactions, and the title already
// says what happened to them. Put what happens next in `caption`.
//
// - `title`: the outcome, for example "Transaction sent".
// - `success`: shows the animated check. Pass false when no transaction was
//   sent or the outcome is a failure.
// - `amount`: optional transfer summary, such as `TransferNode` rows.
// - `details`: optional `FlatRow` facts above the transaction rows.
// - `transactions`: `[{txid, explorerUrl, label}]`. One transaction reads
//   "Transaction ID". With two or more, each row shows its `label`.
//   `explorerUrl` adds an explorer action beside the copy action.
// - `caption`: optional line under the rows.
// - `actions`: `[{label, onPress, variant, disabled}]`. The first action is
//   primary unless it sets `variant`; the others are secondary.
const TransactionResult = ({
  actions = [],
  amount = null,
  caption = null,
  details = null,
  success = true,
  title,
  transactions = [],
}) => {
  const theme = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  const rows = (transactions || []).filter(
    item => typeof item?.txid === 'string' && item.txid.length > 0,
  );
  const showItemLabels = rows.length > 1;

  return (
    <View style={[styles.screen, {backgroundColor: theme.colors.background}]}>
      <FadedScrollView
        containerStyle={[styles.scrollViewport, {marginTop: insets.top}]}
        contentContainerStyle={[styles.content, smallDevice && styles.contentCompact]}
        fadeBackgroundColor={theme.colors.background}>
        <View style={styles.titleRow}>
          {success ? (
            <AnimatedSuccessCheckmark
              style={smallDevice ? styles.successAnimationCompact : styles.successAnimation}
            />
          ) : null}
          <Text
            accessibilityRole="header"
            style={[
              theme.typography.headlineMd,
              styles.title,
              !success && styles.titleWithoutMark,
              {color: theme.colors.textPrimary},
            ]}>
            {title}
          </Text>
        </View>
        {amount ? (
          <View style={[styles.summary, smallDevice && styles.sectionCompact]}>
            {amount}
          </View>
        ) : null}
        {details || rows.length > 0 ? (
          <View
            style={[
              styles.rows,
              smallDevice && styles.sectionCompact,
              {borderTopColor: theme.colors.border},
            ]}>
            {details}
            {rows.map(item => (
              <View
                key={item.txid}
                style={[styles.txRow, {borderBottomColor: theme.colors.border}]}>
                <View style={styles.txCopy}>
                  <Text
                    numberOfLines={2}
                    style={[styles.txLabel, {color: theme.colors.textSecondary}]}>
                    {showItemLabels && item.label ? item.label : 'Transaction ID'}
                  </Text>
                  <Text
                    ellipsizeMode="middle"
                    numberOfLines={1}
                    style={[styles.txid, {color: theme.colors.textPrimary}]}>
                    {item.txid}
                  </Text>
                </View>
                <CopyAction
                  accessibilityLabel="Copy transaction ID"
                  copiedAccessibilityLabel="Transaction ID copied"
                  value={item.txid}
                />
                {item.explorerUrl ? (
                  <TouchableOpacity
                    accessibilityLabel="View in explorer"
                    accessibilityRole="link"
                    activeOpacity={0.72}
                    onPress={() => openUrl(item.explorerUrl)}
                    style={copyActionStyles.iconButton}>
                    <ExternalLink
                      color={theme.colors.textSubtle}
                      size={18}
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
        {caption ? (
          <Text style={[theme.typography.caption, styles.caption, {color: theme.colors.textSubtle}]}>
            {caption}
          </Text>
        ) : null}
      </FadedScrollView>
      {actions.length > 0 ? (
        <SafeBottomActionStack
          bottomSpacing={smallDevice ? 24 : 40}
          gap={10}
          horizontalSpacing={24}
          safeAreaSpacing={12}
          style={[styles.footer, smallDevice && styles.footerCompact]}>
          {actions.map((action, index) => (
            <AppButton
              disabled={action.disabled}
              key={action.label}
              onPress={action.onPress}
              variant={action.variant || (index === 0 ? 'primary' : 'secondary')}>
              {action.label}
            </AppButton>
          ))}
        </SafeBottomActionStack>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1},
  scrollViewport: {flex: 1},
  content: {flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28},
  contentCompact: {paddingTop: 16},
  titleRow: {flexDirection: 'row', alignItems: 'center'},
  successAnimation: {width: 64, height: 64, marginLeft: -10},
  successAnimationCompact: {width: 48, height: 48, marginLeft: -6},
  title: {flex: 1, marginLeft: 4},
  titleWithoutMark: {marginLeft: 0},
  sectionCompact: {marginTop: 12},
  summary: {marginTop: 24},
  rows: {marginTop: 24, borderTopWidth: StyleSheet.hairlineWidth},
  txRow: {minHeight: 58, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center'},
  txCopy: {flex: 1, minWidth: 0, marginRight: 8},
  txLabel: {fontSize: 14, lineHeight: 19, ...fontStyle('regular')},
  txid: {fontSize: 12, lineHeight: 17, marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'},
  caption: {marginTop: 14},
  footer: {paddingTop: 16},
  footerCompact: {paddingTop: 8},
});

export default TransactionResult;
