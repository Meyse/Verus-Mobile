// PR 266 pick ADV: the Advanced form's Confirm reads the old Confirm's facts
// from the prepared transaction. Expected values are worked by hand.
const BigNumber = require('bignumber.js');
const {getAdvancedReview} = require('../../../containers/SendWizard/advancedReview');

const VRSC = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const BRIDGE = 'iSojYsotVzXz4wh2eJriASGo6UidJDDhL2';
const VETH = 'iCtawpxUiCc2sEupt7Z4u8SDAncGZpgSKm';
const address = id => ({getAddressString: () => id});

const preflight = (output, extra = {}) => ({
  output: {currency: VRSC, satoshis: '100000000', address: address('RAddr'), ...output},
  validation: {
    sent: {[VRSC]: '100000000'},
    fees: {[VRSC]: '20000'},
  },
  names: new Map([[VRSC, 'VRSCTEST'], [BRIDGE, 'Bridge.vETH'], [VETH, 'vETH']]),
  deltas: new Map([[VRSC, BigNumber(-100020000)]]),
  source: 'RSource',
  ...extra,
});

describe('getAdvancedReview', () => {
  const coinObj = {id: 'VRSCTEST', proto: 'vrsc'};

  it('reads a plain send: no conversion, 1-5 minutes, the balance after', () => {
    const review = getAdvancedReview({
      preflight: preflight({}),
      balances: {[VRSC]: '5'},
      coinObj,
      priceEstimate: null,
    });
    expect(review.sentAmount.toFixed()).toBe('1');
    expect(review.recipient).toBe('RAddr');
    expect(review.convertTo).toBeNull();
    expect(review.arrives).toBe('1-5 minutes');
    expect(review.conversionFee).toBeNull();
    expect(review.fees.map(item => `${item.amount.toFixed()} ${item.name}`)).toEqual(['0.0002 VRSCTEST']);
    // 5 - 1.0002 = 3.9998
    expect(review.remaining.map(item => item.amount.toFixed())).toEqual(['3.9998']);
    expect(review.enteredAmount).toBeNull();
  });

  it('names a conversion via a basket and takes the 0.05% conversion fee', () => {
    const review = getAdvancedReview({
      preflight: preflight(
        {convertto: VETH, via: BRIDGE},
        {estimate: {estimatedcurrencyout: 0.0003}},
      ),
      balances: {},
      coinObj,
      priceEstimate: null,
    });
    expect(review.convertTo).toBe('vETH via Bridge.vETH');
    expect(review.estimated).toBe('0.0003 vETH');
    expect(review.arrives).toBe('2-10 minutes');
    // 1 × 0.0005
    expect(review.conversionFee).toBe('0.0005 VRSCTEST');
  });

  it('shows the entered amount when the preflight lowered it', () => {
    const review = getAdvancedReview({
      preflight: preflight({}, {submittedsats: '100020000'}),
      balances: {},
      coinObj,
      priceEstimate: null,
    });
    expect(review.enteredAmount.toFixed()).toBe('1.0002');
  });

  it('has no arrival time for a pre-conversion and keeps the export network', () => {
    const review = getAdvancedReview({
      preflight: preflight({convertto: BRIDGE, preconvert: true, exportto: VETH}),
      balances: {},
      coinObj,
      priceEstimate: null,
    });
    expect(review.arrives).toBeNull();
    expect(review.preconvert).toBe(true);
    expect(review.toNetwork).toBe('vETH');
    expect(review.estimated).toBeNull();
  });

  it('names a currency whose controller can mint', () => {
    const review = getAdvancedReview({
      preflight: preflight({convertto: BRIDGE}, {converterdef: {proofprotocol: 2, fullyqualifiedname: 'Bridge.vETH'}}),
      balances: {},
      coinObj,
      priceEstimate: null,
    });
    expect(review.centralized).toBe('Bridge.vETH');
    expect(getAdvancedReview({preflight: preflight({}), balances: {}, coinObj, priceEstimate: null}).centralized).toBeNull();
  });
});
