import React, { useState, useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  StatusBar,
  Platform,
} from 'react-native';
import { Button, Portal, Text } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { UserDataRequestDetails } from 'verus-typescript-primitives';
import * as VDXF_Data from 'verus-typescript-primitives/dist/vdxf/vdxfdatakeys';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import Colors from '../../../globals/colors';
import GradientButton from '../../../components/GradientButton';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { openAuthenticateUserModal } from '../../../actions/actions/sendModal/dispatchers/sendModal';
import { SEND_MODAL_USER_ALLOWLIST } from '../../../utils/constants/sendModal';
import { createAlert, resolveAlert } from '../../../actions/actions/alert/dispatchers/alert';
import { unixToDate } from '../../../utils/math';
import { getSystemNameFromSystemId } from '../../../utils/CoinData/CoinData';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';
import { useObjectSelector } from '../../../hooks/useObjectSelector';
import { requestServiceStoredData } from '../../../utils/auth/authBox';
import { VERUSID_SERVICE_ID } from '../../../utils/constants/services';
import { buildUserDataResponse } from '../../../utils/deeplink/userDataResponseBuilder';
import { getFriendlyLabel } from '../../../utils/dataDescriptor/dataDescriptorDisplay';

const truncateAddress = (addr) => {
  if (!addr || addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
};

const SHARE_MODE_HELPERS = {
  1: 'All details in this record will be shared.',
  2: 'Only these details will be shared.',
  3: 'These records will be shared.',
};

const ATTESTATION_NAME_VDXFID = 'i4GC1YGEVD21afWudGoFJVdnfjJ8bfCoct';

const friendlyKeyLabel = (vdxfKey) => getFriendlyLabel(vdxfKey);

const getDescriptorLabel = (descriptor) => {
  const descriptorKeyId = VDXF_Data.DataDescriptorKey?.vdxfid;
  const json = descriptor?.toJson?.();
  const nested = json?.objectdata?.[descriptorKeyId];

  return nested?.label || json?.label || null;
};

const getDescriptorValue = (descriptor) => {
  const descriptorKeyId = VDXF_Data.DataDescriptorKey?.vdxfid;
  const json = descriptor?.toJson?.();
  const nested = json?.objectdata?.[descriptorKeyId];
  const source = nested || json;
  const objectdata = source?.objectdata;

  if (objectdata == null) return null;

  if (typeof objectdata === 'object' && objectdata.message != null) {
    if (typeof objectdata.message === 'boolean') {
      return objectdata.message ? 'Yes' : 'No';
    }

    if (
      typeof objectdata.message === 'string' ||
      typeof objectdata.message === 'number'
    ) {
      return String(objectdata.message);
    }
  }

  if (typeof objectdata === 'boolean') {
    return objectdata ? 'Yes' : 'No';
  }

  if (
    typeof objectdata === 'string' ||
    typeof objectdata === 'number'
  ) {
    return String(objectdata);
  }

  return null;
};

const extractFieldDescriptors = (descriptors) => {
  if (!Array.isArray(descriptors)) return [];

  const seen = new Set();
  const fields = [];

  descriptors.forEach((descriptor) => {
    const key = getDescriptorLabel(descriptor);

    if (!key || seen.has(key) || key === ATTESTATION_NAME_VDXFID) return;

    seen.add(key);
    fields.push({
      key,
      label: friendlyKeyLabel(key),
      value: getDescriptorValue(descriptor),
    });
  });

  return fields;
};

const RecordPreviewCard = ({ record, showBorder }) => {
  return (
    <View
      style={[
        styles.recordCard,
        showBorder && styles.detailRowBorder,
      ]}
    >
      <Text style={styles.recordName}>{record.name}</Text>
      {record.fields.length > 0 ? (
        <View style={styles.recordFieldList}>
          {record.fields.map((field) => (
            <View key={`${record.id}-${field.key}`} style={styles.recordFieldRow}>
              <MaterialCommunityIcons
                name="check-circle"
                size={16}
                color={Colors.verusGreenColor}
              />
              <View style={styles.recordFieldTextBlock}>
                {field.value && field.value !== field.label ? (
                  <>
                    <Text style={styles.recordFieldLabelText}>{field.label}</Text>
                    <Text style={styles.recordFieldValueText}>{field.value}</Text>
                  </>
                ) : (
                  <Text style={styles.recordFieldValueText}>{field.label}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noFieldsText}>No details available</Text>
      )}
    </View>
  );
};

const UserDataRequestInfo = (props) => {
  const {
    requestSignerFqn,
    requestSignerIdentityID,
    requestSignerSystemID,
    requestSigtime,
    dataType,
    requestedKeys,
    matchingAttestations,
    cancel,
    next,
    response,
    request,
    detailIndex,
  } = props;

  const signedIn = useSelector(state => state.authentication.signedIn);
  const encryptedIds = useObjectSelector(state => state.services.stored[VERUSID_SERVICE_ID]);
  const requestIsTestnet = request != null ? request.isTestnet() : false;

  const [loading, setLoading] = useState(false);
  const [waitingForSignin, setWaitingForSignin] = useState(false);
  const [verusIdDetailsModalProps, setVerusIdDetailsModalProps] = useState(null);

  const isPartialData = dataType === UserDataRequestDetails.PARTIAL_DATA.toNumber();
  const isCollection = dataType === UserDataRequestDetails.COLLECTION.toNumber();
  const requesterLabel = requestSignerFqn || requestSignerIdentityID || 'Unknown requester';
  const requesterAddress = requestSignerIdentityID || null;
  const requestSigDateString = requestSigtime ? unixToDate(requestSigtime) : null;
  const requestChainId = requestSignerSystemID
    ? getSystemNameFromSystemId(requestSignerSystemID) || requestSignerSystemID
    : null;
  const shareModeHelper = SHARE_MODE_HELPERS[dataType] || 'Review what will be shared before continuing.';
  const matchingRecordCount = matchingAttestations?.length || 0;
  const continueDisabled = matchingRecordCount === 0;

  const sharedFieldKeys = useMemo(() => requestedKeys || [], [requestedKeys]);

  const requestDetails = useMemo(() => {
    const detail =
      typeof request?.getDetails === 'function'
        ? request.getDetails(detailIndex)
        : request?.details?.[detailIndex];

    return detail?.data || null;
  }, [detailIndex, request]);

  const requestID = useMemo(() => {
    if (requestDetails?.hasRequestID?.() && requestDetails.requestID) {
      return requestDetails.requestID;
    }

    return undefined;
  }, [requestDetails]);

  const previewRecords = useMemo(() => {
    if (!Array.isArray(matchingAttestations) || matchingAttestations.length === 0) {
      return [];
    }

    return matchingAttestations.map((record) => {
      const allFields = extractFieldDescriptors(
        record?.attestationDetails?.mmrDescriptor?.dataDescriptors,
      );
      let visibleFields = allFields;

      if (isPartialData) {
        visibleFields = allFields.filter((field) => sharedFieldKeys.includes(field.key));
      }

      return {
        id: record.id,
        name: record.name || 'Record',
        fields: visibleFields,
      };
    });
  }, [isPartialData, matchingAttestations, sharedFieldKeys]);

  const primaryRecord = previewRecords[0] || null;
  const primaryShareTitle = useMemo(() => {
    if (matchingRecordCount === 0) return null;
    if (isPartialData) return null;
    if (isCollection) {
      return `${matchingRecordCount} ${matchingRecordCount === 1 ? 'record' : 'records'}`;
    }

    return primaryRecord?.name || '1 record';
  }, [
    isCollection,
    isPartialData,
    matchingRecordCount,
    primaryRecord,
  ]);

  const primaryShareSubtitle = useMemo(() => {
    if (matchingRecordCount === 0) return 'This request cannot be completed on this device';
    if (isPartialData) {
      return primaryRecord?.name ? `From ${primaryRecord.name}` : 'From 1 record';
    }
    if (isCollection) return 'Review these records before sharing';

    return 'Full record';
  }, [isCollection, isPartialData, matchingRecordCount, primaryRecord]);

  const primaryActionLabel = useMemo(() => {
    if (continueDisabled) return 'Continue';
    if (isPartialData) return 'Share details';
    if (isCollection) {
      return matchingRecordCount === 1 ? 'Share record' : 'Share records';
    }

    return 'Share record';
  }, [
    continueDisabled,
    isCollection,
    isPartialData,
    matchingRecordCount,
  ]);

  useEffect(() => {
    if (waitingForSignin && signedIn) {
      setWaitingForSignin(false);
    }
  }, [signedIn, waitingForSignin]);

  const buildAndSendResponse = async () => {
    try {
      setLoading(true);

      return await buildUserDataResponse({
        matchingRecords: matchingAttestations,
        response,
        requestedKeys: isPartialData ? requestedKeys : null,
        requestID,
      });
    } catch (e) {
      console.error('Error building user data response:', e);
      createAlert('Error', `Failed to build response: ${e.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (signedIn) {
      if (!matchingAttestations || matchingAttestations.length === 0) {
        createAlert('No data', 'No matching records were found on this device.');
        return;
      }

      let confirmationBody;

      if (isCollection) {
        confirmationBody = `Are you sure you want to share ${matchingRecordCount} matching records with ${requesterLabel}?`;
      } else if (isPartialData) {
        confirmationBody = `Are you sure you want to share the selected details from this record with ${requesterLabel}?`;
      } else {
        confirmationBody = `Are you sure you want to share all details in this record with ${requesterLabel}?`;
      }

      createAlert(
        'Share data',
        confirmationBody,
        [
          {
            text: 'No',
            onPress: () => {
              resolveAlert();
            },
          },
          {
            text: 'Yes',
            onPress: async () => {
              resolveAlert();
              const builtResponse = await buildAndSendResponse();
              if (builtResponse) {
                next(builtResponse, [detailIndex]);
              }
            },
          },
        ],
        { cancelable: false },
      );
    } else {
      setWaitingForSignin(true);

      const allowList = [];
      if (encryptedIds) {
        try {
          const storedIds = await requestServiceStoredData(VERUSID_SERVICE_ID);
          if (storedIds) {
            Object.entries(storedIds).forEach(([iAddr, idData]) => {
              if (!idData) return;

              const chainId = idData.chainId || (requestIsTestnet ? 'VRSCTEST' : 'VRSC');
              const coinObj = CoinDirectory.findCoinObj(chainId, null, true);

              if (coinObj && coinObj.testnet === requestIsTestnet) {
                allowList.push(iAddr);
              }
            });
          }
        } catch (e) {
          console.warn('Error building allowlist:', e);
        }
      }

      if (allowList.length > 0) {
        openAuthenticateUserModal({ [SEND_MODAL_USER_ALLOWLIST]: allowList });
      } else {
        createAlert(
          'Cannot continue',
          `No ${requestIsTestnet ? 'testnet' : 'mainnet'} profiles found, cannot respond to this request.`,
        );
      }
    }
  };

  const handleSignerDetailsPress = () => {
    if (requestSignerIdentityID && requestSignerSystemID) {
      setVerusIdDetailsModalProps({
        iAddress: requestSignerIdentityID,
        systemId: requestSignerSystemID,
        visible: true,
        onClose: () => setVerusIdDetailsModalProps(null),
      });
    }
  };

  const canOpenSignerModal = !!(requestSignerIdentityID && requestSignerSystemID);

  return loading ? (
    <AnimatedActivityIndicatorBox />
  ) : (
    <SafeAreaView style={styles.container}>
      <Portal>
        {verusIdDetailsModalProps != null && (
          <VerusIdDetailsModal {...verusIdDetailsModalProps} />
        )}
      </Portal>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.mainTitle}>Share data</Text>
        </View>

        <TouchableOpacity
          style={styles.requesterCard}
          onPress={canOpenSignerModal ? handleSignerDetailsPress : undefined}
          activeOpacity={canOpenSignerModal ? 0.7 : 1}
        >
          <View style={styles.requesterHeaderRow}>
            <View style={styles.requesterIconContainer}>
              <MaterialCommunityIcons
                name="account-lock"
                size={28}
                color={Colors.verusGreenColor}
              />
            </View>
            <View style={styles.requesterTextContainer}>
              <Text style={styles.requesterLabel}>Request from</Text>
              <Text style={styles.requesterName}>{requesterLabel}</Text>
              {requesterAddress ? (
                <Text style={styles.requesterAddress}>{truncateAddress(requesterAddress)}</Text>
              ) : null}
            </View>
            {canOpenSignerModal ? (
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={Colors.verusDarkGray}
              />
            ) : null}
          </View>
          {(requestChainId || requestSigDateString) ? (
            <View style={styles.requesterDetailsRow}>
              {requestChainId ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{requestChainId}</Text>
                </View>
              ) : null}
              {requestSigDateString ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{requestSigDateString}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </TouchableOpacity>

        <View style={styles.primaryShareCard}>
          <Text style={styles.primaryShareEyebrow}>You are sharing</Text>
          {primaryShareTitle ? (
            <Text style={styles.primaryShareTitle}>{primaryShareTitle}</Text>
          ) : null}
          <Text style={styles.primaryShareSubtitle}>{primaryShareSubtitle}</Text>
          {matchingRecordCount === 0 ? (
            <View style={styles.primaryEmptyState}>
              <Text style={styles.emptyStateTitle}>No matching data found</Text>
              <Text style={styles.emptyStateBody}>
                This device does not have data that matches this request.
              </Text>
            </View>
          ) : (
            <>
              {!isCollection && primaryRecord ? (
                <View style={styles.primaryDetailSection}>
                  <View style={styles.primaryFieldList}>
                    {primaryRecord.fields.map((field) => (
                      <View
                        key={`${primaryRecord.id}-${field.key}`}
                        style={styles.primaryFieldRow}
                      >
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={18}
                          color={Colors.verusGreenColor}
                        />
                        <View style={styles.primaryFieldTextBlock}>
                          {field.value && field.value !== field.label ? (
                            <>
                              <Text style={styles.primaryFieldLabelText}>{field.label}</Text>
                              <Text style={styles.primaryFieldValueText}>{field.value}</Text>
                            </>
                          ) : (
                            <Text style={styles.primaryFieldValueText}>{field.label}</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.primaryShareList}>
                  {previewRecords.map((record, index) => (
                    <RecordPreviewCard
                      key={record.id || `${record.name}-${index}`}
                      record={record}
                      showBorder={index > 0}
                    />
                  ))}
                </View>
              )}
              <Text style={styles.primaryShareHelper}>{shareModeHelper}</Text>
            </>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.ctaCol}>
          <Button
            mode="contained"
            onPress={() => cancel()}
            style={styles.secondaryCta}
            contentStyle={styles.secondaryCtaContent}
            uppercase={false}
            buttonColor="#EBF6FF"
            textColor={Colors.genericRequestPrimaryButtonColor}
            labelStyle={styles.secondaryCtaLabel}
          >
            Cancel
          </Button>
        </View>
        <View style={styles.ctaCol}>
          <GradientButton
            onPress={() => handleContinue()}
            style={styles.primaryCta}
            disabled={continueDisabled}
            buttonColor={Colors.genericRequestPrimaryButtonColor}
          >
            {primaryActionLabel}
          </GradientButton>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    marginTop: 8,
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: -0.2,
    color: '#1A1A1A',
  },
  requesterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  requesterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requesterIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requesterTextContainer: {
    flex: 1,
  },
  requesterLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  requesterName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  requesterAddress: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  requesterDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  metaChipText: {
    fontSize: 11,
    color: '#5B6F82',
    fontWeight: '600',
  },
  primaryShareCard: {
    backgroundColor: '#F8FBFD',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D7E7F2',
  },
  primaryShareEyebrow: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#5B6F82',
  },
  primaryShareTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#183247',
    marginTop: 8,
  },
  primaryShareSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#36566C',
    marginTop: 8,
  },
  primaryShareHelper: {
    fontSize: 13,
    color: '#4A6477',
    lineHeight: 19,
    marginTop: 16,
  },
  primaryShareList: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7E7F2',
    overflow: 'hidden',
  },
  primaryDetailSection: {
    marginTop: 16,
  },
  primaryFieldList: {
    gap: 10,
  },
  primaryFieldRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D7E7F2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryFieldTextBlock: {
    flex: 1,
    gap: 2,
  },
  primaryFieldLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B6F82',
  },
  primaryFieldValueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#183247',
    flex: 1,
  },
  primaryEmptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7E7F2',
    padding: 18,
    marginTop: 16,
  },
  detailRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#183247',
    marginBottom: 6,
  },
  emptyStateBody: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4A6477',
  },
  recordCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  recordName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  recordFieldList: {
    gap: 8,
  },
  recordFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordFieldTextBlock: {
    flex: 1,
    gap: 2,
  },
  recordFieldLabelText: {
    fontSize: 11,
    color: '#6C7A86',
    fontWeight: '600',
  },
  recordFieldValueText: {
    fontSize: 13,
    color: '#334A5C',
    fontWeight: '600',
    flex: 1,
  },
  noFieldsText: {
    fontSize: 12,
    color: '#8C8C8C',
  },
  bottomSpacer: {
    height: 24,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  ctaCol: {
    flex: 1,
    minWidth: 0,
  },
  secondaryCta: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EBF6FF',
    borderWidth: 0,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  secondaryCtaContent: {
    height: 44,
  },
  secondaryCtaLabel: {
    color: Colors.genericRequestPrimaryButtonColor,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0,
    textTransform: 'none',
  },
  primaryCta: {
    width: '100%',
    alignSelf: 'stretch',
    height: 44,
    borderRadius: 22,
  },
});

export default UserDataRequestInfo;
