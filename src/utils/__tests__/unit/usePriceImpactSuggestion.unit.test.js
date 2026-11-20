// Audit row 16 (PR 266 round 2026-11-20): the smaller-amount suggestion asks
// estimateconversion once per settled amount on a route. A new estimate for
// the same amount (a changed impact) asks nothing again.
jest.mock('../../api/channels/vrpc/requests/estimateConversion', () => ({estimateConversion: jest.fn()}));

const React = require('react');
const BigNumber = require('bignumber.js');
const {act, create} = require('react-test-renderer');
const {estimateConversion} = require('../../api/channels/vrpc/requests/estimateConversion');
const {usePriceImpact} = require('../../../containers/SendWizard/usePriceImpact');
const {SendWizardProvider} = require('../../../containers/SendWizard/SendWizardContext');

jest.mock('react-redux', () => require('../../../tests/helpers/mockReactRedux')({
  useSelector: selector => selector({ledger: {balances: {}}}),
}));

const SOURCE = {id: 'VRSCTEST', currency_id: 'iSource', system_id: 'iSystem'};
const TARGET = {isConversion: true, transactionCurrency: 'iTarget'};
const ROUTE = {key: 'iTarget:local:b1:native:live', via: 'b1'};

describe('usePriceImpact suggestion (audit row 16)', () => {
  let result;
  let view;
  const Probe = props => {
    result = usePriceImpact(props);
    return null;
  };
  const render = output => (
    <SendWizardProvider mode="convert" initialState={{}}>
      <Probe
        channel="vrpc.RAddress.iSystem"
        sourceCoin={SOURCE}
        target={TARGET}
        route={ROUTE}
        amount={BigNumber(100)}
        output={output}
        rate={null}
      />
    </SendWizardProvider>
  );

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    // Market: 1 target per source unit for the 1-unit sample. A smaller
    // amount quotes at 0.99 per unit (1% below market).
    estimateConversion.mockImplementation((system, source, dest, amount) =>
      Promise.resolve({result: {
        estimatedcurrencyout: BigNumber(amount).isEqualTo(1)
          ? 1 : BigNumber(amount).multipliedBy(0.99).toNumber(),
      }}));
  });
  afterEach(() => {
    if (view) act(() => view.unmount());
    view = null;
    jest.useRealTimers();
  });

  it('quotes the suggestion once for one amount', async () => {
    // 100 in, 90 out: 10% below market, a danger level.
    await act(async () => {
      view = create(render(90));
    });
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(estimateConversion).toHaveBeenCalledTimes(2);
    expect(result.suggestion).not.toBeNull();

    // The same amount gets a new estimate: 89 out (11%).
    await act(async () => {
      view.update(render(89));
    });
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(estimateConversion).toHaveBeenCalledTimes(2);
    expect(result.suggestion).not.toBeNull();
  });
});
