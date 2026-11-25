package com.valumobile;
// Updated: Align getMainComponentName with JS app name in app.json ("valumobile")

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowManager;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;
import com.facebook.react.views.view.WindowUtilKt;

public class MainActivity extends ReactActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    // Let React recreate screens instead of restoring detached native fragments.
    super.onCreate(null);
    keepTranslucentStatusBar();
  }

  /**
   * The app draws under a transparent status bar on every Android version. Android 15 and 16 do
   * this through edge-to-edge. Up to React Native 0.86 the app set it on older versions with
   * {@code <StatusBar translucent backgroundColor="transparent">}; React Native 0.87 removed both
   * props. This applies the same window settings the old StatusBarModule applied.
   */
  @SuppressWarnings("deprecation")
  private void keepTranslucentStatusBar() {
    if (WindowUtilKt.isEdgeToEdgeFeatureFlagOn()) {
      return;
    }
    Window window = getWindow();
    window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
    window.setStatusBarColor(Color.TRANSPARENT);
    View decorView = window.getDecorView();
    decorView.setOnApplyWindowInsetsListener(
        (v, insets) -> {
          WindowInsets defaultInsets = v.onApplyWindowInsets(insets);
          return defaultInsets.replaceSystemWindowInsets(
              defaultInsets.getSystemWindowInsetLeft(),
              0,
              defaultInsets.getSystemWindowInsetRight(),
              defaultInsets.getSystemWindowInsetBottom());
        });
    decorView.requestApplyInsets();
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "valumobile";
  }

  /**
   * Returns the instance of the {@link ReactActivityDelegate}. Here we use a util class {@link
   * DefaultReactActivityDelegate} which allows you to easily enable Fabric and Concurrent React
   * (aka React 18) with two boolean flags.
   */
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(
        this,
        getMainComponentName(),
        // If you opted-in for the New Architecture, we enable the Fabric Renderer.
        DefaultNewArchitectureEntryPoint.getFabricEnabled()
        );
  }
}
