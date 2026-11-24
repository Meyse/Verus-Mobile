// PR 266 review R8, option C with the owner's change (2026-11-19): a card's
// title is its short address (first and last 6 characters) or its VerusID
// name or "Private". Owner, 2026-11-25: a card on a Verus chain adds the quiet
// words "on Verus"; any other card adds none. (Intended behaviour change: the
// old " · <ticker>" suffix is gone.)
const {getSubWalletCardTitle} = require('../../subwallet/cardPresentation');
const {coinsList} = require('../../CoinData/CoinsList');

const VRSC_SYSTEM = coinsList.VRSC.system_id;
const VARRR = coinsList.iExBJfZYK7KREDpuhj6PzZBzqMAKaFg7d2;
const ADDRESS = 'RT7d8LpBk2mqZ9wXv4sJq4HcM3Wy';

describe('card title', () => {
  it('names a transparent card by its short address and its chain', () => {
    const wallet = {
      id: `SUBWALLET_vrpc.${ADDRESS}.${VRSC_SYSTEM}`,
      channel: `vrpc.${ADDRESS}.${VRSC_SYSTEM}`,
      name: 'RT7d8...cM3Wy',
      network: VRSC_SYSTEM,
    };

    const title = getSubWalletCardTitle(wallet, {
      address: ADDRESS,
      coin: coinsList.VRSC,
    });

    expect(title.name).toBe('RT7d8L…HcM3Wy');
    expect(title.chainLabel).toBe('on Verus');
    expect(title.text).toBe('RT7d8L…HcM3Wy on Verus');
    expect(title.isAddress).toBe(true);
  });

  it('names a transparent card by its address before the address list loads', () => {
    const wallet = {
      id: `SUBWALLET_vrpc.${ADDRESS}.${VRSC_SYSTEM}`,
      channel: `vrpc.${ADDRESS}.${VRSC_SYSTEM}`,
      name: 'RT7d8...cM3Wy',
      network: VRSC_SYSTEM,
    };

    const title = getSubWalletCardTitle(wallet, {
      address: '-',
      coin: coinsList.VRSC,
    });

    expect(title.text).toBe('RT7d8L…HcM3Wy on Verus');
  });

  it('names a VerusID card by its name and its chain', () => {
    const wallet = {
      id: `SUBWALLET_vrpc.iAlice.${VRSC_SYSTEM}`,
      channel: `vrpc.iAlice.${VRSC_SYSTEM}`,
      name: 'alice@',
      network: VRSC_SYSTEM,
    };

    const title = getSubWalletCardTitle(wallet, {
      address: 'iAliceIdentityAddressXXXXXXXXXXXX',
      coin: coinsList.VRSC,
    });

    expect(title.text).toBe('alice@ on Verus');
    expect(title.isAddress).toBe(false);
  });

  it('gives no chain label when the VerusID name already ends in the chain', () => {
    const system = coinsList.VRSCTEST.system_id;
    const wallet = {
      id: `SUBWALLET_vrpc.iDevphone.${system}`,
      channel: `vrpc.iDevphone.${system}`,
      name: 'devphone.VRSCTEST@',
      network: system,
    };

    const title = getSubWalletCardTitle(wallet, {coin: coinsList.VRSCTEST});

    expect(title.text).toBe('devphone.VRSCTEST@');
    expect(title.chainLabel).toBeNull();
  });

  it('names the private card "Private" with its chain', () => {
    const wallet = {
      id: 'PRIVATE_WALLET',
      channel: 'dlight_private',
      name: 'Private',
      network: VRSC_SYSTEM,
    };

    const title = getSubWalletCardTitle(wallet, {
      address: 'zs1privateaddressxxxxxxxxxxxxxxxxxxxxxx',
      coin: coinsList.VRSC,
    });

    expect(title.text).toBe('Private on Verus');
  });

  it('names a Bitcoin Testnet4 card by its short address alone', () => {
    const wallet = {id: 'MAIN_WALLET', channel: 'electrum', name: 'Main'};

    const title = getSubWalletCardTitle(wallet, {
      address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
      coin: coinsList.TESTNET,
    });

    expect(title.text).toBe('tb1qw5…xpjzsx');
    expect(title.chainLabel).toBeNull();
  });

  it('names a Komodo card by its short address alone', () => {
    const wallet = {id: 'MAIN_WALLET', channel: 'electrum', name: 'Main'};

    const title = getSubWalletCardTitle(wallet, {
      address: 'RKomodoAddressxxxxxxxxxxxxxxQ3Zp7',
      coin: coinsList.KMD,
    });

    expect(title.text).toBe('RKomod…xQ3Zp7');
    expect(title.chainLabel).toBeNull();
  });

  it('names the cards of an asset on two chains apart', () => {
    const vdex = 'iHog9UCTrn95qpUBFCZ7kKz7qWdMA8MQ6N';
    const card = network => ({
      id: `SUBWALLET_vrpc.${ADDRESS}.${network}`,
      channel: `vrpc.${ADDRESS}.${network}`,
      name: 'RT7d8...cM3Wy',
      network,
    });

    const own = getSubWalletCardTitle(card(VRSC_SYSTEM), {
      address: ADDRESS,
      coin: coinsList.VRSC,
    });
    const other = getSubWalletCardTitle(card(vdex), {
      address: ADDRESS,
      coin: coinsList.VRSC,
    });

    expect(own.text).toBe('RT7d8L…HcM3Wy on Verus');
    expect(other.text).toBe('RT7d8L…HcM3Wy on vDEX');
  });

  // Owner, 2026-11-25: there is no "on vETH". A .vETH currency names the
  // vETH bridge as its system, but its funds are on the Verus chain.
  it('names a bridged .vETH currency card "on Verus", never "on vETH"', () => {
    const dai = coinsList.iGBs4DWztRNvNEJBt4mqHszLxfKTNHTkhM;
    const mainCard = {id: 'MAIN_WALLET', channel: 'vrpc', name: 'Main'};
    const bridgeCard = {
      id: `SUBWALLET_vrpc.${ADDRESS}.${dai.system_id}`,
      channel: `vrpc.${ADDRESS}.${dai.system_id}`,
      name: 'RT7d8...cM3Wy',
      network: dai.system_id,
    };

    expect(
      getSubWalletCardTitle(mainCard, {address: ADDRESS, coin: dai}).chainLabel,
    ).toBe('on Verus');
    expect(
      getSubWalletCardTitle(bridgeCard, {address: ADDRESS, coin: dai})
        .chainLabel,
    ).toBe('on Verus');
  });

  it('names a VRSCTEST card "on Verus Testnet", never the ticker', () => {
    const system = coinsList.VRSCTEST.system_id;
    const wallet = {
      id: `SUBWALLET_vrpc.${ADDRESS}.${system}`,
      channel: `vrpc.${ADDRESS}.${system}`,
      name: 'RT7d8...cM3Wy',
      network: system,
    };

    const title = getSubWalletCardTitle(wallet, {
      address: ADDRESS,
      coin: coinsList.VRSCTEST,
    });

    expect(title.chainLabel).toBe('on Verus Testnet');
  });

  it('names a PBaaS chain by its short ticker, not its display name', () => {
    const system = VARRR.system_id;
    const wallet = {
      id: `SUBWALLET_vrpc.${ADDRESS}.${system}`,
      channel: `vrpc.${ADDRESS}.${system}`,
      name: 'RT7d8...cM3Wy',
      network: system,
    };

    const title = getSubWalletCardTitle(wallet, {
      address: ADDRESS,
      coin: VARRR,
    });

    expect(title.chainLabel).toBe('on vARRR');
  });

  it('gives an Ethereum card no chain label', () => {
    const wallet = {
      id: 'MAIN_WALLET',
      channel: 'eth',
      name: 'Main',
      network: '.eth',
    };

    const title = getSubWalletCardTitle(wallet, {
      address: '0x52908400098527886E0F7030069857D2E4169EE7',
      coin: coinsList.ETH,
    });

    expect(title.chainLabel).toBeNull();
    expect(title.text).toBe('0x5290…169EE7');
  });
});
