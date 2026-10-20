import {Platform, Switch} from 'react-native';

// React Native 0.77 lays out every iOS switch as 51 x 31 points. The iOS 26
// switch draws at 63 x 28 from the same origin, so it ran 12 points past the
// end of its row. A switch that sets its own size keeps it.
const IOS_26_SWITCH_SIZE = {width: 63, height: 28};

const applyNativeSwitchSize = () => {
  if (
    Platform.OS !== 'ios' ||
    parseInt(Platform.Version, 10) < 26 ||
    Switch.__verusSizePatched ||
    typeof Switch.render !== 'function'
  ) {
    return;
  }

  const originalRender = Switch.render;

  Switch.render = function renderWithNativeSize(props, ref) {
    return originalRender.call(
      this,
      {...props, style: [IOS_26_SWITCH_SIZE, props.style]},
      ref,
    );
  };

  Switch.__verusSizePatched = true;
};

export default applyNativeSwitchSize;
