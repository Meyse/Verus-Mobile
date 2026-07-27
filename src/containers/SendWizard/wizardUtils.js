import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';

export const SEND_WIZARD_MODE = {
  CONVERT: 'convert',
  SEND: 'send',
};

const CONVERSION_CHANNEL_TYPES = new Set([
  'erc20',
  'eth',
  'vrpc',
  'wyre_service',
]);

export const isConversionChannel = channel =>
  CONVERSION_CHANNEL_TYPES.has(channel?.split('.')[0]);

export const ADDRESS_TYPE = {
  ETHEREUM: 'ethereum',
  GENERIC: 'generic',
  VERUS: 'verus',
};

const getDefinitionId = definition => {
  if (definition == null) return null;
  if (typeof definition === 'string') return definition;
  return definition.currencyid || definition.currency_id || definition.address || null;
};

const getDefinitionName = definition => {
  if (definition == null) return null;
  if (typeof definition === 'string') return definition;
  return (
    definition.fullyqualifiedname ||
    definition.name ||
    definition.symbol ||
    getDefinitionId(definition)
  );
};

const getMappingTarget = (sourceCoin, definition) => {
  if (definition == null) return null;
  if (typeof definition === 'string') return definition;
  if (sourceCoin?.proto === 'vrsc') {
    return definition.symbol || getDefinitionName(definition);
  }
  if (sourceCoin?.proto === 'eth' || sourceCoin?.proto === 'erc20') {
    return (
      definition.fullyqualifiedname ||
      definition.name ||
      getDefinitionId(definition)
    );
  }
  return getDefinitionName(definition);
};

export const getCurrencyDisplay = (currencyId, fallback) => {
  try {
    const coin = CoinDirectory.findCoinObj(currencyId);
    return {
      coinId: coin.id,
      name: coin.display_name,
      ticker: coin.display_ticker,
    };
  } catch (error) {
    const name = fallback || currencyId || 'Unknown asset';
    const pieces = String(name).split('.');
    const ticker = pieces[pieces.length - 1] || name;
    return {coinId: currencyId, name, ticker};
  }
};

const getAddressType = (sourceCoin, path, exportName) => {
  if (path?.ethdest === true || /(^|\.)eth(ereum)?($|\.)/i.test(exportName || '')) {
    return ADDRESS_TYPE.ETHEREUM;
  }

  if (!path?.exportto && ['eth', 'erc20'].includes(sourceCoin?.proto)) {
    return ADDRESS_TYPE.ETHEREUM;
  }

  return sourceCoin?.proto === 'vrsc'
    ? ADDRESS_TYPE.VERUS
    : ADDRESS_TYPE.GENERIC;
};

const getSourceNetworkId = (sourceCoin, sourceNetworkId) =>
  sourceNetworkId || sourceCoin?.system_id || sourceCoin?.id || null;

const getRouteNetwork = (sourceCoin, sourceNetworkId, route) => {
  const sourceNetwork = getSourceNetworkId(sourceCoin, sourceNetworkId);
  const networkKey =
    route.addressType === ADDRESS_TYPE.ETHEREUM
      ? '.eth'
      : route.exportTo || sourceNetwork;
  const networkDisplay = getCurrencyDisplay(
    networkKey,
    route.exportToFqn || sourceCoin?.display_name || networkKey,
  );

  return {
    networkKey,
    networkName:
      networkKey === '.eth'
        ? 'Ethereum'
        : route.exportToFqn || networkDisplay.name,
    networkIcon: networkKey === '.eth' ? 'ETH' : networkDisplay.coinId,
    isSameNetwork: networkKey === sourceNetwork,
  };
};

const buildRoute = (sourceCoin, sourceNetworkId, path) => {
  const exportTo = getDefinitionId(path?.exportto);
  const exportToFqn = getDefinitionName(path?.exportto);
  const via = getDefinitionId(path?.via);
  const viaFqn = getDefinitionName(path?.via);
  const mapDefinition = path?.mappingdestination || path?.destination?.mapto;
  const mapTo = path?.mapping
    ? getMappingTarget(sourceCoin, mapDefinition || path.destination)
    : null;
  const preconvert = Boolean(path?.prelaunch);
  const parts = [];

  if (preconvert) parts.push('Preconvert');
  if (via) parts.push(`via ${viaFqn || via}`);
  if (exportTo) parts.push(`to ${exportToFqn || exportTo}`);
  if (parts.length === 0) parts.push('Same network');

  const route = {
    key: `${
      getDefinitionId(path?.destination) ||
      getDefinitionName(path?.destination) ||
      'same'
    }:${exportTo || 'local'}:${via || 'direct'}:${mapTo || 'native'}:${
      preconvert ? 'pre' : 'live'
    }`,
    label: parts.join(' · '),
    exportTo,
    exportToFqn,
    via,
    viaFqn,
    mapTo,
    price: path?.price == null ? null : path.price,
    preconvert,
    bridgePrelaunch: Boolean(path?.bridgeprelaunch),
    isCrossChain: Boolean(exportTo),
    addressType: getAddressType(sourceCoin, path, exportToFqn),
  };

  return {
    ...route,
    ...getRouteNetwork(sourceCoin, sourceNetworkId, route),
  };
};

const getCanonicalAssetKey = option => {
  const fullyqualifiedname = String(option?.fullyqualifiedname || '');
  let ticker = String(option?.ticker || option?.name || option?.id || '')
    .trim()
    .toUpperCase()
    .replace(/\s*\[ERC20\]\s*/g, '');
  const fqnParts = fullyqualifiedname.toUpperCase().split('.');

  if (
    fqnParts.length > 1 &&
    ticker === fqnParts[fqnParts.length - 1]
  ) {
    ticker = fqnParts.slice(0, -1).join('.');
  }

  if (ticker.endsWith('.VETH')) {
    ticker = ticker.slice(0, -5);
    if (ticker.startsWith('V') && ticker.length > 1) ticker = ticker.slice(1);
  }
  if (ticker === 'VETH') ticker = 'ETH';

  return ticker || option.id;
};

const getCanonicalAssetDisplay = canonicalKey => {
  const display = {
    BRIDGE: {name: 'Bridge.vETH', ticker: 'Bridge.vETH'},
    ETH: {name: 'Ethereum', ticker: 'ETH'},
    MKR: {name: 'Maker', ticker: 'MKR'},
    TBTC: {name: 'tBTC', ticker: 'tBTC'},
  }[canonicalKey];

  return display || {name: canonicalKey, ticker: canonicalKey};
};

const buildNetworkOptions = (option, sourceCoin, sourceNetworkId) => {
  const networks = new Map();

  option.routes.forEach(route => {
    const network = networks.get(route.networkKey) || {
      ...option,
      networkKey: route.networkKey,
      networkName: route.networkName,
      networkIcon: route.networkIcon,
      isSameNetwork: route.isSameNetwork,
      routes: [],
    };

    if (!network.routes.some(existing => existing.key === route.key)) {
      network.routes.push(route);
    }
    networks.set(route.networkKey, network);
  });

  if (networks.size === 0) {
    const sourceNetwork = getSourceNetworkId(sourceCoin, sourceNetworkId);
    const display = getCurrencyDisplay(sourceNetwork, sourceCoin?.display_name);
    networks.set(sourceNetwork, {
      ...option,
      networkKey: sourceNetwork,
      networkName: display.name,
      networkIcon: display.coinId,
      isSameNetwork: true,
      routes: [],
    });
  }

  return [...networks.values()].map(network => ({
    ...network,
    selectionTitle:
      network.isConversion && network.routes.length > 1
        ? 'Select conversion route'
        : null,
  }));
};

const groupConversionOptions = (options, sourceCoin, sourceNetworkId) => {
  const groups = new Map();

  options.forEach(option => {
    const canonicalKey = getCanonicalAssetKey(option);
    const networkOptions = buildNetworkOptions(
      option,
      sourceCoin,
      sourceNetworkId,
    );
    const group = groups.get(canonicalKey) || [];
    group.push(...networkOptions);
    groups.set(canonicalKey, group);
  });

  return [...groups.entries()].map(([canonicalKey, networkOptions]) => {
    const deduplicatedNetworks = [];
    networkOptions.forEach(network => {
      const existing = deduplicatedNetworks.find(
        option =>
          option.networkKey === network.networkKey &&
          option.transactionCurrency === network.transactionCurrency,
      );
      if (existing) {
        network.routes.forEach(route => {
          if (!existing.routes.some(candidate => candidate.key === route.key)) {
            existing.routes.push(route);
          }
        });
      } else {
        deduplicatedNetworks.push({...network, routes: [...network.routes]});
      }
    });

    if (deduplicatedNetworks.length === 1) {
      const [onlyNetwork] = deduplicatedNetworks;
      return {...onlyNetwork, networkOptions: [onlyNetwork]};
    }

    const preferredDisplay =
      deduplicatedNetworks.find(option => option.networkKey === '.eth') ||
      deduplicatedNetworks[0];
    const canonicalDisplay = getCanonicalAssetDisplay(canonicalKey);

    return {
      id: canonicalKey,
      name: canonicalDisplay.name,
      ticker: canonicalDisplay.ticker,
      coinId:
        deduplicatedNetworks.find(
          option => !String(option.coinId || '').startsWith('0x'),
        )?.coinId || preferredDisplay.coinId,
      isConversion: true,
      isGrouped: true,
      networkOptions: deduplicatedNetworks,
      routes: [],
    };
  });
};

export const buildTargetOptions = (
  conversionPaths,
  sourceCoin,
  conversionDisabled,
  sourceNetworkId,
) => {
  if (!sourceCoin) return [];

  const sourceOption = buildSendTarget(
    conversionPaths,
    sourceCoin,
    sourceNetworkId,
  );
  const sourceCurrencyId = sourceCoin.currency_id || sourceCoin.id;
  const optionMap = new Map();

  for (const [destinationKey, paths] of Object.entries(conversionPaths || {})) {
    if (!Array.isArray(paths)) continue;

    paths.forEach(path => {
      const destination = path?.destination;
      if (!destination) return;

      const displayCurrencyId = getDefinitionId(destination) || destinationKey;
      const sameCurrency = displayCurrencyId === sourceCurrencyId;
      const mappingSend = Boolean(path.mapping && path.exportto);
      if (sameCurrency || mappingSend || conversionDisabled) return;

      const route = buildRoute(sourceCoin, sourceNetworkId, path);
      const bouncebackCurrency =
        path.ethdest && destination.mapto
          ? getDefinitionId(destination.mapto) || getDefinitionName(destination.mapto)
          : displayCurrencyId;
      const fallbackName = getDefinitionName(destination) || displayCurrencyId;
      const display = getCurrencyDisplay(displayCurrencyId, fallbackName);
      const option = optionMap.get(displayCurrencyId) || {
        id: displayCurrencyId,
        transactionCurrency: bouncebackCurrency,
        fullyqualifiedname: getDefinitionName(destination) || bouncebackCurrency,
        convertToFqn: path.ethdest
          ? null
          : getDefinitionName(destination) || bouncebackCurrency,
        coinId: display.coinId,
        name: display.name,
        ticker: display.ticker,
        isConversion: true,
        routes: [],
      };

      if (!option.routes.some(existing => existing.key === route.key)) {
        option.routes.push(route);
      }
      optionMap.set(displayCurrencyId, option);
    });
  }

  const conversions = groupConversionOptions(
    [...optionMap.values()],
    sourceCoin,
    sourceNetworkId,
  ).sort((first, second) => first.name.localeCompare(second.name));
  return [sourceOption, ...conversions];
};

export const buildSendTarget = (
  conversionPaths,
  sourceCoin,
  sourceNetworkId,
) => {
  if (!sourceCoin) return null;

  const sourceCurrencyId = sourceCoin.currency_id || sourceCoin.id;
  const sourceDisplay = getCurrencyDisplay(sourceCoin.id, sourceCoin.display_name);
  const directRoute = {
    key: 'local:direct:live:send',
    label: 'Same network',
    exportTo: null,
    exportToFqn: null,
    via: null,
    viaFqn: null,
    mapTo: null,
    price: null,
    preconvert: false,
    bridgePrelaunch: false,
    isCrossChain: false,
    addressType: ['eth', 'erc20'].includes(sourceCoin.proto)
      ? ADDRESS_TYPE.ETHEREUM
      : sourceCoin.proto === 'vrsc'
      ? ADDRESS_TYPE.VERUS
      : ADDRESS_TYPE.GENERIC,
  };
  const sourceOption = {
    id: sourceCurrencyId,
    transactionCurrency: sourceCurrencyId,
    fullyqualifiedname: sourceCurrencyId,
    convertToFqn: null,
    coinId: sourceCoin.id,
    name: sourceCoin.display_name,
    ticker: sourceCoin.display_ticker,
    isConversion: false,
    routes: [
      {
        ...directRoute,
        ...getRouteNetwork(sourceCoin, sourceNetworkId, directRoute),
      },
    ],
    ...sourceDisplay,
    coinId: sourceCoin.id,
    name: sourceCoin.display_name,
    ticker: sourceCoin.display_ticker,
  };

  for (const [destinationKey, paths] of Object.entries(conversionPaths || {})) {
    if (!Array.isArray(paths)) continue;

    paths.forEach(path => {
      const destination = path?.destination;
      if (!destination) return;

      const displayCurrencyId = getDefinitionId(destination) || destinationKey;
      const sameCurrency = displayCurrencyId === sourceCurrencyId;
      const mappingSend = Boolean(path.mapping && path.exportto);

      if (sameCurrency || mappingSend) {
        const route = buildRoute(sourceCoin, sourceNetworkId, path);
        const routeWithMapping = mappingSend
          ? {
              ...route,
              mapTo:
                route.mapTo || getMappingTarget(sourceCoin, destination),
            }
          : route;
        if (
          routeWithMapping.isCrossChain &&
          !sourceOption.routes.some(existing => existing.key === routeWithMapping.key)
        ) {
          sourceOption.routes.push(routeWithMapping);
        }
        return;
      }
    });
  }

  sourceOption.networkOptions = buildNetworkOptions(
    sourceOption,
    sourceCoin,
    sourceNetworkId,
  );
  return sourceOption;
};

export const POPULAR_TARGETS = ['VRSC', 'USDC', 'ETH', 'TBTC', 'DAI'];

export const isPopularTarget = target => {
  const values = [target?.ticker, target?.name, target?.id]
    .filter(Boolean)
    .map(value => String(value).toUpperCase());
  return POPULAR_TARGETS.some(popular =>
    values.some(value => value === popular || value.includes(`.${popular}`)),
  );
};

export const getTransactionId = result => {
  if (typeof result === 'string') return result;
  return (
    result?.txid ||
    result?.hash ||
    result?.transactionid ||
    result?.transactionHash ||
    null
  );
};
