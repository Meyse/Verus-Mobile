import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import {Pencil, Plus} from 'lucide-react-native';
import AppTextInput from '../../../../components/AppTextInput';
import {fontStyle} from '../../../../globals/fonts';
import {createSignedOutSheetStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {
  getIdentitiesWithAddress,
  getIdentity,
} from '../../../../utils/api/channels/verusid/callCreators';
import {requestSeeds} from '../../../../utils/auth/authBox';
import {ELECTRUM} from '../../../../utils/constants/intervalConstants';
import {convertFqnToDisplayFormat} from '../../../../utils/fullyqualifiedname';
import {deriveKeyPair} from '../../../../utils/keys';

const GET_IDENTITIES_WITH_ADDRESS_METHOD = 'getidentitieswithaddress';
const CANDIDATE_ROW_TOTAL_HEIGHT = 64;
const LIST_CONTENT_VERTICAL_PADDING = 4;
const MIN_VISIBLE_CANDIDATE_ROWS = 4;

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
  const {height} = useWindowDimensions();
  const requestIdRef = useRef(0);
  const coinId = coinObj?.id;
  const systemId = coinObj?.system_id;
  const [candidates, setCandidates] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [linking, setLinking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookupUnsupported, setLookupUnsupported] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!active) {
      requestIdRef.current += 1;
      setCandidates([]);
      setErrorMessage(null);
      setLinking(false);
      setLoading(false);
      setLookupUnsupported(false);
      setSearchQuery('');
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

        const seeds = await requestSeeds();
        const seed = seeds[ELECTRUM];

        if (!seed) {
          throw new Error('No wallet seed found for this account.');
        }

        const keyObj = await deriveKeyPair(seed, coinObj, ELECTRUM);
        const primaryAddress = keyObj?.addresses?.[0];

        if (!primaryAddress) {
          throw new Error('No primary address found for this wallet.');
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
  }, [active, coinId, coinObj, isCandidateAllowed, linkedIds, systemId]);

  const filteredCandidates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return candidates;

    return candidates.filter(candidate =>
      toSearchValue(candidate).includes(query),
    );
  }, [candidates, searchQuery]);

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

  if (loading || linking) {
    return (
      <LoadingState
        label={linking ? 'Linking VerusID' : 'Finding VerusIDs'}
        styles={styles}
      />
    );
  }

  const candidateListMaxHeight = Math.max(220, height * 0.48);
  const visibleCandidateRows = Math.max(
    MIN_VISIBLE_CANDIDATE_ROWS,
    Math.floor(candidateListMaxHeight / CANDIDATE_ROW_TOTAL_HEIGHT),
  );
  const candidateListScrollable =
    filteredCandidates.length > visibleCandidateRows;
  const candidateListHeight =
    Math.min(filteredCandidates.length, visibleCandidateRows) *
      CANDIDATE_ROW_TOTAL_HEIGHT +
    LIST_CONTENT_VERTICAL_PADDING;

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
        <View style={styles.statusState}>
          <Text style={styles.statusText}>{errorMessage}</Text>
        </View>
      )}
      {!errorMessage && candidates.length === 0 && (
        <View style={styles.statusState}>
          <Text style={styles.statusText}>
            {'No VerusIDs were found for this wallet.'}
          </Text>
        </View>
      )}
      {!errorMessage &&
        candidates.length > 0 &&
        filteredCandidates.length === 0 && (
          <View style={styles.statusState}>
            <Text style={styles.statusText}>
              {'No VerusIDs match that search.'}
            </Text>
          </View>
        )}
      {filteredCandidates.length > 0 && (
        <View style={[styles.listFrame, {height: candidateListHeight}]}>
          <FlatList
            alwaysBounceVertical={false}
            bounces={false}
            contentContainerStyle={signedOutSheetStyles.listContent}
            data={filteredCandidates}
            keyExtractor={candidate => candidate.identityAddress}
            keyboardShouldPersistTaps="handled"
            renderItem={({item}) => (
              <CandidateRow
                candidate={item}
                onPress={() => handleLinkCandidate(item)}
                styles={styles}
                theme={theme}
              />
            )}
            scrollEnabled={candidateListScrollable}
            showsVerticalScrollIndicator={candidateListScrollable}
          />
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

const LoadingState = ({label, styles}) => (
  <View
    accessibilityLabel={label}
    accessibilityRole="progressbar"
    style={styles.loadingState}>
    <LottieView
      autoPlay
      loop
      source={require('../../../../animations/loading_7bars.json')}
      style={styles.loadingAnimation}
    />
    <Text style={styles.statusText}>{label}</Text>
  </View>
);

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
