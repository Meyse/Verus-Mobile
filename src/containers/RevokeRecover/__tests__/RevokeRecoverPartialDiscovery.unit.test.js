/*
  IS-4 (lead-developer review 2026-11-18): the revoke and recover target
  picker with an incomplete discovery result.

  The index lists alpha and beta; the getIdentity call for beta fails. The
  forms, the discovery hook, the discovery module and the picker sheet are the
  real code. Only the network request modules, key derivation, the store and
  native-only views are mocked.

  Expected: the sheet shows alpha, says that the list is incomplete, and keeps
  "Retry automatic lookup" and "Enter VerusID manually". Alpha is not selected
  automatically and the field stays a tappable chooser.
*/
import React from 'react';
import {act, create} from 'react-test-renderer';

// The first render loads the real forms and their module tree.
jest.setTimeout(60000);

const mockGetIdentitiesWithAddress = jest.fn();
const mockGetIdentity = jest.fn();
const mockGetIdentitiesWithRecovery = jest.fn();
const mockGetIdentitiesWithRevocation = jest.fn();
let mockState;

jest.mock('../../../utils/api/channels/verusid/requests/getIdentitiesWithAddress', () => ({
  getIdentitiesWithAddress: (...args) => mockGetIdentitiesWithAddress(...args),
}));
jest.mock('../../../utils/api/channels/verusid/requests/getIdentity', () => ({
  getIdentity: (...args) => mockGetIdentity(...args),
}));
jest.mock('../../../utils/api/channels/verusid/requests/getIdentitiesWithAuthority', () => ({
  getIdentitiesWithRecovery: (...args) => mockGetIdentitiesWithRecovery(...args),
  getIdentitiesWithRevocation: (...args) => mockGetIdentitiesWithRevocation(...args),
}));
jest.mock('../../../utils/api/channels/verusid/requests/updateIdentity', () => ({
  createRevokeIdentityTx: jest.fn(),
  createRecoverIdentityTx: jest.fn(),
}));
jest.mock('../../../utils/keys', () => ({
  deriveKeyPair: jest.fn(async () => ({
    addresses: ['RAuthorityPrimaryAddress1111111111'],
  })),
}));
jest.mock('../../../utils/seedCrypt', () => ({
  decryptkey: (_key, seed) => seed,
}));
jest.mock('../../../utils/CoinData/CoinDirectory', () => ({
  CoinDirectory: {
    findSystemCoinObj: () => ({id: 'VRSCTEST', display_name: 'VRSCTEST'}),
  },
}));
jest.mock('../../../store', () => ({
  __esModule: true,
  default: {getState: () => mockState, subscribe: () => () => {}, dispatch: jest.fn()},
}));
jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: extractor => extractor(mockState),
}));
jest.mock('../../../hooks/useObjectSelector', () => ({
  useObjectSelector: extractor => extractor(mockState),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
  SafeAreaProvider: ({children}) => children,
  SafeAreaView: ({children}) => children,
}));
jest.mock(
  'react-native-vector-icons/MaterialCommunityIcons',
  () => 'MaterialCommunityIcons',
);
jest.mock('lottie-react-native', () => 'LottieView');
jest.mock('react-native-svg', () => {
  const ReactModule = require('react');
  const stub = name => props =>
    ReactModule.createElement(name, props, props.children);

  return {
    __esModule: true,
    default: stub('Svg'),
    Circle: stub('Circle'),
    Defs: stub('Defs'),
    LinearGradient: stub('LinearGradient'),
    Path: stub('Path'),
    Rect: stub('Rect'),
    Stop: stub('Stop'),
  };
});
jest.mock('lucide-react-native', () => {
  const ReactModule = require('react');

  return new Proxy(
    {},
    {get: (_target, name) => props => ReactModule.createElement(String(name), props)},
  );
});
jest.mock('../../../components/BottomSheetModal', () => {
  const ReactModule = require('react');

  return props =>
    props.visible
      ? ReactModule.createElement(
          'BottomSheetModal',
          {onClose: props.onClose},
          props.children,
        )
      : null;
});
jest.mock('../../../components/SkeletonLoader', () => {
  const ReactModule = require('react');
  const stub = name => props =>
    ReactModule.createElement(name, props, props.children);

  return {
    __esModule: true,
    default: stub('SkeletonLoader'),
    SkeletonBlock: stub('SkeletonBlock'),
    SkeletonSection: stub('SkeletonSection'),
  };
});
jest.mock('../../../components/BarcodeReader/ScannerScreen', () => () => null);

const {AccessibilityInfo} = require('react-native');

if (AccessibilityInfo) {
  AccessibilityInfo.isReduceMotionEnabled = jest.fn(() => Promise.resolve(false));
  AccessibilityInfo.addEventListener = jest.fn(() => ({remove: jest.fn()}));
}

const constants = require('../../../utils/constants/sendModal');
const RevokeIdentityForm =
  require('../../../components/SendModal/RevokeIdentity/RevokeIdentityForm/RevokeIdentityForm').default;
const RecoverIdentityForm =
  require('../../../components/SendModal/RecoverIdentity/RecoverIdentityForm/RecoverIdentityForm').default;

const I_AUTH = 'iAuthority111111111111111111111111';
const I_ALPHA = 'iAlpha11111111111111111111111111111';
const I_BETA = 'iBeta111111111111111111111111111111';
const REVOKED = 0x8000;
const PARTIAL_TEXT =
  'Some VerusIDs couldn’t be loaded. This list may be incomplete.';

const authority = {
  identityaddress: I_AUTH,
  primaryaddresses: ['RAuthorityPrimaryAddress1111111111'],
  minimumsignatures: 1,
  flags: 0,
  revocationauthority: I_AUTH,
  recoveryauthority: I_AUTH,
};
const target = (address, name, flags) => ({
  identity: {
    identityaddress: address,
    name,
    flags,
    primaryaddresses: ['ROtherOwner111111111111111111111111'],
    minimumsignatures: 1,
    revocationauthority: I_AUTH,
    recoveryauthority: I_AUTH,
  },
  fullyqualifiedname: `${name}.VRSCTEST@`,
});

// `failing` is the set of i-addresses whose getIdentity call fails. Tests
// change it between discovery runs to model a retry.
let failing;
const setupNetwork = flags => {
  mockGetIdentitiesWithAddress.mockResolvedValue({result: [{identity: authority}]});
  const list = {
    result: [target(I_ALPHA, 'alpha', flags), target(I_BETA, 'beta', flags)],
  };
  mockGetIdentitiesWithRevocation.mockResolvedValue(list);
  mockGetIdentitiesWithRecovery.mockResolvedValue(list);
  mockGetIdentity.mockImplementation(async (_system, address) => {
    if (failing.has(address)) return {error: {code: -1, message: 'network timeout'}};
    return {result: target(address, address === I_ALPHA ? 'alpha' : 'beta', flags)};
  });
};

const buildProps = () => ({
  cancel: jest.fn(),
  loading: false,
  navigation: {navigate: jest.fn()},
  setIdentitySafetyRequestCloseHandler: jest.fn(),
  setLoading: jest.fn(),
  setModalHeight: jest.fn(),
  updateSendFormData: jest.fn(),
});

const flush = async () => {
  for (let index = 0; index < 6; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

// Host nodes only: a composite and its host view share the testID.
const byTestId = (renderer, testID) =>
  renderer.root.findAll(
    node => typeof node.type === 'string' && node.props?.testID === testID,
  );
const hasText = (renderer, text) =>
  renderer.root.findAll(
    node =>
      typeof node.type === 'string' &&
      (node.props?.children === text ||
        (Array.isArray(node.props?.children) && node.props.children.includes(text))),
  ).length > 0;
const press = async (renderer, testID) => {
  const [node] = renderer.root.findAll(
    item => item.props?.testID === testID && typeof item.props?.onPress === 'function',
  );
  expect(node).toBeTruthy();
  await act(async () => {
    node.props.onPress();
  });
  await flush();
};

describe.each([
  ['revoke', RevokeIdentityForm, constants.SEND_MODAL_IDENTITY_TO_REVOKE_FIELD, 0],
  ['recover', RecoverIdentityForm, constants.SEND_MODAL_IDENTITY_TO_RECOVER_FIELD, REVOKED],
])('%s picker with an incomplete discovery result', (_mode, Form, targetField, flags) => {
  let renderer;
  let props;

  beforeEach(async () => {
    jest.clearAllMocks();
    failing = new Set([I_BETA]);
    setupNetwork(flags);
    mockState = {
      authentication: {instanceKey: 'instance-key', signedIn: false, activeAccount: null},
      settings: {generalWalletSettings: {}},
      sendModal: {
        requestId: 'modal-1',
        data: {
          [targetField]: '',
          [constants.SEND_MODAL_SYSTEM_ID]: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq',
          [constants.SEND_MODAL_ENCRYPTED_IDENTITY_SEED]: 'authority-seed',
        },
      },
    };
    props = buildProps();
    await act(async () => {
      renderer = create(<Form {...props} />);
    });
    await flush();
  });

  afterEach(async () => {
    if (renderer) {
      await act(async () => renderer.unmount());
    }
    renderer = null;
  });

  it('lists the found target, says the list is incomplete, and selects nothing', () => {
    expect(byTestId(renderer, `revokeRecover.identity.option.${I_ALPHA}`)).toHaveLength(1);
    expect(byTestId(renderer, `revokeRecover.identity.option.${I_BETA}`)).toHaveLength(0);
    expect(hasText(renderer, PARTIAL_TEXT)).toBe(true);
    expect(byTestId(renderer, 'revokeRecover.identity.retry')).toHaveLength(1);
    expect(byTestId(renderer, 'revokeRecover.identity.manual')).toHaveLength(1);

    // No automatic selection, and the field stays a chooser the user can tap.
    expect(props.updateSendFormData).not.toHaveBeenCalledWith(targetField, I_ALPHA);
    expect(byTestId(renderer, 'revokeRecover.identity.single')).toHaveLength(0);
    expect(byTestId(renderer, 'revokeRecover.identity.choose').length).toBeGreaterThan(0);
  });

  it('shows the complete list after a retry that succeeds', async () => {
    failing = new Set();
    await press(renderer, 'revokeRecover.identity.retry');

    expect(byTestId(renderer, `revokeRecover.identity.option.${I_ALPHA}`)).toHaveLength(1);
    expect(byTestId(renderer, `revokeRecover.identity.option.${I_BETA}`)).toHaveLength(1);
    expect(hasText(renderer, PARTIAL_TEXT)).toBe(false);
    expect(byTestId(renderer, 'revokeRecover.identity.retry')).toHaveLength(0);
  });

  it('keeps the incomplete state and Retry after a retry that fails again', async () => {
    const callsBefore = mockGetIdentity.mock.calls.filter(([, address]) => address === I_BETA).length;
    await press(renderer, 'revokeRecover.identity.retry');

    expect(
      mockGetIdentity.mock.calls.filter(([, address]) => address === I_BETA).length,
    ).toBe(callsBefore + 1);
    expect(byTestId(renderer, `revokeRecover.identity.option.${I_ALPHA}`)).toHaveLength(1);
    expect(hasText(renderer, PARTIAL_TEXT)).toBe(true);
    expect(byTestId(renderer, 'revokeRecover.identity.retry')).toHaveLength(1);
    expect(byTestId(renderer, 'revokeRecover.identity.manual')).toHaveLength(1);
    expect(props.updateSendFormData).not.toHaveBeenCalledWith(targetField, I_ALPHA);
  });

  it('opens manual entry from the incomplete state', async () => {
    await press(renderer, 'revokeRecover.identity.manual');

    expect(byTestId(renderer, 'revokeRecover.identity.input').length).toBeGreaterThan(0);
    expect(byTestId(renderer, `revokeRecover.identity.option.${I_ALPHA}`)).toHaveLength(0);
  });

  it('replaces a selected target that a complete retry no longer lists', async () => {
    // Choose alpha from the partial list, then open the picker again.
    await press(renderer, `revokeRecover.identity.option.${I_ALPHA}`);
    expect(props.updateSendFormData).toHaveBeenLastCalledWith(targetField, I_ALPHA);
    await press(renderer, 'revokeRecover.identity.choose');

    // The retry succeeds, and the complete list holds only beta.
    failing = new Set();
    mockGetIdentitiesWithRevocation.mockResolvedValue({result: [target(I_BETA, 'beta', flags)]});
    mockGetIdentitiesWithRecovery.mockResolvedValue({result: [target(I_BETA, 'beta', flags)]});
    await press(renderer, 'revokeRecover.identity.retry');

    // Alpha is no longer offered: beta replaces it, not a locked alpha field.
    expect(props.updateSendFormData).toHaveBeenLastCalledWith(targetField, I_BETA);
    expect(hasText(renderer, 'alpha@')).toBe(false);
    expect(hasText(renderer, 'beta@')).toBe(true);
  });

  it('still selects the only target automatically when the list is complete', async () => {
    await act(async () => renderer.unmount());
    jest.clearAllMocks();
    failing = new Set();
    mockGetIdentitiesWithRevocation.mockResolvedValue({result: [target(I_ALPHA, 'alpha', flags)]});
    mockGetIdentitiesWithRecovery.mockResolvedValue({result: [target(I_ALPHA, 'alpha', flags)]});
    props = buildProps();
    await act(async () => {
      renderer = create(<Form {...props} />);
    });
    await flush();

    expect(props.updateSendFormData).toHaveBeenCalledWith(targetField, I_ALPHA);
    expect(byTestId(renderer, 'revokeRecover.identity.single').length).toBeGreaterThan(0);
  });
});

// Owner pick of 2026-11-19 (PR 266 review I1, applied to IS-4): the lookup can
// leave out a target, so manual entry stays in every state after the lookup.
describe.each([
  ['revoke', RevokeIdentityForm, constants.SEND_MODAL_IDENTITY_TO_REVOKE_FIELD, 0],
  ['recover', RecoverIdentityForm, constants.SEND_MODAL_IDENTITY_TO_RECOVER_FIELD, REVOKED],
])('%s picker with a complete or empty discovery result', (_mode, Form, targetField, flags) => {
  let renderer;
  const mountWith = async list => {
    jest.clearAllMocks();
    failing = new Set();
    setupNetwork(flags);
    mockGetIdentitiesWithRevocation.mockResolvedValue({result: list});
    mockGetIdentitiesWithRecovery.mockResolvedValue({result: list});
    mockState = {
      authentication: {instanceKey: 'instance-key', signedIn: false, activeAccount: null},
      settings: {generalWalletSettings: {}},
      sendModal: {
        requestId: 'modal-1',
        data: {
          [targetField]: '',
          [constants.SEND_MODAL_SYSTEM_ID]: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq',
          [constants.SEND_MODAL_ENCRYPTED_IDENTITY_SEED]: 'authority-seed',
        },
      },
    };
    await act(async () => {
      renderer = create(<Form {...buildProps()} />);
    });
    await flush();
  };

  afterEach(async () => {
    if (renderer) await act(async () => renderer.unmount());
    renderer = null;
  });

  it('offers manual entry under a complete list', async () => {
    await mountWith([target(I_ALPHA, 'alpha', flags), target(I_BETA, 'beta', flags)]);

    expect(byTestId(renderer, `revokeRecover.identity.option.${I_BETA}`)).toHaveLength(1);
    expect(byTestId(renderer, 'revokeRecover.identity.retry')).toHaveLength(0);
    await press(renderer, 'revokeRecover.identity.manual');
    expect(byTestId(renderer, 'revokeRecover.identity.input').length).toBeGreaterThan(0);
  });

  it('keeps the list and manual entry reachable from a single selected target', async () => {
    await mountWith([target(I_ALPHA, 'alpha', flags)]);

    await press(renderer, 'revokeRecover.identity.single');
    expect(byTestId(renderer, 'revokeRecover.identity.manual')).toHaveLength(1);
  });

  it('offers manual entry when the lookup finds no target', async () => {
    await mountWith([]);

    expect(byTestId(renderer, 'revokeRecover.identity.empty')).toHaveLength(1);
    await press(renderer, 'revokeRecover.identity.manualInline');
    expect(byTestId(renderer, 'revokeRecover.identity.input').length).toBeGreaterThan(0);
  });
});
