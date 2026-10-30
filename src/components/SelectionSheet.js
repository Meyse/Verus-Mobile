import React, {useMemo} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {Check, ChevronLeft} from 'lucide-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheetModal from './BottomSheetModal';
import SheetScrollView from './SheetScrollView';
import {
  createSignedOutSheetStyles,
  createSelectionSheetStyles,
} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';

export const SelectionRow = ({
  title,
  titleNumberOfLines,
  subtitle,
  titleMonospace,
  subtitleMonospace,
  selected,
  onPress,
  value,
  valueLabel,
  valueContent,
  leading,
  badge,
  accessibilityLabel,
  compact = false,
  dense = false,
  // A choice that exists but cannot be picked now, such as a private card
  // that still syncs. The subtitle says why.
  disabled = false,
  preserveSubtitle = false,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ||
        [title, subtitle, value, valueLabel]
          .filter(item => item != null && item !== '')
          .join(', ')
      }
      accessibilityState={
        selected == null && !disabled ? undefined : {selected: Boolean(selected), disabled}
      }
      activeOpacity={0.74}
      disabled={disabled}
      hitSlop={dense ? {top: 2, bottom: 2, left: 0, right: 0} : undefined}
      onPress={onPress}
      style={[styles.row, compact && styles.compactRow, dense && styles.denseRow, selected && styles.selectedRow]}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={[styles.copy, preserveSubtitle && styles.preservedCopy, disabled && styles.disabledContent]}>
        <Text
          ellipsizeMode="tail"
          numberOfLines={titleNumberOfLines ?? (compact ? 1 : undefined)}
          style={[styles.rowTitle, compact && styles.compactTitle, dense && styles.denseTitle, titleMonospace && styles.identifier]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={compact ? 1 : undefined}
            style={[
              styles.rowSubtitle,
              compact && styles.compactSubtitle,
              dense && styles.denseSubtitle,
              subtitleMonospace && styles.identifier,
            ]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge ? <View style={styles.badge}>{badge}</View> : null}
      {value != null || valueContent ? (
        <View style={[styles.value, preserveSubtitle && styles.wrappingValue, disabled && styles.disabledContent]}>
          {valueContent || (
            <>
              <Text style={[styles.valueText, preserveSubtitle && styles.wrappingValueText]}>{value}</Text>
              {valueLabel ? (
                <Text style={styles.valueLabel}>{valueLabel}</Text>
              ) : null}
            </>
          )}
        </View>
      ) : null}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.indicator, compact && styles.compactIndicator]}>
        {disabled ? null : selected ? (
          <Check color={theme.colors.successText} size={20} strokeWidth={2.4} />
        ) : (
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={theme.colors.textSubtle}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

export const SelectionGroup = ({title, children}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      {children}
    </View>
  );
};

export const SelectionAction = ({title, onPress}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      activeOpacity={0.74}
      onPress={onPress}
      style={styles.action}>
      <Text style={styles.actionText}>{title}</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={theme.colors.textSubtle}
      />
    </TouchableOpacity>
  );
};

const SelectionSheet = ({
  children,
  title,
  subtitle,
  header,
  footer,
  visible,
  onClose,
  onClosed,
  onBack,
  backAccessibilityLabel = 'Back',
  contentContainerStyle,
  avoidKeyboard = false,
  fillHeight = false,
  maxHeight = '76%',
  listProps,
  scrollViewProps,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  const bodyStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      avoidKeyboard={avoidKeyboard}
      maxHeight={maxHeight}
      contentContainerStyle={[fillHeight ? {height: maxHeight} : null, contentContainerStyle]}>
      <View
        style={[
          bodyStyles.body,
          bodyStyles.bodyShort,
          styles.body,
          fillHeight && styles.fill,
        ]}
        onAccessibilityEscape={onClose}>
        <View style={[styles.header, onBack && styles.nestedHeader]}>
          {onBack ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={backAccessibilityLabel}
              onPress={onBack}
              style={styles.backButton}>
              <ChevronLeft size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ) : null}
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {header ? <View style={styles.headerContent}>{header}</View> : null}
        <SheetScrollView
          fill={fillHeight}
          listProps={listProps}
          scrollViewProps={scrollViewProps}
          contentContainerStyle={bodyStyles.listContent}>
          {children}
        </SheetScrollView>
        {footer}
      </View>
    </BottomSheetModal>
  );
};

export default SelectionSheet;
