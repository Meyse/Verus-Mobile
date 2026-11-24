import {getAdvancedFormData} from '../advancedForm';
import {getAdvancedResultCaption, getAdvancedReview} from '../advancedReview';
import {
  SEND_MODAL_SHOW_CONVERTTO_FIELD,
  SEND_MODAL_SHOW_EXPORTTO_FIELD,
  SEND_MODAL_SHOW_IS_PRECONVERT,
  SEND_MODAL_SHOW_MAPPING_FIELD,
  SEND_MODAL_SHOW_VIA_FIELD,
} from '../../../utils/constants/sendModal';

const review = ({preconvert = false, estimate = null} = {}) =>
  getAdvancedReview({
    preflight: {
      output: {
        currency: 'iVRSC',
        satoshis: 100000000,
        address: {getAddressString: () => 'RAddr'},
        convertto: 'iDAI',
        preconvert,
      },
      validation: {fees: {}, sent: {iVRSC: 100000000}},
      names: {iVRSC: 'VRSCTEST', iDAI: 'DAI.vETH'},
      deltas: {},
      source: 'RSource',
      estimate,
    },
    balances: {},
    coinObj: {proto: 'vrsc'},
    priceEstimate: null,
  });

describe('Advanced form parity with upstream', () => {
  it('flags a conversion without an estimate, not a pre-conversion', () => {
    expect(review().noEstimate).toBe(true);
    expect(review({preconvert: true}).noEstimate).toBe(false);
  });

  it('has an estimate row value when an estimate exists, also on a pre-conversion', () => {
    const estimate = {estimatedcurrencyout: 12.5};
    expect(review({estimate}).estimated).toBe('12.5 DAI.vETH');
    expect(review({estimate}).noEstimate).toBe(false);
    expect(review({estimate, preconvert: true}).estimated).toBe('12.5 DAI.vETH');
    expect(review().estimated).toBeNull();
  });

  it('hides Convert to, Via and preconvert with conversion disabled, keeps Export to', () => {
    const on = getAdvancedFormData({proto: 'vrsc'}, false);
    const off = getAdvancedFormData({proto: 'vrsc'}, true);
    [SEND_MODAL_SHOW_CONVERTTO_FIELD, SEND_MODAL_SHOW_VIA_FIELD, SEND_MODAL_SHOW_IS_PRECONVERT].forEach(key => {
      expect(on[key]).toBe(true);
      expect(off[key]).toBe(false);
    });
    expect(off[SEND_MODAL_SHOW_EXPORTTO_FIELD]).toBe(true);
    expect(getAdvancedFormData({proto: 'eth'}, true)[SEND_MODAL_SHOW_MAPPING_FIELD]).toBe(true);
  });

  it('explains a burn on the result page', () => {
    expect(getAdvancedResultCaption({burn: true})).toMatch(/removed from circulation/);
    expect(getAdvancedResultCaption({convertto: 'x'})).toMatch(/Conversions and cross-chain/);
    expect(getAdvancedResultCaption({})).toMatch(/follow the transaction/);
  });
});
