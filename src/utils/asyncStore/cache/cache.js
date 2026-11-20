export * from './electrumVersions'
export * from './blockHeaders'
export * from './ethTxReceipts'
export * from './vrpcResponseCache'
export * from './savedVrpcResponses'

import { 
  clearCachedVersions,
  initElectrumCache
 } from './electrumVersions'
import { 
  clearCachedHeaders,
  initHeaderCache
} from './blockHeaders'
import { 
  initEthTxReceiptCache,
  clearCachedEthTxReceipts
} from './ethTxReceipts'
import { 
  initVrpcResponseCache,
  clearCachedVrpcResponses
} from './vrpcResponseCache'
import {
  initSavedVrpcResponses,
  clearSavedVrpcResponses
} from './savedVrpcResponses'

export const initCache = () => {
  return Promise.all([
    initElectrumCache(),
    initHeaderCache(),
    initEthTxReceiptCache(),
    initVrpcResponseCache(),
    initSavedVrpcResponses()
  ]).catch((e) => {
    throw e;
  });
}

export const clearCache = () => {
  return Promise.all([
    clearCachedVersions(),
    clearCachedHeaders(),
    clearCachedEthTxReceipts(),
    clearCachedVrpcResponses(),
    clearSavedVrpcResponses()
  ]).catch((e) => {
    throw e;
  });
};
