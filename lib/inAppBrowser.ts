/**
 * In-app browser detection for WeChat, Facebook, and similar WebViews.
 * Used to apply layout/rendering fallbacks (dvh → vh, skip WebGL) so the site
 * works reliably when opened from WeChat or Facebook links.
 */

const WECHAT_UA = /MicroMessenger/i;
const FACEBOOK_UA = /FBAN|FBAV|FB_IAB|FBIOS/i;

export function isWeChat(): boolean {
  if (typeof navigator === "undefined") return false;
  return WECHAT_UA.test(navigator.userAgent);
}

export function isFacebookInApp(): boolean {
  if (typeof navigator === "undefined") return false;
  return FACEBOOK_UA.test(navigator.userAgent);
}

export function isInAppBrowser(): boolean {
  return isWeChat() || isFacebookInApp();
}
