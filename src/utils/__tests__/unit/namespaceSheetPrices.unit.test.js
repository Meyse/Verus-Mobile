/*
  PR 266 review R5 (owner pick A, 2026-11-19): the namespace sheet names the
  currency of every price, never shows "Free", has one "Price" heading and one
  network fee footnote, and marks the chosen row without a check mark.
*/
let mockState;
jest.mock('react-redux', () => ({
  useSelector: selector => selector(mockState),
  useDispatch: () => jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));
jest.mock('@react-navigation/native', () => ({useFocusEffect: jest.fn()}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('lucide-react-native', () => {
  const ReactModule = require('react');
  return new Proxy({}, {get: (target, name) => props => ReactModule.createElement(String(name), props)});
});
jest.mock('../../../components/BottomSheetModal', () => {
  const ReactModule = require('react');
  return props => (props.visible ? ReactModule.createElement('BottomSheetModal', null, props.children) : null);
});

const React = require('react');
const {act, create} = require('react-test-renderer');
const {NamespaceSheet} = require('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/RegistrationDesign');

const textOf = node => (typeof node === 'string' ? node : (node.children || []).map(textOf).join(''));
const rowOf = (view, name) => view.root.findAll(node => typeof node.type === 'string' &&
  node.props.accessibilityRole === 'button' && node.props.accessibilityLabel?.startsWith(`${name},`))[0];
const namespaces = [
  {id: 'iRoot', name: 'Verus Testnet', suffix: '@', amount: '10000000000', currency: 'VRSCTEST'},
  {id: 'iKbc', name: 'kbc', suffix: '.kbc@', amount: '10000000000', currency: 'kbc', referralRequired: true},
  {id: 'iLabs', name: 'labs', suffix: '.labs@', amount: '0', currency: 'labs'},
];

beforeEach(() => {
  mockState = {settings: {generalWalletSettings: {}}, ledger: {rates: {}}};
});

test('every price names its currency, a price of 0 is not "Free", and one footnote names the network fee', () => {
  let view;
  act(() => {
    view = create(<NamespaceSheet visible namespaces={namespaces} selectedId="iRoot" nativeCurrency="VRSCTEST"
      onClose={jest.fn()} onSelect={jest.fn()} onRetry={jest.fn()} />);
  });
  const shown = textOf(view.root);

  expect(shown).toContain('Price');
  expect(shown).toContain('100 VRSCTEST');
  expect(shown).toContain('100 kbc');
  expect(shown).toContain('0 labs');
  expect(shown).not.toContain('Free');
  expect(shown.match(/Every VerusID also needs a network fee of at least 0\.0001 VRSCTEST\./g)).toHaveLength(1);
  expect(rowOf(view, 'labs').props.accessibilityLabel).toBe('labs, Price 0 labs');

  // The chosen row is marked by its fill and outline and its accessibility
  // state, not by a check mark.
  expect(rowOf(view, 'Verus Testnet').props.accessibilityState).toMatchObject({selected: true});
  expect(rowOf(view, 'kbc').props.accessibilityState).toMatchObject({selected: false});
  expect(view.root.findAll(node => node.type === 'Check')).toHaveLength(0);
  act(() => view.unmount());
});
