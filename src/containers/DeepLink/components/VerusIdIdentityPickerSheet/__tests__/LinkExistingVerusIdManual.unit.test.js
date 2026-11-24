/*
  PR 266 review I1 (owner pick A, 2026-11-19): manual entry in the shared link
  sheet.
   - the "Enter VerusID manually" row shows after the lookup in every result,
     not only after a failure, and not while the lookup runs
   - the wallet's own Link links a revoked VerusID and a VerusID that needs
     other signers by hand, as upstream does
   - a request picker still refuses a revoked VerusID (it must sign)
   - a VerusID without a wallet primary address is refused, as upstream
*/
import React from 'react';
import {act, create} from 'react-test-renderer';

const WALLET = 'RWalletAddress000000000000000000000000';
const OTHER = 'ROtherSignerAddress0000000000000000000';
const mockGetIdentitiesWithAddress = jest.fn();
const mockGetIdentity = jest.fn();
const mockStoreState = {
  authentication: {
    activeAccount: {
      accountHash: 'account-a',
      keys: {VRSCTEST: {vrpc: {addresses: [WALLET]}}},
    },
    sessionEpoch: 3,
  },
};

jest.mock('../../../../../store', () => ({
  __esModule: true,
  default: {getState: () => mockStoreState},
}));
jest.mock('../../../../../utils/api/channels/verusid/callCreators', () => ({
  getFriendlyNameMap: jest.fn(async () => ({})),
  getIdentitiesWithAddress: (...args) => mockGetIdentitiesWithAddress(...args),
  getIdentity: (...args) => mockGetIdentity(...args),
}));
jest.mock('react-redux', () => ({
  useSelector: extractor => extractor(mockStoreState),
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
    Defs: stub('Defs'),
    LinearGradient: stub('LinearGradient'),
    Rect: stub('Rect'),
    Stop: stub('Stop'),
  };
});
jest.mock('lucide-react-native', () => {
  const ReactModule = require('react');
  return new Proxy(
    {},
    {get: (target, name) => props => ReactModule.createElement(String(name), props)},
  );
});
jest.mock('../../../../../components/BottomSheetModal', () => {
  const ReactModule = require('react');
  return props =>
    props.visible
      ? ReactModule.createElement('BottomSheetModal', null, props.children)
      : null;
});
jest.mock('../../../../../components/SkeletonLoader', () => {
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

const LinkExistingVerusIdSheet = require('../LinkExistingVerusIdSheet').default;
const {LINK_EXISTING_VERUSID_SHEET_MODES} = require('../LinkExistingVerusIdSheet');

const flush = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
  });
};
const textOf = node =>
  typeof node === 'string' ? node : (node.children || []).map(textOf).join('');
const pressableByLabel = (renderer, label) =>
  renderer.root.findAll(
    node =>
      typeof node.props?.onPress === 'function' &&
      node.props?.accessibilityLabel === label,
  )[0];
const press = async (renderer, label) => {
  const node = pressableByLabel(renderer, label);
  expect(node).toBeTruthy();
  await act(async () => {
    node.props.onPress();
  });
  await flush();
};
const identity = ({status = 'active', primaryaddresses = [WALLET], minimumsignatures = 1} = {}) => ({
  error: null,
  result: {
    fullyqualifiedname: 'alice.VRSCTEST@',
    identity: {
      identityaddress: 'iAlice',
      name: 'alice',
      primaryaddresses,
      minimumsignatures,
    },
    status,
  },
});

const mount = async props => {
  let renderer;
  await act(async () => {
    renderer = create(
      <LinkExistingVerusIdSheet
        active
        coinObj={{id: 'VRSCTEST', system_id: 'iSystemId'}}
        isCandidateAllowed={() => true}
        linkedIds={{}}
        onLinkCandidate={jest.fn(async () => {})}
        {...props}
      />,
    );
  });
  await flush();
  return renderer;
};
const lookUpByHand = async props => {
  const renderer = await mount({
    initialMode: LINK_EXISTING_VERUSID_SHEET_MODES.MANUAL,
    initialManualValue: 'alice.VRSCTEST@',
    ...props,
  });
  await press(renderer, 'Look up VerusID');
  return renderer;
};

beforeEach(() => {
  mockGetIdentitiesWithAddress.mockReset().mockResolvedValue({error: null, result: []});
  mockGetIdentity.mockReset();
});

describe('Link VerusID sheet manual entry', () => {
  it('shows the manual row after a lookup that finds VerusIDs or none, but not while it runs', async () => {
    let finishLookup;
    mockGetIdentitiesWithAddress.mockReturnValueOnce(
      new Promise(resolve => {
        finishLookup = resolve;
      }),
    );
    mockGetIdentity.mockResolvedValue(identity());
    const found = await mount();
    expect(pressableByLabel(found, 'Enter VerusID manually')).toBeUndefined();

    await act(async () => {
      finishLookup({error: null, result: [{identityaddress: 'iAlice'}]});
    });
    await flush();
    expect(pressableByLabel(found, 'Link alice.VRSCTEST@')).toBeTruthy();
    expect(pressableByLabel(found, 'Enter VerusID manually')).toBeTruthy();

    const none = await mount();
    expect(textOf(none.root)).toContain('No VerusIDs were found for this wallet.');
    expect(pressableByLabel(none, 'Enter VerusID manually')).toBeTruthy();
  });

  it('links a revoked VerusID by hand in the wallet and says that linking does not recover it', async () => {
    mockGetIdentity.mockResolvedValue(identity({status: 'revoked'}));
    const onLinkCandidate = jest.fn(async () => {});
    const renderer = await lookUpByHand({allowInactive: true, onLinkCandidate});

    expect(textOf(renderer.root)).toContain('Revoked');
    expect(textOf(renderer.root)).toContain(
      'This VerusID is revoked. Linking shows it in your wallet. It does not recover it.',
    );
    expect(textOf(renderer.root)).not.toContain('Only active VerusIDs');

    await press(renderer, 'Link alice.VRSCTEST@');
    expect(onLinkCandidate).toHaveBeenCalledTimes(1);
    expect(onLinkCandidate.mock.calls[0][0]).toMatchObject({
      identityAddress: 'iAlice',
      primaryAddress: WALLET,
      status: 'revoked',
    });
  });

  it('links by hand a VerusID that needs another signer', async () => {
    mockGetIdentity.mockResolvedValue(
      identity({primaryaddresses: [OTHER, WALLET], minimumsignatures: 2}),
    );
    const onLinkCandidate = jest.fn(async () => {});
    const renderer = await lookUpByHand({allowInactive: true, onLinkCandidate});

    expect(textOf(renderer.root)).not.toContain('This VerusID is revoked.');
    await press(renderer, 'Link alice.VRSCTEST@');
    expect(onLinkCandidate.mock.calls[0][0]).toMatchObject({
      identityAddress: 'iAlice',
      primaryAddress: WALLET,
    });
  });

  it('keeps the active-only rule in a request picker', async () => {
    mockGetIdentity.mockResolvedValue(identity({status: 'revoked'}));
    const onLinkCandidate = jest.fn(async () => {});
    const renderer = await lookUpByHand({onLinkCandidate});

    expect(textOf(renderer.root)).toContain('Only active VerusIDs can be linked.');
    expect(pressableByLabel(renderer, 'Link alice.VRSCTEST@')).toBeUndefined();
    expect(onLinkCandidate).not.toHaveBeenCalled();
  });

  it('refuses a VerusID without a primary address from this wallet, as upstream', async () => {
    mockGetIdentity.mockResolvedValue(identity({primaryaddresses: [OTHER]}));
    const onLinkCandidate = jest.fn(async () => {});
    const renderer = await lookUpByHand({allowInactive: true, onLinkCandidate});

    expect(textOf(renderer.root)).toContain(
      'This VerusID does not use a primary address from this wallet.',
    );
    expect(onLinkCandidate).not.toHaveBeenCalled();
  });
});
