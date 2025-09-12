import {createStackNavigator} from '@react-navigation/stack';
import React, {useState} from 'react';
import SeedIntro from './Forms/SeedIntro';
import SeedWords from './Forms/SeedWords';
import SetupWallet from '../SetupWallet/SetupWallet';
const CreateSeedStack = createStackNavigator();

export default function CreateSeedStackScreens({ navigation, newSeed, setNewSeed, onComplete, createProfile, testProfile }) {
  return (
    <CreateSeedStack.Navigator>
      <CreateSeedStack.Screen
        name="SeedIntro"
        options={{
          headerShown: false,
        }}>
        {() => (
          <SeedIntro
            navigation={navigation}
            setNewSeed={setNewSeed}
          />
        )}
      </CreateSeedStack.Screen>
      <CreateSeedStack.Screen
        name="SeedWords"
        options={{
          headerShown: false,
        }}>
        {() => (
          <SeedWords
            navigation={navigation}
            newSeed={newSeed}
            onComplete={onComplete}
          />
        )}
      </CreateSeedStack.Screen>
      <CreateSeedStack.Screen
        name="SetupWallet"
        options={{
          headerShown: false,
        }}
      >
        {() => (
          <SetupWallet
            navigation={navigation}
            createProfile={createProfile}
            seed={newSeed}
            testProfile={testProfile}
          />
        )}
      </CreateSeedStack.Screen>
    </CreateSeedStack.Navigator>
  );
}