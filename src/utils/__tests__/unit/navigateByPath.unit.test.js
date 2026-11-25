import {getHomeTabFor, navigateByPath} from '../../navigation/navigateByPath';

// A navigation object for one navigator, as React Navigation 7 gives it to a screen.
const navigator = (routeNames, focused, parent) => ({
  getParent: () => parent,
  getState: () => ({routeNames, index: 0, routes: [{name: focused}]}),
  navigate: jest.fn(),
});

const mainStack = navigator(['Home', 'CoinDetails', 'SendWizard'], 'SendWizard');
const homeTabs = focused => navigator(['WalletHome', 'ServicesHome', 'IdentityTab', 'SettingsHome', 'VerusPay'], focused, mainStack);

describe('navigateByPath', () => {
  it('navigates in this navigator when it owns the screen', () => {
    const walletStack = navigator(['Wallets', 'Service', 'Notifications'], 'Wallets', homeTabs('WalletHome'));

    navigateByPath(walletStack, ['Home', 'WalletHome', 'Notifications']);

    expect(walletStack.navigate).toHaveBeenCalledWith('Notifications', undefined, {pop: true});
  });

  it('navigates through the parent route when only an ancestor owns part of the path', () => {
    const sendWizard = navigator(['SendWizardRecipient'], 'SendWizardRecipient', mainStack);

    navigateByPath(sendWizard, ['Home', 'ServicesHome', 'AddressBook'], {id: 1});

    expect(sendWizard.navigate).toHaveBeenCalledWith('Home', {
      screen: 'ServicesHome',
      params: {screen: 'AddressBook', params: {id: 1}, pop: true},
      pop: true,
    }, {pop: true});
  });

  it('keeps the original call when no navigator owns a route on the path', () => {
    const signedOut = {navigate: jest.fn()};

    navigateByPath(signedOut, ['SignedInStack', 'Home', 'WalletHome', 'Notifications']);

    expect(signedOut.navigate).toHaveBeenCalledWith('Notifications', undefined);
  });
});

describe('getHomeTabFor', () => {
  it('uses the focused tab when it is the Wallet or the Services tab', () => {
    const servicesStack = navigator(['Services', 'Service'], 'Services', homeTabs('ServicesHome'));

    expect(getHomeTabFor(servicesStack)).toBe('ServicesHome');
  });

  it('uses the Wallet tab when the focused tab has no such screen', () => {
    const identityStack = navigator(['IdentityHome'], 'IdentityHome', homeTabs('IdentityTab'));

    expect(getHomeTabFor(identityStack)).toBe('WalletHome');
  });
});
