import React, {useCallback, useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AnimatedActivityIndicatorBox from '../../../../components/AnimatedActivityIndicatorBox';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import GradientButton from '../../../../components/GradientButton';
import MissingInfoRedirect from '../../../../components/MissingInfoRedirect/MissingInfoRedirect';
import VerusIdObjectData from '../../../../components/VerusIdObjectData';
import {fontStyle} from '../../../../globals/fonts';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {CoinDirectory} from '../../../../utils/CoinData/CoinDirectory';
import {getFriendlyNameMap, getIdentity} from '../../../../utils/api/channels/verusid/callCreators';
import {convertFqnToDisplayFormat} from '../../../../utils/fullyqualifiedname';
import {openUrl} from '../../../../utils/linking';
import {setServiceLoading, setUserCoins} from '../../../../actions/actionCreators';
import {unlinkVerusId} from '../../../../actions/actions/services/dispatchers/verusid/verusid';
import {updateVerusIdWallet} from '../../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager';
import {
  clearChainLifecycle,
  refreshActiveChainLifecycles,
} from '../../../../actions/actions/intervals/dispatchers/lifecycleManager';
import {VERUSID_SERVICE_ID} from '../../../../utils/constants/services';

const BOTTOM_FADE_HEIGHT = 48;

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

const SignedInVerusIdDetails = () => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const theme = useOnboardingTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const {chain, iAddress} = route.params;
  const activeAccount = useObjectSelector(state => state.authentication.activeAccount);
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);
  const [identity, setIdentity] = useState(null);
  const [friendlyNames, setFriendlyNames] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unlinkVisible, setUnlinkVisible] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [unlinkError, setUnlinkError] = useState(null);
  const bottomPadding = Math.max(insets.bottom, 20);

  const load = useCallback(async () => {
    try {
      setError(null);
      const systemId = CoinDirectory.getBasicCoinObj(chain).system_id;
      const response = await getIdentity(systemId, iAddress);
      if (response.error) throw new Error(response.error.message);
      setIdentity(response.result);
      setFriendlyNames(await getFriendlyNameMap(systemId, response.result));
    } catch (e) {
      setError(e.message || 'Failed to load VerusID');
    }
  }, [chain, iAddress]);

  useEffect(() => {
    load();
  }, [load]);

  const title = useMemo(
    () =>
      identity?.fullyqualifiedname
        ? convertFqnToDisplayFormat(identity.fullyqualifiedname)
        : route.params?.displayName || 'VerusID',
    [identity?.fullyqualifiedname, route.params?.displayName],
  );

  const unlinkIdentity = useCallback(async () => {
    setUnlinking(true);
    setUnlinkError(null);
    dispatch(setServiceLoading(true, VERUSID_SERVICE_ID));
    try {
      const coinObj = CoinDirectory.findCoinObj(chain);
      await unlinkVerusId(iAddress, coinObj.id);
      await updateVerusIdWallet();
      clearChainLifecycle(coinObj.id);
      if (activeAccount) {
        const action = setUserCoins(activeCoinList, activeAccount.id);
        dispatch(action);
        refreshActiveChainLifecycles(action.payload.activeCoinsForUser);
      }
      setUnlinkVisible(false);
      navigation.goBack();
    } catch (e) {
      setUnlinkError(e.message || 'Unable to unlink VerusID');
    } finally {
      dispatch(setServiceLoading(false, VERUSID_SERVICE_ID));
      setUnlinking(false);
    }
  }, [activeAccount, activeCoinList, chain, dispatch, iAddress, navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open in browser"
            disabled={!identity}
            hitSlop={8}
            onPress={() => openUrl(`https://verus.io/verusid-lookup/${identity.fullyqualifiedname}`)}
            style={styles.headerIcon}>
            <MaterialCommunityIcons name="open-in-new" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Unlink identity"
            hitSlop={8}
            onPress={() => {
              setUnlinkError(null);
              setUnlinkVisible(true);
            }}
            style={styles.headerIconLast}>
            <MaterialCommunityIcons name="link-variant-off" size={22} color={theme.colors.danger} />
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

  return (
    <View style={[styles.screen, {backgroundColor: theme.colors.background}]}>
      {identity && friendlyNames ? (
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
          <View style={[styles.inlineTitleContainer, {backgroundColor: theme.colors.background}]}>
            <Text numberOfLines={2} style={[styles.title, {color: theme.colors.textPrimary}]}>
              {title}
            </Text>
          </View>
          <VerusIdObjectData
            verusId={identity}
            friendlyNames={friendlyNames}
            scrollDisabled
            containerStyle={styles.identityData}
            semanticTheme={theme}
          />
          <View style={[styles.emptyAttestations, {backgroundColor: theme.colors.background}]}>
            <MaterialCommunityIcons
              name="certificate-outline"
              size={48}
              color={theme.colors.textSecondary}
              style={styles.emptyAttestationIcon}
            />
            <Text style={[styles.emptyAttestationTitle, {color: theme.colors.textSecondary}]}>
              No attestations linked to this identity
            </Text>
            <Text style={[styles.emptyAttestationBody, {color: theme.colors.textSubtle}]}>
              Attestations you receive for this VerusID will appear here
            </Text>
          </View>
        </ScrollView>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MissingInfoRedirect icon="alert-circle-outline" label={error} />
        </View>
      ) : (
        <AnimatedActivityIndicatorBox />
      )}

      {identity && friendlyNames ? (
        <BottomFade backgroundColor={theme.colors.background} solidHeight={bottomPadding} />
      ) : null}

      <BottomSheetModal
        visible={unlinkVisible}
        onClose={() => {
          if (!unlinking) {
            setUnlinkVisible(false);
            setUnlinkError(null);
          }
        }}
        floating={false}
        maxHeight="55%"
        contentContainerStyle={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, {color: theme.colors.textPrimary}]}>Unlink identity</Text>
          <TouchableOpacity
            accessibilityLabel="Close"
            disabled={unlinking}
            onPress={() => {
              setUnlinkVisible(false);
              setUnlinkError(null);
            }}
            style={[styles.closeButton, {backgroundColor: theme.colors.surfaceMuted}]}>
            <MaterialCommunityIcons name="close" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.sheetBody, {color: theme.colors.textSecondary}]}>
          This will remove the identity from your wallet. Your VerusID remains safe on the blockchain and you can link it again anytime.
        </Text>
        {unlinkError ? (
          <Text style={[styles.unlinkError, {color: theme.colors.danger}]}>{unlinkError}</Text>
        ) : null}
        <GradientButton
          disabled={unlinking}
          onPress={unlinkIdentity}
          topColor={theme.colors.danger}
          bottomColor={theme.colors.danger}
          style={styles.unlinkAction}>
          {unlinking ? 'Unlinking...' : 'Unlink identity'}
        </GradientButton>
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
  title: {...fontStyle('bold'), fontSize: 28, lineHeight: 34, letterSpacing: -0.2},
  identityData: {width: '100%'},
  errorContainer: {flex: 1, justifyContent: 'center'},
  emptyAttestations: {
    marginTop: 8,
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAttestationIcon: {marginBottom: 16, opacity: 0.6},
  emptyAttestationTitle: {...fontStyle('semiBold'), fontSize: 16, lineHeight: 21, textAlign: 'center', marginBottom: 8},
  emptyAttestationBody: {...fontStyle('regular'), fontSize: 14, lineHeight: 20, textAlign: 'center'},
  bottomFade: {position: 'absolute', left: 0, right: 0, bottom: 0},
  bottomFadeSvg: {marginBottom: -1},
  sheet: {borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 20, paddingBottom: 40},
  sheetHeader: {height: 58, alignItems: 'center', justifyContent: 'center'},
  sheetTitle: {...fontStyle('semiBold'), fontSize: 16, lineHeight: 20},
  closeButton: {
    position: 'absolute',
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {...fontStyle('regular'), fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 24},
  unlinkError: {...fontStyle('regular'), fontSize: 13, lineHeight: 18, marginTop: -12, marginBottom: 16},
  unlinkAction: {width: '100%', height: 44, borderRadius: 22},
});

export default SignedInVerusIdDetails;
