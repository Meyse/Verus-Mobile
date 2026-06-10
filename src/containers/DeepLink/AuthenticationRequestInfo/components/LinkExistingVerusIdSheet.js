import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Pencil} from 'lucide-react-native';
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

const truncateAddress = addr => {
  if (!addr || addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
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

  if (displaySource) {
    return convertFqnToDisplayFormat(displaySource);
  }

  return truncateAddress(candidate.identityAddress);
};

const toSearchValue = candidate => {
  return [
    candidate.identityAddress,
    candidate.name,
    candidate.friendlyName,
    candidate.fullyQualifiedName,
    candidate.status,
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
  linkedIds,
  requestIsTestnet,
  onLinkCandidate,
  onManualLink,
}) => {
  const theme = useOnboardingTheme();
  const signedOutSheetStyles = useMemo(
    () => createSignedOutSheetStyles(theme),
    [theme],
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const requestIdRef = useRef(0);
  const coinId = coinObj?.id;
  const systemId = coinObj?.system_id;
  const [candidates, setCandidates] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!active) {
      requestIdRef.current += 1;
      setCandidates([]);
      setErrorMessage(null);
      setLoading(false);
      setSearchQuery('');
      return;
    }

    if (requestIsTestnet) {
      setCandidates([]);
      setErrorMessage(null);
      setLoading(false);
      setSearchQuery('');
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const discover = async () => {
      setCandidates([]);
      setErrorMessage(null);
      setLoading(true);

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
          throw new Error(discoveryRes.error.message);
        }

        const linkedAddressSet = buildLinkedAddressSet(linkedIds);
        const discoveredCandidates = await Promise.all(
          normalizeDiscoveryResult(discoveryRes.result).map(
            async discoveryResult => {
              const identityAddress = getIdentityAddress(discoveryResult);

              if (!identityAddress) return null;

              let enrichedResult = null;

              try {
                const identityRes = await getIdentity(
                  systemId,
                  identityAddress,
                );

                if (!identityRes.error) {
                  enrichedResult = identityRes.result;
                }
              } catch (e) {
                enrichedResult = null;
              }

              const enrichedIdentity = enrichedResult?.identity || {};
              const discoveryIdentity = discoveryResult?.identity || {};
              const finalIdentityAddress =
                enrichedIdentity.identityaddress ||
                getIdentityAddress(enrichedResult) ||
                identityAddress;

              return {
                identityAddress: finalIdentityAddress,
                name:
                  enrichedIdentity.name ||
                  discoveryIdentity.name ||
                  discoveryResult?.name ||
                  null,
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
                status: enrichedResult?.status || discoveryResult?.status || null,
                linked: linkedAddressSet.has(finalIdentityAddress.toLowerCase()),
              };
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

        deduped.sort((left, right) => {
          if (left.linked !== right.linked) return left.linked ? 1 : -1;
          return getCandidateDisplayName(left).localeCompare(
            getCandidateDisplayName(right),
          );
        });

        if (requestIdRef.current === requestId) {
          setCandidates(deduped);
        }
      } catch (e) {
        if (requestIdRef.current === requestId) {
          setErrorMessage(
            'Automatic VerusID lookup is unavailable. You can still enter a VerusID manually.',
          );
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    };

    discover();
  }, [active, coinId, linkedIds, requestIsTestnet, systemId]);

  const filteredCandidates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return candidates;

    return candidates.filter(candidate =>
      toSearchValue(candidate).includes(query),
    );
  }, [candidates, searchQuery]);

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
      <ScrollView
        alwaysBounceVertical={false}
        bounces={false}
        contentContainerStyle={signedOutSheetStyles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.statusState}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.statusText}>
              {'Checking this wallet for VerusIDs...'}
            </Text>
          </View>
        )}
        {!loading && errorMessage && (
          <View style={styles.statusState}>
            <Text style={styles.statusText}>{errorMessage}</Text>
          </View>
        )}
        {!loading &&
          !requestIsTestnet &&
          !errorMessage &&
          candidates.length === 0 && (
            <View style={styles.statusState}>
              <Text style={styles.statusText}>
                {'No VerusIDs were found for this wallet address.'}
              </Text>
            </View>
          )}
        {!loading &&
          !errorMessage &&
          candidates.length > 0 &&
          filteredCandidates.length === 0 && (
            <View style={styles.statusState}>
              <Text style={styles.statusText}>
                {'No VerusIDs match that search.'}
              </Text>
            </View>
          )}
        {!loading &&
          filteredCandidates.map(candidate => (
            <CandidateRow
              candidate={candidate}
              key={candidate.identityAddress}
              onPress={() => onLinkCandidate(candidate.identityAddress)}
              styles={styles}
              theme={theme}
            />
          ))}
        <ManualLinkRow
          onPress={onManualLink}
          signedOutSheetStyles={signedOutSheetStyles}
          theme={theme}
        />
      </ScrollView>
    </>
  );
};

const CandidateRow = ({candidate, onPress, styles, theme}) => {
  const disabled = candidate.linked;
  const displayName = getCandidateDisplayName(candidate);
  const addressLabel = truncateAddress(candidate.identityAddress);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={disabled ? 1 : 0.74}
        disabled={disabled}
        onPress={onPress}
        style={styles.rowMain}>
        <View style={styles.rowText}>
          <Text numberOfLines={1} style={styles.identityName}>
            {displayName}
          </Text>
          {candidate.status ? (
            <Text numberOfLines={1} style={styles.identityMeta}>
              {`${candidate.status} - `}
              <Text style={styles.identityAddress}>{addressLabel}</Text>
            </Text>
          ) : (
            <Text numberOfLines={1} style={styles.identityAddress}>
              {addressLabel}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={disabled ? 1 : 0.74}
        disabled={disabled}
        onPress={onPress}
        style={[styles.linkButton, disabled && styles.linkButtonDisabled]}>
        <Text
          style={[
            styles.linkButtonText,
            disabled && styles.linkButtonTextDisabled,
          ]}>
          {disabled ? 'Linked' : 'Link'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

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
    rowText: {
      flex: 1,
      minWidth: 0,
    },
    identityName: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      ...fontStyle('semiBold'),
    },
    identityMeta: {
      marginTop: 3,
      color: theme.colors.textSubtle,
      fontSize: 12,
      ...fontStyle('regular'),
    },
    identityAddress: {
      marginTop: 3,
      color: theme.colors.textSubtle,
      fontSize: 12,
      fontFamily: Platform.select({
        ios: 'Menlo',
        android: 'monospace',
        default: 'monospace',
      }),
    },
    linkButton: {
      minWidth: 74,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    linkButtonDisabled: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.surfaceMuted,
    },
    linkButtonText: {
      color: theme.colors.primary,
      fontSize: 12,
      ...fontStyle('semiBold'),
    },
    linkButtonTextDisabled: {
      color: theme.colors.textSubtle,
    },
  });

export default LinkExistingVerusIdSheet;
