/*
  R6: a re-read of the stored VerusID record must not drop rows that are
  already on screen. Only the first load may end in the error state.
*/
import React from 'react';
import {act, create} from 'react-test-renderer';

const mockRequestServiceStoredData = jest.fn();
let mockController = null;

jest.mock('../../../../../utils/auth/authBox', () => ({
  requestServiceStoredData: (...args) => mockRequestServiceStoredData(...args),
}));

jest.mock('../VerusIdService.render', () => ({
  VerusIdServiceRender: function () {
    mockController = this;
    return null;
  },
}));

const VerusIdService = require('../VerusIdService').default.WrappedComponent;

const navigation = {setOptions: () => {}};
const dispatch = jest.fn();

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const renderService = async encryptedIds => {
  let renderer;
  await act(async () => {
    renderer = create(
      <VerusIdService
        dispatch={dispatch}
        navigation={navigation}
        encryptedIds={encryptedIds}
      />,
    );
  });
  await flush();
  return renderer;
};

const rerender = async (renderer, encryptedIds) => {
  await act(async () => {
    renderer.update(
      <VerusIdService
        dispatch={dispatch}
        navigation={navigation}
        encryptedIds={encryptedIds}
      />,
    );
  });
  await flush();
};

const ALICE = {VRSCTEST: {iAlice: 'alice.VRSCTEST@'}};

describe('VerusIdService linked VerusID refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockController = null;
  });

  it('keeps the rows when a refresh fails', async () => {
    mockRequestServiceStoredData.mockResolvedValueOnce({linked_ids: ALICE});
    const renderer = await renderService('cipher-1');
    expect(mockController.state.linkedIds).toEqual(ALICE);

    mockRequestServiceStoredData.mockRejectedValueOnce(new Error('read failed'));
    await rerender(renderer, 'cipher-2');

    expect(mockRequestServiceStoredData).toHaveBeenCalledTimes(2);
    expect(mockController.state.linkedIds).toEqual(ALICE);
    expect(mockController.state.loadError).toBeNull();
    renderer.unmount();
  });

  it('keeps the rows on screen while a refresh is running', async () => {
    mockRequestServiceStoredData.mockResolvedValueOnce({linked_ids: ALICE});
    const renderer = await renderService('cipher-1');

    let finishRead;
    mockRequestServiceStoredData.mockReturnValueOnce(
      new Promise(resolve => {
        finishRead = resolve;
      }),
    );
    await rerender(renderer, 'cipher-2');
    expect(mockController.state.linkedIds).toEqual(ALICE);

    const BOB = {VRSCTEST: {...ALICE.VRSCTEST, iBob: 'bob.VRSCTEST@'}};
    await act(async () => {
      finishRead({linked_ids: BOB});
    });
    await flush();
    expect(mockController.state.linkedIds).toEqual(BOB);
    renderer.unmount();
  });

  it('shows the error state when the first load fails', async () => {
    mockRequestServiceStoredData.mockRejectedValueOnce(new Error('read failed'));
    const renderer = await renderService('cipher-1');

    expect(mockController.state.linkedIds).toEqual({});
    expect(mockController.state.loadError).toBe('read failed');
    renderer.unmount();
  });

  it('shows the skeleton again when Try again runs after a failed first load', async () => {
    mockRequestServiceStoredData.mockRejectedValueOnce(new Error('read failed'));
    const renderer = await renderService('cipher-1');

    let finishRead;
    mockRequestServiceStoredData.mockReturnValueOnce(
      new Promise(resolve => {
        finishRead = resolve;
      }),
    );
    await act(async () => {
      mockController.getLinkedIds();
    });
    expect(mockController.state.linkedIds).toBeNull();
    expect(mockController.state.loadError).toBeNull();

    await act(async () => {
      finishRead({linked_ids: ALICE});
    });
    await flush();
    expect(mockController.state.linkedIds).toEqual(ALICE);
    renderer.unmount();
  });
});
