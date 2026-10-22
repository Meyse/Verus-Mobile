import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {setServiceLoading} from '../../../../actions/actionCreators';
import {modifyServiceStoredDataForUser} from '../../../../actions/actions/services/dispatchers/services';
import {requestServiceStoredData} from '../../../../utils/auth/authBox';
import {GIFT_CARD_SERVICE_ID} from '../../../../utils/constants/services';
import {normalizeGiftCardServiceData} from '../../../../utils/giftCard/giftCard';
import GiftCardServiceIntroSlider from './GiftCardServiceIntroSlider/GiftCardServiceIntroSlider';
import GiftCardServiceOverview, {
  GiftCardServiceOverviewLoadError,
  GiftCardServiceOverviewSkeleton,
} from './GiftCardServiceOverview/GiftCardServiceOverview';

const GiftCardService = props => {
  const dispatch = useDispatch();
  const loading = useSelector(state => state.services.loading[GIFT_CARD_SERVICE_ID]);
  const encryptedCards = useSelector(state => state.services.stored[GIFT_CARD_SERVICE_ID]);
  const activeAccount = useSelector(state => state.authentication.activeAccount);
  const [serviceData, setServiceData] = useState(null);
  // Only the first load shows an error; later reloads keep the old behavior.
  const [loadError, setLoadError] = useState(false);
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
      setLoadError(false);
      setServiceData(storedData);
    } catch (e) {
      console.warn(e.message);
      if (showLoading) setLoadError(true);
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
    async nextDataOrUpdater => {
      const savedData = await modifyServiceStoredDataForUser(
        currentData => {
          const normalizedCurrent = normalizeGiftCardServiceData(currentData);
          const nextData =
            typeof nextDataOrUpdater === 'function'
              ? nextDataOrUpdater(normalizedCurrent)
              : nextDataOrUpdater;

          return normalizeGiftCardServiceData(nextData);
        },
        GIFT_CARD_SERVICE_ID,
        activeAccount.accountHash,
      );

      setServiceData(savedData);
      return savedData;
    },
    [activeAccount],
  );

  const markIntroSeen = useCallback(async () => {
    await saveServiceData(currentData => ({
      ...currentData,
      introSeen: true,
    }));
  }, [saveServiceData]);

  const retryLoad = () => {
    setLoadError(false);
    setServiceData(null);
    loadCards({showLoading: true});
  };

  if (loadError) {
    return (
      <GiftCardServiceOverviewLoadError
        navigation={props.navigation}
        onRetry={retryLoad}
      />
    );
  }

  if (serviceData == null || (loading && !initialLoadCompleteRef.current)) {
    return <GiftCardServiceOverviewSkeleton navigation={props.navigation} />;
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
