jest.mock('react-native-paper', () => ({
  Button: 'PaperButton', Text: 'Text', Provider: 'PaperProvider',
  Portal: 'Portal',
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('@react-navigation/elements', () => ({useHeaderHeight: () => 0}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0})}));
jest.mock('react-redux', () => ({
  connect: () => Component => props => require('react').createElement(Component, {dispatch: jest.fn(), modalStack: [], ...props}),
  useSelector: select => select({alert: {active: null}}),
}));
jest.mock('../../../store', () => ({dispatch: jest.fn()}));
jest.mock('../../vrpc/vrpcInterface', () => ({}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const Native = require('react-native');
const AppButton = require('../../../components/AppButton').default;
const AppTextInput = require('../../../components/AppTextInput').default;
const AlertModal = require('../../../components/Alert').default;
const AcknowledgeSheet = require('../../../components/AcknowledgeSheet').default;
const BottomSheetModal = require('../../../components/BottomSheetModal').default;
const {resolveAppTheme} = require('../../../theme/app');
const {OnboardingThemeContext} = require('../../../theme/onboarding/OnboardingThemeProvider');
const {NameField, RegistrationListItem} = require('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/RegistrationDesign');

let views;
const mount = element => {
  let view;
  act(() => {view = create(element);});
  views.push(view);
  return view;
};
beforeEach(() => {
  views = [];
  jest.spyOn(Native, 'useWindowDimensions').mockReturnValue({width: 375, height: 667});
  jest.spyOn(Native, 'Modal', 'get').mockReturnValue('NativeModal');
});
afterEach(() => {
  act(() => views.forEach(view => view.unmount()));
  jest.restoreAllMocks();
});

it.each(['light', 'dark'])('keeps destructive geometry and disabled colors equal to primary in %s mode', mode => {
  const destructive = mount(<AppButton themeMode={mode} variant="destructive">Delete</AppButton>);
  const primary = mount(<AppButton themeMode={mode}>Keep</AppButton>);
  const button = () => destructive.root.findByType('PaperButton');
  const normal = primary.root.findByType('PaperButton');
  expect(button().props.buttonColor).toBe('#D1242F');
  expect(button().props.textColor).toBe('#FFFFFF');
  expect(button().props.contentStyle).toEqual(normal.props.contentStyle);
  expect(Native.StyleSheet.flatten(button().props.contentStyle).height).toBe(44);
  expect(button().props.labelStyle).toEqual(normal.props.labelStyle);
  act(() => button().props.onPressIn({}));
  expect(button().props.buttonColor).toBe('#B01E28');
  act(() => button().props.onPressOut({}));
  expect(button().props.buttonColor).toBe('#D1242F');
  act(() => {
    destructive.update(<AppButton themeMode={mode} variant="destructive" disabled>Delete</AppButton>);
    primary.update(<AppButton themeMode={mode} disabled>Keep</AppButton>);
  });
  const disabledPrimary = primary.root.findByType('PaperButton');
  expect(button().props.buttonColor).toBe(disabledPrimary.props.buttonColor);
  expect(button().props.textColor).toBe(disabledPrimary.props.textColor);
});

it.each(['light', 'dark'])('passes the actual input outline to its end accessory in %s mode', mode => {
  const theme = resolveAppTheme(mode);
  const accessory = jest.fn(({borderColor, borderWidth}) =>
    <Native.View testID="divider" style={{width: borderWidth, backgroundColor: borderColor}} />);
  const field = props => <AppTextInput themeMode={mode} endAccessory={accessory} {...props} />;
  const view = mount(field());
  const divider = () => view.root.findByProps({testID: 'divider'});
  const check = color => {
    expect(divider().props.style).toEqual({width: 1, backgroundColor: color});
    expect(Native.StyleSheet.flatten(divider().parent.props.style).borderColor).toBe(color);
  };
  check(theme.colors.inputBorder);
  const input = () => view.root.findByType(Native.TextInput);
  act(() => input().props.onFocus({}));
  check(theme.colors.inputFocusBorder);
  act(() => view.update(field({invalid: true})));
  check(theme.colors.danger);
  act(() => input().props.onBlur({}));
  check(theme.colors.danger);
  act(() => view.update(field({errorText: 'Try another name.'})));
  check(theme.colors.danger);
  act(() => view.update(field({inputShellStyle: {borderColor: '#123456'}})));
  check('#123456');
});

it.each(['light', 'dark'])('uses the field outline for the registration namespace divider in %s mode', mode => {
  const theme = resolveAppTheme(mode);
  const field = availability => <OnboardingThemeContext.Provider value={theme}>
    <NameField name="alice" namespace={{suffix: '.VRSCTEST@'}} availability={availability} />
  </OnboardingThemeContext.Provider>;
  const view = mount(field('available'));
  const check = color => {
    const divider = view.root.findAllByType(Native.View).find(node =>
      Native.StyleSheet.flatten(node.props.style)?.alignSelf === 'stretch' &&
      Native.StyleSheet.flatten(node.props.style)?.width === 1);
    expect(divider).toBeDefined();
    expect(Native.StyleSheet.flatten(divider.props.style).backgroundColor).toBe(color);
  };
  check(theme.colors.inputBorder);
  act(() => view.root.findByType(Native.TextInput).props.onFocus({}));
  check(theme.colors.inputFocusBorder);
  act(() => view.update(field('taken')));
  check(theme.colors.danger);
});

it('centers registration actions with the text and keeps the dot break with and without delete', () => {
  const onPress = jest.fn();
  const onDelete = jest.fn();
  for (const status of ['commitment_prepared', 'commitment_broadcast']) {
    for (const deletable of [true, false]) {
      const view = mount(<RegistrationListItem job={{displayName: 'qahomeios1104.VRSCTEST@', status}}
        onPress={onPress} onDelete={deletable ? onDelete : undefined} />);
      const name = view.root.findAllByType(Native.Text).find(node => node.props.accessibilityLabel === 'qahomeios1104.VRSCTEST@');
      expect(name.props.children[1]).toBe('.\u200bVRSCTEST@');
      const row = view.root.findAllByType(Native.View).find(node =>
        Native.StyleSheet.flatten(node.props.style)?.flexDirection === 'row' &&
        Native.StyleSheet.flatten(node.props.style)?.gap === 12);
      expect(Native.StyleSheet.flatten(row.props.style).alignItems).toBe('center');
      const pill = view.root.findAllByType(Native.Pressable).find(node => {
        const style = typeof node.props.style === 'function' ? node.props.style({pressed: false}) : node.props.style;
        return Native.StyleSheet.flatten(style)?.height === 36;
      });
      if (status === 'commitment_prepared') {
        const style = Native.StyleSheet.flatten(pill.props.style({pressed: false}));
        expect(style).toMatchObject({height: 36, minHeight: 36, alignSelf: 'center'});
        act(() => pill.props.onLayout({nativeEvent: {layout: {width: 84, height: 36}}}));
        expect(pill.props.hitSlop).toMatchObject({top: 4, bottom: 4});
      } else expect(pill).toBeUndefined();
      if (deletable) {
        const remove = view.root.findAllByType(Native.Pressable).find(node => node.props.accessibilityLabel?.startsWith('Delete saved registration'));
        expect(Native.StyleSheet.flatten(remove.props.style)).toMatchObject({width: 44, height: 44});
      }
    }
  }
});

it('keeps node end accessories and primary press callbacks unchanged', () => {
  const onPressIn = jest.fn();
  const onPressOut = jest.fn();
  const primary = mount(<AppButton onPressIn={onPressIn} onPressOut={onPressOut}>Continue</AppButton>);
  expect(primary.root.findByType('PaperButton').props.onPressIn).toBe(onPressIn);
  expect(primary.root.findByType('PaperButton').props.onPressOut).toBe(onPressOut);
  const field = mount(<AppTextInput endAccessory={<Native.View testID="node-accessory" />} />);
  expect(field.root.findByProps({testID: 'node-accessory'})).toBeDefined();
});

it('uses a destructive alert action while keeping cancel last and callbacks after closing', () => {
  const remove = jest.fn();
  const cancel = jest.fn();
  const view = mount(<AlertModal activeAlert={{uid: 'delete', title: 'Delete saved data?', buttons: [
    {text: 'Not now', style: 'cancel', onPress: cancel},
    {text: 'Delete', style: 'destructive', onPress: remove},
  ]}} />);
  const buttons = view.root.findAllByType(AppButton);
  expect(buttons.map(button => [button.props.children, button.props.variant])).toEqual([
    ['Delete', 'destructive'], ['Not now', 'secondary'],
  ]);
  act(() => buttons[0].props.onPress());
  expect(remove).not.toHaveBeenCalled();
  act(() => view.root.findByType(BottomSheetModal).props.onClosed());
  expect(remove).toHaveBeenCalledTimes(1);
  expect(cancel).not.toHaveBeenCalled();
});

it.each([true, false])('keeps alert outside dismissal routed to cancel (destructive=%s)', destructive => {
  const remove = jest.fn();
  const cancel = jest.fn();
  const view = mount(<AlertModal activeAlert={{uid: 'dismiss', title: 'Remove?', buttons: [
    {text: 'Remove', style: destructive ? 'destructive' : undefined, onPress: remove},
    {text: 'Not now', style: 'cancel', onPress: cancel},
  ]}} />);
  expect(view.root.findAllByType(AppButton)[0].props.variant).toBe(destructive ? 'destructive' : 'primary');
  act(() => view.root.findByType(BottomSheetModal).props.onClose());
  act(() => view.root.findByType(BottomSheetModal).props.onClosed());
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(remove).not.toHaveBeenCalled();
});

it.each([true, false])('uses the acknowledgement destructive prop without changing confirmation timing (%s)', destructive => {
  const close = jest.fn();
  const confirm = jest.fn();
  const view = mount(<AcknowledgeSheet visible title="Remove?" message="Saved data will be removed."
    destructive={destructive} dismissLabel="Not now" onClose={close} onAcknowledged={confirm} />);
  const buttons = view.root.findAllByType(AppButton);
  expect(buttons[0].props.variant).toBe(destructive ? 'destructive' : 'primary');
  expect(buttons[1].props.variant).toBe('secondary');
  act(() => buttons[0].props.onPress());
  expect(close).toHaveBeenCalledTimes(1);
  expect(confirm).not.toHaveBeenCalled();
  act(() => view.root.findByType(BottomSheetModal).props.onClosed());
  expect(confirm).toHaveBeenCalledTimes(1);
});
