import { useEffect, useMemo, useRef, useState } from "react";
import BigNumber from "bignumber.js";
import { Alert, Animated, Dimensions } from "react-native";
import { createAlert } from "../../../actions/actions/alert/dispatchers/alert";
import { API_GET_ADDRESSES, API_SEND, DLIGHT_PRIVATE, ERC20, ETH, VRPC } from "../../../utils/constants/intervalConstants";
import {
  SEND_MODAL_INVOICE_CONTEXT,
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_CONTINUE_IMMEDIATELY,
  SEND_MODAL_CONVERTTO_FIELD,
  SEND_MODAL_DISABLED_INPUTS,
  SEND_MODAL_EXPORTTO_FIELD,
  SEND_MODAL_IS_PRECONVERT,
  SEND_MODAL_IS_BURN_CHANGE_PRICE,
  SEND_MODAL_MAPPING_FIELD,
  SEND_MODAL_PRICE_ESTIMATE,
  SEND_MODAL_SHOW_CONVERTTO_FIELD,
  SEND_MODAL_SHOW_EXPORTTO_FIELD,
  SEND_MODAL_SHOW_MAPPING_FIELD,
  SEND_MODAL_SHOW_VIA_FIELD,
  SEND_MODAL_STRICT_AMOUNT,
  SEND_MODAL_TO_ADDRESS_FIELD,
  SEND_MODAL_VDXF_TAG,
  SEND_MODAL_VIA_FIELD,
} from '../../../utils/constants/sendModal';
import { coinsToSats, isNumber, satsToCoins } from "../../../utils/math";
import { getConversionPaths } from "../../../utils/api/routers/getConversionPaths";
import { getCurrency } from "../../../utils/api/channels/verusid/callCreators";
import { DEST_ETH, DEST_ID, DEST_PKH, TransferDestination, fromBase58Check, toIAddress, toLowerCaseCLocale } from "verus-typescript-primitives";
import { CoinDirectory } from "../../../utils/CoinData/CoinDirectory";
import { ethers } from "ethers";
import { getAddressBalances } from "../../../utils/api/routers/getAddressBalance";
import { coinsList } from "../../../utils/CoinData/CoinsList";
import { ETH_CONTRACT_ADDRESS, VETH } from "../../../utils/constants/web3Constants";
import { preflightConvertOrCrossChain } from "../../../utils/api/routers/preflightConvertOrCrossChain";
import { getIdentity } from "../../../utils/api/routers/getIdentity";
import { addressIsBlocked } from "../../../utils/addressBlocklist";
import { selectAddressBlocklist } from "../../../selectors/settings";
import { I_ADDRESS_VERSION, R_ADDRESS_VERSION } from "../../../utils/constants/constants";
import { getWeb3ProviderForNetwork } from "../../../utils/web3/provider";
import { useObjectSelector } from "../../../hooks/useObjectSelector";
import {showFundRawTransactionErrorAlert} from '../../../utils/vrpc/fundRawTransactionError';

// A problem the user can fix on the form. Inline mode shows it on the screen.
const fieldError = (field, title, message) => {
  const error = new Error(message);
  error.formField = field;
  error.formTitle = title;
  return error;
};

// The logic of the manual conversion and cross-chain form (upstream's
// ConvertOrCrossChainSendForm): fields, suggestions, checks and the preflight.
// It was moved out of that screen unchanged so that the old send modal and
// the wizard's Advanced form (PR 266 pick ADV) build the same transaction.
//
// `sendModal` is {coinObj, subWallet, data}. `updateSendFormData(key, value)`
// writes one field. `onPrepared({preflight, balances})` receives the prepared
// transaction. `inlineMessages` shows errors on the screen instead of alerts:
// invoices always do; the wizard passes it too, and then the three notes
// after the preflight are left to its Confirm step.
const useConvertOrCrossChainForm = ({
  sendModal,
  updateSendFormData,
  setLoading,
  setModalHeight,
  onPrepared,
  inlineMessages: inlineMessagesOption = false,
}) => {
  const { height } = Dimensions.get('window');
  const isBurnChangePrice =
    sendModal.data[SEND_MODAL_IS_BURN_CHANGE_PRICE] === true;
  const isInvoice = !!sendModal.data[SEND_MODAL_INVOICE_CONTEXT];
  const inlineMessages = isInvoice || inlineMessagesOption;
  // The old non-invoice form alerts the notes after the preflight.
  const legacyAlerts = !inlineMessages;
  const lockedInputs = sendModal.data[SEND_MODAL_DISABLED_INPUTS] || {};
  // A locked field shows as a row, so its error goes above the action.
  const amountErrorField = lockedInputs[SEND_MODAL_AMOUNT_FIELD] ? 'form' : 'amount';
  const destinationErrorField = lockedInputs[SEND_MODAL_TO_ADDRESS_FIELD] ? 'form' : 'destination';
  const [balanceError, setBalanceError] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const showFormError = (field, title, message) => {
    if (inlineMessages) setFormErrors({[field]: message});
    // The old non-invoice form has no inline error state.
    else createAlert(title, message);
  };
  const allSubWallets = useObjectSelector(state => state.coinMenus.allSubWallets);
  const activeUser = useObjectSelector(state => state.authentication.activeAccount);
  const activeAccount = useObjectSelector(state => state.authentication.activeAccount);
  const addressBlocklist = useObjectSelector(selectAddressBlocklist);
  const networkName = useMemo(() => {
    try {
      const subwallet = sendModal.subWallet;

      return subwallet.network ? CoinDirectory.getBasicCoinObj(subwallet.network).display_ticker : null;
    } catch(e) {
      console.error(e);
      return null;
    }
  }, [sendModal.subWallet]);
  
  const FIELD_TITLES = {
    [SEND_MODAL_EXPORTTO_FIELD]: "Destination network",
    [SEND_MODAL_VIA_FIELD]: "Convert via",
    [SEND_MODAL_CONVERTTO_FIELD]: sendModal.data[SEND_MODAL_IS_PRECONVERT] ? "Preconvert to" : "Convert to",
    [SEND_MODAL_MAPPING_FIELD]: "Receive as",
    [SEND_MODAL_TO_ADDRESS_FIELD]: "Recipient address"
  }

  const CONVERSION_PATH_FIELDS = [
    SEND_MODAL_EXPORTTO_FIELD, 
    SEND_MODAL_VIA_FIELD, 
    SEND_MODAL_CONVERTTO_FIELD, 
    SEND_MODAL_MAPPING_FIELD
  ];

  const [searchMode, setSearchMode] = useState(false);
  const [selectedField, setSelectedField] = useState("");

  const [processedAmount, setProcessedAmount] = useState(null);

  const [localNetworkName, setLocalNetworkName] = useState(null);

  const [localBalances, setLocalBalances] = useState(null);

  const [suggestions, setSuggestions] = useState([]);
  // A failed path lookup, shown on the page where the page has no alerts.
  const [suggestionError, setSuggestionError] = useState(null);
  const [suggestionBase, setSuggestionBase] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [conversionPaths, setConversionPaths] = useState(null);

  const [isConversion, setIsConversion] = useState(
   !!(sendModal.data[SEND_MODAL_CONVERTTO_FIELD] != null &&
      sendModal.data[SEND_MODAL_CONVERTTO_FIELD].length > 0)
  );
  const [isVia, setIsVia] = useState(
    !!(sendModal.data[SEND_MODAL_VIA_FIELD] != null &&
      sendModal.data[SEND_MODAL_VIA_FIELD].length > 0)
  );
  const [isExport, setIsExport] = useState(
    !!(sendModal.data[SEND_MODAL_EXPORTTO_FIELD] != null &&
      sendModal.data[SEND_MODAL_EXPORTTO_FIELD].length > 0)
  );
  const [isMapping, setIsMapping] = useState(
    !!(sendModal.data[SEND_MODAL_MAPPING_FIELD] != null &&
      sendModal.data[SEND_MODAL_MAPPING_FIELD].length > 0)
  );

  const [showConversionField, setShowConversionField] = useState(
    sendModal.data[SEND_MODAL_SHOW_CONVERTTO_FIELD] || 
    isConversion
  )

  const [showViaField, setShowViaField] = useState(
    sendModal.data[SEND_MODAL_SHOW_VIA_FIELD] || 
    isVia
  )

  const [showExportField, setShowExportField] = useState(
    sendModal.data[SEND_MODAL_SHOW_EXPORTTO_FIELD] || 
    isExport
  )

  const [showMappingField, setShowMappingField] = useState(
    sendModal.data[SEND_MODAL_MAPPING_FIELD] || 
    isMapping
  )

  const fadeSearchMode = useRef(new Animated.Value(0)).current;
  const fadeNormalForm = useRef(new Animated.Value(1)).current;

  const enterSearchMode = () => {
    Animated.timing(fadeNormalForm, {
      toValue: 0, // Final value
      duration: 200, // Length of animation
      useNativeDriver: true
    }).start();

    setTimeout(() => {
      setSearchMode(true);
      Animated.timing(fadeSearchMode, {
        toValue: 1, // Final value
        duration: 200, // Length of animation
        useNativeDriver: true
      }).start();
    }, 200)
  };
  
  const leaveSearchMode = () => {
    Animated.timing(fadeSearchMode, {
      toValue: 0, // Final value
      duration: 200, // Length of animation
      useNativeDriver: true
    }).start();

    setTimeout(() => {
      setSearchMode(false);
      setSuggestions([]);
      Animated.timing(fadeNormalForm, {
        toValue: 1, // Final value
        duration: 200, // Length of animation
        useNativeDriver: true
      }).start();
    }, 200)
  };

  const fetchSuggestions = (text = "", base = suggestionBase) => {    
    if (text.length == 0) return base;
    else return base.filter(x => {
      for (const keyword of x.keywords) {
        const keywordLc = toLowerCaseCLocale(keyword);
        const textLc = toLowerCaseCLocale(text.trim());

        if (keywordLc.includes(textLc) || textLc.includes(keywordLc)) {
          return true;
        }
      }

      return false;
    })
  }

  const getFieldPlaceholder = (field) => {
    const FIELD_PLACEHOLDERS = {
      [SEND_MODAL_CONVERTTO_FIELD]: `Could not find any currencies to convert to from ${
        sendModal.coinObj.display_ticker
      }, enter a currency manually or leave this field blank.`,
      [SEND_MODAL_VIA_FIELD]: isConversion ? (`Could not find any currencies to convert via when converting from ${
        sendModal.coinObj.display_ticker
      } to ${
        sendModal.data[SEND_MODAL_CONVERTTO_FIELD]
      }. Try entering a currency manually or leave blank to convert directly.`) 
      : 
      (`Could not find any currencies to convert via when converting from ${
        sendModal.coinObj.display_ticker
      }.`),
      [SEND_MODAL_EXPORTTO_FIELD]: `Could not find any networks to send ${
        sendModal.coinObj.display_ticker
      } to, enter a network manually or leave this field blank.`
    }

    if (FIELD_PLACEHOLDERS[field]) return FIELD_PLACEHOLDERS[field]
    else return ""
  }

  const processConverttoSuggestionPaths = async (flatPaths, coinObj) => {
    switch (coinObj.proto) {
      case 'vrsc':        
        return flatPaths.filter(x => {
          if (sendModal.data[SEND_MODAL_IS_PRECONVERT]) {
            return !x.mapping && x.prelaunch
          } else return !x.mapping && !x.prelaunch
        }).map((path, index) => {
          return {
            title: path.destination.fullyqualifiedname,
            logoid: path.destination.currencyid,
            key: index.toString(),
            description: path.via
              ? `${
                  path.exportto
                    ? path.gateway
                      ? `off-system to ${path.exportto.fullyqualifiedname} network `
                      : `off-chain to ${path.exportto.fullyqualifiedname} network `
                    : ''
                }via ${path.via.fullyqualifiedname}`
              : path.exportto
              ? path.gateway && path.exportto
                ? `off-system to ${path.exportto.fullyqualifiedname} network`
                : `off-chain to ${path.exportto.fullyqualifiedname} network`
              : 'direct',
            values: {
              [SEND_MODAL_VIA_FIELD]: path.via ? path.via.fullyqualifiedname : '',
              [SEND_MODAL_CONVERTTO_FIELD]: path.destination.fullyqualifiedname,
              [SEND_MODAL_EXPORTTO_FIELD]: path.exportto
                ? path.exportto.fullyqualifiedname
                : '',
              [SEND_MODAL_PRICE_ESTIMATE]: { price: path.price, name: path.destination.fullyqualifiedname }
            },
            right: `${Number(BigNumber(1).dividedBy(BigNumber(path.price)).toFixed(8))}`,
            keywords: [path.destination.currencyid, path.destination.fullyqualifiedname]
          };
        });
      case 'eth':
      case 'erc20':
        return flatPaths.filter(x => {
          return !x.mapping
        }).map((path, index) => {
          const addr = path.ethdest ? path.destination.address : null;
          
          const name = path.ethdest
            ? path.destination.address === ETH_CONTRACT_ADDRESS ? path.destination.name : `${path.destination.name} (${
                addr.substring(0, 8) + '...' + addr.substring(addr.length - 8)
              })`
            : path.destination.fullyqualifiedname;

          return {
            title: name,
            logoid: path.ethdest ? path.destination.address : path.destination.currencyid,
            logoproto: path.ethdest ? "erc20" : null,
            key: index.toString(),
            description: path.via
              ? `${
                  path.exportto
                    ? path.gateway
                      ? `off-system to ${path.exportto.fullyqualifiedname} network `
                      : `off-chain to ${path.exportto.fullyqualifiedname} network `
                    : ''
                }via ${path.via.fullyqualifiedname}`
              : path.exportto
              ? path.gateway && path.exportto
                ? `off-system to ${path.exportto.fullyqualifiedname} network`
                : `off-chain to ${path.exportto.fullyqualifiedname} network`
              : 'direct',
            values: {
              [SEND_MODAL_VIA_FIELD]: path.via ? path.via.fullyqualifiedname : '',
              [SEND_MODAL_CONVERTTO_FIELD]: path.ethdest ? path.destination.mapto.fullyqualifiedname : path.destination.fullyqualifiedname,
              [SEND_MODAL_EXPORTTO_FIELD]: path.exportto
                ? path.exportto.fullyqualifiedname
                : '',
              [SEND_MODAL_PRICE_ESTIMATE]: { price: path.price, name: name }
            },
            right: `${Number(BigNumber(1).dividedBy(BigNumber(path.price)).toFixed(8))}`,
            keywords: path.ethdest
              ? [path.destination.address, path.destination.symbol, path.destination.name]
              : [path.destination.currencyid, path.destination.fullyqualifiedname]
          };
        });
      default:
        return []
    }
  }

  const processViaSuggestionPaths = async (flatPaths, coinObj) => {
    switch (coinObj.proto) {
      case 'vrsc':
        return flatPaths.filter(x => {
          if (isConversion) {
            const destinationCurrency = sendModal.data[SEND_MODAL_CONVERTTO_FIELD];
            return (
              x.via != null &&
              (x.destination.currencyid === destinationCurrency ||
                toLowerCaseCLocale(destinationCurrency) === toLowerCaseCLocale(x.destination.fullyqualifiedname))
            );
          } else return x.via != null;
        }).map((path, index) => {
          return {
            title: path.via.fullyqualifiedname,
            logoid: path.via.currencyid,
            key: index.toString(),
            description: `${
                  path.exportto
                    ? path.gateway
                      ? `off-system to ${path.exportto.fullyqualifiedname} network `
                      : `off-chain to ${path.exportto.fullyqualifiedname} network `
                    : ''
                }to ${path.destination.fullyqualifiedname}`,
            values: {
              [SEND_MODAL_VIA_FIELD]: path.via.fullyqualifiedname,
              [SEND_MODAL_CONVERTTO_FIELD]: path.destination.fullyqualifiedname,
              [SEND_MODAL_EXPORTTO_FIELD]: path.exportto
                ? path.exportto.fullyqualifiedname
                : '',
              [SEND_MODAL_PRICE_ESTIMATE]: { price: path.price, name: path.destination.fullyqualifiedname }
            },
            right: `${Number(BigNumber(1).dividedBy(BigNumber(path.price)).toFixed(8))}`,
            keywords: [path.via.currencyid, path.via.fullyqualifiedname]
          };
        })
      case 'eth':
      case 'erc20':
        return flatPaths.filter(x => {
          if (isConversion) {
            const destinationCurrency = sendModal.data[SEND_MODAL_CONVERTTO_FIELD];
            const destinationCurrencyMatch = !x.ethdest && (x.destination.currencyid === destinationCurrency ||
              toLowerCaseCLocale(destinationCurrency) === toLowerCaseCLocale(x.destination.fullyqualifiedname))
            const destinationTokenMatch = x.ethdest && (x.destination.address === destinationCurrency ||
              toLowerCaseCLocale(destinationCurrency) === toLowerCaseCLocale(x.destination.address))
            
            return (
              x.via != null &&
              (destinationCurrencyMatch || destinationTokenMatch)
            );
          } else return x.via != null;
        }).map((path, index) => {
          const priceFixed = Number(path.price.toFixed(2))
          const destname = path.ethdest
            ? path.destination.address === ETH_CONTRACT_ADDRESS ? path.destination.name : `${path.destination.name} (${
                path.destination.address.substring(0, 8) + '...' + path.destination.address.substring(path.destination.address.length - 8)
              })`
            : path.destination.fullyqualifiedname;
    
          return {
            title: path.via.fullyqualifiedname,
            logoid: path.via.currencyid,
            key: index.toString(),
            description: `${
                  path.exportto
                    ? path.gateway
                      ? `off-system to ${path.exportto.fullyqualifiedname} network `
                      : `off-chain to ${path.exportto.fullyqualifiedname} network `
                    : ''
                }to ${destname}`,
            values: {
              [SEND_MODAL_VIA_FIELD]: path.via.fullyqualifiedname,
              [SEND_MODAL_CONVERTTO_FIELD]: path.ethdest ? path.destination.mapto.fullyqualifiedname : path.destination.fullyqualifiedname,
              [SEND_MODAL_EXPORTTO_FIELD]: path.exportto
                ? path.exportto.fullyqualifiedname
                : '',
              [SEND_MODAL_PRICE_ESTIMATE]: { price: path.price, name: destname }
            },
            right: `${Number(BigNumber(1).dividedBy(BigNumber(path.price)).toFixed(8))}`,
            keywords: [path.via.currencyid, path.via.fullyqualifiedname]
          };
        })
      default:
        return []
    }
  }

  const processExporttoSuggestionPaths = async (flatPaths, coinObj) => {
    switch (coinObj.proto) {
      case 'vrsc':
        const seenSystems = {}
        return flatPaths.filter(x => {
          if (x.exportto == null) return false;

          if (sendModal.data[SEND_MODAL_IS_PRECONVERT]) {
            if (
              !x.prelaunch || (!x.mapping && flatPaths.find(
                y =>
                  y.mapping &&
                  y.exportto != null &&
                  y.exportto.currencyid === x.exportto.currencyid,
              ) != null)
            )
              return false;
          } else {
            if (
              x.prelaunch || (!x.mapping && flatPaths.find(
                y =>
                  y.mapping &&
                  y.exportto != null &&
                  y.exportto.currencyid === x.exportto.currencyid,
              ) != null)
            )
              return false;
          }

          const seen = seenSystems[x.exportto.currencyid] != null;

          if (!seen) {
            seenSystems[x.exportto.currencyid] = true;
            return true
          } else return false;
        }).map((path, index) => {

          return {
            title: path.exportto.fullyqualifiedname,
            logoid: path.exportto.currencyid,
            key: index.toString(),
            description: path.exportto.currencyid,
            values: {
              [SEND_MODAL_EXPORTTO_FIELD]: path.exportto.fullyqualifiedname,
              [SEND_MODAL_MAPPING_FIELD]: path.mapping ? path.destination.symbol : coinObj.display_ticker
            },
            right: "",
            keywords: [path.exportto.currencyid, path.exportto.fullyqualifiedname]
          };
        });
      case 'eth':
      case 'erc20':
        return [
          {
            title: coinObj.testnet
              ? coinsList.VRSCTEST.display_name
              : coinsList.VRSC.display_name,
            logoid: coinObj.testnet ? coinsList.VRSCTEST.id : coinsList.VRSC.id,
            key: 0,
            description: coinObj.testnet
              ? 'Send to the Verus testnet'
              : 'Send to the Verus network',
            values: {
              [SEND_MODAL_EXPORTTO_FIELD]: coinObj.testnet
                ? coinsList.VRSCTEST.display_ticker
                : coinsList.VRSC.display_ticker,
            },
            right: '',
            keywords: coinObj.testnet
              ? [coinsList.VRSCTEST.display_name, coinsList.VRSCTEST.id]
              : [coinsList.VRSC.display_name, coinsList.VRSCTEST.id],
          },
        ];
      default:
        return []
    }
  }

  const processMappingSuggestionPaths = async (flatPaths, coinObj) => {
    switch (coinObj.proto) {
      case 'vrsc':
        return flatPaths
          .filter(x => {
            return x.mapping;
          })
          .map((path, index) => {
            const name =
              path.destination.address === ETH_CONTRACT_ADDRESS
                ? path.destination.name
                : `${path.destination.name} (${
                    path.destination.address.substring(0, 8) +
                    '...' +
                    path.destination.address.substring(path.destination.address.length - 8)
                  })`;

            return {
              title: name,
              logoid: path.destination.address,
              logoproto: 'erc20',
              key: index.toString(),
              description: path.destination.address === ETH_CONTRACT_ADDRESS ? "receive as Ethereum" : `receive as the ${path.destination.symbol} ERC20 token`,
              values: {
                [SEND_MODAL_VIA_FIELD]: '',
                [SEND_MODAL_MAPPING_FIELD]: path.destination.symbol,
                [SEND_MODAL_EXPORTTO_FIELD]: path.exportto.fullyqualifiedname,
                [SEND_MODAL_PRICE_ESTIMATE]: { price: path.price, name: name },
              },
              right: "",
              keywords: [
                path.destination.symbol,
                path.destination.name,
              ],
            };
          });
      case 'eth':
      case 'erc20':
        return flatPaths
          .filter(x => {
            return x.mapping;
          })
          .map((path, index) => {
            return {
              title: path.destination.fullyqualifiedname,
              logoid: path.destination.currencyid,
              key: index.toString(),
              description: `receive on ${path.exportto.fullyqualifiedname} network`,
              values: {
                [SEND_MODAL_VIA_FIELD]: '',
                [SEND_MODAL_MAPPING_FIELD]: path.destination.fullyqualifiedname,
                [SEND_MODAL_EXPORTTO_FIELD]: path.exportto.fullyqualifiedname,
                [SEND_MODAL_PRICE_ESTIMATE]: { price: path.price, name: path.destination.fullyqualifiedname },
              },
              right: "",
              keywords: [
                path.destination.currencyid,
                path.destination.fullyqualifiedname,
              ],
            };
          });
      default:
        return [];
    }
  };

  const processSelfSuggestionPaths = () => {
    const addresses = [];
    const seen = new Set();

    // The Verus coin of the card's own network: VRSCTEST on testnet. Upstream
    // read VRSC only, so a testnet wallet listed no Verus address.
    const verusCoin = sendModal.coinObj?.testnet ? coinsList.VRSCTEST : coinsList.VRSC;

    if (activeAccount) {
      if (allSubWallets[verusCoin.id]) {
        const vrscKeys = activeAccount.keys[verusCoin.id] || {};

        for (const channelId in vrscKeys) {
          const [channelName, addr, network] = channelId.split('.');
  
          if (channelName === VRPC && !seen.has(addr)) {
            const walletId = `SUBWALLET_${channelId}`;
  
            if (allSubWallets[verusCoin.id]) {
              const wallet = allSubWallets[verusCoin.id].find(x => x.id === walletId);
  
              if (wallet) {  
                seen.add(addr);
                addresses.push({
                  title: wallet.name,
                  logoid: verusCoin.id,
                  key: addr,
                  description: addr,
                  values: {
                    [SEND_MODAL_TO_ADDRESS_FIELD]: addr
                  },
                  right: "",
                  keywords: [
                    addr,
                    wallet.name
                  ],
                })
              }
            }
          }
        }
      }

      if (!sendModal.data[SEND_MODAL_IS_PRECONVERT]) {
        for (const coinId in activeAccount.keys) {
          if (activeAccount.keys[coinId] && (activeAccount.keys[coinId][ETH] || activeAccount.keys[coinId][ERC20])) {
            const ethAddresses = activeAccount.keys[coinId][ETH] ? 
              activeAccount.keys[coinId][ETH].addresses : activeAccount.keys[coinId][ERC20].addresses;
            
            if (ethAddresses && ethAddresses.length > 0) {
              const addr = ethAddresses[0];
              const addrTitle = addr.substring(0, 8) + '...' + addr.substring(addr.length - 8);
  
              if (!seen.has(addr)) {
                seen.add(addr);
                addresses.push({
                  title: addrTitle,
                  logoid: coinsList.ETH.id,
                  key: addr,
                  description: addr,
                  values: {
                    [SEND_MODAL_TO_ADDRESS_FIELD]: addr
                  },
                  right: "",
                  keywords: [
                    addr
                  ]
                })
              }
  
              break;
            }
          }
        }
      }
    }

    return addresses;
  };

  const fetchSuggestionsBase = async (field) => {
    if (loadingSuggestions) return;
    let newSuggestionsBase = []
    
    try {
      setLoadingSuggestions(true)
      setSuggestionError(null)

      // {[destinationid: string]: Array<{
      //   via?: CurrencyDefinition;
      //   destination: CurrencyDefinition;
      //   exportto?: string;
      //   price: number;
      //   viapriceinroot?: number;
      //   destpriceinvia?: number;
      //   gateway: boolean;
      //   mapping: boolean;
      //   bounceback: boolean;
      // }>}

      let flatPaths = []
      
      if (CONVERSION_PATH_FIELDS.includes(field)) {
        const paths = conversionPaths
          ? conversionPaths
          : await getConversionPaths(
              sendModal.coinObj,
              sendModal.subWallet.api_channels[API_SEND],
              {
                src: sendModal.coinObj.currency_id,
              },
            );

        for (const destinationid in paths) {
          flatPaths = flatPaths.concat(paths[destinationid])
        }
        
        setConversionPaths(paths)
      }
      
      switch (field) {
        case SEND_MODAL_CONVERTTO_FIELD:
          newSuggestionsBase = await processConverttoSuggestionPaths(flatPaths, sendModal.coinObj);
          setSuggestionBase(newSuggestionsBase);
          break;
        case SEND_MODAL_VIA_FIELD:
          newSuggestionsBase = await processViaSuggestionPaths(flatPaths, sendModal.coinObj);
          setSuggestionBase(newSuggestionsBase);
          break;
        case SEND_MODAL_EXPORTTO_FIELD:
          newSuggestionsBase = await processExporttoSuggestionPaths(flatPaths, sendModal.coinObj);
          setSuggestionBase(newSuggestionsBase);
          break;
        case SEND_MODAL_MAPPING_FIELD:
          newSuggestionsBase = await processMappingSuggestionPaths(flatPaths, sendModal.coinObj);
          setSuggestionBase(newSuggestionsBase);
          break;
        case SEND_MODAL_TO_ADDRESS_FIELD:
          newSuggestionsBase = processSelfSuggestionPaths();
          setSuggestionBase(newSuggestionsBase);
          break;
        default:
          setSuggestionBase(newSuggestionsBase);
          break;
      }
    } catch(e) {
      if (inlineMessages) setSuggestionError(e.message || 'Conversion paths are unavailable.');
      else Alert.alert("Failed to fetch conversion paths, enter your currency manually", e.message)
    }

    setLoadingSuggestions(false);
    return newSuggestionsBase;
  };

  const handleSearch = async (text) => {
    if (sendModal.data[SEND_MODAL_PRICE_ESTIMATE] != null) {
      updateSendFormData(SEND_MODAL_PRICE_ESTIMATE, null)
    }

    updateSendFormData(selectedField, text);

    setSuggestions(fetchSuggestions(text))
  };

  const handleFieldFocus = async (field) => {
    const selectField = () => {
      setSelectedField(field);
      enterSearchMode();
    }

    selectField();
    
    setSuggestions(fetchSuggestions("", await fetchSuggestionsBase(field)));
  };

  const handleDoneSearching = () => {
    leaveSearchMode();
  };

  const selectSuggestion = (suggestion) => {
    const { values } = suggestion
    updateSendFormData(SEND_MODAL_PRICE_ESTIMATE, null)
    
    for (const key in values) {
      updateSendFormData(key, values[key]);
    }
    
    leaveSearchMode();
  };

  const fetchLocalNetworkInfo = async () => {
    let address;

    if (sendModal.coinObj.proto === 'erc20' || sendModal.coinObj.proto === 'eth') {
      address =
        sendModal.coinObj.proto === 'erc20'
          ? activeUser.keys[sendModal.coinObj.id][ERC20].addresses[0]
          : activeUser.keys[sendModal.coinObj.id][ETH].addresses[0];

      setLocalNetworkName(coinsList.ETH.display_ticker);
    } else {
      const [channelName, channelAddress, systemId] = sendModal.subWallet.api_channels[API_SEND].split('.');

      address = channelAddress;

      // The network name only feeds the old form, so a failure is only logged.
      try {
        const response = await getCurrency(systemId, sendModal.coinObj.system_id);

        if (response.error) console.warn("Error fetching current network", response.error.message);
        else {
          setLocalNetworkName(response.result.fullyqualifiedname);
        }
      } catch (e) {
        console.warn("Error fetching current network", e);
      }
    }

    try {
      const balances = await getAddressBalances(
        sendModal.coinObj,
        sendModal.subWallet.api_channels[API_SEND],
        {address},
      );

      setLocalBalances(balances);
    } catch(e) {
      console.warn("Error fetching balances", e);
      if (inlineMessages) setBalanceError(true);
      else Alert.alert("Error fetching balances", e.message);
    }
  }

  const retryBalances = () => {
    setBalanceError(false);
    fetchLocalNetworkInfo();
  };

  useEffect(() => {
    setShowConversionField(sendModal.data[SEND_MODAL_SHOW_CONVERTTO_FIELD] || isConversion)
  }, [sendModal.data[SEND_MODAL_SHOW_CONVERTTO_FIELD], isConversion])

  useEffect(() => {
    setShowViaField(sendModal.data[SEND_MODAL_SHOW_VIA_FIELD] || isVia)
  }, [sendModal.data[SEND_MODAL_SHOW_VIA_FIELD], isVia])

  useEffect(() => {
    setShowExportField(sendModal.data[SEND_MODAL_SHOW_EXPORTTO_FIELD] || isExport)
  }, [sendModal.data[SEND_MODAL_SHOW_EXPORTTO_FIELD], isExport])

  useEffect(() => {
    setShowMappingField(sendModal.data[SEND_MODAL_SHOW_MAPPING_FIELD] || isMapping)
  }, [sendModal.data[SEND_MODAL_SHOW_MAPPING_FIELD], isMapping])

  useEffect(() => {
    setProcessedAmount(getProcessedAmount())
  }, [sendModal.data[SEND_MODAL_AMOUNT_FIELD]])

  useEffect(() => {
    fetchLocalNetworkInfo()
  }, [sendModal.subWallet.api_channels[API_SEND]])

  useEffect(() => {
    setIsConversion(!!(sendModal.data[SEND_MODAL_CONVERTTO_FIELD] != null &&
      sendModal.data[SEND_MODAL_CONVERTTO_FIELD].length > 0))
  }, [sendModal.data[SEND_MODAL_CONVERTTO_FIELD]])

  useEffect(() => {
    setIsVia(!!(sendModal.data[SEND_MODAL_VIA_FIELD] != null &&
      sendModal.data[SEND_MODAL_VIA_FIELD].length > 0))
  }, [sendModal.data[SEND_MODAL_VIA_FIELD]])

  useEffect(() => {
    setIsExport(!!(sendModal.data[SEND_MODAL_EXPORTTO_FIELD] != null &&
      sendModal.data[SEND_MODAL_EXPORTTO_FIELD].length > 0))
  }, [sendModal.data[SEND_MODAL_EXPORTTO_FIELD]])

  useEffect(() => {
    setIsMapping(!!(sendModal.data[SEND_MODAL_MAPPING_FIELD] != null &&
      sendModal.data[SEND_MODAL_MAPPING_FIELD].length > 0))
  }, [sendModal.data[SEND_MODAL_MAPPING_FIELD]])

  useEffect(() => {
    if (localBalances != null && sendModal.data[SEND_MODAL_CONTINUE_IMMEDIATELY]) {
      updateSendFormData(SEND_MODAL_CONTINUE_IMMEDIATELY, false);
      submitData();
    }
  }, [localBalances])
  
  const fillAmount = (amount) => {
    let displayAmount = BigNumber(amount);
    if (displayAmount.isLessThan(BigNumber(0))) {
      displayAmount = BigNumber(0);
    }

    updateSendFormData(
      SEND_MODAL_AMOUNT_FIELD,
      displayAmount.toString()
    );
  };

  const getProcessedAmount = () => {
    const { data } = sendModal;

    const amount =
      (data[SEND_MODAL_AMOUNT_FIELD].includes(".") &&
        data[SEND_MODAL_AMOUNT_FIELD].includes(",")) ||
      !data[SEND_MODAL_AMOUNT_FIELD]
        ? data[SEND_MODAL_AMOUNT_FIELD]
        : data[SEND_MODAL_AMOUNT_FIELD].replace(/,/g, ".");

    if (!amount || amount.length < 0) {
      return null;
    } else if (!isNumber(Number(amount))) {
      return null;
    } else {
      return amount;
    }
  }

  // The problem with an address that is not a VerusID, or null. These are the
  // checks of selectAddress in submitData, without its result.
  const getAddressFormatProblem = addr => {
    if (addr.endsWith("@")) return null;
    try {
      if (ethers.isAddress(addr)) return null;
    } catch (e) {} // Not an Ethereum address; check it as a Verus address.
    let decoded;
    try {
      decoded = fromBase58Check(addr);
    } catch (e) {
      return "Enter a valid address or VerusID.";
    }
    return decoded.version === R_ADDRESS_VERSION || decoded.version === I_ADDRESS_VERSION
      ? null
      : "This address type is not supported.";
  };

  const formHasError = () => {
    const { subWallet, coinObj, data } = sendModal;
    const channel = subWallet.api_channels[API_SEND];

    // The form only shows after the balances load.
    if (!localBalances) return true;

    const spendableBalance = localBalances.hasOwnProperty(coinObj.currency_id) ? localBalances[coinObj.currency_id] : null;

    const toAddress =
      data[SEND_MODAL_TO_ADDRESS_FIELD] != null ? data[SEND_MODAL_TO_ADDRESS_FIELD].trim() : "";

    const amount = getProcessedAmount()

    // Each field's first problem, top to bottom. The inline form shows all of
    // them at once; the old form alerts the first, as before.
    const problems = [];

    if (!toAddress || toAddress.length < 1) {
      problems.push([destinationErrorField, "Required Field", "Enter an address or VerusID."]);
    } else if (addressIsBlocked(toAddress, addressBlocklist)) {
      problems.push([destinationErrorField, "Blocked Address", "Sending to this address is blocked."]);
    } else if (inlineMessages) {
      // The same local checks the preparation makes (selectAddress), made here
      // so that this error shows together with the amount's. A VerusID still
      // needs its lookup, so it is checked when the payment is prepared.
      const formatProblem = getAddressFormatProblem(String(data[SEND_MODAL_TO_ADDRESS_FIELD]));
      if (formatProblem) problems.push([destinationErrorField, "Invalid Address", formatProblem]);
    }

    if (amount == null) {
      problems.push([amountErrorField, "Invalid Amount", "Enter a valid amount."]);
    } else {
      if (spendableBalance == null || Number(amount) > Number(spendableBalance)) {
        const ticker = coinObj.display_ticker;
        const message =
          spendableBalance == null
            ? `No ${ticker} on this card.`
            : spendableBalance < 0
            ? 'The available amount is less than the network fee.'
            : `Not enough ${ticker}. ${spendableBalance} ${ticker} available.` +
              (channel === DLIGHT_PRIVATE
                ? ' Private funds need 10 confirmations before they can be spent.'
                : '');

        problems.push([amountErrorField, "Insufficient Funds", message]);
      }
    }

    if (problems.length > 0) {
      if (inlineMessages) {
        const errors = {};
        for (const [field, , message] of problems) {
          if (errors[field] == null) errors[field] = message;
        }
        setFormErrors(errors);
      } else {
        const [field, title, message] = problems[0];
        showFormError(field, title, message);
      }
      return true;
    }

    return false;
  };

  // The editable currency field that holds `name`, or "form" when none does
  // (a locked field, an invoice, or a currency the form did not type).
  const currencyFieldFor = name => {
    const wanted = toLowerCaseCLocale(String(name).trim());
    const key = [
      SEND_MODAL_CONVERTTO_FIELD,
      SEND_MODAL_VIA_FIELD,
      SEND_MODAL_EXPORTTO_FIELD,
      SEND_MODAL_MAPPING_FIELD,
    ].find(field => {
      const value = sendModal.data[field];
      return typeof value === 'string' && toLowerCaseCLocale(value.trim()) === wanted;
    });

    return key == null || isInvoice || lockedInputs[key] ? "form" : key;
  };

  const updateInvoiceFormData = (key, value) => {
    setFormErrors({});
    updateSendFormData(key, value);
  };

  const submitData = async () => {
    setFormErrors({});
    if (formHasError()) return;

    setLoading(true);

    const { coinObj, data } = sendModal;

    try {
      const selectData = (data) => data == null || data.length == 0 ? undefined : data;
      const channel = sendModal.subWallet.api_channels[API_SEND];
      const parentChannel = channel.split('.')[0];

      const selectAddress = async (addr) => {
        let keyhash;

        if (addr.endsWith("@")) {
          const identityRes = await getIdentity(coinObj, activeAccount, channel, addr);

          if (identityRes.error) {
            throw fieldError(
              destinationErrorField,
              "VerusID Not Found",
              "This VerusID could not be looked up. Enter its i-address instead.",
            );
          }

          keyhash = identityRes.result.identity.identityaddress;
        } else keyhash = addr;

        const keyhashIsEth = () => {
          try {
            return ethers.isAddress(keyhash);
          } catch(e) {
            return false;
          }
        }

        if (keyhashIsEth()) {
          return new TransferDestination({
            destinationBytes: Buffer.from(keyhash.substring(2), 'hex'),
            type: DEST_ETH
          })
        } else {
          let decoded;

          try {
            decoded = fromBase58Check(keyhash);
          } catch (e) {
            console.warn(e);
            throw fieldError(destinationErrorField, "Invalid Address", "Enter a valid address or VerusID.");
          }

          const { hash, version } = decoded;
          let type;

          if (version === R_ADDRESS_VERSION) type = DEST_PKH;
          else if (version === I_ADDRESS_VERSION) type = DEST_ID;
          else throw fieldError(destinationErrorField, "Invalid Address", "This address type is not supported.");

          return new TransferDestination({
            destinationBytes: hash,
            type
          })
        }        
      }

      const amount = getProcessedAmount();

      let output = {
        currency: coinObj.currency_id,
        // Receive-as labels are display-only for Verus-origin transfers.
        mapto: parentChannel === ETH || parentChannel === ERC20
          ? selectData(data[SEND_MODAL_MAPPING_FIELD])
          : undefined,
        convertto: selectData(data[SEND_MODAL_CONVERTTO_FIELD]),
        exportto: selectData(data[SEND_MODAL_EXPORTTO_FIELD]),
        via: selectData(data[SEND_MODAL_VIA_FIELD]),
        address: await selectAddress(data[SEND_MODAL_TO_ADDRESS_FIELD]),
        satoshis: coinsToSats(BigNumber(amount)).toString(),
        preconvert: selectData(data[SEND_MODAL_IS_PRECONVERT]),
        burn: data[SEND_MODAL_IS_BURN_CHANGE_PRICE] === true
          ? true
          : undefined,
        vdxftag: selectData(data[SEND_MODAL_VDXF_TAG])
      }

      if (
        coinObj.proto === 'vrsc' &&
          output.exportto != null &&
          (toLowerCaseCLocale(output.exportto) === toIAddress(VETH, coinObj.testnet ? 'VRSCTEST' : 'VRSC').toLowerCase() || toLowerCaseCLocale(output.exportto) === 'veth')
      ) {
        try {
          const provider = getWeb3ProviderForNetwork(
            coinObj.testnet ? 'sepolia' : 'homestead',
          );

          if (!(await provider.isVerusBridgeDelegatorActive())) {
            output.feecurrency = toIAddress(
              VETH,
              coinObj.testnet ? 'VRSCTEST' : 'VRSC',
            );
            output.bridgeprelaunch = true;
          }
        } catch (e) {
          console.warn(e);
        }
      }

      for (const key in output) {
        if (output[key] == null) delete output[key]
      }

      const res = await preflightConvertOrCrossChain(coinObj, activeAccount, channel, output)

      if (setModalHeight) setModalHeight(height >= 720 ? 696 : height - 24);

      if (res.err) {
        const error = new Error(res.result);
        if (res.notFoundCurrency != null) error.notFoundCurrency = res.notFoundCurrency;
        throw error;
      }

      const {
        converterdef,
        submittedsats,
        estimate,
        output: resout
      } = res.result;

      // The invoice review (InvoicePaymentReview) shows these three warnings
      // as notes. Only the old non-invoice form still alerts.
      if (legacyAlerts && resout.convertto != null && estimate == null && sendModal.data[SEND_MODAL_PRICE_ESTIMATE] == null) {
        Alert.alert("Could not estimate conversion result", 'Failed to calculate an estimated result for this conversion.')
      }

      if (legacyAlerts && converterdef != null && converterdef.proofprotocol === 2) {
        Alert.alert("Centralized currency", `You are converting to ${
          converterdef.fullyqualifiedname
        }, a centralized currency. The controller, ${converterdef.fullyqualifiedname}@, has the ability to mint new supply.`)
      }

      if (submittedsats !== resout.satoshis) {
        if (sendModal.data[SEND_MODAL_STRICT_AMOUNT]) {
          throw fieldError(
            amountErrorField,
            "Insufficient Funds",
            `Not enough ${coinObj.display_ticker} for ${satsToCoins(
              BigNumber(submittedsats),
            ).toString()} ${coinObj.display_ticker} plus the network fee.`,
          );
        } else if (legacyAlerts) {
          Alert.alert(
            'Amount changed',
            `You have insufficient funds to send your submitted amount of ${satsToCoins(
              BigNumber(submittedsats),
            ).toString()} ${coinObj.display_ticker} with the transaction fee, so the transaction amount has been changed to the maximum sendable value of ${satsToCoins(
              BigNumber(resout.satoshis),
            ).toString()} ${coinObj.display_ticker}.`,
          );
        }
      }

      onPrepared({ preflight: res.result, balances: localBalances });
    } catch (e) {
      if (e?.formField) {
        showFormError(e.formField, e.formTitle, e.message);
      } else if (e?.notFoundCurrency != null) {
        // An unknown currency name: say so under the field that holds it.
        const name = String(e.notFoundCurrency);
        showFormError(
          currencyFieldFor(name),
          "Currency Not Found",
          `Currency “${name.trim()}” was not found.`,
        );
      } else if (/insufficient funds/i.test(e?.message || '')) {
        console.warn(e);
        showFormError(
          amountErrorField,
          "Insufficient Funds",
          `Not enough ${coinObj.display_ticker} for this amount plus the network fee.`,
        );
      } else if (!showFundRawTransactionErrorAlert(e)) {
        console.warn(e);
        showFormError(
          "form",
          `Can’t prepare this ${isBurnChangePrice ? "burn" : "payment"}`,
          `The ${
            isBurnChangePrice ? "burn" : "payment"
          } could not be prepared. Check your connection and try again.`,
        );
      }
    }

    setLoading(false);
  };

  const maxAmount = () => {
    const { coinObj } = sendModal;

    const spendableBalance = localBalances.hasOwnProperty(coinObj.currency_id) ? localBalances[coinObj.currency_id] : 0;

    fillAmount(BigNumber(spendableBalance));
  };

  // With a Verus card in the wallet, Self lists the wallet's own addresses.
  // Otherwise it fills the active coin's first address.
  const selfUsesList = Boolean(
    allSubWallets[coinsList.VRSC.id] || allSubWallets[coinsList.VRSCTEST.id],
  );

  const handleSelfPressed = () => {
    if (selfUsesList) {
      handleFieldFocus(SEND_MODAL_TO_ADDRESS_FIELD);
    } else {
      // The source card's own first address. Upstream read the globally
      // active coin, which can be another asset or none (PR 266 review).
      const { coinObj, subWallet } = sendModal;
      const addressChannel = subWallet?.api_channels?.[API_GET_ADDRESSES];
      const addr = activeAccount?.keys?.[coinObj?.id]?.[addressChannel]?.addresses?.[0];

      if (addr) updateSendFormData(SEND_MODAL_TO_ADDRESS_FIELD, addr);
      else showFormError(destinationErrorField, "No address", "No address of this card was found.");
    }
  };

  return {
    activeAccount,
    allSubWallets,
    amountErrorField,
    balanceError,
    destinationErrorField,
    fadeNormalForm,
    fadeSearchMode,
    fetchSuggestionsBase,
    FIELD_TITLES,
    formErrors,
    getFieldPlaceholder,
    handleDoneSearching,
    handleFieldFocus,
    handleSearch,
    handleSelfPressed,
    isBurnChangePrice,
    isConversion,
    isExport,
    isInvoice,
    isMapping,
    isVia,
    loadingSuggestions,
    localBalances,
    localNetworkName,
    lockedInputs,
    maxAmount,
    networkName,
    processedAmount,
    processSelfSuggestionPaths,
    retryBalances,
    searchMode,
    selectedField,
    selectSuggestion,
    selfUsesList,
    setFormErrors,
    showConversionField,
    showExportField,
    showMappingField,
    showViaField,
    submitData,
    suggestionError,
    suggestions,
    updateInvoiceFormData,
  };
};

export default useConvertOrCrossChainForm;
