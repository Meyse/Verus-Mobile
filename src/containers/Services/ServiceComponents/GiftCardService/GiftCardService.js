import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ScrollView} from 'react-native';
import {ActivityIndicator} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {setServiceLoading} from '../../../../actions/actionCreators';
import {createAlert} from '../../../../actions/actions/alert/dispatchers/alert';
import {modifyServiceStoredDataForUser} from '../../../../actions/actions/services/dispatchers/services';
import {requestServiceStoredData} from '../../../../utils/auth/authBox';
import {GIFT_CARD_SERVICE_ID} from '../../../../utils/constants/services';
import {
  normalizeGiftCardServiceData,
} from '../../../../utils/giftCard/giftCard';
import {useAppTheme} from '../../../../theme/app';
import Styles from '../../../../styles';
import GiftCardServiceIntroSlider from './GiftCardServiceIntroSlider/GiftCardServiceIntroSlider';
import GiftCardServiceOverview from './GiftCardServiceOverview/GiftCardServiceOverview';

const GiftCardService = props => {
  const dispatch = useDispatch();
  const theme = useAppTheme();
  const loading = useSelector(state => state.services.loading[GIFT_CARD_SERVICE_ID]);
  const encryptedCards = useSelector(state => state.services.stored[GIFT_CARD_SERVICE_ID]);
  const activeAccount = useSelector(state => state.authentication.activeAccount);
  const [serviceData, setServiceData] = useState(null);
  const initialLoadCompleteRef = useRef(false);

  useEffect(() => {
    props.navigation.setOptions({title: 'Gift Cards'});
  }, [props.navigation]);

  const loadCards = useCallback(async ({showLoading = false} = {}) => {
    if (showLoading) {
      dispatch(setServiceLoading(true, GIFT_CARD_SERVICE_ID));
    }

    try {
      const storedData = normalizeGiftCardServiceData(
        await requestServiceStoredData(GIFT_CARD_SERVICE_ID),
      );
      setServiceData(storedData);
    } catch (e) {
      if (showLoading) {
        createAlert('Error Loading Gift Cards', e.message);
      } else {
        console.warn(e.message);
      }
      setServiceData(normalizeGiftCardServiceData({}));
    } finally {
      initialLoadCompleteRef.current = true;

      if (showLoading) {
        dispatch(setServiceLoading(false, GIFT_CARD_SERVICE_ID));
      }
    }
  }, [dispatch]);

  useEffect(() => {
    loadCards({showLoading: !initialLoadCompleteRef.current});
  }, [loadCards, encryptedCards]);

  const saveServiceData = useCallback(
    async nextData => {
      const normalizedData = normalizeGiftCardServiceData(nextData);

      setServiceData(normalizedData);
      await modifyServiceStoredDataForUser(
        normalizedData,
        GIFT_CARD_SERVICE_ID,
        activeAccount.accountHash,
      );
    },
    [activeAccount],
  );

  const markIntroSeen = useCallback(async () => {
    await saveServiceData({
      ...normalizeGiftCardServiceData(serviceData),
      introSeen: true,
    });
  }, [saveServiceData, serviceData]);

  if (serviceData == null || (loading && !initialLoadCompleteRef.current)) {
    return (
      <SafeAreaView
        style={[
          Styles.defaultRoot,
          {backgroundColor: theme.colors.background},
        ]}>
        <ScrollView
          contentContainerStyle={{
            ...Styles.centerContainer,
            flexGrow: 1,
          }}
          style={[
            Styles.fullWidth,
            {backgroundColor: theme.colors.background},
          ]}>
        <ActivityIndicator
          animating
          color={theme.colors.primary}
          size="large"
        />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const cardCount = Object.keys(serviceData.cards || {}).length;

  if (!serviceData.introSeen && cardCount === 0) {
    return (
      <GiftCardServiceIntroSlider
        onBack={() => props.navigation.goBack()}
        onDone={markIntroSeen}
      />
    );
  }

  return (
    <GiftCardServiceOverview
      navigation={props.navigation}
      serviceData={serviceData}
      saveServiceData={saveServiceData}
      reload={loadCards}
    />
  );
};

export default GiftCardService;
