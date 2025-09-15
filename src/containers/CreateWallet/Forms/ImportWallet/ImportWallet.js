import {createStackNavigator} from '@react-navigation/stack';
import React, {useState} from 'react';
import ImportIntro from './Forms/ImportIntro';
import ImportSeed from './Forms/ImportSeed';
import SetupWallet from '../SetupWallet/SetupWallet';
import ImportText from './Forms/ImportText';
const ImportWalletStack = createStackNavigator();

export default function ImportWalletStackScreens({
  navigation,
  importedSeed,
  setImportedSeed,
  onComplete,
  label,
  createProfile,
  testProfile
}) {
  return (
    <ImportWalletStack.Navigator>
      <ImportWalletStack.Screen
        name="ImportIntro"
        options={{
          headerShown: false,
        }}>
        {() => (
          <ImportIntro
            navigation={navigation}
            importedSeed={importedSeed}
            setImportedSeed={setImportedSeed}
            label={label}
          />
        )}
      </ImportWalletStack.Screen>
      <ImportWalletStack.Screen
        name="ImportText"
        options={{
          headerShown: false,
        }}>
        {() => (
          <ImportText
            navigation={navigation}
            importedSeed={importedSeed}
            setImportedSeed={setImportedSeed}
            onComplete={() => navigation.navigate('SetupWallet')}
          />
        )}
      </ImportWalletStack.Screen>
      <ImportWalletStack.Screen
        name="ScanQr"
        options={{
          headerShown: false,
        }}>
        {() => (
          <ImportText
            navigation={navigation}
            importedSeed={importedSeed}
            setImportedSeed={setImportedSeed}
            onComplete={() => navigation.navigate('SetupWallet')}
            qr={true}
          />
        )}
      </ImportWalletStack.Screen>
      <ImportWalletStack.Screen
        name="ImportSeed"
        options={{
          headerShown: false,
        }}>
        {() => (
          <ImportSeed
            navigation={navigation}
            importedSeed={importedSeed}
            setImportedSeed={setImportedSeed}
            onComplete={() => navigation.navigate('SetupWallet')}
          />
        )}
      </ImportWalletStack.Screen>

      <ImportWalletStack.Screen
        name="SetupWallet"
        options={{
          headerShown: false,
        }}
      >
        {() => (
          // Reuse the inline setup UI; pass the imported seed and flags
          <SetupWallet
            navigation={navigation}
            createProfile={createProfile}
            seed={importedSeed}
            testProfile={testProfile}
          />
        )}
      </ImportWalletStack.Screen>
    </ImportWalletStack.Navigator>
  );
}
