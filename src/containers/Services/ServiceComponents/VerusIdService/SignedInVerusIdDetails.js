/*
  SignedInVerusIdDetails
  - Shows one linked VerusID. The name is the screen title; status, network,
    and identifiers lead the data, control information follows, and technical
    detail stays collapsed until asked for.
  - Loading, refresh failure, and unlink confirmation use the shared
    onboarding theme, skeletons, floating sheets, and dismissal lifecycle.
*/
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AppButton from '../../../../components/AppButton';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import SkeletonLoader, {
  SkeletonBlock,
  SkeletonSection,
} from '../../../../components/SkeletonLoader';
import useSheetDismissal from '../../../../components/useSheetDismissal';
import VerusIdObjectData, {
  VERUSID_OBJECT_DATA_PRESENTATIONS,
} from '../../../../components/VerusIdObjectData';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import Store from '../../../../store';
import {createSignedOutSheetStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {CoinDirectory} from '../../../../utils/CoinData/CoinDirectory';
import {
  getFriendlyNameMap,
  getIdentity,
} from '../../../../utils/api/channels/verusid/callCreators';
import {VRPC} from '../../../../utils/constants/intervalConstants';
import {convertFqnToDisplayFormat} from '../../../../utils/fullyqualifiedname';
import {openUrl} from '../../../../utils/linking';
import {setServiceLoading, setUserCoins} from '../../../../actions/actionCreators';
import {unlinkVerusId} from '../../../../actions/actions/services/dispatchers/verusid/verusid';
import {updateVerusIdWallet} from '../../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager';
import {
  clearChainLifecycle,
  refreshActiveChainLifecycles,
} from '../../../../actions/actions/intervals/dispatchers/lifecycleManager';
import {
  captureSessionScope,
  sessionScopeIsCurrent,
} from '../../../../actions/actions/updates/sessionRequests';
import {shouldNavigateAfterUnlinkDismissal} from '../../../../utils/verusid/verusIdFlowGuards';
import {VERUSID_SERVICE_ID} from '../../../../utils/constants/services';

const BOTTOM_FADE_HEIGHT = 48;
const LOAD_FAILED_MESSAGE =
  'Check your connection, then try again.';
const UNLINK_FAILED_MESSAGE = 'Unable to unlink this VerusID. Try again.';

const BottomFade = ({backgroundColor, solidHeight}) => (
  <View pointerEvents="none" style={styles.bottomFade}>
    <Svg height={BOTTOM_FADE_HEIGHT} width="100%" style={styles.bottomFadeSvg}>
      <Defs>
        <LinearGradient id="verusIdDetailsBottomFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={backgroundColor} stopOpacity="0" />
          <Stop offset="0.3" stopColor={backgroundColor} stopOpacity="0.1" />
          <Stop offset="1" stopColor={backgroundColor} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect
        x="0"
        y="0"
        width="100%"
        height={BOTTOM_FADE_HEIGHT}
        fill="url(#verusIdDetailsBottomFade)"
      />
    </Svg>
    <View style={{height: solidHeight, backgroundColor}} />
  </View>
);

const DetailsSkeleton = ({theme}) => (
  <SkeletonLoader
    accessibilityLabel="Loading VerusID details"
    style={styles.skeleton}>
    <SkeletonBlock height={28} style={styles.skeletonTitle} width="52%" />
    <SkeletonSection
      rows={[
        {labelWidth: '16%', valueWidth: '26%'},
        {labelWidth: '22%', valueWidth: '38%'},
        {labelWidth: '14%', valueWidth: '74%'},
      ]}
      titleWidth="28%"
    />
    <SkeletonSection
      rows={[
        {labelWidth: '36%', valueWidth: '48%'},
        {labelWidth: '34%', valueWidth: '44%'},
      ]}
      titleWidth="24%"
    />
    <View style={{height: theme.spacing.sm}} />
  </SkeletonLoader>
);

const describeUnlinkFailure = error => {
  const message =
    typeof error?.message === 'string' ? error.message.trim() : '';

  if (
    !message ||
    message.length > 140 ||
    /rpc|json|0x[0-9a-f]{6,}|-?\d{3,}/i.test(message)
  ) {
    return UNLINK_FAILED_MESSAGE;
  }

  return message;
};

const SignedInVerusIdDetails = () => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const theme = useOnboardingTheme();
  const sheetStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const navigation = useNavigation();
  const route = useRoute();
  const {chain, iAddress} = route.params;
  // The route this screen instance owns. The queued unlink navigation must
  // only fire while this exact route is still focused.
  const originatingRouteKeyRef = useRef(route.key);
  const screenMountedRef = useRef(true);
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);
  const walletAddresses = useObjectSelector(
    state =>
      state.authentication.activeAccount?.keys?.[chain]?.[VRPC]?.addresses ||
      null,
  );
  const [identity, setIdentity] = useState(null);
  const [friendlyNames, setFriendlyNames] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unlinkVisible, setUnlinkVisible] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [unlinkError, setUnlinkError] = useState(null);
  const loadRequestIdRef = useRef(0);
  const unlinkingRef = useRef(false);
  const unlinkTokenRef = useRef(0);
  // The session this screen rendered against. Operations capture the scope
  // synchronously so a late completion cannot write into another account.
  const renderedSessionScopeRef = useRef(null);
  renderedSessionScopeRef.current = captureSessionScope(
    Store.getState(),
    activeAccount?.accountHash || null,
  );
  const isRenderedSessionCurrent = useCallback(
    () =>
      sessionScopeIsCurrent(
        Store.getState(),
        renderedSessionScopeRef.current,
      ),
    [],
  );
  const bottomPadding = Math.max(insets.bottom, 20);

  const load = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    const sessionScope = renderedSessionScopeRef.current;
    const isRequestCurrent = () =>
      requestId === loadRequestIdRef.current &&
      sessionScopeIsCurrent(Store.getState(), sessionScope);
    setError(null);

    try {
      const systemId = CoinDirectory.getBasicCoinObj(chain).system_id;
      const response = await getIdentity(systemId, iAddress);

      if (!isRequestCurrent()) return;
      if (response.error) throw new Error(response.error.message);

      const loadedIdentity = response.result;
      const loadedFriendlyNames = await getFriendlyNameMap(
        systemId,
        loadedIdentity,
      );

      if (!isRequestCurrent()) return;

      setIdentity(loadedIdentity);
      setFriendlyNames(loadedFriendlyNames);
    } catch (e) {
      if (!isRequestCurrent()) return;

      // A failed refresh keeps the VerusID already on screen and reports the
      // failure in the screen's own words. Raw RPC text is never the headline.
      setError(LOAD_FAILED_MESSAGE);
    }
  }, [chain, iAddress]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    screenMountedRef.current = true;

    return () => {
      screenMountedRef.current = false;
    };
  }, []);

  const title = useMemo(
    () =>
      identity?.fullyqualifiedname
        ? convertFqnToDisplayFormat(identity.fullyqualifiedname)
        : route.params?.displayName || 'VerusID',
    [identity?.fullyqualifiedname, route.params?.displayName],
  );

  const ownedAddress = useMemo(() => {
    const primaryAddresses = identity?.identity?.primaryaddresses || [];

    if (!Array.isArray(walletAddresses)) return null;

    return (
      primaryAddresses.find(address => walletAddresses.includes(address)) ||
      null
    );
  }, [identity, walletAddresses]);

  // The dismissal hook's onClose must hide unconditionally; the processing
  // guard is applied by the caller instead.
  const closeUnlinkSheet = useCallback(() => setUnlinkVisible(false), []);

  const handleUnlinkSheetClosed = useCallback(() => {
    unlinkTokenRef.current += 1;
    unlinkingRef.current = false;
    setUnlinkError(null);
    setUnlinking(false);
  }, []);

  const unlinkDismissal = useSheetDismissal({
    visible: unlinkVisible,
    onClose: closeUnlinkSheet,
    onClosed: handleUnlinkSheetClosed,
  });

  const requestCloseUnlinkSheet = useCallback(() => {
    if (unlinkingRef.current) return;

    unlinkDismissal.close();
  }, [unlinkDismissal]);

  const unlinkIdentity = useCallback(async () => {
    // Same-frame double taps must only start one unlink.
    if (unlinkingRef.current) return;
    // The details belong to the account this screen rendered. If the store
    // account already moved on, the unlink must not run against the new one.
    if (!isRenderedSessionCurrent()) return;

    const requestContext = {
      sessionScope: renderedSessionScopeRef.current,
    };
    const token = unlinkTokenRef.current + 1;
    unlinkTokenRef.current = token;
    unlinkingRef.current = true;
    const isCurrent = () =>
      unlinkTokenRef.current === token &&
      sessionScopeIsCurrent(Store.getState(), requestContext.sessionScope);
    const assertSessionCurrent = () => {
      if (!sessionScopeIsCurrent(Store.getState(), requestContext.sessionScope)) {
        const sessionError = new Error(
          'Account changed while the VerusID was being unlinked.',
        );
        sessionError.code = 'SESSION_CHANGED';
        throw sessionError;
      }
    };

    setUnlinking(true);
    setUnlinkError(null);
    dispatch(setServiceLoading(true, VERUSID_SERVICE_ID));

    try {
      const coinObj = CoinDirectory.findCoinObj(chain);
      await unlinkVerusId(iAddress, coinObj.id, requestContext);
      assertSessionCurrent();
      await updateVerusIdWallet(requestContext);
      assertSessionCurrent();
      clearChainLifecycle(coinObj.id);

      if (activeAccount) {
        const action = setUserCoins(activeCoinList, activeAccount.id);
        dispatch(action);
        refreshActiveChainLifecycles(action.payload.activeCoinsForUser);
      }

      assertSessionCurrent();
      // The list underneath must be the active screen before this screen
      // leaves, so the unlink sheet finishes closing first.
      if (!isCurrent()) return;
      unlinkDismissal.dismiss(() => {
        // The queued navigation runs after the close animation. Re-check the
        // session that began this unlink and the route/focus ownership here, at
        // execution time, because both may have changed mid-dismissal. The
        // request context is captured when the unlink starts, so a rerender
        // cannot swap the scope out from under the delayed callback. The
        // unlink token is intentionally not consulted: `onClosed` bumps it
        // first, so it would always look stale.
        if (
          !shouldNavigateAfterUnlinkDismissal({
            mounted: screenMountedRef.current,
            sessionScope: requestContext.sessionScope,
            state: Store.getState(),
            originatingRouteKey: originatingRouteKeyRef.current,
            navigationState: navigation.getState?.(),
            isFocused:
              typeof navigation.isFocused === 'function'
                ? navigation.isFocused()
                : undefined,
          })
        ) {
          return;
        }
        navigation.goBack();
      });
    } catch (e) {
      if (!isCurrent()) return;

      setUnlinkError(describeUnlinkFailure(e));
    } finally {
      // Only clear the global service-loading flag while the captured session
      // is still the active one; otherwise this old operation would clear a
      // newly active session's loading state.
      if (isCurrent()) {
        dispatch(setServiceLoading(false, VERUSID_SERVICE_ID));
      }
      if (unlinkTokenRef.current === token) {
        unlinkingRef.current = false;
        setUnlinking(false);
      }
    }
  }, [
    activeAccount,
    activeCoinList,
    chain,
    dispatch,
    iAddress,
    isRenderedSessionCurrent,
    navigation,
    unlinkDismissal,
  ]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityLabel="Open VerusID in browser"
            accessibilityRole="button"
            disabled={!identity}
            hitSlop={8}
            onPress={() =>
              openUrl(
                `https://verus.io/verusid-lookup/${identity.fullyqualifiedname}`,
              )
            }
            style={styles.headerIcon}>
            <MaterialCommunityIcons
              name="open-in-new"
              size={22}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Unlink VerusID"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              setUnlinkError(null);
              setUnlinkVisible(true);
            }}
            style={styles.headerIconLast}>
            <MaterialCommunityIcons
              name="link-variant-off"
              size={22}
              color={theme.colors.danger}
            />
          </TouchableOpacity>
        </View>
      ),
      headerBackTitle: 'Back',
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: theme.colors.background,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: theme.colors.textPrimary,
    });
  }, [identity, navigation, theme]);

  const hasIdentity = Boolean(identity && friendlyNames);

  return (
    <View style={[styles.screen, {backgroundColor: theme.colors.background}]}>
      {hasIdentity ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {paddingBottom: 40 + BOTTOM_FADE_HEIGHT + bottomPadding},
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              tintColor={theme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}>
          <View style={styles.inlineTitleContainer}>
            <Text
              numberOfLines={2}
              style={[
                theme.typography.headlineMd,
                {color: theme.colors.textPrimary},
              ]}>
              {title}
            </Text>
          </View>
          {error ? (
            <View
              style={[
                styles.refreshErrorRow,
                {backgroundColor: theme.colors.surfaceMuted},
              ]}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={20}
                color={theme.colors.danger}
              />
              <View style={styles.refreshErrorText}>
                <Text
                  style={[
                    theme.typography.titleRow,
                    {color: theme.colors.textPrimary},
                  ]}>
                  Couldn't refresh this VerusID
                </Text>
                <Text
                  style={[
                    theme.typography.caption,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {error}
                </Text>
              </View>
              <AppButton
                accessibilityLabel="Try loading this VerusID again"
                onPress={load}
                style={styles.refreshErrorAction}
                themeMode={theme.mode}
                variant="text">
                Try again
              </AppButton>
            </View>
          ) : null}
          <VerusIdObjectData
            verusId={identity}
            friendlyNames={friendlyNames}
            presentation={VERUSID_OBJECT_DATA_PRESENTATIONS.SIGNED_IN_DETAILS}
            ownedAddress={ownedAddress}
            ownedByUser={Boolean(ownedAddress)}
            scrollDisabled
            containerStyle={styles.identityData}
            semanticTheme={theme}
          />
        </ScrollView>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={52}
            color={theme.colors.textSubtle}
          />
          <Text
            style={[
              theme.typography.titleRow,
              styles.errorTitle,
              {color: theme.colors.textPrimary},
            ]}>
            Couldn't load this VerusID
          </Text>
          <Text
            style={[
              theme.typography.bodySm,
              styles.errorText,
              {color: theme.colors.textSecondary},
            ]}>
            {error}
          </Text>
          <AppButton
            accessibilityLabel="Try loading this VerusID again"
            onPress={load}
            style={styles.errorAction}
            themeMode={theme.mode}>
            Try again
          </AppButton>
        </View>
      ) : (
        <DetailsSkeleton theme={theme} />
      )}

      {hasIdentity ? (
        <BottomFade
          backgroundColor={theme.colors.background}
          solidHeight={bottomPadding}
        />
      ) : null}

      <BottomSheetModal
        closeDisabled={unlinking}
        onClose={requestCloseUnlinkSheet}
        onClosed={unlinkDismissal.onClosed}
        maxHeight="60%"
        visible={unlinkVisible}>
        <View style={[sheetStyles.body, sheetStyles.bodyShort]}>
          <Text
            accessibilityRole="header"
            style={[theme.typography.titleSheet, {color: theme.colors.textPrimary}]}>
            Unlink VerusID
          </Text>
          <Text
            style={[
              theme.typography.bodySm,
              styles.unlinkBody,
              {color: theme.colors.textSecondary},
            ]}>
            {`This removes ${title} from this wallet. The VerusID stays on the blockchain: unlinking does not revoke, delete, recover, or change it, and you can link it again anytime.`}
          </Text>
          {unlinkError ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[
                theme.typography.caption,
                styles.unlinkError,
                {color: theme.colors.danger},
              ]}>
              {unlinkError}
            </Text>
          ) : null}
          <SafeBottomActionStack
            bottomSpacing={12}
            gap={10}
            horizontalSpacing={0}
            includeBottomInset={false}
            safeAreaSpacing={0}
            style={styles.unlinkActions}>
            <AppButton
              accessibilityLabel={`Unlink ${title}`}
              buttonColor={theme.colors.danger}
              disabled={unlinking}
              height={56}
              onPress={unlinkIdentity}
              textColor={theme.colors.onPrimary}
              themeMode={theme.mode}>
              {unlinking ? 'Unlinking...' : 'Unlink VerusID'}
            </AppButton>
            <AppButton
              accessibilityLabel="Cancel unlinking this VerusID"
              disabled={unlinking}
              height={56}
              onPress={requestCloseUnlinkSheet}
              themeMode={theme.mode}
              variant="secondary">
              Cancel
            </AppButton>
          </SafeBottomActionStack>
        </View>
      </BottomSheetModal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1},
  headerActions: {flexDirection: 'row', alignItems: 'center', paddingRight: 8},
  headerIcon: {padding: 6, marginRight: 10},
  headerIconLast: {padding: 6, marginRight: 6},
  scrollView: {flex: 1},
  content: {paddingBottom: 40},
  inlineTitleContainer: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12},
  identityData: {width: '100%'},
  refreshErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  refreshErrorText: {flex: 1, minWidth: 0, marginLeft: 10, marginRight: 4},
  refreshErrorAction: {alignSelf: 'center'},
  skeleton: {paddingHorizontal: 16, paddingTop: 12},
  skeletonTitle: {marginBottom: 24},
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  errorTitle: {textAlign: 'center', marginTop: 16},
  errorText: {textAlign: 'center', marginTop: 8, marginBottom: 24},
  errorAction: {minWidth: 180},
  bottomFade: {position: 'absolute', left: 0, right: 0, bottom: 0},
  bottomFadeSvg: {marginBottom: -1},
  unlinkBody: {marginTop: 12},
  unlinkError: {marginTop: 12},
  unlinkActions: {marginTop: 18},
});

export default SignedInVerusIdDetails;
