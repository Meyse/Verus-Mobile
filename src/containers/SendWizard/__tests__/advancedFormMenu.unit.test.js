import {SEND_WIZARD_MODE, shouldShowAdvancedFormMenu} from '../wizardUtils';

const card = {id: 'card'};
const plain = {sourceSubWallet: card, channel: 'vrpc.RAddr.iSystem'};
const show = (overrides = {}) =>
  shouldShowAdvancedFormMenu({
    mode: SEND_WIZARD_MODE.SEND,
    routeName: 'SendWizardAmount',
    state: plain,
    ...overrides,
  });

describe('Advanced form entry in the header More options menu', () => {
  it('shows on Convert to in Convert, and on a plain Send Amount', () => {
    expect(
      show({mode: SEND_WIZARD_MODE.CONVERT, routeName: 'SendWizardSelectTarget'}),
    ).toBe(true);
    expect(show()).toBe(true);
  });

  it('is absent on Convert Amount and on other steps', () => {
    expect(show({mode: SEND_WIZARD_MODE.CONVERT})).toBe(false);
    expect(show({routeName: 'SendWizardRecipient'})).toBe(false);
    expect(show({routeName: 'SendWizardSelectSource'})).toBe(false);
  });

  it('is absent without a source card', () => {
    expect(show({state: {...plain, sourceSubWallet: null}})).toBe(false);
  });

  it.each([
    ['a scanned request', {scanRequest: {address: 'RAddr'}}],
    ['an invoice', {invoice: {}}],
    ['a pre-conversion', {route: {preconvert: true}}],
    ['a card that is not on a conversion channel', {channel: 'dlight_private.zs1.x'}],
  ])('is absent for Send with %s', (_name, extra) => {
    expect(show({state: {...plain, ...extra}})).toBe(false);
  });

  it('is absent when conversion is disabled', () => {
    expect(show({conversionDisabled: true})).toBe(false);
  });
});
