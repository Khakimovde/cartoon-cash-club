// RichAds Telegram Ads Integration

declare global {
  interface Window {
    TelegramAdsController: any;
  }
}

let controller: any = null;

export function initRichAds(): void {
  if (controller) return;
  try {
    if (window.TelegramAdsController) {
      controller = new window.TelegramAdsController();
      controller.initialize({
        pubId: "1003785",
        appId: "6434",
      });
      console.log("RichAds initialized");
    }
  } catch (e) {
    console.error("RichAds init error:", e);
  }
}

/**
 * Show interstitial ad. Returns true if shown, false otherwise.
 */
export function showInterstitialAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!controller) {
      initRichAds();
    }
    if (!controller) {
      resolve(false);
      return;
    }
    try {
      controller.triggerInterstitialBanner()
        .then(() => resolve(true))
        .catch(() => resolve(false));
    } catch {
      resolve(false);
    }
  });
}

/**
 * Show banner ad. Returns true if shown, false otherwise.
 */
export function showBannerAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!controller) {
      initRichAds();
    }
    if (!controller) {
      resolve(false);
      return;
    }
    try {
      controller.triggerBanner()
        .then(() => resolve(true))
        .catch(() => resolve(false));
    } catch {
      resolve(false);
    }
  });
}
