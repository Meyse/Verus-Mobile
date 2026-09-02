import React, {useMemo, useState} from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import {Check, Pencil, RotateCw} from 'lucide-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppSearchField from '../../components/AppSearchField';
import AppTextInput from '../../components/AppTextInput';
import BottomSheetModal from '../../components/BottomSheetModal';
import SignedOutActionRow from '../../components/SignedOutActionRow';
import SkeletonLoader, {SkeletonBlock} from '../../components/SkeletonLoader';
import {fontStyle} from '../../globals/fonts';
import {createSignedOutSheetStyles} from '../../styles';
import {useAppTheme} from '../../theme/app';
import {useOnboardingTheme} from '../../theme/onboarding';
import {AUTHORITY_IDENTITY_DISCOVERY_STATUS} from '../../utils/api/channels/verusid/authorityIdentityDiscovery';

const SHEET_MAX_HEIGHT_RATIO = 0.76;
const SHEET_MAX_HEIGHT = 548;
const SHEET_MIN_HEIGHT = 174;
const SHEET_PADDING_HEIGHT = 26;
const SHEET_ROW_HEIGHT = 64;
const SHEET_SEARCH_HEIGHT = 80;
const SHEET_STATUS_HEIGHT = 112;
const SHEET_ACTION_HEIGHT = 62;
export const AUTHORITY_IDENTITY_SEARCH_THRESHOLD = 6;
const SKELETON_WIDTHS = ['52%', '68%', '44%', '61%'];

const toSearchValue = candidate =>
  `${candidate.displayName || ''} ${candidate.identityAddress || ''}`.toLowerCase();

const getStatusMessage = (status, isRecovery) => {
  const action = isRecovery ? 'recover' : 'revoke';

  if (status === AUTHORITY_IDENTITY_DISCOVERY_STATUS.UNSUPPORTED) {
    return 'Automatic lookup isn’t available on this blockchain.';
  }

  if (status === AUTHORITY_IDENTITY_DISCOVERY_STATUS.ERROR) {
    return 'VerusIDs couldn’t be loaded right now.';
  }

  return `No VerusIDs were found that this authority can ${action}.`;
};

const RevokeRecoverIdentityPickerSheet = ({
  candidates,
  isRecovery,
  onClose,
  onManualEntry,
  onRetry,
  onSelect,
  selectedIdentityAddress,
  status,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const {height} = useWindowDimensions();
  const signedOutSheetStyles = useMemo(
    () => createSignedOutSheetStyles(theme),
    [theme],
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [searchQuery, setSearchQuery] = useState('');
  const loading = status === AUTHORITY_IDENTITY_DISCOVERY_STATUS.LOADING;
  const showCandidates =
    status === AUTHORITY_IDENTITY_DISCOVERY_STATUS.READY &&
    candidates.length > 0;
  const showSearch =
    showCandidates &&
    candidates.length > AUTHORITY_IDENTITY_SEARCH_THRESHOLD;
  const filteredCandidates = useMemo(() => {
    if (!showSearch) return candidates;

    const query = searchQuery.trim().toLowerCase();

    if (!query) return candidates;
    return candidates.filter(candidate =>
      toSearchValue(candidate).includes(query),
    );
  }, [candidates, searchQuery, showSearch]);
  const showRetry = status === AUTHORITY_IDENTITY_DISCOVERY_STATUS.ERROR;
  const showManualEntry =
    status === AUTHORITY_IDENTITY_DISCOVERY_STATUS.ERROR ||
    status === AUTHORITY_IDENTITY_DISCOVERY_STATUS.UNSUPPORTED;
  const candidateContentHeight = showCandidates
    ? Math.min(
        candidates.length,
        AUTHORITY_IDENTITY_SEARCH_THRESHOLD + 1,
      ) * SHEET_ROW_HEIGHT
    : 0;
  const desiredSheetHeight = loading
    ? SHEET_PADDING_HEIGHT + SKELETON_WIDTHS.length * SHEET_ROW_HEIGHT
    : showCandidates
    ? SHEET_PADDING_HEIGHT +
      candidateContentHeight +
      (showSearch ? SHEET_SEARCH_HEIGHT : 0)
    : SHEET_PADDING_HEIGHT +
      SHEET_STATUS_HEIGHT +
      (showRetry ? SHEET_ACTION_HEIGHT : 0) +
      (showManualEntry ? SHEET_ACTION_HEIGHT : 0);
  const sheetHeight = Math.min(
    SHEET_MAX_HEIGHT,
    Math.floor(height * SHEET_MAX_HEIGHT_RATIO),
    Math.max(SHEET_MIN_HEIGHT, desiredSheetHeight),
  );

  return (
    <BottomSheetModal
      avoidKeyboard={showSearch}
      contentContainerStyle={{height: sheetHeight}}
      embedded
      maxHeight={sheetHeight}
      onClose={onClose}
      visible={visible}>
      <View
        style={[
          signedOutSheetStyles.body,
          signedOutSheetStyles.bodyShort,
          styles.body,
        ]}>
        <View style={styles.discoveryArea}>
          {loading ? (
            <SkeletonLoader
              accessibilityLabel={`Finding VerusIDs to ${
                isRecovery ? 'recover' : 'revoke'
              }`}
              style={styles.skeletonState}>
              {SKELETON_WIDTHS.map(width => (
                <View key={width} style={styles.identityRow}>
                  <SkeletonBlock
                    color={theme.colors.border}
                    height={16}
                    width={width}
                  />
                </View>
              ))}
            </SkeletonLoader>
          ) : null}

          {showCandidates ? (
            <>
              {showSearch ? (
                <AppSearchField
                  accessibilityLabel="Search VerusIDs"
                  onChangeText={setSearchQuery}
                  placeholder="Search VerusIDs"
                  resultCount={filteredCandidates.length}
                  style={styles.searchContainer}
                  testID="revokeRecover.identity.search"
                  themeMode={theme.mode}
                  value={searchQuery}
                />
              ) : null}
              {filteredCandidates.length ? (
                <FlatList
                  alwaysBounceVertical={false}
                  bounces={false}
                  contentContainerStyle={signedOutSheetStyles.listContent}
                  data={filteredCandidates}
                  keyExtractor={candidate => candidate.identityAddress}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({item}) => (
                    <IdentityRow
                      candidate={item}
                      isRecovery={isRecovery}
                      onPress={() => onSelect(item)}
                      selected={
                        item.identityAddress === selectedIdentityAddress
                      }
                      styles={styles}
                      theme={theme}
                    />
                  )}
                  showsVerticalScrollIndicator
                />
              ) : (
                <StatusState
                  message="No VerusIDs match that search."
                  styles={styles}
                />
              )}
            </>
          ) : null}

          {!loading && !showCandidates ? (
            <StatusState
              message={getStatusMessage(status, isRecovery)}
              styles={styles}
            />
          ) : null}
        </View>

        {showRetry ? (
          <SignedOutActionRow
            IconComponent={RotateCw}
            label="Retry automatic lookup"
            onPress={onRetry}
            testID="revokeRecover.identity.retry"
          />
        ) : null}
        {showManualEntry ? (
          <SignedOutActionRow
            IconComponent={Pencil}
            label="Enter VerusID manually"
            onPress={onManualEntry}
            testID="revokeRecover.identity.manual"
          />
        ) : null}
      </View>
    </BottomSheetModal>
  );
};

const StatusState = ({message, styles}) => (
  <View accessibilityLiveRegion="polite" style={styles.statusState}>
    <Text style={styles.statusText}>{message}</Text>
  </View>
);

const IdentityRow = ({
  candidate,
  isRecovery,
  onPress,
  selected,
  styles,
  theme,
}) => (
  <TouchableOpacity
    accessibilityLabel={`Select ${candidate.displayName} to ${
      isRecovery ? 'recover' : 'revoke'
    }`}
    accessibilityRole="button"
    accessibilityState={{selected}}
    activeOpacity={0.74}
    onPress={onPress}
    style={[
      styles.identityRow,
      {
        backgroundColor: selected
          ? theme.colors.successBackground
          : theme.colors.surfaceMuted,
      },
    ]}
    testID={`revokeRecover.identity.option.${candidate.identityAddress}`}>
    <View style={styles.identityText}>
      <Text numberOfLines={1} style={styles.identityName}>
        {candidate.displayName}
      </Text>
    </View>
    <View style={styles.checkContainer}>
      {selected ? (
        <Check color={theme.colors.success} size={20} strokeWidth={2.4} />
      ) : null}
    </View>
  </TouchableOpacity>
);

export const RevokeRecoverIdentityField = ({
  candidateCount,
  discoveryStatus,
  errorText,
  isRecovery,
  manualEntry,
  onChangeText,
  onChoose,
  onRetry,
  onSubmitEditing,
  selectedCandidate,
  value,
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createFieldStyles(theme), [theme]);
  const action = isRecovery ? 'recover' : 'revoke';
  const loading =
    discoveryStatus === AUTHORITY_IDENTITY_DISCOVERY_STATUS.LOADING;
  const empty = discoveryStatus === AUTHORITY_IDENTITY_DISCOVERY_STATUS.EMPTY;
  const singleCandidate =
    discoveryStatus === AUTHORITY_IDENTITY_DISCOVERY_STATUS.READY &&
    candidateCount === 1;

  if (manualEntry) {
    return (
      <View>
        <AppTextInput
          autoCapitalize="none"
          autoCorrect={false}
          errorText={errorText}
          label="VerusID name or i-address"
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          placeholder="name@ or i..."
          returnKeyType={isRecovery ? 'next' : 'done'}
          testID="revokeRecover.identity.input"
          value={value || ''}
        />
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.74}
          onPress={onChoose}
          style={styles.chooseAvailable}
          testID="revokeRecover.identity.chooseAvailable">
          <Text style={styles.chooseAvailableText}>
            {`Choose from VerusIDs this authority can ${action}`}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <SkeletonLoader
        accessibilityLabel={`Finding VerusIDs to ${action}`}
        style={styles.selectionField}>
        <View style={styles.selectionCopy}>
          <SkeletonBlock color={theme.colors.border} height={16} width="46%" />
          <SkeletonBlock
            color={theme.colors.border}
            height={12}
            style={styles.fieldSkeletonBody}
            width="72%"
          />
        </View>
      </SkeletonLoader>
    );
  }

  if (empty) {
    return (
      <View>
        <View
          accessibilityLabel={`No VerusIDs are available to ${action}`}
          style={styles.selectionField}
          testID="revokeRecover.identity.empty">
          <View style={styles.selectionCopy}>
            <Text style={styles.selectionTitle}>No eligible VerusIDs found</Text>
            <Text style={styles.selectionBody}>
              {`This authority cannot ${action} any eligible identities.`}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.74}
          onPress={onRetry}
          style={styles.chooseAvailable}
          testID="revokeRecover.identity.retryInline">
          <Text style={styles.chooseAvailableText}>Try automatic lookup again</Text>
        </TouchableOpacity>
        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      </View>
    );
  }

  const selectionCopy = (
    <View style={styles.selectionCopy}>
      <Text numberOfLines={1} style={styles.selectionTitle}>
        {selectedCandidate?.displayName || 'Choose a VerusID'}
      </Text>
      <Text
        numberOfLines={1}
        style={[
          styles.selectionBody,
          selectedCandidate && styles.selectionTechnicalBody,
        ]}>
        {selectedCandidate?.identityAddress ||
          `Find identities this authority can ${action}`}
      </Text>
    </View>
  );

  return (
    <View>
      {singleCandidate ? (
        <View
          accessibilityLabel={`${selectedCandidate?.displayName}, selected to ${action}`}
          style={styles.selectionField}
          testID="revokeRecover.identity.single">
          {selectionCopy}
        </View>
      ) : (
        <TouchableOpacity
          accessibilityLabel={`Choose a VerusID to ${action}`}
          accessibilityRole="button"
          activeOpacity={0.76}
          onPress={onChoose}
          style={styles.selectionField}
          testID="revokeRecover.identity.choose">
          {selectionCopy}
          <MaterialCommunityIcons
            color={theme.colors.textSubtle}
            name="chevron-right"
            size={23}
          />
        </TouchableOpacity>
      )}
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
    </View>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    body: {
      flex: 1,
    },
    discoveryArea: {
      flex: 1,
      minHeight: 0,
    },
    searchContainer: {
      marginBottom: 10,
    },
    skeletonState: {
      flex: 1,
      justifyContent: 'center',
    },
    statusState: {
      flex: 1,
      minHeight: 96,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    statusText: {
      color: theme.colors.textSubtle,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
      ...fontStyle('regular'),
    },
    identityRow: {
      height: 56,
      borderRadius: 18,
      paddingHorizontal: 16,
      marginVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    identityText: {
      minWidth: 0,
      flex: 1,
      paddingRight: 10,
    },
    identityName: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      ...fontStyle('semiBold'),
    },
    checkContainer: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

const createFieldStyles = theme =>
  StyleSheet.create({
    selectionField: {
      minHeight: 64,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    selectionCopy: {
      minWidth: 0,
      flex: 1,
      paddingRight: 12,
    },
    fieldSkeletonBody: {
      marginTop: 8,
    },
    selectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 21,
      ...fontStyle('semiBold'),
    },
    selectionBody: {
      marginTop: 2,
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
    selectionTechnicalBody: {
      fontFamily: 'monospace',
      fontWeight: '500',
    },
    chooseAvailable: {
      minHeight: 44,
      alignSelf: 'flex-start',
      justifyContent: 'center',
    },
    chooseAvailableText: {
      color: theme.colors.primary,
      fontSize: 14,
      lineHeight: 20,
      ...fontStyle('semiBold'),
    },
    errorText: {
      marginTop: 6,
      marginLeft: 12,
      color: theme.colors.danger,
      fontSize: 12,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
  });

export default RevokeRecoverIdentityPickerSheet;
