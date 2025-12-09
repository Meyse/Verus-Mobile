import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { WizardStateProvider } from './state/WizardStateContext';
import SendSource from './SendSource'; 
import SendDestination from './SendDestination';
import SendAmount from './SendAmount';
import SendRecipient from './SendRecipient';
import SendConfirm from './SendConfirm';

const Stack = createStackNavigator();

const SendWizardNavigator = () => {
  return (
    <WizardStateProvider>
      <Stack.Navigator
        initialRouteName="SendSource"
        screenOptions={{
          headerShown: true,
          headerBackTitle: 'Back',
          headerTintColor: 'black',
          headerStyle: {
            backgroundColor: 'white',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTitle: '',
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="SendSource" component={SendSource} />
        <Stack.Screen name="SendDestination" component={SendDestination} />
        <Stack.Screen name="SendAmount" component={SendAmount} />
        <Stack.Screen name="SendRecipient" component={SendRecipient} />
        <Stack.Screen name="SendConfirm" component={SendConfirm} />
      </Stack.Navigator>
    </WizardStateProvider>
  );
};

export default SendWizardNavigator;
