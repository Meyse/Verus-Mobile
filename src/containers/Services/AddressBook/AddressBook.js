import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ScrollView, TouchableOpacity, View} from 'react-native';
import {Button, IconButton, Modal, Portal, Text, TextInput} from 'react-native-paper';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import CopyAction from '../../../components/CopyAction';
import SkeletonLoader, {SkeletonRow} from '../../../components/SkeletonLoader';
import signedInCopy from '../../../copy/signedIn';
import {createSignedInStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {
  loadAddressBook,
  saveAddressBook,
} from '../../../utils/addressBook/addressBook';
import {createAlert, resolveAlert} from '../../../actions/actions/alert/dispatchers/alert';

const EMPTY_RECORD = {
  id: '',
  label: '',
  address: '',
  asset: '',
  network: '',
  verusId: '',
};

const AddressBook = () => {
  const theme = useOnboardingTheme();
  const styles = createSignedInStyles(theme);
  const insets = useSafeAreaInsets();
  const accountHash = useSelector(
    state => state.authentication.activeAccount.accountHash,
  );
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecords(await loadAddressBook());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    const source = [...records].sort((a, b) => a.label.localeCompare(b.label));

    if (!query) return source;
    return source.filter(record =>
      [record.label, record.address, record.asset, record.network, record.verusId]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [records, search]);

  const persist = async nextRecords => {
    try {
      setRecords(await saveAddressBook(nextRecords, accountHash));
      setEditing(null);
    } catch (e) {
      createAlert('Unable to save address', e.message);
    }
  };

  const saveEditing = () => {
    const record = {
      ...editing,
      id:
        editing.id ||
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    };
    const nextRecords = records.some(item => item.id === record.id)
      ? records.map(item => (item.id === record.id ? record : item))
      : [...records, record];
    persist(nextRecords);
  };

  const removeRecord = async record => {
    const confirmed = await createAlert(
      'Remove address?',
      `Remove ${record.label} from your Address Book?`,
      [
        {text: 'Cancel', style: 'cancel', onPress: () => resolveAlert(false)},
        {text: 'Remove', style: 'destructive', onPress: () => resolveAlert(true)},
      ],
    );

    if (confirmed) persist(records.filter(item => item.id !== record.id));
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeScreen}>
      <Portal>
        <Modal
          visible={editing != null}
          onDismiss={() => setEditing(null)}
          contentContainerStyle={{
            backgroundColor: theme.colors.sheet,
            margin: theme.spacing.md,
            borderRadius: theme.rounded.xl,
            padding: theme.spacing.lg,
            maxHeight: '90%',
          }}>
          {editing && (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{paddingBottom: Math.max(insets.bottom, 12)}}>
              <Text style={theme.typography.titleSheet}>
                {editing.id ? 'Edit address' : 'Add address'}
              </Text>
              <TextInput
                mode="outlined"
                label="Label"
                value={editing.label}
                onChangeText={label => setEditing({...editing, label})}
                style={{marginTop: theme.spacing.lg}}
              />
              <TextInput
                mode="outlined"
                label="Address"
                value={editing.address}
                onChangeText={address => setEditing({...editing, address})}
                autoCapitalize="none"
                style={{marginTop: theme.spacing.md}}
              />
              <TextInput
                mode="outlined"
                label="Asset ticker (optional)"
                value={editing.asset}
                onChangeText={asset => setEditing({...editing, asset})}
                autoCapitalize="characters"
                style={{marginTop: theme.spacing.md}}
              />
              <TextInput
                mode="outlined"
                label="Network (optional)"
                value={editing.network}
                onChangeText={network => setEditing({...editing, network})}
                style={{marginTop: theme.spacing.md}}
              />
              <TextInput
                mode="outlined"
                label="VerusID (optional)"
                value={editing.verusId}
                onChangeText={verusId => setEditing({...editing, verusId})}
                autoCapitalize="none"
                style={{marginTop: theme.spacing.md}}
              />
              <View style={{flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.lg}}>
                <Button mode="outlined" style={{flex: 1}} onPress={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  style={{flex: 1}}
                  disabled={!editing.label.trim() || !editing.address.trim()}
                  onPress={saveEditing}>
                  Save
                </Button>
              </View>
            </ScrollView>
          )}
        </Modal>
      </Portal>
      <View style={{flex: 1, paddingHorizontal: theme.spacing.lg}}>
        <TextInput
          mode="outlined"
          placeholder="Search addresses"
          value={search}
          onChangeText={setSearch}
          left={<TextInput.Icon icon="magnify" />}
          style={{marginTop: theme.spacing.md}}
        />
        {loading ? (
          <SkeletonLoader accessibilityLabel="Loading Address Book">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </SkeletonLoader>
        ) : error ? (
          <View style={{paddingVertical: theme.spacing.xl, alignItems: 'center'}}>
            <Text style={styles.rowTitle}>Address Book unavailable</Text>
            <Text style={[styles.rowDescription, {textAlign: 'center'}]}>{error}</Text>
            <Button mode="outlined" onPress={refresh} style={{marginTop: theme.spacing.md}}>
              {signedInCopy.actions.retry}
            </Button>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{paddingVertical: theme.spacing.md}}>
            {filteredRecords.length === 0 ? (
              <View style={{paddingVertical: theme.spacing.xl, alignItems: 'center'}}>
                <Text style={styles.rowTitle}>No saved addresses</Text>
                <Text style={[styles.rowDescription, {textAlign: 'center'}]}>
                  Add a labeled address to reuse it in future transfers.
                </Text>
              </View>
            ) : (
              <View style={styles.surface}>
                {filteredRecords.map((record, index) => (
                  <React.Fragment key={record.id}>
                    <View style={styles.row}>
                      <View style={{flex: 1, minWidth: 0}}>
                        <Text style={styles.rowTitle}>{record.label}</Text>
                        <Text numberOfLines={1} style={styles.rowDescription}>
                          {[record.asset, record.network, record.verusId]
                            .filter(Boolean)
                            .join(' · ') || 'Any compatible transfer'}
                        </Text>
                        <Text numberOfLines={1} style={styles.rowDescription}>
                          {record.address}
                        </Text>
                      </View>
                      <CopyAction value={record.address} accessibilityLabel={`Copy ${record.label}`} />
                      <IconButton
                        icon="pencil-outline"
                        accessibilityLabel={`Edit ${record.label}`}
                        onPress={() => setEditing({...record})}
                      />
                      <IconButton
                        icon="delete-outline"
                        accessibilityLabel={`Remove ${record.label}`}
                        iconColor={theme.colors.danger}
                        onPress={() => removeRecord(record)}
                      />
                    </View>
                    {index < filteredRecords.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.sm,
          paddingBottom: Math.max(insets.bottom, 12),
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}>
        <Button
          mode="contained"
          icon="plus"
          contentStyle={{minHeight: 52}}
          onPress={() => setEditing({...EMPTY_RECORD})}>
          Add address
        </Button>
      </View>
    </SafeAreaView>
  );
};

export default AddressBook;
