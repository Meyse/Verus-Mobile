import React from 'react';
import {TouchableOpacity} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { createStackNavigator } from "@react-navigation/stack";
import { defaultHeaderOptions } from '../../../utils/navigation/header';
import Services from '../../Services/Services'
import Service from '../../Services/Service/Service'
import WyreServiceAccountData from '../../Services/ServiceComponents/WyreService/WyreServiceAccount/WyreServiceAccountData/WyreServiceAccountData';
import WyreServiceAddPaymentMethod from '../../Services/ServiceComponents/WyreService/WyreServiceAccount/WyreServiceAddPaymentMethod/WyreServiceAddPaymentMethod';
import WyreServiceEditPaymentMethod from '../../Services/ServiceComponents/WyreService/WyreServiceAccount/WyreServiceEditPaymentMethod/WyreServiceEditPaymentMethod';
import GiftCardCreate from '../../Services/ServiceComponents/GiftCardService/GiftCardCreate/GiftCardCreate';
import GiftCardFund from '../../Services/ServiceComponents/GiftCardService/GiftCardFund/GiftCardFund';
import {ENABLE_SIGNED_IN_REDESIGN} from '../../../../env/index';
import {createRedesignedHeaderOptions} from '../../../utils/navigation/header';
import {useOnboardingTheme} from '../../../theme/onboarding';
import AddressBook from '../../Services/AddressBook/AddressBook';

const ServicesStack = createStackNavigator();

const ServicesStackScreens = props => {
  const theme = useOnboardingTheme();

  return (
    <ServicesStack.Navigator
      screenOptions={
        ENABLE_SIGNED_IN_REDESIGN
          ? createRedesignedHeaderOptions(theme)
          : defaultHeaderOptions
      }
    >
      <ServicesStack.Screen
        name="Services"
        component={Services}
        options={{
          title: "Services",
          headerShown: !ENABLE_SIGNED_IN_REDESIGN,
        }}
      />
      <ServicesStack.Screen
        name="AddressBook"
        component={AddressBook}
        options={({navigation}) => ({
          title: 'Address Book',
          headerLeft: ({tintColor}) => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Back to Services"
              style={{paddingHorizontal: 12, minHeight: 44, justifyContent: 'center'}}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={32}
                color={tintColor}
              />
            </TouchableOpacity>
          ),
        })}
      />
      <ServicesStack.Screen
        name="Service"
        component={Service}
      />
      <ServicesStack.Screen
        name="WyreServiceAccountData"
        component={WyreServiceAccountData}
      />
      <ServicesStack.Screen
        name="WyreServiceAddPaymentMethod"
        component={WyreServiceAddPaymentMethod}
        options={{
          title: "Connect",
        }}
      />
      <ServicesStack.Screen
        name="WyreServiceEditPaymentMethod"
        component={WyreServiceEditPaymentMethod}
        options={{
          title: "Edit Account",
        }}
      />
      <ServicesStack.Screen
        name="GiftCardCreate"
        component={GiftCardCreate}
        options={{
          title: "Create Gift Card",
        }}
      />
      <ServicesStack.Screen
        name="GiftCardFund"
        component={GiftCardFund}
        options={{
          title: "Fund Gift Card",
        }}
      />
    </ServicesStack.Navigator>
  );
};

export default ServicesStackScreens
