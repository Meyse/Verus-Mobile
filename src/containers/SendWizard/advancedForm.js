import {
  SEND_MODAL_ADVANCED_FORM,
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_CONVERTTO_FIELD,
  SEND_MODAL_DISABLED_INPUTS,
  SEND_MODAL_EXPORTTO_FIELD,
  SEND_MODAL_IS_PRECONVERT,
  SEND_MODAL_MAPPING_FIELD,
  SEND_MODAL_MEMO_FIELD,
  SEND_MODAL_PRICE_ESTIMATE,
  SEND_MODAL_SHOW_CONVERTTO_FIELD,
  SEND_MODAL_SHOW_EXPORTTO_FIELD,
  SEND_MODAL_SHOW_IS_PRECONVERT,
  SEND_MODAL_SHOW_MAPPING_FIELD,
  SEND_MODAL_SHOW_VIA_FIELD,
  SEND_MODAL_TO_ADDRESS_FIELD,
  SEND_MODAL_VIA_FIELD,
} from '../../utils/constants/sendModal';

// The unguided form of the wallet before the redesign (PR 266 feedback F7):
// the user enters every value of a conversion, a pre-conversion, a
// cross-chain transfer or an off-chain send by hand. These are the fields of
// upstream's "Advanced" choice on the Send tab (SendCoin.js). The wizard's
// Advanced form step (SendWizardAdvanced, PR 266 pick ADV) starts from them.
export const getAdvancedFormData = coin => ({
  [SEND_MODAL_TO_ADDRESS_FIELD]: '',
  [SEND_MODAL_AMOUNT_FIELD]: '',
  [SEND_MODAL_MEMO_FIELD]: '',
  [SEND_MODAL_CONVERTTO_FIELD]: '',
  [SEND_MODAL_EXPORTTO_FIELD]: '',
  [SEND_MODAL_VIA_FIELD]: '',
  [SEND_MODAL_MAPPING_FIELD]: '',
  [SEND_MODAL_PRICE_ESTIMATE]: null,
  [SEND_MODAL_IS_PRECONVERT]: false,
  [SEND_MODAL_SHOW_CONVERTTO_FIELD]: true,
  [SEND_MODAL_SHOW_EXPORTTO_FIELD]: true,
  [SEND_MODAL_SHOW_MAPPING_FIELD]: coin?.proto === 'erc20' || coin?.proto === 'eth',
  [SEND_MODAL_SHOW_VIA_FIELD]: true,
  [SEND_MODAL_ADVANCED_FORM]: true,
  [SEND_MODAL_SHOW_IS_PRECONVERT]: true,
  [SEND_MODAL_DISABLED_INPUTS]: {},
});

// The old form's Help, as two topics of the Advanced form's info sheet.
export const ADVANCED_FORM_HELP = [
  {
    title: 'Conversions and transfers',
    body: 'To convert funds to another currency, or to send them to another network, fill in the matching fields.',
  },
  {
    title: 'Timing',
    body: 'Conversions and cross-chain transfers can take a few minutes to complete, even after the funds show as sent.',
  },
];
