import React from 'react';
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
import {
  createRedesignedHeaderOptions,
  createSettingsHeaderOptions,
} from '../../../utils/navigation/header';
import {useAppTheme} from '../../../theme/app';
import AddressBook from '../../Services/AddressBook/AddressBook';
import SignedInVerusIdDetails from '../../Services/ServiceComponents/VerusIdService/SignedInVerusIdDetails';
import {
  GIFT_CARD_SERVICE_ID,
  VERUSID_SERVICE_ID,
} from '../../../utils/constants/services';

const ServicesStack = createStackNavigator();

const ServicesStackScreens = () => {
  const theme = useAppTheme();
  const addressBookHeaderOptions = createSettingsHeaderOptions(theme);

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
        options={{
          ...addressBookHeaderOptions,
          title: '',
          headerShadowVisible: false,
        }}
      />
      <ServicesStack.Screen
        name="Service"
        component={Service}
        options={({route}) => ({
          title: '',
          headerShown:
            route.params?.service === GIFT_CARD_SERVICE_ID
              ? false
              : !(
                  ENABLE_SIGNED_IN_REDESIGN &&
                  route.params?.service === VERUSID_SERVICE_ID
                ),
        })}
      />
      <ServicesStack.Screen
        name="VerusIdDetails"
        component={SignedInVerusIdDetails}
        options={{title: ''}}
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
          headerShown: false,
        }}
      />
      <ServicesStack.Screen
        name="GiftCardFund"
        component={GiftCardFund}
        options={{
          headerShown: false,
        }}
      />
    </ServicesStack.Navigator>
  );
};

export default ServicesStackScreens
