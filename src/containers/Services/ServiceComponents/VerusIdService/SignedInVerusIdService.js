import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Buffer} from 'buffer';
import {
  Image,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {primitives} from 'verusid-ts-client';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useDispatch} from 'react-redux';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import GradientButton from '../../../../components/GradientButton';
import {fontStyle} from '../../../../globals/fonts';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {CoinDirectory} from '../../../../utils/CoinData/CoinDirectory';
import {convertFqnToDisplayFormat} from '../../../../utils/fullyqualifiedname';
import {SEND_MODAL_IDENTITY_TO_LINK_FIELD} from '../../../../utils/constants/sendModal';
import {
  NOTIFICATION_TYPE_VERUSID_ERROR,
  NOTIFICATION_TYPE_VERUSID_READY,
} from '../../../../utils/constants/services';
import {openLinkIdentityModal} from '../../../../actions/actions/sendModal/dispatchers/sendModal';
import {dispatchRemoveNotification} from '../../../../actions/actions/notifications/dispatchers/notifications';
import {
  checkVerusIdNotificationsForUpdates,
  deleteProvisionedIds,
} from '../../../../actions/actions/services/dispatchers/verusid/verusid';
import {updatePendingVerusIds} from '../../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager';
import {VERUSID_NETWORK_DEFAULT} from '../../../../../env/index';
import {processVerusId} from './VerusIdLogin';

const emptyVerusIdImage = require('../../../../images/customIcons/empty-verusid.png');
const BOTTOM_FADE_HEIGHT = 48;

const FAQ_ITEMS = [
  {
    key: 'what-is',
    title: 'What is VerusID?',
    body: 'Your VerusID is a blockchain-based identity that belongs entirely to you. It works as both a universal login and a personal database — letting you authenticate across apps and store your data in your wallet rather than on company servers.',
  },
  {
    key: 'sign-in',
    title: 'Signing in with VerusID',
    body: 'Instead of creating usernames and passwords for every app, you authenticate with your VerusID.\n\n• The app presents a QR code or link\n• Your wallet opens\n• You select which VerusID to use\n• You review and approve the request\n\nNo passwords needed.',
  },
  {
    key: 'personal-db',
    title: 'Your personal database',
    body: "Apps can request to store data in your VerusID or read data you've previously saved. Each request appears in your wallet for you to approve or deny.\n\nYour data is encrypted and written directly to your identity on the blockchain.",
  },
  {
    key: 'different',
    title: 'What makes this different?',
    body: 'Traditional apps store your data in their databases — they can analyze it, sell it, or lose it in a breach. With VerusID, your data lives in your identity.\n\nYou decide exactly what to share with each app, when you share it.',
  },
  {
    key: 'recovery',
    title: 'Permanent and recoverable',
    body: 'Your VerusID never expires and has no renewal fees. No company can suspend or delete it.\n\nYou can designate recovery options to restore access if you ever lose your keys.',
  },
];

const getReadyActionConfig = details => {
  const requestType = details?.requestType || 'loginconsent';
  let hasResponseUris = Boolean(details?.hasResponseUris);

  if (!hasResponseUris && requestType === 'loginconsent' && details?.loginRequest) {
    try {
      const request = new primitives.LoginConsentRequest();
      request.fromBuffer(Buffer.from(details.loginRequest, 'base64'));
      hasResponseUris = Boolean(request.challenge?.redirect_uris?.length);
    } catch (e) {
      hasResponseUris = false;
    }
  }

  return {
    requestType,
    hasResponseUris,
    label: hasResponseUris ? 'Link and login' : 'Link',
  };
};

const normalizeIdentityItems = (linkedIds, pendingIds, identityNetwork) => {
  const linked = [];
  Object.keys(linkedIds || {}).forEach(chain => {
    Object.keys(linkedIds[chain] || {}).forEach(iAddress => {
      linked.push({chain, iAddress, name: String(linkedIds[chain][iAddress])});
    });
  });
  linked.sort((a, b) => {
    const preferred = Number(b.chain === identityNetwork) - Number(a.chain === identityNetwork);
    return preferred || a.chain.localeCompare(b.chain) || a.name.localeCompare(b.name);
  });

  const linkedAddresses = new Set(linked.map(item => item.iAddress.toLowerCase()));
  const linkedNames = new Set(linked.map(item => item.name.toLowerCase()));
  const groups = {ready: [], attention: [], progress: []};

  Object.keys(pendingIds || {}).forEach(chain => {
    Object.keys(pendingIds[chain] || {}).forEach(iAddress => {
      const details = pendingIds[chain][iAddress] || {};
      const name = details.fqn
        ? convertFqnToDisplayFormat(details.fqn)
        : details.provisioningName
        ? `${details.provisioningName}@`
        : iAddress;
      if (linkedAddresses.has(iAddress.toLowerCase()) || linkedNames.has(String(name).toLowerCase())) {
        return;
      }

      const item = {
        chain,
        iAddress,
        name,
        details,
        status: details.status,
        linkInput: details.fqn ? convertFqnToDisplayFormat(details.fqn) : iAddress,
        readyAction: getReadyActionConfig(details),
      };
      if (details.status === NOTIFICATION_TYPE_VERUSID_READY) groups.ready.push(item);
      else if (details.status === NOTIFICATION_TYPE_VERUSID_ERROR) groups.attention.push(item);
      else groups.progress.push(item);
    });
  });

  Object.values(groups).forEach(group => group.sort((a, b) => a.name.localeCompare(b.name)));
  return {linked, groups};
};

const BottomFade = ({backgroundColor, solidHeight}) => (
  <View pointerEvents="none" style={styles.bottomFade}>
    <Svg height={BOTTOM_FADE_HEIGHT} width="100%" style={styles.bottomFadeSvg}>
      <Defs>
        <LinearGradient id="identityBottomFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={backgroundColor} stopOpacity="0" />
          <Stop offset="0.3" stopColor={backgroundColor} stopOpacity="0.1" />
          <Stop offset="1" stopColor={backgroundColor} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height={BOTTOM_FADE_HEIGHT} fill="url(#identityBottomFade)" />
    </Svg>
    <View style={{height: solidHeight, backgroundColor}} />
  </View>
);

const IdentityRow = ({actionLabel, isPreferred, name, network, onPress, subtitle, theme}) => (
  <View style={styles.rowWrap}>
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.identityRow,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
        },
      ]}>
      <View
        style={[
          styles.rowText,
          actionLabel && styles.rowTextWithAction,
          actionLabel === 'Link and login' && styles.rowTextWithWideAction,
        ]}>
        <Text numberOfLines={1} ellipsizeMode="middle" style={[styles.identityName, {color: theme.colors.textPrimary}]}>
          {name}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[styles.identitySubtitle, {color: theme.colors.textSecondary}]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {network ? (
        <View
          style={[
            styles.networkPill,
            {backgroundColor: isPreferred ? theme.colors.surfaceMuted : theme.colors.surfaceRaised},
          ]}>
          <Text
            style={[
              styles.networkText,
              {color: isPreferred ? theme.colors.primary : theme.colors.textSubtle},
            ]}>
            {network}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
    {actionLabel ? (
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.75}
        onPress={onPress}
        style={[
          styles.rowAction,
          actionLabel === 'Link and login' && styles.rowActionWide,
          {backgroundColor: theme.colors.surfaceMuted},
        ]}>
        <Text style={[styles.rowActionText, {color: theme.colors.primary}]}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const SectionHeading = ({count, title, theme}) => (
  <View style={styles.sectionHeading}>
    <Text style={[styles.sectionTitle, {color: theme.colors.textPrimary}]}>{title}</Text>
    <Text
      style={[
        styles.countPill,
        {backgroundColor: theme.colors.surfaceMuted, color: theme.colors.textSecondary},
      ]}>
      {count}
    </Text>
  </View>
);

const FaqBody = ({body, theme}) => (
  <View style={styles.faqBody}>
    {String(body)
      .split('\n')
      .map((line, index) =>
        line.trim() ? (
          <Text
            key={`${line}:${index}`}
            style={[
              styles.faqParagraph,
              line.trim().startsWith('•') && styles.faqBullet,
              {color: theme.colors.textSecondary},
            ]}>
            {line}
          </Text>
        ) : (
          <View key={`spacer:${index}`} style={styles.faqSpacer} />
        ),
      )}
  </View>
);

const SheetHeader = ({disabled, onClose, theme, title}) => (
  <View style={styles.sheetHeader}>
    <Text style={[styles.sheetTitle, {color: theme.colors.textPrimary}]}>{title}</Text>
    <TouchableOpacity
      accessibilityLabel="Close"
      disabled={disabled}
      onPress={onClose}
      style={[styles.closeButton, {backgroundColor: theme.colors.surfaceMuted}]}>
      <MaterialCommunityIcons name="close" size={18} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  </View>
);

const SignedInVerusIdService = ({controller}) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const theme = useOnboardingTheme();
  const pendingIds = useObjectSelector(state => state.channelStore_verusid?.pendingIds || {});
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [createInfoVisible, setCreateInfoVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [selectedPending, setSelectedPending] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingError, setPendingError] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef(false);
  const testnetOverrides = controller.props.activeAccount?.testnetOverrides || {};
  const identityNetwork = testnetOverrides[VERUSID_NETWORK_DEFAULT] || VERUSID_NETWORK_DEFAULT;
  const linkedIds = controller.state.linkedIds;
  const loading = controller.props.loading || linkedIds == null;
  const {linked, groups} = useMemo(
    () => normalizeIdentityItems(linkedIds, pendingIds, identityNetwork),
    [identityNetwork, linkedIds, pendingIds],
  );
  const pendingCount = groups.ready.length + groups.attention.length + groups.progress.length;
  const hasContent = linked.length > 0 || pendingCount > 0;
  const bottomPadding = Math.max(insets.bottom, 20);

  const openLink = useCallback(
    (chain = identityNetwork, value) =>
      openLinkIdentityModal(
        CoinDirectory.findCoinObj(chain),
        value ? {[SEND_MODAL_IDENTITY_TO_LINK_FIELD]: value} : undefined,
      ),
    [identityNetwork],
  );

  const openIdentity = useCallback(
    item =>
      controller.props.navigation.navigate('VerusIdDetails', {
        chain: item.chain,
        iAddress: item.iAddress,
        displayName: item.name,
      }),
    [controller.props.navigation],
  );

  const runPendingAction = useCallback(
    async action => {
      if (!selectedPending || pendingAction) return;
      setPendingAction(action);
      setPendingError(null);
      try {
        if (action === 'refresh') {
          await checkVerusIdNotificationsForUpdates();
          await updatePendingVerusIds();
        } else if (action === 'remove') {
          await deleteProvisionedIds(selectedPending.iAddress, selectedPending.chain);
          await updatePendingVerusIds();
          if (selectedPending.details?.notificationUid) {
            await dispatchRemoveNotification(selectedPending.details.notificationUid);
          }
        } else if (action === 'retry') {
          await processVerusId(
            {dispatch, navigation: controller.props.navigation},
            selectedPending.details.loginRequest,
            selectedPending.details.fromService || null,
            selectedPending.details.fqn || null,
            selectedPending.details.requestType || 'loginconsent',
          );
        }
        setSelectedPending(null);
      } catch (error) {
        setPendingError(error.message || 'Unable to update this request.');
      } finally {
        setPendingAction(null);
      }
    },
    [controller.props.navigation, dispatch, pendingAction, selectedPending],
  );

  const handleReady = useCallback(
    item => {
      if (!item.readyAction.hasResponseUris || !item.details?.loginRequest) {
        openLink(item.chain, item.linkInput);
        return;
      }
      Promise.resolve(
        processVerusId(
          {dispatch, navigation: controller.props.navigation},
          item.details.loginRequest,
          item.details.fromService || null,
          item.details.fqn || null,
          item.readyAction.requestType,
        ),
      ).catch(() => openLink(item.chain, item.linkInput));
    },
    [controller.props.navigation, dispatch, openLink],
  );

  const handleScroll = event => {
    const next = (event.nativeEvent.contentOffset.y || 0) > 1;
    if (scrollRef.current !== next) {
      scrollRef.current = next;
      setScrolled(next);
    }
  };

  const renderPendingGroup = (title, items, showHeading = true) => {
    if (!items.length) return null;
    return (
      <View style={styles.pendingGroup}>
        {showHeading ? <SectionHeading count={items.length} title={title} theme={theme} /> : null}
        <View style={styles.pendingRows}>
          {items.map(item => {
            const isReady = item.status === NOTIFICATION_TYPE_VERUSID_READY;
            const press = isReady ? () => handleReady(item) : () => setSelectedPending(item);
            return (
              <IdentityRow
                key={`${item.chain}:${item.iAddress}`}
                actionLabel={isReady ? item.readyAction.label : null}
                isPreferred={item.chain === identityNetwork}
                name={item.name}
                network={isReady ? null : item.chain}
                onPress={press}
                subtitle={
                  isReady
                    ? null
                    : item.status === NOTIFICATION_TYPE_VERUSID_ERROR
                    ? 'Needs attention'
                    : 'In progress'
                }
                theme={theme}
              />
            );
          })}
        </View>
      </View>
    );
  };

  const closePendingSheet = () => {
    if (pendingAction) return;
    setSelectedPending(null);
    setPendingError(null);
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, {backgroundColor: theme.colors.background}]}>
      <View
        style={[
          styles.header,
          {backgroundColor: theme.colors.background},
          scrolled && {borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth},
        ]}>
        <Text style={[styles.heading, {color: theme.colors.textPrimary}]}>Identity</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setInfoVisible(true)} hitSlop={10} style={styles.headerIcon}>
            <MaterialCommunityIcons name="information-variant" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openLink()} hitSlop={10} style={styles.headerIcon}>
            <MaterialCommunityIcons name="plus" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <Text style={[styles.loadingText, {color: theme.colors.textSubtle}]}>Loading...</Text>
        </View>
      ) : controller.state.loadError ? (
        <View style={styles.errorState}>
          <MaterialCommunityIcons name="alert-circle-outline" size={52} color={theme.colors.textSubtle} />
          <Text style={[styles.emptyTitle, {color: theme.colors.textPrimary}]}>Unable to load VerusIDs</Text>
          <Text style={[styles.emptyDescription, {color: theme.colors.textSecondary}]}>
            {controller.state.loadError}
          </Text>
          <GradientButton onPress={() => controller.getLinkedIds()} style={styles.emptyPrimaryCta}>
            Try again
          </GradientButton>
        </View>
      ) : hasContent ? (
        <SectionList
          sections={[{key: 'linked', data: linked}]}
          keyExtractor={item => `${item.chain}:${item.iAddress}`}
          contentContainerStyle={[
            styles.listContent,
            {paddingBottom: 40 + BOTTOM_FADE_HEIGHT + bottomPadding},
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {renderPendingGroup('Ready to link', groups.ready, false)}
              {renderPendingGroup('Needs attention', groups.attention)}
              {renderPendingGroup('In progress', groups.progress)}
            </View>
          }
          renderSectionHeader={() => (
            <SectionHeading count={linked.length} title="Your VerusIDs" theme={theme} />
          )}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          renderItem={({item}) => (
            <IdentityRow
              isPreferred={item.chain === identityNetwork}
              name={item.name}
              network={item.chain}
              onPress={() => openIdentity(item)}
              theme={theme}
            />
          )}
        />
      ) : (
        <View style={styles.emptyState}>
          <Image
            source={emptyVerusIdImage}
            style={styles.emptyImage}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text style={[styles.emptyTitle, {color: theme.colors.textPrimary}]}>No identity in your wallet</Text>
          <Text style={[styles.emptyDescription, {color: theme.colors.textSecondary}]}>
            Link a VerusID to manage funds, authenticate across apps, and keep your data in your hands.
          </Text>
          <GradientButton
            onPress={() => setCreateInfoVisible(true)}
            style={styles.emptyPrimaryCta}
            labelStyle={styles.emptyPrimaryLabel}>
            Create free VerusID
          </GradientButton>
          <TouchableOpacity
            onPress={() => openLink()}
            style={[styles.emptySecondaryCta, {backgroundColor: theme.colors.surfaceMuted}]}>
            <Text style={[styles.emptySecondaryLabel, {color: theme.colors.primary}]}>Link VerusID</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setInfoVisible(true)}
            activeOpacity={0.75}
            style={styles.learnMoreRow}>
            <MaterialCommunityIcons
              name="information-variant"
              size={16}
              color={theme.colors.textSubtle}
              style={styles.learnMoreIcon}
            />
            <Text style={[styles.learnMoreText, {color: theme.colors.textSubtle}]}>VerusID explained</Text>
          </TouchableOpacity>
        </View>
      )}

      {hasContent ? <BottomFade backgroundColor={theme.colors.background} solidHeight={bottomPadding} /> : null}

      <BottomSheetModal
        visible={infoVisible}
        onClose={() => setInfoVisible(false)}
        floating={false}
        maxHeight="88%"
        contentContainerStyle={styles.sheet}>
        <SheetHeader onClose={() => setInfoVisible(false)} theme={theme} title="What is a VerusID?" />
        <Text style={[styles.infoSummary, {color: theme.colors.textSecondary}]}>
          VerusID is a self-sovereign identity and personal data vault. Controlled by you, not companies.
        </Text>
        <View style={[styles.faqList, {borderColor: theme.colors.border}]}>
          {FAQ_ITEMS.map((item, index) => {
            const expanded = item.key === expandedFaq;
            return (
              <View
                key={item.key}
                style={[
                  styles.faqItem,
                  index > 0 && {borderTopColor: theme.colors.border, borderTopWidth: 1},
                ]}>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => setExpandedFaq(current => (current === item.key ? null : item.key))}
                  style={styles.faqHeader}>
                  <Text style={[styles.faqTitle, {color: theme.colors.textPrimary}]}>{item.title}</Text>
                  <MaterialCommunityIcons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
                {expanded ? <FaqBody body={item.body} theme={theme} /> : null}
              </View>
            );
          })}
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        visible={createInfoVisible}
        onClose={() => setCreateInfoVisible(false)}
        floating={false}
        maxHeight="55%"
        contentContainerStyle={styles.sheet}>
        <SheetHeader
          onClose={() => setCreateInfoVisible(false)}
          theme={theme}
          title="Create a VerusID"
        />
        <Text style={[styles.sheetBody, {color: theme.colors.textSecondary}]}>
          This wallet can create a VerusID when a compatible app sends a secure
          provisioning request. You can link an existing VerusID now.
        </Text>
        <GradientButton
          onPress={() => {
            setCreateInfoVisible(false);
            openLink();
          }}
          style={styles.sheetPrimaryAction}>
          Link VerusID
        </GradientButton>
      </BottomSheetModal>

      <BottomSheetModal
        visible={Boolean(selectedPending)}
        onClose={closePendingSheet}
        floating={false}
        maxHeight="70%"
        contentContainerStyle={styles.sheet}>
        <SheetHeader
          disabled={Boolean(pendingAction)}
          onClose={closePendingSheet}
          theme={theme}
          title="Identity status"
        />
        <Text numberOfLines={1} style={[styles.pendingName, {color: theme.colors.textPrimary}]}>
          {selectedPending?.name || 'Unknown identity'}
        </Text>
        <Text style={[styles.pendingStatus, {color: theme.colors.textSecondary}]}>
          {selectedPending?.status === NOTIFICATION_TYPE_VERUSID_ERROR ? 'Needs attention' : 'In progress'}
        </Text>
        <Text style={[styles.sheetBody, {color: theme.colors.textSecondary}]}>
          {selectedPending?.status === NOTIFICATION_TYPE_VERUSID_ERROR
            ? 'This request appears stuck or failed. You can refresh, retry, or remove it from your list.'
            : 'This request is still being processed. You can refresh or remove it from your list.'}
        </Text>
        {pendingError ? <Text style={[styles.pendingError, {color: theme.colors.danger}]}>{pendingError}</Text> : null}
        <TouchableOpacity
          disabled={Boolean(pendingAction)}
          onPress={() => runPendingAction('refresh')}
          style={[styles.sheetAction, {backgroundColor: theme.colors.surfaceMuted}]}>
          <Text style={[styles.actionLabel, {color: theme.colors.primary}]}>
            {pendingAction === 'refresh' ? 'Refreshing...' : 'Refresh now'}
          </Text>
        </TouchableOpacity>
        {selectedPending?.status === NOTIFICATION_TYPE_VERUSID_ERROR && selectedPending?.details?.loginRequest ? (
          <TouchableOpacity
            disabled={Boolean(pendingAction)}
            onPress={() => runPendingAction('retry')}
            style={[styles.sheetAction, {backgroundColor: theme.colors.surfaceMuted}]}>
            <Text style={[styles.actionLabel, {color: theme.colors.primary}]}>
              {pendingAction === 'retry' ? 'Retrying...' : 'Retry request'}
            </Text>
          </TouchableOpacity>
        ) : null}
        <GradientButton
          disabled={Boolean(pendingAction)}
          onPress={() => runPendingAction('remove')}
          topColor={theme.colors.danger}
          bottomColor={theme.colors.danger}
          style={styles.removeAction}>
          {pendingAction === 'remove' ? 'Removing...' : 'Remove from list'}
        </GradientButton>
        {selectedPending?.status === NOTIFICATION_TYPE_VERUSID_ERROR && !selectedPending?.details?.loginRequest ? (
          <Text style={[styles.helperText, {color: theme.colors.textSecondary}]}>
            Retry is unavailable because the original request payload is missing.
          </Text>
        ) : null}
      </BottomSheetModal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1},
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 26,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heading: {...fontStyle('bold'), flex: 1, fontSize: 28, lineHeight: 34},
  headerActions: {flexDirection: 'row', alignItems: 'center', columnGap: 6},
  headerIcon: {padding: 6},
  listContent: {paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40},
  listHeader: {paddingTop: 0},
  pendingGroup: {marginBottom: 18},
  pendingRows: {rowGap: 12},
  sectionHeading: {flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 16},
  sectionTitle: {...fontStyle('bold'), fontSize: 16, lineHeight: 20},
  countPill: {
    marginLeft: 8,
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
    textAlign: 'center',
    ...fontStyle('bold'),
    fontSize: 12,
    lineHeight: 16,
  },
  rowWrap: {width: '100%', justifyContent: 'center'},
  identityRow: {
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  rowText: {flex: 1, minWidth: 0},
  rowTextWithAction: {paddingRight: 90},
  rowTextWithWideAction: {paddingRight: 140},
  identityName: {...fontStyle('bold'), fontSize: 18, lineHeight: 23, letterSpacing: -0.2},
  identitySubtitle: {...fontStyle('regular'), fontSize: 13, lineHeight: 17, marginTop: 2, letterSpacing: -0.1},
  networkPill: {paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8, alignSelf: 'flex-start'},
  networkText: {...fontStyle('bold'), fontSize: 10, lineHeight: 12, textTransform: 'uppercase'},
  rowAction: {
    position: 'absolute',
    right: 12,
    minWidth: 74,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  rowActionWide: {minWidth: 132},
  rowActionText: {...fontStyle('bold'), fontSize: 13, lineHeight: 17, letterSpacing: -0.2},
  itemSeparator: {height: 12},
  loading: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20},
  loadingText: {...fontStyle('regular'), fontSize: 14, lineHeight: 19},
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 60,
    paddingHorizontal: 32,
  },
  emptyImage: {width: 170, height: 140, marginBottom: 32},
  emptyTitle: {...fontStyle('bold'), fontSize: 20, lineHeight: 25, textAlign: 'center', marginBottom: 8},
  emptyDescription: {...fontStyle('regular'), fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 32},
  emptyPrimaryCta: {width: 200, height: 44, borderRadius: 22, marginBottom: 16},
  emptyPrimaryLabel: {marginTop: -1},
  emptySecondaryCta: {
    width: 200,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptySecondaryLabel: {...fontStyle('bold'), fontSize: 16, lineHeight: 20},
  learnMoreRow: {flexDirection: 'row', alignItems: 'center'},
  learnMoreIcon: {marginRight: 6},
  learnMoreText: {...fontStyle('semiBold'), fontSize: 13, lineHeight: 17, letterSpacing: -0.1},
  bottomFade: {position: 'absolute', left: 0, right: 0, bottom: 0},
  bottomFadeSvg: {marginBottom: -1},
  sheet: {borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 20, paddingBottom: 28},
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
  infoSummary: {...fontStyle('regular'), fontSize: 14, lineHeight: 20, marginBottom: 14},
  faqList: {width: '100%', borderWidth: 1, borderRadius: 14, overflow: 'hidden'},
  faqItem: {width: '100%'},
  faqHeader: {minHeight: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center'},
  faqTitle: {...fontStyle('bold'), flex: 1, fontSize: 15, lineHeight: 20, letterSpacing: -0.2},
  faqBody: {paddingLeft: 16, paddingRight: 16, paddingBottom: 12},
  faqParagraph: {...fontStyle('regular'), fontSize: 14, lineHeight: 20, marginBottom: 10},
  faqBullet: {marginLeft: 10, marginBottom: 6},
  faqSpacer: {height: 10},
  pendingName: {...fontStyle('bold'), fontSize: 16, lineHeight: 21},
  pendingStatus: {...fontStyle('regular'), fontSize: 13, lineHeight: 17, marginTop: 2, marginBottom: 12},
  sheetBody: {...fontStyle('regular'), fontSize: 14, lineHeight: 20, marginBottom: 14},
  pendingError: {...fontStyle('regular'), fontSize: 13, lineHeight: 18, marginBottom: 2},
  sheetAction: {width: '100%', height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 10},
  actionLabel: {...fontStyle('bold'), fontSize: 16, lineHeight: 20},
  removeAction: {width: '100%', height: 44, borderRadius: 22, marginTop: 2},
  sheetPrimaryAction: {width: '100%', height: 44, borderRadius: 22},
  helperText: {...fontStyle('regular'), marginTop: 10, fontSize: 12, lineHeight: 16},
});

export default SignedInVerusIdService;
