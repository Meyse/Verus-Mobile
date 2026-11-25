import React, { useState } from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { defaultHeaderOptions } from '../../../utils/navigation/header';
import RevokeRecoverSlider from '../../RevokeRecover/RevokeRecoverSlider';
import ImportWalletStackScreens from '../../CreateWallet/Forms/ImportWallet/ImportWallet';
import RevokeRecoverIdentityForm from '../../RevokeRecover/RevokeRecoverIdentityForm';
import { CommonActions } from '@react-navigation/native';

const RevokeRecoverStack = createStackNavigator();

const RevokeRecoverStackScreens = props => {
  const [importedSeed, setImportedSeed] = useState(null);
  const [isRecovery, setIsRecovery] = useState(false);

  const exitRevokeRecover = () => props.navigation.dispatch(CommonActions.goBack())

  // React Navigation 7 does not search child navigators for a route name.
  // Navigate with the RevokeRecover stack navigation, which owns IdentityForm.
  const completeImport = (seed, stackNavigation) => {
    if (seed != null) setImportedSeed(seed);

    stackNavigation.navigate("IdentityForm");
  };

  return (
    <RevokeRecoverStack.Navigator
      screenOptions={defaultHeaderOptions}
    >
      <RevokeRecoverStack.Screen
        name="Slider"
        options={{
          headerShown: false,
        }}
      >
        {({navigation: stackNavigation}) => (
          <RevokeRecoverSlider
            navigation={stackNavigation}
            setIsRecovery={setIsRecovery}
          />
        )}
      </RevokeRecoverStack.Screen>

      <RevokeRecoverStack.Screen
        name="ImportWallet"
        options={{
          headerShown: false,
        }}>
        {({navigation: stackNavigation}) => (
          <ImportWalletStackScreens
            navigation={props.navigation}
            importedSeed={importedSeed}
            setImportedSeed={setImportedSeed}
            onComplete={seed => completeImport(seed, stackNavigation)}
            label={`Import ${isRecovery ? "Recovery" : "Revocation"} Seed or Key`}
          />
        )}
      </RevokeRecoverStack.Screen>

      <RevokeRecoverStack.Screen
        name="IdentityForm"
        options={{
          headerShown: false,
        }}
      >
        {() => (
          <RevokeRecoverIdentityForm
            navigation={props.navigation}
            isRecovery={isRecovery}
            importedSeed={importedSeed}
            exitRevokeRecover={exitRevokeRecover}
          />
        )}
      </RevokeRecoverStack.Screen>
    </RevokeRecoverStack.Navigator>
  );
};

export default RevokeRecoverStackScreens
