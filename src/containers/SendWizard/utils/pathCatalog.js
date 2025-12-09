// Normalize conversion path catalog for wizard: network grouping, route flags, display names
import { getConversionPaths } from "../../../utils/api/routers/getConversionPaths";
import { CoinDirectory } from "../../../utils/CoinData/CoinDirectory";
import { coinsList } from "../../../utils/CoinData/CoinsList";
import { IS_PBAAS_CHAIN } from "../../../utils/constants/currencies";

/**
 * Wraps getConversionPaths and normalizes output into a friendly format for the UI.
 * Groups paths by Network so we don't show duplicate network options for different routes.
 * 
 * @param {Object} coinObj - The source coin object.
 * @param {String} channel - The API channel to use (e.g., 'vrpc', 'wyre').
 * @param {Object} params - Additional params for getConversionPaths.
 * @returns {Promise<Object>} - Normalized path catalog.
 */
export const getPathCatalog = async (coinObj, channel, params) => {
  try {
    const rawPaths = await getConversionPaths(coinObj, channel, params);
    const catalog = {};

    for (const [destinationId, options] of Object.entries(rawPaths)) {
      if (!options || options.length === 0) continue;

      const destinationDef = options[0].destination;
      
      let displayName = destinationDef.fullyqualifiedname;
      let displayTicker = destinationDef.name;
      
      try {
        let localCoin = null;
        if (CoinDirectory.coinExistsInDirectory(destinationId)) {
          localCoin = CoinDirectory.getBasicCoinObj(destinationId);
        }

        if (localCoin) {
          displayName = localCoin.display_name;
          displayTicker = localCoin.display_ticker;
        }
      } catch (e) {
        // Ignore lookup errors
      }

      // Group options by Network ID
      const networkGroups = {};

      options.forEach(opt => {
        const { exportto, via, mapping, preconvert } = opt;
        
        // Derive destination network
        let networkId = exportto?.currencyid || destinationDef.systemid || coinObj.system_id || coinObj.id;
        let networkName = destinationDef.systemid === coinObj.system_id ? "Verus" : destinationDef.fullyqualifiedname || destinationDef.name;
        let description = null;
        let isExportToExternalChain = false;

        // Normalize common aliases
        if (networkId === ".eth") networkId = "ETH";

        // Handle exportto (cross-chain) - follow legacy pattern from Convert.js
        // If exportto currency is mapped to an external chain (like vETH → ETH), 
        // display the external chain name, not the bridge currency name
        if (exportto?.currencyid) {
          try {
            const exportNetworkObj = CoinDirectory.getBasicCoinObj(exportto.currencyid);
            
            // Check if the bridge/export currency is mapped to an external chain (e.g., vETH → ETH)
            // AND it's not a PBaaS chain (PBaaS chains stay as-is)
            if (exportNetworkObj.mapped_to && 
                !((exportNetworkObj.pbaas_options & IS_PBAAS_CHAIN) === IS_PBAAS_CHAIN)) {
              // Use the mapped chain's name (e.g., "Ethereum" instead of "vETH")
              const mappedObj = CoinDirectory.getBasicCoinObj(exportNetworkObj.mapped_to);
              networkName = mappedObj.display_name;
              networkId = mappedObj.id;
              isExportToExternalChain = true;
            } else {
              // Regular export to another Verus/PBaaS chain
              networkName = exportNetworkObj.display_name || exportto.fullyqualifiedname || exportto.name;
            }
          } catch (e) {
            // Fallback to exportto's own name if lookup fails
            networkName = exportto.fullyqualifiedname || exportto.name || networkName;
          }
        } else if (!exportto) {
          // No exportto - this is a local/same-chain transaction
          // Use CoinDirectory for nicer naming when possible
          try {
            if (networkId && CoinDirectory.coinExistsInDirectory(networkId)) {
              const sys = CoinDirectory.getBasicCoinObj(networkId);
              networkName = sys.display_name || networkName;
            }
          } catch(e) {}
        }

        // Explicit mapping flag (bridge) with no exportto often means Ethereum
        if (mapping && !exportto && networkId === coinObj.system_id) {
          networkId = "ETH";
          networkName = "Ethereum";
        }

        // Description hints
        if (exportto || isExportToExternalChain) {
          description = `Send to ${networkName}`;
        } else if (mapping) {
          description = "Bridge transfer";
        } else if (destinationDef.systemid && destinationDef.systemid !== coinObj.system_id) {
          description = `Send to ${networkName}`;
        }

        // Via label for per-path display
        if (via) {
          let viaName = via.name || via.fullyqualifiedname || "converter";
          try {
            if (CoinDirectory.coinExistsInDirectory(via.currencyid)) {
              const viaCoin = CoinDirectory.getBasicCoinObj(via.currencyid);
              viaName = viaCoin.display_name || viaName;
            }
          } catch(e) {}
          opt.viaName = viaName;
        }

        if (!networkGroups[networkId]) {
          networkGroups[networkId] = {
            networkName,
            networkId,
            description,
            paths: []
          };
        }

        networkGroups[networkId].paths.push({
          ...opt,
          networkName,
          networkId,
          routeType: exportto
            ? (opt.convertto ? "convert+export" : "export")
            : (opt.convertto ? "convert" : "direct"),
          isPreconvert: !!preconvert,
          isMapping: !!mapping,
          // Unique ID for this specific path
          pathId: `${destinationId}-${opt.via ? opt.via.currencyid : 'direct'}-${exportto ? exportto.currencyid : networkId}-${opt.price}`,
        });
      });

      // Convert groups to array
      const networks = Object.values(networkGroups);

      catalog[destinationId] = {
        currencyDef: destinationDef,
        displayName,
        displayTicker,
        networks // [{ networkName, networkId, paths: [...] }]
      };
    }

    return catalog;
  } catch (error) {
    console.error("Error getting path catalog:", error);
    throw error;
  }
};
