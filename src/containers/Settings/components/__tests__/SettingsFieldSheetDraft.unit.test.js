/*
  BottomSheetModal hides its native modal while an app alert is open, which
  unmounts the sheet content. An edit in progress must come back unchanged
  when the alert closes (for example "Remove server", then "Not now").
*/
import React from 'react';
import {act, create} from 'react-test-renderer';

let mockAlertActive = false;

jest.mock('../../../../components/BottomSheetModal', () => props =>
  props.visible && !mockAlertActive ? props.children : null,
);
jest.mock('../../../../components/AppTextInput', () => props => {
  const RN = require('react');
  return RN.createElement('AppTextInput', props);
});
jest.mock('../../../../components/AppButton', () => props => {
  const RN = require('react');
  return RN.createElement('AppButton', props, props.children);
});
jest.mock('../../../../components/SafeBottomActionStack', () => props => props.children);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MCIcon');

const SettingsFieldSheet = require('../SettingsFieldSheet').default;

const element = props => (
  <SettingsFieldSheet
    initialValue="https://v2api.verustest.net"
    label="Server"
    onClose={jest.fn()}
    onSave={jest.fn()}
    title="Verus Testnet"
    visible
    {...props}
  />
);
const input = renderer => renderer.root.findByType('AppTextInput');

describe('SettingsFieldSheet draft', () => {
  beforeEach(() => {
    mockAlertActive = false;
  });

  it('keeps the edited text when an alert hides the sheet and closes again', () => {
    let renderer;
    act(() => {
      renderer = create(element());
    });
    act(() => {
      input(renderer).props.onChangeText('https://v2api.verXYZustest.net');
    });

    mockAlertActive = true;
    act(() => renderer.update(element()));
    mockAlertActive = false;
    act(() => renderer.update(element()));

    expect(input(renderer).props.value).toBe('https://v2api.verXYZustest.net');
    act(() => renderer.unmount());
  });

  it('starts from the initial value when the sheet opens again', () => {
    let renderer;
    act(() => {
      renderer = create(element());
    });
    act(() => {
      input(renderer).props.onChangeText('https://edited.example');
    });
    act(() => renderer.update(element({visible: false})));
    act(() => renderer.update(element({visible: true})));

    expect(input(renderer).props.value).toBe('https://v2api.verustest.net');
    act(() => renderer.unmount());
  });
});
