// PR 266 review R8, option C with the owner's change (2026-11-19): a card's
// title is its short address (first and last 6 characters) or its VerusID
// name or "Private", then the network.
const {getSubWalletCardTitle} = require('../../subwallet/cardPresentation');
const {coinsList} = require('../../CoinData/CoinsList');

const VRSC_SYSTEM = coinsList.VRSC.system_id;
const ADDRESS = 'RT7d8LpBk2mqZ9wXv4sJq4HcM3Wy';

describe('card title', () => {
  it('names a transparent card by its short address and its network', () => {
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

    expect(title.text).toBe('RT7d8L…HcM3Wy · VRSC');
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

    expect(title.text).toBe('RT7d8L…HcM3Wy · VRSC');
  });

  it('names a VerusID card by its name and its network', () => {
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

    expect(title.text).toBe('alice@ · VRSC');
    expect(title.isAddress).toBe(false);
  });

  it('drops the network when the VerusID name already ends in it', () => {
    const system = coinsList.VRSCTEST.system_id;
    const wallet = {
      id: `SUBWALLET_vrpc.iDevphone.${system}`,
      channel: `vrpc.iDevphone.${system}`,
      name: 'devphone.VRSCTEST@',
      network: system,
    };

    const title = getSubWalletCardTitle(wallet, {coin: coinsList.VRSCTEST});

    expect(title.text).toBe('devphone.VRSCTEST@');
    expect(title.network).toBeNull();
  });

  it('names the private card "Private" with its network', () => {
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

    expect(title.text).toBe('Private · VRSC');
  });

  it('names a Bitcoin Testnet4 card by its short address and BTCTEST', () => {
    const wallet = {id: 'MAIN_WALLET', channel: 'electrum', name: 'Main'};

    const title = getSubWalletCardTitle(wallet, {
      address: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
      coin: coinsList.TESTNET,
    });

    expect(title.text).toBe('tb1qw5…xpjzsx · BTCTEST');
  });

  it('names a Komodo card by its coin ticker, not its system id', () => {
    const wallet = {id: 'MAIN_WALLET', channel: 'electrum', name: 'Main'};

    const title = getSubWalletCardTitle(wallet, {
      address: 'RKomodoAddressxxxxxxxxxxxxxxQ3Zp7',
      coin: coinsList.KMD,
    });

    expect(title.text).toBe('RKomod…xQ3Zp7 · KMD');
  });

  it('names the cards of an asset on two networks apart', () => {
    // The vETH system.
    const other = 'i9nwxtKuVYX4MSbeULLiK2ttVi6rUEhh4X';
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
    const bridged = getSubWalletCardTitle(card(other), {
      address: ADDRESS,
      coin: coinsList.VRSC,
    });

    expect(own.text).toBe('RT7d8L…HcM3Wy · VRSC');
    expect(bridged.text).toBe('RT7d8L…HcM3Wy · vETH');
  });
});
