/*
  R4 option B (owner 2026-11-23): "About this amount" glyph after "You receive"
  next to an estimate only, and the one sheet "Estimated amount". Expected copy
  comes from the decision, not from the code.
*/
import React from 'react';
import {Clipboard, Pressable, StyleSheet} from 'react-native';
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

  // The receive row is 60 points high; the label line (22-point name above,
  // 18-point caption) puts the 16-point glyph at 33..49. A 44-point target that
  // stays inside the row, above the "Est. slippage" row, is 16..60: 17 above
  // the glyph and 11 below it. The row is the same with or without that row.
  it('keeps its 44-point target inside the receive row', () => {
    const slop = glyphs(estimate({}))[0].props.hitSlop;
    expect(slop).toEqual({top: 17, bottom: 11, left: 14, right: 14});
    expect(16 + slop.top + slop.bottom).toBe(44);
    expect(49 + slop.bottom).toBeLessThanOrEqual(60);
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

  // Before this branch a node copied on a LONG PRESS (and the accessibility
  // copy action); a single tap did nothing. The glyph is its own button.
  const longPress = element => {
    const host = element.findAll(n => typeof n.props.onResponderGrant === 'function')[0];
    const event = {nativeEvent: {touches: [], changedTouches: [], timestamp: 0}, persist() {}, target: 1, currentTarget: 1};
    act(() => host.props.onResponderGrant(event));
    act(() => { jest.advanceTimersByTime(800); });
    act(() => host.props.onResponderRelease(event));
  };

  it('copies the amount on a long press through the rendered pressable, not on a tap', () => {
    const spy = jest.spyOn(Clipboard, 'setString').mockImplementation(() => {});
    const view = node({onInfo: jest.fn()});
    const amount = view.root.find(n => n.type === Pressable && n.props.accessible === true);
    expect(amount.props.accessibilityActions).toEqual([{name: 'copy', label: 'Copy'}]);
    expect(amount.props.onPress).toBeUndefined();
    longPress(amount);
    expect(spy).toHaveBeenCalledWith('5.34');
    spy.mockRestore();
  });

  it('keeps the accessibility copy action on the amount', () => {
    const spy = jest.spyOn(Clipboard, 'setString').mockImplementation(() => {});
    const view = node({onInfo: jest.fn()});
    const amount = view.root.find(n => n.type === Pressable && n.props.accessible === true);
    act(() => amount.props.onAccessibilityAction({nativeEvent: {actionName: 'copy'}}));
    expect(spy).toHaveBeenCalledWith('5.34');
    spy.mockRestore();
  });

  it('also copies on a long press of the logo and of the label, as before the branch', () => {
    const spy = jest.spyOn(Clipboard, 'setString').mockImplementation(() => {});
    const view = node({onInfo: jest.fn(), coinId: 'DAI'});
    const logo = view.root.find(n => n.type === Pressable && n.props.accessible === false);
    longPress(logo);
    expect(spy).toHaveBeenCalledTimes(1);
    const head = view.root.find(n => n.type === 'Text' && n.props.children === 'You');
    act(() => head.props.onLongPress());
    const tail = view.root.find(n => n.type === 'Text' && n.props.children === 'receive');
    act(() => tail.props.onLongPress());
    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy).toHaveBeenLastCalledWith('5.34');
    spy.mockRestore();
  });

  it('wraps the label as before and keeps the glyph with its last word', () => {
    const view = node({onInfo: jest.fn()});
    // "You" + "receive ⓘ": the last word and the glyph are one unit, so they
    // wrap together; the label block gives way before the value does.
    const tail = view.root.find(n => n.type === 'Text' && n.props.children === 'receive');
    let unit = tail.parent;
    const hasGlyph = n => n.findAll(c => c.props.accessibilityLabel === 'About this amount').length > 0;
    while (!hasGlyph(unit)) unit = unit.parent;
    expect(unit.findAll(n => n.type === 'Text' && n.props.children === 'You')).toHaveLength(0);
    // The unit sits in a wrapping row, and the label block cannot shrink below
    // the unit's measured width (rounded up: 71.6 reads as 72).
    const line = view.root.findAll(
      n => typeof n.type === 'string' && StyleSheet.flatten(n.props.style || {}).flexWrap === 'wrap',
    );
    expect(line.length).toBeGreaterThan(0);
    const measured = unit.findAll(n => typeof n.props.onLayout === 'function')[0];
    act(() => measured.props.onLayout({nativeEvent: {layout: {width: 71.6}}}));
    const block = view.root.findAll(
      n => typeof n.type === 'string' && StyleSheet.flatten(n.props.style || {}).minWidth === 72,
    );
    expect(block.length).toBeGreaterThan(0);
    expect(StyleSheet.flatten(block[0].props.style).flexShrink).toBe(100);
    const ticker = view.root.find(n => n.type === 'Text' && n.props.numberOfLines === 1 &&
      String(n.props.children).includes('DAI'));
    expect(StyleSheet.flatten(ticker.props.style).flexShrink).toBe(0);
    const plain = node({});
    const plainLabel = plain.root.find(n => n.type === 'Text' && n.props.children === 'You receive');
    expect(plainLabel.props.numberOfLines).toBe(2);
    const plainTicker = plain.root.find(n => n.type === 'Text' && n.props.numberOfLines === 1 &&
      String(n.props.children).includes('DAI'));
    expect(StyleSheet.flatten(plainTicker.props.style).flexShrink).toBe(0);
  });

  it('is heard once as "You receive"; the glyph target stops at the word gap', () => {
    const view = node({onInfo: jest.fn()});
    const head = view.root.find(n => n.type === 'Text' && n.props.children === 'You');
    expect(head.props.accessibilityLabel).toBe('You receive');
    expect(StyleSheet.flatten(head.props.style).paddingRight).toBe(4);
    const tail = view.root.find(n => n.type === 'Text' && n.props.children === 'receive');
    expect(tail.props.accessible).toBe(false);
    expect(tail.parent.parent.props.accessibilityElementsHidden).toBe(true);
    expect(tail.parent.parent.props.importantForAccessibility).toBe('no-hide-descendants');
    const glyph = view.root.find(n => n.props.accessibilityLabel === 'About this amount' && n.props.hitSlop);
    expect(glyph.props.hitSlop).toEqual({top: 14, bottom: 14, left: 6, right: 22});
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

  // The Amount step refocuses its field in onClosed; the real wrapper must pass it on.
  it('forwards onClosed to the sheet', () => {
    const onClosed = jest.fn();
    const view = mount(<EstimatedAmountSheet onClose={jest.fn()} onClosed={onClosed} visible />);
    expect(view.root.findByType('InfoSheet').props.onClosed).toBe(onClosed);
  });
});
