package com.verusmobile;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.RenderEffect;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.os.Build;
import android.renderscript.Allocation;
import android.renderscript.Element;
import android.renderscript.RenderScript;
import android.renderscript.ScriptIntrinsicBlur;
import android.text.TextPaint;
import android.view.View;

public class PrivacyBlurredTextView extends View {
  private static final float RENDER_EFFECT_SIGMA_SCALE = 0.57735f;
  private static final float RENDER_EFFECT_SIGMA_OFFSET = 0.5f;

  private final TextPaint paint = new TextPaint(TextPaint.ANTI_ALIAS_FLAG);
  private String text = "";
  private String fontFamily;
  private String fontWeight = "normal";
  private String textAlign = "left";
  private float fontSize = 14;
  private float lineHeight = 14;
  private float letterSpacing = 0;
  private float blurRadius = 5;
  private Bitmap blurredBitmap;

  public PrivacyBlurredTextView(Context context) {
    super(context);
    paint.setColor(Color.BLACK);
    setWillNotDraw(false);
  }

  public void setText(String value) {
    text = value == null ? "" : value;
    invalidateBlur();
  }

  public void setTextColor(int value) {
    paint.setColor(value);
    invalidateBlur();
  }

  public void setFontFamily(String value) {
    fontFamily = value;
    updateTypeface();
  }

  public void setFontWeight(String value) {
    fontWeight = value == null ? "normal" : value;
    updateTypeface();
  }

  public void setFontSize(float value) {
    fontSize = value;
    paint.setTextSize(toPixels(value));
    updateLetterSpacing();
    invalidateBlur();
  }

  public void setLetterSpacing(float value) {
    letterSpacing = value;
    updateLetterSpacing();
    invalidateBlur();
  }

  public void setLineHeight(float value) {
    lineHeight = value;
    invalidateBlur();
  }

  public void setTextAlign(String value) {
    textAlign = value == null ? "left" : value;
    invalidateBlur();
  }

  public void setBlurRadius(float value) {
    blurRadius = value;
    updateRenderEffect();
    invalidateBlur();
  }

  private float toPixels(float value) {
    return value * getResources().getDisplayMetrics().density;
  }

  private void updateTypeface() {
    int style = "bold".equals(fontWeight) || parseWeight(fontWeight) >= 600
        ? Typeface.BOLD
        : Typeface.NORMAL;
    paint.setTypeface(Typeface.create(fontFamily, style));
    invalidateBlur();
  }

  private void updateLetterSpacing() {
    paint.setLetterSpacing(fontSize == 0 ? 0 : letterSpacing / fontSize);
  }

  private int parseWeight(String value) {
    try {
      return Integer.parseInt(value);
    } catch (NumberFormatException ignored) {
      return 400;
    }
  }

  private void updateRenderEffect() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      float targetSigma = toPixels(blurRadius);
      float radius =
          Math.max(
              (targetSigma - RENDER_EFFECT_SIGMA_OFFSET) / RENDER_EFFECT_SIGMA_SCALE,
              0.1f);
      setRenderEffect(RenderEffect.createBlurEffect(radius, radius, Shader.TileMode.DECAL));
    }
  }

  private void invalidateBlur() {
    if (blurredBitmap != null) {
      blurredBitmap.recycle();
      blurredBitmap = null;
    }
    invalidate();
  }

  @Override
  protected void onSizeChanged(int width, int height, int oldWidth, int oldHeight) {
    super.onSizeChanged(width, height, oldWidth, oldHeight);
    invalidateBlur();
  }

  @Override
  protected void onDraw(Canvas canvas) {
    super.onDraw(canvas);

    if (text.isEmpty() || getWidth() == 0 || getHeight() == 0) {
      return;
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      drawText(canvas);
      return;
    }

    if (blurredBitmap == null) {
      blurredBitmap = renderSoftwareBlur();
    }
    canvas.drawBitmap(blurredBitmap, 0, 0, null);
  }

  private void drawText(Canvas canvas) {
    paint.setTextAlign(resolvePaintAlignment());
    float x = resolveTextX();
    float lineHeightPixels = toPixels(lineHeight);
    float lineTop = (getHeight() - lineHeightPixels) / 2f;
    float baseline =
        lineTop + (lineHeightPixels - paint.descent() - paint.ascent()) / 2f;
    canvas.drawText(text, x, baseline, paint);
  }

  private TextPaint.Align resolvePaintAlignment() {
    if ("right".equals(textAlign)) {
      return TextPaint.Align.RIGHT;
    }
    if ("center".equals(textAlign)) {
      return TextPaint.Align.CENTER;
    }
    return TextPaint.Align.LEFT;
  }

  private float resolveTextX() {
    if ("right".equals(textAlign)) {
      return getWidth();
    }
    if ("center".equals(textAlign)) {
      return getWidth() / 2f;
    }
    return 0;
  }

  @SuppressWarnings("deprecation")
  private Bitmap renderSoftwareBlur() {
    Bitmap source = Bitmap.createBitmap(getWidth(), getHeight(), Bitmap.Config.ARGB_8888);
    drawText(new Canvas(source));
    Bitmap output = Bitmap.createBitmap(source);
    RenderScript renderScript = RenderScript.create(getContext());
    Allocation input = Allocation.createFromBitmap(renderScript, source);
    Allocation result = Allocation.createFromBitmap(renderScript, output);
    ScriptIntrinsicBlur blur =
        ScriptIntrinsicBlur.create(renderScript, Element.U8_4(renderScript));
    blur.setRadius(Math.min(Math.max(toPixels(blurRadius), 0.1f), 25f));
    blur.setInput(input);
    blur.forEach(result);
    result.copyTo(output);
    blur.destroy();
    input.destroy();
    result.destroy();
    renderScript.destroy();
    source.recycle();
    return output;
  }
}
