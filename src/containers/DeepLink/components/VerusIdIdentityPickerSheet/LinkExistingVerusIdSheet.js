import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import {Pencil, Plus} from 'lucide-react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import AppTextInput from '../../../../components/AppTextInput';
import {fontStyle} from '../../../../globals/fonts';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import {createSignedOutSheetStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {
  getIdentitiesWithAddress,
  getIdentity,
} from '../../../../utils/api/channels/verusid/callCreators';
import {VRPC} from '../../../../utils/constants/intervalConstants';
import {convertFqnToDisplayFormat} from '../../../../utils/fullyqualifiedname';

const GET_IDENTITIES_WITH_ADDRESS_METHOD = 'getidentitieswithaddress';
const CANDIDATE_ROW_TOTAL_HEIGHT = 64;
const LIST_CONTENT_VERTICAL_PADDING = 4;
const DEFAULT_CANDIDATE_LIST_HEIGHT =
  4 * CANDIDATE_ROW_TOTAL_HEIGHT + LIST_CONTENT_VERTICAL_PADDING;
const SCROLL_CUE_HEIGHT = 42;
const SCROLL_END_THRESHOLD = 8;

const getErrorText = value => {
  if (value == null) return '';
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value);
  } catch (e) {
    return String(value);
  }
};

const isGetIdentitiesWithAddressUnsupported = error => {
  if (!error) return false;
  if (error.code === -32601) return true;

  const errorText = `${getErrorText(error.message)} ${getErrorText(
    error.data,
  )}`.toLowerCase();
  const hasUnsupportedMessage =
    errorText.includes('not found') ||
    errorText.includes('not supported') ||
    errorText.includes('unsupported') ||
    errorText.includes('unknown method') ||
    errorText.includes('method not found') ||
    errorText.includes('not a function');

  return (
    hasUnsupportedMessage &&
    (errorText.includes(GET_IDENTITIES_WITH_ADDRESS_METHOD) ||
      errorText.includes('method'))
  );
};

const normalizeDiscoveryResult = result => {
  if (result == null) return [];
  return Array.isArray(result) ? result : [result];
};

const getIdentityAddress = result => {
  return (
    result?.identityaddress ||
    result?.identityAddress ||
    result?.identity?.identityaddress ||
    result?.identity?.identityAddress ||
    null
  );
};

const getCandidateDisplayName = candidate => {
  const displaySource =
    candidate.fullyQualifiedName || candidate.friendlyName || candidate.name;

  return displaySource ? convertFqnToDisplayFormat(displaySource) : null;
};

const toSearchValue = candidate => {
  return [
    candidate.identityAddress,
    candidate.displayName,
    candidate.name,
    candidate.friendlyName,
    candidate.fullyQualifiedName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

const buildLinkedAddressSet = linkedIds => {
  const linkedAddresses = new Set();

  for (const chainId of Object.keys(linkedIds || {})) {
    for (const iAddress of Object.keys(linkedIds[chainId] || {})) {
      linkedAddresses.add(iAddress.toLowerCase());
    }
  }

  return linkedAddresses;
};

const LinkExistingVerusIdSheet = ({
  active,
  candidateListHeight = DEFAULT_CANDIDATE_LIST_HEIGHT,
  coinObj,
  isCandidateAllowed,
  linkedIds,
  onLinkCandidate,
  onManualLink,
}) => {
  const theme = useOnboardingTheme();
  const signedOutSheetStyles = useMemo(
    () => createSignedOutSheetStyles(theme),
    [theme],
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const listRef = useRef(null);
  const requestIdRef = useRef(0);
  const coinId = coinObj?.id;
  const systemId = coinObj?.system_id;
  const primaryAddress = useObjectSelector(state =>
    coinId
      ? state.authentication.activeAccount?.keys?.[coinId]?.[VRPC]
          ?.addresses?.[0] || null
      : null,
  );
  const [candidates, setCandidates] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [linking, setLinking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookupUnsupported, setLookupUnsupported] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBottomScrollCue, setShowBottomScrollCue] = useState(false);
  const [showTopScrollCue, setShowTopScrollCue] = useState(false);

  useEffect(() => {
    if (!active) {
      requestIdRef.current += 1;
      setCandidates([]);
      setErrorMessage(null);
      setLinking(false);
      setLoading(false);
      setLookupUnsupported(false);
      setSearchQuery('');
      setShowBottomScrollCue(false);
      setShowTopScrollCue(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const discover = async () => {
      setCandidates([]);
      setErrorMessage(null);
      setLoading(true);
      setLookupUnsupported(false);

      try {
        if (!systemId) {
          throw new Error('Missing VerusID network.');
        }

        if (!primaryAddress) {
          throw new Error('No wallet R-address found for this account.');
        }

        const discoveryRes = await getIdentitiesWithAddress(
          systemId,
          primaryAddress,
          false,
        );

        if (discoveryRes.error) {
          if (isGetIdentitiesWithAddressUnsupported(discoveryRes.error)) {
            if (requestIdRef.current === requestId) {
              setLookupUnsupported(true);
              setErrorMessage(
                'Automatic VerusID lookup is unavailable for this chain.',
              );
            }
            return;
          }

          throw new Error(discoveryRes.error.message);
        }

        const linkedAddressSet = buildLinkedAddressSet(linkedIds);
        const discoveredCandidates = await Promise.all(
          normalizeDiscoveryResult(discoveryRes.result).map(
            async discoveryResult => {
              const identityAddress = getIdentityAddress(discoveryResult);

              if (!identityAddress) return null;

              let identityRes;

              try {
                identityRes = await getIdentity(systemId, identityAddress);
              } catch (e) {
                return null;
              }

              if (identityRes.error) return null;

              const enrichedResult = identityRes.result;
              const enrichedIdentity = enrichedResult?.identity || {};
              const finalIdentityAddress =
                enrichedIdentity.identityaddress ||
                getIdentityAddress(enrichedResult) ||
                identityAddress;
              const candidate = {
                chainId: coinId,
                displayName: null,
                identity: enrichedIdentity,
                identityAddress: finalIdentityAddress,
                identityResult: enrichedResult,
                name: enrichedIdentity.name || discoveryResult?.name || null,
                friendlyName:
                  enrichedResult?.friendlyname ||
                  enrichedResult?.friendlyName ||
                  discoveryResult?.friendlyname ||
                  discoveryResult?.friendlyName ||
                  null,
                fullyQualifiedName:
                  enrichedResult?.fullyqualifiedname ||
                  enrichedResult?.fullyQualifiedName ||
                  discoveryResult?.fullyqualifiedname ||
                  discoveryResult?.fullyQualifiedName ||
                  null,
                primaryAddress,
                status: enrichedResult?.status || discoveryResult?.status || null,
                systemId,
              };

              candidate.displayName = getCandidateDisplayName(candidate);

              if (
                candidate.status !== 'active' ||
                !candidate.displayName ||
                linkedAddressSet.has(finalIdentityAddress.toLowerCase())
              ) {
                return null;
              }

              if (
                typeof isCandidateAllowed === 'function' &&
                !isCandidateAllowed(candidate)
              ) {
                return null;
              }

              return candidate;
            },
          ),
        );

        const deduped = [];
        const seen = new Set();

        for (const candidate of discoveredCandidates) {
          if (!candidate?.identityAddress) continue;

          const key = candidate.identityAddress.toLowerCase();
          if (seen.has(key)) continue;

          seen.add(key);
          deduped.push(candidate);
        }

        deduped.sort((left, right) =>
          left.displayName.localeCompare(right.displayName),
        );

        if (requestIdRef.current === requestId) {
          setCandidates(deduped);
        }
      } catch (e) {
        if (requestIdRef.current === requestId) {
          if (isGetIdentitiesWithAddressUnsupported(e)) {
            setLookupUnsupported(true);
            setErrorMessage(
              'Automatic VerusID lookup is unavailable for this chain.',
            );
          } else {
            setErrorMessage('Unable to find VerusIDs right now.');
          }
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    };

    discover();

    return () => {
      requestIdRef.current += 1;
    };
  }, [active, coinId, isCandidateAllowed, linkedIds, primaryAddress, systemId]);

  const filteredCandidates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return candidates;

    return candidates.filter(candidate =>
      toSearchValue(candidate).includes(query),
    );
  }, [candidates, searchQuery]);
  const listViewportHeight = Math.max(
    CANDIDATE_ROW_TOTAL_HEIGHT + LIST_CONTENT_VERTICAL_PADDING,
    candidateListHeight,
  );
  const candidateContentHeight =
    filteredCandidates.length * CANDIDATE_ROW_TOTAL_HEIGHT +
    LIST_CONTENT_VERTICAL_PADDING;
  const candidateListScrollable =
    candidateContentHeight > listViewportHeight + SCROLL_END_THRESHOLD;

  useEffect(() => {
    listRef.current?.scrollToOffset?.({offset: 0, animated: false});
    setShowTopScrollCue(false);
    setShowBottomScrollCue(candidateListScrollable);
  }, [
    candidateListScrollable,
    filteredCandidates.length,
    listViewportHeight,
    searchQuery,
  ]);

  useEffect(() => {
    if (!active || !candidateListScrollable || filteredCandidates.length === 0) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      listRef.current?.flashScrollIndicators?.();
    }, 260);

    return () => clearTimeout(timeout);
  }, [active, candidateListScrollable, filteredCandidates.length, searchQuery]);

  const handleLinkCandidate = async candidate => {
    if (linking) return;

    setLinking(true);

    try {
      await onLinkCandidate(candidate);
    } catch (e) {
      // Parent surfaces the actionable error. Keep the sheet stable.
    } finally {
      setLinking(false);
    }
  };

  const handleCandidateListScroll = event => {
    const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;
    const isAtTop = contentOffset.y <= SCROLL_END_THRESHOLD;
    const isAtEnd =
      contentOffset.y + layoutMeasurement.height >=
      contentSize.height - SCROLL_END_THRESHOLD;

    setShowTopScrollCue(current => {
      const next = candidateListScrollable && !isAtTop;
      return current === next ? current : next;
    });
    setShowBottomScrollCue(current => {
      const next = candidateListScrollable && !isAtEnd;
      return current === next ? current : next;
    });
  };

  if (loading || linking) {
    return (
      <LoadingState
        label={linking ? 'Linking VerusID' : 'Finding VerusIDs'}
        minHeight={listViewportHeight}
        styles={styles}
      />
    );
  }

  return (
    <>
      {candidates.length > 0 && (
        <AppTextInput
          autoCapitalize="none"
          containerStyle={styles.searchContainer}
          inputShellStyle={styles.searchShell}
          leftAccessory={
            <MaterialCommunityIcons
              name="magnify"
              size={21}
              color={theme.colors.textSubtle}
            />
          }
          onChangeText={setSearchQuery}
          onRightPress={() => setSearchQuery('')}
          placeholder="Search VerusID"
          returnKeyType="search"
          rightAccessibilityLabel="Clear search"
          rightIcon={searchQuery ? 'close-circle' : null}
          themeMode={theme.mode}
          value={searchQuery}
        />
      )}
      {errorMessage && (
        <View style={[styles.statusState, {minHeight: listViewportHeight}]}>
          <Text style={styles.statusText}>{errorMessage}</Text>
        </View>
      )}
      {!errorMessage && candidates.length === 0 && (
        <View style={[styles.statusState, {minHeight: listViewportHeight}]}>
          <Text style={styles.statusText}>
            {'No VerusIDs were found for this wallet.'}
          </Text>
        </View>
      )}
      {!errorMessage &&
        candidates.length > 0 &&
        filteredCandidates.length === 0 && (
          <View style={[styles.statusState, {minHeight: listViewportHeight}]}>
            <Text style={styles.statusText}>
              {'No VerusIDs match that search.'}
            </Text>
          </View>
        )}
      {filteredCandidates.length > 0 && (
        <View style={[styles.listFrame, {height: listViewportHeight}]}>
          <FlatList
            ref={listRef}
            alwaysBounceVertical={false}
            bounces={false}
            contentContainerStyle={signedOutSheetStyles.listContent}
            data={filteredCandidates}
            keyExtractor={candidate => candidate.identityAddress}
            keyboardShouldPersistTaps="handled"
            onScroll={handleCandidateListScroll}
            renderItem={({item}) => (
              <CandidateRow
                candidate={item}
                onPress={() => handleLinkCandidate(item)}
                styles={styles}
                theme={theme}
              />
            )}
            scrollEventThrottle={16}
            scrollEnabled={candidateListScrollable}
            showsVerticalScrollIndicator={candidateListScrollable}
          />
          {showTopScrollCue && (
            <ScrollCue position="top" styles={styles} theme={theme} />
          )}
          {showBottomScrollCue && (
            <ScrollCue position="bottom" styles={styles} theme={theme} />
          )}
        </View>
      )}
      {lookupUnsupported && (
        <ManualLinkRow
          onPress={onManualLink}
          signedOutSheetStyles={signedOutSheetStyles}
          theme={theme}
        />
      )}
    </>
  );
};

const LoadingState = ({label, minHeight, styles}) => (
  <View
    accessibilityLabel={label}
    accessibilityRole="progressbar"
    style={[styles.loadingState, {minHeight}]}>
    <LottieView
      autoPlay
      loop
      source={require('../../../../animations/loading_7bars.json')}
      style={styles.loadingAnimation}
    />
    <Text style={styles.statusText}>{label}</Text>
  </View>
);

const ScrollCue = ({position, styles, theme}) => {
  if (position === 'top') {
    return (
      <View
        pointerEvents="none"
        style={[styles.scrollCue, styles.scrollCueTop]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="identityTopScrollCue" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={theme.colors.sheet} stopOpacity="1" />
              <Stop offset="0.28" stopColor={theme.colors.sheet} stopOpacity="0.92" />
              <Stop offset="1" stopColor={theme.colors.sheet} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#identityTopScrollCue)" />
        </Svg>
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[styles.scrollCue, styles.scrollCueBottom]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="identityBottomScrollCue" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={theme.colors.sheet} stopOpacity="0" />
            <Stop offset="0.72" stopColor={theme.colors.sheet} stopOpacity="0.92" />
            <Stop offset="1" stopColor={theme.colors.sheet} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#identityBottomScrollCue)" />
      </Svg>
      <View style={styles.scrollCueChevron}>
        <MaterialCommunityIcons
          name="chevron-down"
          size={15}
          color={theme.colors.textSubtle}
        />
      </View>
    </View>
  );
};

const CandidateRow = ({candidate, onPress, styles, theme}) => (
  <TouchableOpacity
    accessibilityLabel={`Link ${candidate.displayName}`}
    accessibilityRole="button"
    activeOpacity={0.74}
    onPress={onPress}
    style={styles.identityRow}>
    <View style={styles.identityText}>
      <Text numberOfLines={1} style={styles.identityName}>
        {candidate.displayName}
      </Text>
    </View>
    <View pointerEvents="none" style={styles.plusContainer}>
      <Plus color={theme.colors.primary} size={20} strokeWidth={2.4} />
    </View>
  </TouchableOpacity>
);

const ManualLinkRow = ({onPress, signedOutSheetStyles, theme}) => (
  <TouchableOpacity
    accessibilityRole="button"
    activeOpacity={0.74}
    onPress={onPress}
    style={signedOutSheetStyles.actionRow}>
    <View
      style={[
        signedOutSheetStyles.actionIconContainer,
        signedOutSheetStyles.actionIcon,
      ]}>
      <Pencil size={24} color={theme.colors.textPrimary} />
    </View>
    <Text numberOfLines={1} style={signedOutSheetStyles.actionLabel}>
      {'Enter VerusID manually'}
    </Text>
    <MaterialCommunityIcons
      name="chevron-right"
      size={22}
      color={theme.colors.textSubtle}
    />
  </TouchableOpacity>
);

const createStyles = theme =>
  StyleSheet.create({
    searchContainer: {
      marginBottom: 10,
    },
    searchShell: {
      height: 50,
      minHeight: 50,
      borderRadius: 12,
    },
    loadingState: {
      minHeight: 156,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      gap: 8,
    },
    loadingAnimation: {
      width: 96,
      height: 70,
    },
    statusState: {
      minHeight: 78,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      gap: 10,
    },
    statusText: {
      color: theme.colors.textSubtle,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
      ...fontStyle('regular'),
    },
    listFrame: {
      width: '100%',
      overflow: 'hidden',
    },
    scrollCue: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: SCROLL_CUE_HEIGHT,
    },
    scrollCueTop: {
      top: 0,
    },
    scrollCueBottom: {
      bottom: 0,
    },
    scrollCueChevron: {
      position: 'absolute',
      bottom: 2,
      alignSelf: 'center',
      width: 20,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
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
      flex: 1,
      minWidth: 0,
      paddingRight: 10,
    },
    identityName: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      ...fontStyle('semiBold'),
    },
    plusContainer: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default LinkExistingVerusIdSheet;
