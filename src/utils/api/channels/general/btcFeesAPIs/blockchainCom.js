import axios from 'axios';
import {validateBTCFeeRates} from './feeRates';

export const getBlockchainComBTCFees = async maximum => {
  try {
    const response = await axios.get('https://api.blockchain.com/mempool/fees', {timeout: 10000});
    return validateBTCFeeRates({
      fastest: response.data.priority,
      average: response.data.regular,
      // This fallback publishes two tiers. Equal valid tiers stay equal.
      slowest: response.data.regular,
    }, maximum);
  } catch (_) {
    return false;
  }
};
