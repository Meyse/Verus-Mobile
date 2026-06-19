import React from 'react';
import {TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {ContentMultiMapRemoveKey} from 'verus-typescript-primitives';
import Colors from '../globals/colors';
import {verusIdObjectDataStyles as LocalStyles} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';
import {VERUSID_CMM_DATA} from '../utils/constants/verusidObjectData';
import {capitalizeString} from '../utils/stringUtils';
import {getVDXFKeyLabel} from '../utils/vdxf/vdxfTypeLabels';

export const getCmmDataKeyLabel = (iAddr, cmmDataKeys) => {
  const keyLabel = getVDXFKeyLabel(iAddr, true);

  if (keyLabel != null) {
    return capitalizeString(keyLabel);
  }

  if (cmmDataKeys && cmmDataKeys[iAddr]) {
    return cmmDataKeys[iAddr].label;
  }

  if (typeof iAddr === 'string' && iAddr.length > 8) {
    return `${iAddr.substring(0, 4)}...${iAddr.substring(iAddr.length - 4)}`;
  }

  return iAddr || 'Unknown key';
};

export const getCmmDataPreview = (
  data,
  maxItems = 3,
  maxLen = 80,
  maxDepth = 2,
) => {
  const trim = value => {
    if (value == null) return 'null';
    const str = String(value);
    return str.length > maxLen ? `${str.slice(0, maxLen)}...` : str;
  };

  const formatValue = (value, depth = 0) => {
    if (Array.isArray(value)) {
      if (depth >= maxDepth) return `${value.length} items`;

      const shownItems = value
        .slice(0, maxItems)
        .map(entry => formatValue(entry, depth + 1));
      const shown = shownItems.join(' | ');
      return value.length > maxItems
        ? `${shown} +${value.length - maxItems} more`
        : shown;
    }

    if (typeof value === 'object' && value != null) {
      const keys = Object.keys(value);
      if (depth >= maxDepth) return `${keys.length} fields`;

      if (keys.length === 1) {
        const key = keys[0];
        const label = getVDXFKeyLabel(key, true) || key;
        return `${label}: ${formatValue(value[key], depth + 1)}`;
      }

      return `${keys.length} fields`;
    }

    return trim(value);
  };

  return formatValue(data);
};

export const normalizeCmmDisplayUpdates = cmmUpdates => {
  const normalized = {};

  for (const key in cmmUpdates || {}) {
    const entry = cmmUpdates[key];
    normalized[key] =
      entry && entry.rawData != null
        ? {
            ...entry,
            data: getCmmDataPreview(entry.rawData),
          }
        : entry;
  }

  return normalized;
};

export const isContentMultiMapRemove = rawData => {
  const isRemoveObj = obj => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    const keys = Object.keys(obj);
    if (keys.length !== 1) return false;
    return keys[0] === ContentMultiMapRemoveKey.vdxfid;
  };

  if (isRemoveObj(rawData)) return true;
  if (Array.isArray(rawData)) {
    return rawData.length > 0 && rawData.every(isRemoveObj);
  }

  return false;
};

export const getCmmChangeType = (hasExisting, updateEntry) => {
  if (!updateEntry) return null;
  if (isContentMultiMapRemove(updateEntry.rawData)) return 'removed';
  if (!hasExisting) return 'added';
  return 'appended';
};

const getUpdateKeyTarget = updateKey => {
  const prefix = `${VERUSID_CMM_DATA.key}:`;
  if (!updateKey.startsWith(prefix)) return updateKey;

  return updateKey.slice(prefix.length).split(':remove:')[0];
};

const getSameRequestRemoveTargets = cmmUpdates => {
  const targets = new Set();
  let clearsAll = false;

  for (const key in cmmUpdates || {}) {
    const removeMeta = cmmUpdates[key]?.removeMeta;
    if (!removeMeta) continue;

    if (removeMeta.action === 4) {
      clearsAll = true;
    } else if (removeMeta.action === 3) {
      targets.add(getUpdateKeyTarget(key));
    }
  }

  return {clearsAll, targets};
};

const sameRequestRemovesTarget = (targetKey, removeTargets) =>
  removeTargets.clearsAll || removeTargets.targets.has(targetKey);

export const buildVerusIdContentChangeItems = ({
  verusId,
  cmmUpdates,
  getCmmDataKey,
  changedOnly = false,
}) => {
  const contentMultiMapInfo = {};
  const currentContentMultiMap =
    verusId && verusId.identity ? verusId.identity.contentmultimap : null;
  const removeTargets = getSameRequestRemoveTargets(cmmUpdates);

  if (changedOnly) {
    return Object.keys(cmmUpdates || {}).flatMap(key => {
      const updateEntry = cmmUpdates[key];
      if (
        updateEntry?.removeMeta?.action === 4 &&
        currentContentMultiMap &&
        Object.keys(currentContentMultiMap).length > 0
      ) {
        return Object.keys(currentContentMultiMap).map(iAddrKey => {
          const entryLabel = getCmmDataKey(iAddrKey);

          return {
            key: `${key}:active:${iAddrKey}`,
            title: entryLabel,
            data: getCmmDataPreview(currentContentMultiMap[iAddrKey]),
            hideOldData: false,
            dataInDescription: true,
            changeType: 'removed',
            isEncrypted: Boolean(updateEntry && updateEntry.isEncrypted),
            isEncryptedKey: Boolean(updateEntry && updateEntry.isEncryptedKey),
            updatedData: updateEntry ? updateEntry.data : null,
            removeMeta: updateEntry
              ? {
                  ...updateEntry.removeMeta,
                  entryLabel,
                }
              : null,
          };
        });
      }

      const targetKey = getUpdateKeyTarget(key);
      const isRemoveUpdate = Boolean(updateEntry?.removeMeta);
      const existingData =
        currentContentMultiMap && currentContentMultiMap[targetKey] != null
          ? currentContentMultiMap[targetKey]
          : null;
      const hasExisting = existingData != null;
      const existingClearedByRequest =
        !isRemoveUpdate && sameRequestRemovesTarget(targetKey, removeTargets);
      const hasExistingAfterRequestRemovals =
        hasExisting && !existingClearedByRequest;

      return {
        key,
        title:
          updateEntry && updateEntry.displayTitle
            ? updateEntry.displayTitle
            : getCmmDataKey(targetKey),
        data: hasExisting
          ? getCmmDataPreview(existingData)
          : updateEntry
          ? updateEntry.data
          : null,
        hideOldData: !hasExisting || existingClearedByRequest,
        dataInDescription: true,
        changeType: getCmmChangeType(
          hasExistingAfterRequestRemovals,
          updateEntry,
        ),
        isEncrypted: Boolean(updateEntry && updateEntry.isEncrypted),
        isEncryptedKey: Boolean(updateEntry && updateEntry.isEncryptedKey),
        updatedData: updateEntry ? updateEntry.data : null,
        removeMeta: updateEntry ? updateEntry.removeMeta : null,
      };
    });
  }

  if (currentContentMultiMap) {
    for (const iAddrKey in currentContentMultiMap) {
      const updateKey = `${VERUSID_CMM_DATA.key}:${iAddrKey}`;
      const updateEntry = cmmUpdates[updateKey];
      const isRemoveUpdate = Boolean(updateEntry?.removeMeta);
      const existingClearedByRequest =
        !isRemoveUpdate && sameRequestRemovesTarget(iAddrKey, removeTargets);

      contentMultiMapInfo[updateKey] = {
        key: updateKey,
        title: getCmmDataKey(iAddrKey),
        data: getCmmDataPreview(currentContentMultiMap[iAddrKey]),
        hideOldData: existingClearedByRequest,
        dataInDescription: true,
        changeType: getCmmChangeType(!existingClearedByRequest, updateEntry),
        isEncrypted: Boolean(updateEntry && updateEntry.isEncrypted),
        isEncryptedKey: Boolean(updateEntry && updateEntry.isEncryptedKey),
        updatedData: updateEntry ? updateEntry.data : null,
        removeMeta: updateEntry ? updateEntry.removeMeta : null,
      };
    }
  }

  for (const key in cmmUpdates) {
    if (!contentMultiMapInfo[key]) {
      const updateEntry = cmmUpdates[key];
      const targetKey = getUpdateKeyTarget(key);

      contentMultiMapInfo[key] = {
        key,
        title:
          updateEntry && updateEntry.displayTitle
            ? updateEntry.displayTitle
            : getCmmDataKey(targetKey),
        data: updateEntry ? updateEntry.data : null,
        hideOldData: true,
        dataInDescription: true,
        changeType: getCmmChangeType(false, updateEntry),
        isEncrypted: Boolean(updateEntry && updateEntry.isEncrypted),
        isEncryptedKey: Boolean(updateEntry && updateEntry.isEncryptedKey),
        updatedData: updateEntry ? updateEntry.data : null,
        removeMeta: updateEntry ? updateEntry.removeMeta : null,
      };
    }
  }

  return Object.values(contentMultiMapInfo);
};

export const isPrivateContentChange = item =>
  Boolean(item && (item.isEncrypted || item.isEncryptedKey));

export const contentChangeMatchesFilter = (item, filter) => {
  if (filter === 'all') return true;
  if (filter === 'add') {
    return item.changeType === 'added' || item.changeType === 'appended';
  }
  if (filter === 'remove') return item.changeType === 'removed';
  if (filter === 'protect') return isPrivateContentChange(item);
  return true;
};

const getChangeBadgeConfig = changeType => {
  switch (changeType) {
    case 'added':
      return {
        icon: 'plus-circle-outline',
        label: 'New key',
        color: Colors.verusGreenColor,
      };
    case 'appended':
      return {
        icon: 'plus-circle-outline',
        label: 'Add value',
        color: Colors.verusGreenColor,
      };
    case 'removed':
      return {
        icon: 'minus-circle-outline',
        label: 'Will remove',
        color: Colors.warningButtonColor,
      };
    default:
      return null;
  }
};

export const getContentChangeBadges = item => {
  const badges = [];
  const baseBadge = getChangeBadgeConfig(item.changeType);

  if (baseBadge) {
    badges.push(
      item.changeType === 'removed'
        ? {
            ...baseBadge,
            label: item.removeMeta?.action === 4 ? 'Will clear' : 'Will remove',
          }
        : baseBadge,
    );
  }

  if (isPrivateContentChange(item)) {
    badges.push({
      icon: 'shield-lock-outline',
      label: 'Will encrypt',
      color: Colors.primaryColor,
    });
  }

  return badges;
};

const truncatePreview = (text, maxLen = 60) => {
  if (text == null) return '';
  const str = String(text);
  return str.length > maxLen ? `${str.slice(0, maxLen)}...` : str;
};

const renderCmmDescBlock = (
  label,
  value,
  borderColor,
  muted = false,
  darkMode = false,
) => (
  <View style={[LocalStyles.cmmCardDescBlock, {borderLeftColor: borderColor}]}>
    <Text style={[LocalStyles.cmmCardDescLabel, {color: borderColor}]}>
      {label}
    </Text>
    <Text
      style={[
        LocalStyles.cmmCardDescValue,
        darkMode && LocalStyles.cmmCardDescValueDark,
        muted && {
          textDecorationLine: 'line-through',
          color: darkMode ? '#7E8EA6' : '#999',
        },
      ]}
      numberOfLines={2}>
      {truncatePreview(value, 80) || 'Unknown'}
    </Text>
  </View>
);

const getRemoveActionDescription = removeMeta => {
  if (!removeMeta) return null;

  const {action, entryLabel, valueHash} = removeMeta;
  const valueHashText =
    typeof valueHash === 'string' && valueHash.length > 0
      ? ` (hash ${valueHash.substring(0, 10)}...)`
      : '';

  if (action === 4) return 'All active content keys and values';
  if (action === 3) {
    return `All active values under ${entryLabel || 'selected key'}`;
  }
  if (action === 2) {
    return `All active matching values under ${
      entryLabel || 'selected key'
    }${valueHashText}`;
  }
  if (action === 1) {
    return `One active value under ${
      entryLabel || 'selected key'
    }${valueHashText}`;
  }

  return 'Selected content';
};

const renderCmmChangeDescription = (item, updateEntry, darkMode = false) => {
  const neutralBorderColor = darkMode ? '#7E8EA6' : '#CCC';
  const updatedPreview = item.isEncrypted
    ? 'Encrypted upload (tap to view)'
    : item.updatedData ?? updateEntry?.data ?? item.data;

  if (item.changeType === 'added') {
    return renderCmmDescBlock(
      'New key',
      updatedPreview || 'New value',
      Colors.verusGreenColor,
      false,
      darkMode,
    );
  }

  if (item.changeType === 'removed') {
    const actionLabel =
      item.removeMeta?.action === 4 ? 'Will clear' : 'Will remove';

    if (item.removeMeta) {
      const removeActionDescription = getRemoveActionDescription(item.removeMeta);
      const removesDisplayedActive =
        item.removeMeta.action === 3 || item.removeMeta.action === 4;

      return (
        <>
          {item.data != null &&
            !item.hideOldData &&
            renderCmmDescBlock(
              'Active',
              item.data,
              neutralBorderColor,
              removesDisplayedActive,
              darkMode,
            )}
          {renderCmmDescBlock(
            actionLabel,
            removeActionDescription || 'Selected content',
            Colors.warningButtonColor,
            false,
            darkMode,
          )}
        </>
      );
    }

    return renderCmmDescBlock(
      actionLabel,
      item.data || 'Unknown value',
      Colors.warningButtonColor,
      true,
      darkMode,
    );
  }

  if (item.changeType === 'appended') {
    return (
      <>
        {item.data != null &&
          renderCmmDescBlock(
            'Existing',
            item.data,
            neutralBorderColor,
            false,
            darkMode,
          )}
        {renderCmmDescBlock(
          'Add value',
          updatedPreview || 'New value',
          Colors.verusGreenColor,
          false,
          darkMode,
        )}
      </>
    );
  }

  return (
    <Text
      style={{color: darkMode ? '#A9B6CA' : Colors.verusDarkGray}}>
      {item.dataInDescription ? item.data : item.title}
    </Text>
  );
};

const getTonePanelStyle = (item, darkMode = false) => {
  if (item.changeType === 'removed') {
    return darkMode
      ? LocalStyles.cmmCardRemovePanelDark
      : LocalStyles.cmmCardRemovePanel;
  }

  if (isPrivateContentChange(item)) {
    return darkMode
      ? LocalStyles.cmmCardPrivatePanelDark
      : LocalStyles.cmmCardPrivatePanel;
  }

  if (item.changeType === 'added' || item.changeType === 'appended') {
    return darkMode
      ? LocalStyles.cmmCardAddPanelDark
      : LocalStyles.cmmCardAddPanel;
  }

  return null;
};

const VerusIdContentChangeCard = ({
  darkMode: darkModeProp,
  item,
  panelTone = false,
  style,
  updateEntry,
}) => {
  const theme = useOnboardingTheme();
  const darkMode = darkModeProp ?? theme.isDark;
  const encryptedInfoColor = darkMode ? '#8FB1FF' : Colors.primaryColor;
  const badges = getContentChangeBadges(item);
  const onPress =
    updateEntry && updateEntry.onPress ? updateEntry.onPress : item.onPress;

  return (
    <TouchableOpacity
      key={item.key}
      accessibilityRole={onPress ? 'button' : undefined}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      onPress={onPress}
      style={[
        LocalStyles.cmmCard,
        darkMode && LocalStyles.cmmCardDark,
        panelTone && getTonePanelStyle(item, darkMode),
        style,
      ]}>
      <View style={LocalStyles.cmmCardHeader}>
        <Text
          style={[
            LocalStyles.cmmCardTitle,
            darkMode && LocalStyles.cmmCardTitleDark,
          ]}>
          {item.title}
        </Text>
        {badges.length > 0 && (
          <View style={LocalStyles.cmmCardBadgeRow}>
            {badges.map((badge, idx) => (
              <View
                key={`${badge.label}-${idx}`}
                style={[LocalStyles.badge, {borderColor: badge.color}]}>
                <MaterialCommunityIcons
                  color={badge.color}
                  name={badge.icon}
                  size={12}
                  style={LocalStyles.badgeIcon}
                />
                <Text style={[LocalStyles.badgeText, {color: badge.color}]}>
                  {badge.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {renderCmmChangeDescription(item, updateEntry, darkMode)}

      {item.isEncryptedKey && (
        <View
          style={[
            LocalStyles.encryptedKeyInfo,
            darkMode && LocalStyles.encryptedKeyInfoDark,
          ]}>
          <MaterialCommunityIcons
            color={encryptedInfoColor}
            name="shield-lock-outline"
            size={14}
            style={{marginRight: 6, marginTop: 1}}
          />
          <Text
            style={[
              LocalStyles.encryptedKeyInfoText,
              darkMode && LocalStyles.encryptedKeyInfoTextDark,
            ]}>
            This credential data will be encrypted before it is stored on-chain.
            Neither the credential type nor its contents will be publicly
            visible. The identity's z-address must match the z-address linked to
            your account's shielded (Z) seed.
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default VerusIdContentChangeCard;
