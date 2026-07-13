import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';

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

const buildRoute = (sourceCoin, path, index) => {
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

  return {
    key: `${
      getDefinitionId(path?.destination) ||
      getDefinitionName(path?.destination) ||
      'same'
    }:${exportTo || 'local'}:${via || 'direct'}:${mapTo || 'native'}:${
      preconvert ? 'pre' : 'live'
    }:${index}`,
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
};

export const buildTargetOptions = (
  conversionPaths,
  sourceCoin,
  conversionDisabled,
) => {
  if (!sourceCoin) return [];

  const sourceCurrencyId = sourceCoin.currency_id || sourceCoin.id;
  const sourceDisplay = getCurrencyDisplay(sourceCoin.id, sourceCoin.display_name);
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
      },
    ],
    ...sourceDisplay,
    coinId: sourceCoin.id,
    name: sourceCoin.display_name,
    ticker: sourceCoin.display_ticker,
  };
  const optionMap = new Map();

  for (const [destinationKey, paths] of Object.entries(conversionPaths || {})) {
    if (!Array.isArray(paths)) continue;

    paths.forEach((path, index) => {
      if (path?.prelaunch) return;
      const destination = path?.destination;
      if (!destination) return;

      const displayCurrencyId = getDefinitionId(destination) || destinationKey;
      const sameCurrency = displayCurrencyId === sourceCurrencyId;
      const mappingSend = Boolean(path.mapping && path.exportto);
      const route = buildRoute(sourceCoin, path, index);

      if (sameCurrency || mappingSend) {
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

      if (conversionDisabled) return;

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

      option.routes.push(route);
      optionMap.set(displayCurrencyId, option);
    });
  }

  const conversions = [...optionMap.values()].sort((first, second) =>
    first.name.localeCompare(second.name),
  );
  return [sourceOption, ...conversions];
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
