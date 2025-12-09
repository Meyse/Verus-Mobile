// Wizard recipient step: capture destination and run native preflight (no legacy modal)
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Text, Button, TextInput as PaperInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useWizardState } from './state/WizardStateContext';
import Colors from '../../globals/colors';
import { useObjectSelector } from '../../hooks/useObjectSelector';
import SelfAddressSheet from './components/SelfAddressSheet';
import { wizardPreflight } from './utils/wizardPreflight';

const SendRecipient = () => {
  const navigation = useNavigation();
  const { wizardState, updateWizardState } = useWizardState();
  const { sourceCoin, sourceSubWallet, destNetwork, recipient, memo } = wizardState;

  const [address, setAddress] = useState(recipient || '');
  const [memoText, setMemoText] = useState(memo || '');
  const [selfSheetVisible, setSelfSheetVisible] = useState(false);
  const [selfAddresses, setSelfAddresses] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const activeAccount = useObjectSelector((state) => state.authentication.activeAccount);

  // Update wizard state on change
  useEffect(() => {
    updateWizardState({ recipient: address, memo: memoText });
  }, [address, memoText, updateWizardState]);

  // Collect addresses based on destination network
  const handleSendToMyself = useCallback(() => {
    const addrs = [];
    const seenAddresses = new Set();

    // Determine if destination is Ethereum
    const isEthDest = destNetwork === 'ETH' || destNetwork === '.eth' || destNetwork === 'vETH' || destNetwork === 'Ethereum';

    // Addresses are stored in activeAccount.keys[coinId][channel].addresses
    const keys = activeAccount?.keys || {};
    
    for (const coinId of Object.keys(keys)) {
      const coinKeys = keys[coinId];
      if (!coinKeys) continue;
      
      if (isEthDest) {
        // For Ethereum destinations, show ETH/ERC20 addresses (0x...)
        const ethAddrs = coinKeys.eth?.addresses || coinKeys.erc20?.addresses || [];
        for (const addr of ethAddrs) {
          if (addr && !seenAddresses.has(addr) && addr.startsWith('0x')) {
            addrs.push({
              label: addr.substring(0, 8) + '...' + addr.substring(addr.length - 6),
              address: addr,
              coinTicker: 'ETH',
              networkId: destNetwork
            });
            seenAddresses.add(addr);
          }
        }
      } else {
        // For Verus/PBaaS destinations, show VRPC R-addresses and i-addresses
        if (coinKeys.vrpc?.addresses) {
          for (const addr of coinKeys.vrpc.addresses) {
            if (addr && !seenAddresses.has(addr) && (addr.startsWith('R') || addr.startsWith('i'))) {
              addrs.push({
                label: addr.substring(0, 8) + '...' + addr.substring(addr.length - 6),
                address: addr,
                coinTicker: coinId,
                networkId: destNetwork
              });
              seenAddresses.add(addr);
            }
          }
        }
      }
    }

    setSelfAddresses(addrs);
    setSelfSheetVisible(true);
  }, [activeAccount, destNetwork]);

  const handleScan = () => {
    // TODO: Integrate QR Scanner
    // For now, placeholder or maybe navigate to existing scanner if possible
    console.log("Scan QR requested");
  };

  const handleSubmit = async () => {
    if (!address) return;
    setSubmitting(true);

    try {
      const res = await wizardPreflight(
        { ...wizardState, recipient: address, memo: memoText },
        activeAccount
      );

      updateWizardState({ preflightResult: res, recipient: address, memo: memoText });

      if (res.err) {
        throw new Error(res.result);
      }

      navigation.navigate('SendConfirm');
    } catch (e) {
      Alert.alert("Preflight failed", e.message || "Unable to prepare transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.mainTitle}>To who?</Text>
        </View>

        <View style={styles.inputGroup}>
          <PaperInput
            mode="outlined"
            label="Recipient Address"
            value={address}
            onChangeText={setAddress}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor={Colors.primaryColor}
            right={
              <PaperInput.Icon 
                icon="qrcode-scan" 
                color={Colors.primaryColor} 
                onPress={handleScan} 
              />
            }
          />
          
          <PaperInput
            mode="outlined"
            label="Memo (Optional)"
            value={memoText}
            onChangeText={setMemoText}
            style={styles.input}
            outlineColor="#E0E0E0"
            activeOutlineColor={Colors.primaryColor}
          />
        </View>

        <TouchableOpacity onPress={handleSendToMyself} style={styles.myselfButton}>
          <View style={styles.myselfIcon}>
            <Text style={{ color: Colors.primaryColor, fontWeight: 'bold' }}>Me</Text>
          </View>
          <Text style={styles.myselfText}>Send to myself</Text>
        </TouchableOpacity>

      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!address || submitting}
          style={styles.button}
          buttonColor={Colors.primaryColor}
          contentStyle={{ height: 48 }}
        >
          {submitting ? "Preparing..." : "Review & Send"}
        </Button>
      </View>

      <SelfAddressSheet
        visible={selfSheetVisible}
        addresses={selfAddresses}
        onClose={() => setSelfSheetVisible(false)}
        onSelect={(addr) => {
          setAddress(addr);
          setSelfSheetVisible(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'black',
  },
  inputGroup: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'white',
    marginBottom: 16,
  },
  myselfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F5', // Light gray
    alignSelf: 'flex-start',
  },
  myselfIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD', // Light blue
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  myselfText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  button: {
    borderRadius: 24,
  },
});

export default SendRecipient;
