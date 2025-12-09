import { estimateConversion } from "../../../utils/api/channels/vrpc/requests/estimateConversion";

const estimateCache = {};

/**
 * Estimates the conversion result for a given path.
 * 
 * @param {Object} params
 * @param {String} params.systemId - The system ID to query.
 * @param {String} params.currencyId - The source currency ID.
 * @param {String} params.converttoId - The destination currency ID.
 * @param {Number} params.amount - The source amount.
 * @param {String} params.viaId - Optional via currency ID.
 * @param {Boolean} params.preconvert - Whether it's a preconversion.
 * @param {String} params.pathId - Unique identifier for the path (for caching).
 * @returns {Promise<Object>} - { estimatedReceive, fees, slippageWarning }
 */
export const routeEstimator = async ({
  systemId,
  currencyId,
  converttoId,
  amount,
  viaId,
  preconvert,
  pathId,
  channelHint, // optional: helps skip unsupported estimators
}) => {
  const cacheKey = `${pathId}-${amount}`;
  
  if (estimateCache[cacheKey]) {
    return estimateCache[cacheKey];
  }

  try {
    // Estimator currently only supports VRPC conversion; bail early for others
    const isVrpcLike = systemId === 'VRSC' || systemId === 'VRSCTEST' || channelHint === 'vrpc';
    if (!isVrpcLike) {
      throw new Error("Estimation unavailable for this network/path");
    }

    const res = await estimateConversion(
      systemId,
      currencyId,
      converttoId,
      amount,
      viaId,
      preconvert
    );

    if (res.error) {
      throw new Error(res.error.message);
    }

    const result = {
      estimatedReceive: res.result.estimatedcurrencyout,
      fees: res.result.txfees, // This might need adjustment based on exact response structure
      slippageWarning: false, // Calculate based on price impact if possible
      rawResult: res.result
    };

    estimateCache[cacheKey] = result;
    return result;
  } catch (error) {
    console.error("Route estimation error:", error);
    throw error;
  }
};



