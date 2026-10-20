import { getCoinPaprikaRate } from './ratesAPIs/coinPaprika';
import { getMempoolSpaceBTCFees } from './btcFeesAPIs/mempoolSpace';
import { getBlockchainComBTCFees } from'./btcFeesAPIs/blockchainCom';
import { getFiatExchangeRates } from './ratesAPIs/fiatExchangeRates'
import ApiException from '../../errors/apiError';
import { GENERAL } from '../../../constants/intervalConstants';
import { USD } from '../../../constants/currencies'
import { CONNECTION_ERROR } from '../../errors/errorMessages';
import { GENERAL_CONNECTION_ERROR } from '../../errors/errorCodes';
import BigNumber from 'bignumber.js';

export const getRecommendedBTCFees = async (testnet = false, maximum) => {
  const primary = await getMempoolSpaceBTCFees(maximum, testnet);
  if (primary) return primary;
  return await getBlockchainComBTCFees(maximum);
};

export const getCoinRates = (coinObj) => {
  // Functions that can get rates for different coins. Due to the nature of Promise.all, 
  // these should not reject, but instead resolve with an object that either has a
  // 'result' property, or an 'error' property.
  let rateFunctions = [getCoinPaprikaRate(coinObj)]
  let rateUsd = null
  let source = null

  return new Promise((resolve, reject) => {
    Promise.all(rateFunctions)
      .then(rates => {
        rates = rates.filter(rate => rate.error == null)

        if (rates.length > 0) {
          rateUsd = rates[0].result.rate
          source = rates[0].result.source
          
          return getFiatExchangeRates()
        } else
          reject(
            new ApiException(
              CONNECTION_ERROR,
              "No valid coin rates found",
              coinObj.id,
              GENERAL,
              GENERAL_CONNECTION_ERROR
            )
          );
      })
      .then(exchangeRates => {
        let resObj = { result: { [USD]: BigNumber(rateUsd) }, source }

        Object.keys(
          exchangeRates.result == null ? {} : exchangeRates.result
        ).map(fiatCurr => {
          resObj.result[fiatCurr] = BigNumber(exchangeRates.result[fiatCurr]).multipliedBy(rateUsd).toString();
        });

        resolve(resObj)
      })
      .catch(error => {
        reject(
          new ApiException(
            CONNECTION_ERROR,
            error.message || "Error connecting to rates APIs",
            coinObj.id,
            GENERAL,
            error.code || GENERAL_CONNECTION_ERROR
          )
        );
      });
  });
}