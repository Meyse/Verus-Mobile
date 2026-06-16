import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {Text} from 'react-native-paper';
import {
  deepLinkRequestReviewStyles as createDeepLinkRequestReviewStyles,
} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {convertFqnToDisplayFormat} from '../../../../utils/fullyqualifiedname';
import {getCmmDataLabel} from '../../../../utils/vdxf/cmmDataLabel';
import {getVDXFKeyLabel} from '../../../../utils/vdxf/vdxfTypeLabels';
import {capitalizeString} from '../../../../utils/stringUtils';
import DeepLinkRequestInfoSection from './DeepLinkRequestInfoSection';
import DeepLinkRequestSheetScaffold from './DeepLinkRequestSheetScaffold';

const abbreviateKey = value => {
  const text = String(value || '');
  if (text.length <= 12) return text;

  return `${text.substring(0, 4)}...${text.substring(text.length - 4)}`;
};

const formatValue = value => {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(formatValue).filter(Boolean).join('\n');
  }

  try {
    return JSON.stringify(value);
  } catch (e) {
    return String(value);
  }
};

const getFriendlyValue = (friendlyNames, value, options = {}) => {
  if (!value) return null;

  const friendlyValue = friendlyNames?.[value] || value;
  if (options.stripAt) return String(friendlyValue).replace(/@/g, '');

  return String(friendlyValue);
};

const getContentLabel = key => {
  const vdxfLabel = getVDXFKeyLabel(key, true);
  if (vdxfLabel) return capitalizeString(vdxfLabel);

  return abbreviateKey(key);
};

const buildVerusIdSections = (verusId, friendlyNames) => {
  const identity = verusId?.identity;
  if (!identity) return [];

  const primaryAddresses = Array.isArray(identity.primaryaddresses)
    ? identity.primaryaddresses
    : [];
  const contentMultiMap = identity.contentmultimap || {};
  const contentRows = Object.keys(contentMultiMap).map(key => ({
    label: getContentLabel(key),
    value: formatValue(getCmmDataLabel(contentMultiMap[key])),
  }));

  return [
    {
      title: 'Identity',
      rows: [
        {label: 'Name', value: formatValue(identity.name)},
        {
          label: 'Fully qualified name',
          value: verusId.fullyqualifiedname
            ? convertFqnToDisplayFormat(verusId.fullyqualifiedname)
            : null,
        },
        {label: 'i-Address', value: formatValue(identity.identityaddress)},
        {
          label: 'System',
          value: getFriendlyValue(friendlyNames, identity.systemid, {
            stripAt: true,
          }),
        },
        {label: 'Status', value: formatValue(verusId.status)},
      ],
    },
    {
      title: 'Authorities',
      rows: [
        {
          label: 'Revocation authority',
          value: getFriendlyValue(friendlyNames, identity.revocationauthority),
        },
        {
          label: 'Recovery authority',
          value: getFriendlyValue(friendlyNames, identity.recoveryauthority),
        },
        ...primaryAddresses.map((address, index) => ({
          label:
            primaryAddresses.length > 1
              ? `Primary address ${index + 1}`
              : 'Primary address',
          value: formatValue(address),
        })),
      ],
    },
    {
      title: 'Private address',
      rows: [
        {
          label: 'Private address',
          value: formatValue(identity.privateaddress),
        },
      ],
    },
    {
      title: 'Identity content',
      rows: contentRows,
    },
  ].filter(section => section.rows.some(row => row.value != null));
};

const DeepLinkVerusIdDetailsSheet = ({
  loadFriendlyNames,
  loadVerusId,
  onClose,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createDeepLinkRequestReviewStyles(theme),
    [theme],
  );
  const [verusId, setVerusId] = useState(null);
  const [friendlyNames, setFriendlyNames] = useState({});
  const [loading, setLoading] = useState(false);
  const [failedMessage, setFailedMessage] = useState(null);

  useEffect(() => {
    let active = true;

    const loadDetails = async () => {
      if (!visible || typeof loadVerusId !== 'function') return;

      setLoading(true);
      setFailedMessage(null);
      setVerusId(null);
      setFriendlyNames({});

      try {
        const loadedVerusId = await loadVerusId();
        const loadedFriendlyNames =
          typeof loadFriendlyNames === 'function'
            ? await loadFriendlyNames(loadedVerusId)
            : {};

        if (!active) return;

        setVerusId(loadedVerusId);
        setFriendlyNames(loadedFriendlyNames || {});
      } catch (e) {
        if (!active) return;

        setFailedMessage(e?.message || 'Failed to load VerusID');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDetails();

    return () => {
      active = false;
    };
  }, [loadFriendlyNames, loadVerusId, visible]);

  const sections = useMemo(
    () => buildVerusIdSections(verusId, friendlyNames),
    [friendlyNames, verusId],
  );

  return (
    <DeepLinkRequestSheetScaffold
      visible={visible}
      onClose={onClose}
      maxHeight="82%"
      title="VerusID details">
      {loading ? (
        <View style={styles.requestSheetState}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.requestSheetStateText}>Loading VerusID</Text>
        </View>
      ) : failedMessage ? (
        <View style={styles.requestSheetState}>
          <Text style={styles.requestSheetStateTitle}>
            Unable to load VerusID
          </Text>
          <Text style={styles.requestSheetStateText}>{failedMessage}</Text>
        </View>
      ) : sections.length > 0 ? (
        sections.map(section => (
          <DeepLinkRequestInfoSection
            key={section.title}
            title={section.title}
            rows={section.rows}
          />
        ))
      ) : (
        <View style={styles.requestSheetState}>
          <Text style={styles.requestSheetStateText}>
            No VerusID details were returned.
          </Text>
        </View>
      )}
    </DeepLinkRequestSheetScaffold>
  );
};

export default DeepLinkVerusIdDetailsSheet;
