/*
  R4 option B (owner 2026-11-23): "About this amount" glyph after "You receive"
  next to an estimate only, and the one sheet "Estimated amount". Expected copy
  comes from the decision, not from the code.
*/
import React from 'react';
import {Clipboard, Pressable} from 'react-native';
import {act, create} from 'react-test-renderer';

jest.mock('../../../theme/onboarding', () => ({
  useOnboardingTheme: () => ({colors: {textSubtle: '#888', textPrimary: '#000', textSecondary: '#555', border: '#ddd'}, typography: {}}),
}));
jest.mock('lucide-react-native', () => ({Info: 'InfoIcon'}));
jest.mock('../../../components/InfoSheet', () => props => {
  const ReactModule = require('react');
  return props.visible
    ? ReactModule.createElement('InfoSheet', props, props.children)
    : null;
});
jest.mock('../../../components/SkeletonLoader', () => ({
  __esModule: true, default: 'SkeletonLoader', SkeletonBlock: 'SkeletonBlock',
}));
jest.mock('../../../components/StatusBadge', () => 'StatusBadge');
jest.mock('../../../components/CopyFeedback', () => props => props.children);
jest.mock('../../../components/PrivacyBlurredText', () => 'PrivacyBlurredText');
jest.mock('../../../utils/CoinData/Graphics', () => ({AssetCoinLogo: 'AssetCoinLogo'}));
jest.mock('../../../containers/SendWizard/components/ViaLine', () => 'ViaLine');
jest.mock('../../../containers/SendWizard/components/WizardUI', () => ({FlatRow: 'FlatRow'}));
jest.mock('../../haptics/haptics', () => ({triggerLightHaptic: jest.fn()}));

jest.useFakeTimers();
const AmountEstimate = require('../../../containers/SendWizard/components/AmountEstimate').default;
const {TransferNode} = require('../../../containers/SendWizard/components/TransferSummary');
const {
  EstimatedAmountSheet,
  ESTIMATE_INFO_LABEL,
  ESTIMATE_SHEET_BODY,
  ESTIMATE_SHEET_TITLE,
} = require('../../../containers/SendWizard/components/EstimateInfo');

const TITLE = 'Estimated amount';
const BODY = 'The network sets the final amount when it processes your conversion. All conversions through the same basket in one block get the same price. Other conversions in that block can move your amount up or down.';
const target = {id: 'DAI', ticker: 'DAI.vETH', name: 'DAI.vETH'};

const mount = element => {
  let view;
  act(() => { view = create(element); });
  return view;
};
const glyphs = view => view.root.findAll(
  node => node.type === Pressable && node.props.accessibilityLabel === ESTIMATE_INFO_LABEL,
);

describe('Amount step glyph', () => {
  const estimate = props => mount(
    <AmountEstimate
      estimateLoading={false}
      estimatedOutput={5.34}
      onOpenEstimateInfo={jest.fn()}
      priceImpact={{impact: null, level: 'none'}}
      target={target}
      {...props}
    />,
  );

  it('shows with an estimate, as a button, and opens on press', () => {
    const onOpenEstimateInfo = jest.fn();
    const view = estimate({onOpenEstimateInfo});
    expect(glyphs(view)).toHaveLength(1);
    expect(glyphs(view)[0].props.accessibilityRole).toBe('button');
    act(() => glyphs(view)[0].props.onPress());
    expect(onOpenEstimateInfo).toHaveBeenCalledTimes(1);
  });

  it('is hidden without an estimate: empty amount, failed estimate, loading, launch', () => {
    expect(glyphs(estimate({estimatedOutput: null}))).toHaveLength(0);
    expect(glyphs(estimate({estimatedOutput: null, estimateFailed: true}))).toHaveLength(0);
    expect(glyphs(estimate({estimateLoading: true}))).toHaveLength(0);
    expect(glyphs(estimate({atLaunch: true, estimatedOutput: null}))).toHaveLength(0);
  });
});

describe('TransferNode glyph', () => {
  const node = props => mount(
    <TransferNode amount="≈ 5.34" copyValue="5.34" label="You receive" ticker="DAI" {...props} />,
  );

  it('opens the sheet from the glyph and does not copy the amount', () => {
    const spy = jest.spyOn(Clipboard, 'setString').mockImplementation(() => {});
    const onInfo = jest.fn();
    const view = node({onInfo});
    expect(glyphs(view)).toHaveLength(1);
    act(() => glyphs(view)[0].props.onPress());
    expect(onInfo).toHaveBeenCalledTimes(1);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('keeps the copy action on the amount', () => {
    const spy = jest.spyOn(Clipboard, 'setString').mockImplementation(() => {});
    const view = node({onInfo: jest.fn()});
    const copyTarget = view.root.findAll(node => typeof node.props.onLongPress === 'function')[0];
    act(() => copyTarget.props.onLongPress());
    expect(spy).toHaveBeenCalledWith('5.34');
    spy.mockRestore();
  });

  it('has no glyph without onInfo (invoice, pre-conversion, send)', () => {
    expect(glyphs(node({}))).toHaveLength(0);
  });
});

describe('Estimated amount sheet', () => {
  it('has the decided title and body', () => {
    expect(ESTIMATE_SHEET_TITLE).toBe(TITLE);
    expect(ESTIMATE_SHEET_BODY).toBe(BODY);
    const view = mount(<EstimatedAmountSheet onClose={jest.fn()} visible />);
    const sheet = view.root.findByType('InfoSheet');
    expect(sheet.props.title).toBe(TITLE);
    expect(view.root.findAll(n => n.children?.includes?.(BODY))).not.toHaveLength(0);
  });
});
