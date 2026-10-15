export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, but has touch.
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

/** Browsers inside other apps (Instagram, WhatsApp, Messenger…) can't install web apps. */
export function isInAppBrowser(): boolean {
  return /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Messenger|Line\/|Snapchat|TikTok|musical_ly|GSA\//.test(
    navigator.userAgent,
  );
}

export function isIOSNonSafari(): boolean {
  // Chrome, Firefox and Edge on iOS can add to home screen on iOS 16.4+, but Safari is the reliable path.
  return isIOS() && /CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
}
