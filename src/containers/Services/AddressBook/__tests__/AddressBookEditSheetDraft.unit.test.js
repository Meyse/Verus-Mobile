/*
  BottomSheetModal hides its native modal while an app alert is open, which
  unmounts the sheet content. A label edit in progress must come back
  unchanged when the alert closes.
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
jest.mock('../../../../components/AppAddressInput', () => {
  const RN = require('react');
  return RN.forwardRef((props, ref) =>
    RN.createElement('AppAddressInput', props),
  );
});
jest.mock('../../../../components/AppButton', () => props => {
  const RN = require('react');
  return RN.createElement('AppButton', props, props.children);
});
jest.mock('../../../../components/SafeBottomActionStack', () => props => props.children);
jest.mock('../../../../components/BarcodeReader/BarcodeReader', () => 'BarcodeReader');
jest.mock('../../../../components/OnboardingBackButton', () => 'OnboardingBackButton');
jest.mock('../../../../utils/QrScanner/QrScanner', () => ({}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MCIcon');

const AddressBookEditSheet = require('../AddressBookEditSheet').default;

const editing = {
  id: 'entry-1',
  address: 'iGHXn8mvh9kutBNotJ2LCNz3zDxvemEb2i',
  label: 'Test Bob',
};
const element = props => (
  <AddressBookEditSheet
    editing={editing}
    onClose={jest.fn()}
    onSave={jest.fn()}
    visible
    {...props}
  />
);
const labelInput = renderer => renderer.root.findByType('AppTextInput');

describe('AddressBookEditSheet draft', () => {
  beforeEach(() => {
    mockAlertActive = false;
  });

  it('keeps the edited label when an alert hides the sheet and closes again', () => {
    let renderer;
    act(() => {
      renderer = create(element());
    });
    act(() => {
      labelInput(renderer).props.onChangeText('Test XYZ Bob');
    });

    mockAlertActive = true;
    act(() => renderer.update(element()));
    mockAlertActive = false;
    act(() => renderer.update(element()));

    expect(labelInput(renderer).props.value).toBe('Test XYZ Bob');
    act(() => renderer.unmount());
  });

  it('starts from the saved entry when the sheet opens again', () => {
    let renderer;
    act(() => {
      renderer = create(element());
    });
    act(() => {
      labelInput(renderer).props.onChangeText('Edited');
    });
    act(() => renderer.update(element({visible: false})));
    act(() => renderer.update(element({visible: true})));

    expect(labelInput(renderer).props.value).toBe('Test Bob');
    act(() => renderer.unmount());
  });
});
