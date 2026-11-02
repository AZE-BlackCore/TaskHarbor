package com.taskharbor.mobile;

import com.getcapacitor.BridgeActivity;
import android.graphics.Insets;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.WindowInsets;
import android.webkit.WebView;
import android.webkit.WebSettings;

/**
 * 小湾清单移动端 · 原生入口
 *
 * 关键修复：Android 上 env(safe-area-inset-top/bottom) 只对「刘海/挖孔」返回非零，
 * 对普通状态栏/导航栏返回 0，导致 WebView 里用 CSS 安全区 padding 失效、界面被系统栏压住。
 * 这里改为在原生侧用 WindowInsets 读出真实的系统栏高度（像素），转 dp 后注入成 CSS 变量，
 * 前端 header/tabbar 立即获得正确留白。监听 onGlobalLayout 以覆盖首屏、旋转、系统栏显隐。
 */
public class MainActivity extends BridgeActivity {

  private int lastTop = -1;
  private int lastBottom = -1;

  private final ViewTreeObserver.OnGlobalLayoutListener layoutListener =
      () -> injectSafeArea();

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // decor 创建后再注册，避免空引用；首屏也先注入一次
    getWindow().getDecorView().post(() -> {
      allowMixedContent();
      getWindow().getDecorView().getViewTreeObserver().addOnGlobalLayoutListener(layoutListener);
      injectSafeArea();
    });
  }

  @Override
  public void onResume() {
    super.onResume();
    allowMixedContent();
    injectSafeArea();
  }

  @Override
  public void onDestroy() {
    super.onDestroy();
    try {
      getWindow().getDecorView().getViewTreeObserver().removeOnGlobalLayoutListener(layoutListener);
    } catch (Exception ignored) {
      // ignore
    }
  }

  /**
   * 移动端以 https://localhost 加载，需跨源 fetch 局域网明文 Hub(http://<LAN IP>:18766)。
   * 默认 WebView 混合内容策略会拦截 https 页访问 http 资源（先于 CORS），
   * 此处显式放开，与 capacitor.config.ts 的 android.allowMixedContent 双保险。
   */
  private void allowMixedContent() {
    if (bridge == null || bridge.getWebView() == null) return;
    bridge.getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
  }

  private void injectSafeArea() {
    if (bridge == null || bridge.getWebView() == null) return;
    final WebView wv = bridge.getWebView();

    int top = 0;
    int bottom = 0;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      final WindowInsets insets = getWindow().getDecorView().getRootWindowInsets();
      if (insets == null) return;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        final Insets sb = insets.getInsets(WindowInsets.Type.systemBars());
        top = sb.top;
        bottom = sb.bottom;
      } else {
        top = insets.getSystemWindowInsetTop();
        bottom = insets.getSystemWindowInsetBottom();
      }
    }
    if (top == lastTop && bottom == lastBottom) return;
    lastTop = top;
    lastBottom = bottom;

    final float density = getResources().getDisplayMetrics().density;
    final int topDp = Math.round(top / density);
    final int bottomDp = Math.round(bottom / density);

    final String js =
        "try{"
            + "document.documentElement.style.setProperty('--safe-top','"
            + topDp
            + "px');"
            + "document.documentElement.style.setProperty('--safe-bottom','"
            + bottomDp
            + "px');"
            + "window.__SAFE_AREA__={top:"
            + topDp
            + ",bottom:"
            + bottomDp
            + "};"
            + "if(window.__onSafeArea)window.__onSafeArea();"
            + "}catch(e){}";
    wv.post(() -> wv.evaluateJavascript(js, null));
  }
}
