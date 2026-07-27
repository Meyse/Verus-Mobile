#!/usr/bin/env node

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const loadWizardUtils = coinDirectory => {
  const filename = path.resolve(
    __dirname,
    '../src/containers/SendWizard/wizardUtils.js',
  );
  const source = fs
    .readFileSync(filename, 'utf8')
    .replace(
      "import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';",
      '',
    )
    .replace(/export const /g, 'const ')
    .concat(
      '\nmodule.exports = {buildSendTarget, buildTargetOptions, isConversionChannel};\n',
    );
  const appModule = {exports: {}};

  new Function('module', 'exports', 'CoinDirectory', source)(
    appModule,
    appModule.exports,
    coinDirectory,
  );

  return appModule.exports;
};

const VRSCTEST_ID = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const DAI_VERUS_ID = 'iDAIonVRSCTEST111111111111111111111';
const DAI_ETH_ID = '0x00000000000000000000000000000000000000da';
const PRELAUNCH_ID = 'iSuperVrsc111111111111111111111111111';
const BASKET_ID = 'iBasket1111111111111111111111111111111';
const OTHER_SYSTEM_ID = 'iOtherSystem1111111111111111111111111';

const coins = {
  VRSCTEST: {
    id: 'VRSCTEST',
    currency_id: VRSCTEST_ID,
    system_id: VRSCTEST_ID,
    display_name: 'Verus Testnet',
    display_ticker: 'VRSCTEST',
    proto: 'vrsc',
  },
  [DAI_VERUS_ID]: {
    id: DAI_VERUS_ID,
    currency_id: DAI_VERUS_ID,
    system_id: VRSCTEST_ID,
    display_name: 'DAI on Verus',
    display_ticker: 'DAI.vETH',
    proto: 'vrsc',
  },
  [DAI_ETH_ID]: {
    id: DAI_ETH_ID,
    currency_id: DAI_ETH_ID,
    system_id: '.eth',
    display_name: 'Dai Stablecoin',
    display_ticker: 'DAI',
    proto: 'erc20',
  },
};

const coinDirectory = {
  findCoinObj: id => {
    if (!coins[id]) throw new Error(`Unknown fixture coin: ${id}`);
    return coins[id];
  },
};

const currency = (currencyid, fullyqualifiedname, symbol, systemid) => ({
  currencyid,
  fullyqualifiedname,
  symbol,
  systemid,
});

const daiOnVerus = currency(
  DAI_VERUS_ID,
  'DAI.vETH',
  'DAI.vETH',
  VRSCTEST_ID,
);
const bridge = currency(
  'iBridgeVeth11111111111111111111111111',
  'Bridge.vETH',
  'Bridge.vETH',
  VRSCTEST_ID,
);

const conversionPaths = {
  [VRSCTEST_ID]: [
    {
      destination: currency(
        VRSCTEST_ID,
        'VRSCTEST',
        'VRSCTEST',
        VRSCTEST_ID,
      ),
      exportto: currency(
        OTHER_SYSTEM_ID,
        'OTHER.VRSCTEST',
        'OTHER',
        VRSCTEST_ID,
      ),
      price: 1,
    },
  ],
  [DAI_VERUS_ID]: [
    {destination: daiOnVerus, price: 1},
    {destination: daiOnVerus, via: bridge, price: 1.01},
  ],
  [DAI_ETH_ID]: [
    {
      destination: {
        address: DAI_ETH_ID,
        name: 'Dai Stablecoin',
        symbol: 'DAI',
        mapto: daiOnVerus,
      },
      via: bridge,
      ethdest: true,
      price: 0.99,
    },
  ],
  [PRELAUNCH_ID]: [
    {
      destination: currency(
        PRELAUNCH_ID,
        'SUPERVRSC.VRSCTEST',
        'SUPERVRSC',
        VRSCTEST_ID,
      ),
      prelaunch: true,
      price: 1,
    },
  ],
  [BASKET_ID]: [
    {
      destination: currency(
        BASKET_ID,
        'BASKET.VRSCTEST',
        'BASKET',
        VRSCTEST_ID,
      ),
      price: 1,
    },
  ],
};

const main = () => {
  const {
    buildSendTarget,
    buildTargetOptions,
    isConversionChannel,
  } = loadWizardUtils(coinDirectory);
  const directSend = buildSendTarget({}, coins.VRSCTEST);

  assert(directSend, 'direct Send must be available without conversion data');
  assert.strictEqual(
    directSend.routes.length,
    1,
    'direct Send must start with one local route',
  );
  assert.strictEqual(
    directSend.routes[0].isCrossChain,
    false,
    'the locally seeded Send route must stay on the current network',
  );

  const options = buildTargetOptions(conversionPaths, coins.VRSCTEST, false);
  const send = options.find(option => !option.isConversion);
  const conversions = options.filter(option => option.isConversion);

  assert(send, 'VRSCTEST must retain its ordinary-send option');
  assert(
    send.routes.some(route => route.isCrossChain),
    'same-asset cross-chain routes must remain attached to Send',
  );
  assert.strictEqual(
    send.networkOptions.length,
    2,
    'Send must expose current and cross-chain destination networks',
  );
  assert(
    conversions.every(option => option.isConversion),
    'Convert target lists must exclude the direct-send option',
  );
  assert(isConversionChannel('vrpc.RAddress.System'));
  assert(isConversionChannel('eth'));
  assert(!isConversionChannel('dlight_private'));
  const prelaunch = conversions.find(option => option.id === PRELAUNCH_ID);
  assert(
    prelaunch,
    'VRSCTEST prelaunch currencies must remain available as preconvert targets',
  );
  assert(
    prelaunch.routes.every(route => route.preconvert),
    'prelaunch targets must preserve the preconvert transaction flag',
  );
  assert(
    prelaunch.routes.every(route => route.label.startsWith('Preconvert')),
    'prelaunch targets must be labeled as preconversions',
  );
  assert(
    conversions.some(option => option.id === BASKET_ID),
    'unlisted PBaaS currencies sharing a network suffix must stay distinct',
  );

  const daiConversions = conversions.filter(option =>
    [DAI_VERUS_ID, DAI_ETH_ID, 'DAI'].includes(option.id),
  );
  assert.strictEqual(
    daiConversions.length,
    1,
    'DAI representations on Verus and Ethereum must be one target asset row',
  );

  const [dai] = daiConversions;
  assert.strictEqual(dai.ticker, 'DAI');
  assert.deepStrictEqual(
    dai.networkOptions.map(option => option.networkKey).sort(),
    ['.eth', VRSCTEST_ID],
    'the target row must expose distinct receive-network choices',
  );

  const verus = dai.networkOptions.find(
    option => option.networkKey === VRSCTEST_ID,
  );
  assert.strictEqual(
    verus.routes.length,
    2,
    'direct and via-converter paths must remain route choices after network selection',
  );
  assert.strictEqual(
    verus.selectionTitle,
    'Select conversion route',
    'multiple converter paths are routes, not networks',
  );
  const ethereum = dai.networkOptions.find(
    option => option.networkKey === '.eth',
  );
  assert.strictEqual(
    ethereum.transactionCurrency,
    DAI_VERUS_ID,
    'Ethereum receive keeps the mapped Verus convertto currency',
  );
  assert(
    ethereum.routes.every(route => route.addressType === 'ethereum'),
    'the selected receive network must keep its destination address contract',
  );

  console.log('Send wizard option matrix: PASS');
};

main();
