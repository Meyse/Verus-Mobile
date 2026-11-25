/*
  2025-11-22: Removed the drawer/SideMenu wrapper so signed-in users land
  directly in MainStack with the new Settings bottom tab.
*/
import React, { useEffect } from 'react';
import MainStackScreens from '../MainStackScreens/MainStackScreens';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { setDeeplinkUrl } from '../../../actions/actionCreators';
import { closeOffRamp } from '../../../actions/actions/channels/valu/dispatchers/ValuWalletReduxManager';
import { VALU_SERVICE_ID } from '../../../utils/constants/services';
import { useNavigation } from '@react-navigation/native';
import { getHomeTabFor, navigateByPath } from '../../../utils/navigation/navigateByPath';

const SignedInStackScreens = props => {
  const deeplinkId = useSelector((state) => state.deeplink.id)
  const deeplinkUrl = useSelector((state) => state.deeplink.url)
  const parsingUrl = useSelector(state => state.deeplink.parsingUrl);
  const requestId = useSelector(state => state.deeplink.requestId);
  const store = useStore();
  const offRampRequest = useSelector((state) => state.channelStore_valu_service.offRampRequest)
  const openOffRamp = useSelector((state) => state.channelStore_valu_service.openOffRamp)
  const navigation = useNavigation();
  const dispatch = useDispatch()

  useEffect(() => {
    // A newer URL or close can arrive between this render and its effect.
    const current = store.getState().deeplink;
    if (deeplinkId != null && deeplinkUrl != null && !parsingUrl &&
        current.requestId === requestId && current.url === deeplinkUrl && !current.parsingUrl) {
      dispatch(setDeeplinkUrl(null))  
      // pop: React Navigation 7 pushes a second VerifyDeepLink without it; v6 went back.
      props.navigation.navigate('DeepLink', {screen: 'VerifyDeepLink', pop: true}, {pop: true});
    }
  }, [deeplinkId, deeplinkUrl, parsingUrl, requestId, store]);

  useEffect(() => {
    if (!!offRampRequest && openOffRamp) {
      closeOffRamp();
      new Promise(resolve => setTimeout(resolve, 3000))
        .then(() => {
          console.log(" props.navigation.navigate('Service',");
          // Service is in the Wallet and Services tab stacks, below this navigator.
          navigateByPath(navigation, ['SignedInStack', 'Home', getHomeTabFor(navigation), 'Service'], {
            service: VALU_SERVICE_ID,
            subScreen: 'ValuOffRampReview'
          });
        });
    }
  }, [offRampRequest, openOffRamp]);

  return <MainStackScreens {...props} />;
};

export default SignedInStackScreens;