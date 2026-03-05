// RichAds Telegram Interstitial Ads Integration

declare global {
  interface Window {
    TelegramAdsController: any;
  }
}

let initialized = false;

export function initRichAds(): void {
  if (initialized || !window.TelegramAdsController) return;
  try {
    window.TelegramAdsController = new window.TelegramAdsController();
    window.TelegramAdsController.initialize({
      pubId: "1003785",
      appId: "6434",
    });
    initialized = true;
    console.log("RichAds initialized");
  } catch (e) {
    console.error("RichAds init error:", e);
  }
}

export function showInterstitialAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!window.TelegramAdsController) {
      resolve(false);
      return;
    }
    
    if (!initialized) {
      initRichAds();
    }

    try {
      window.TelegramAdsController.triggerInterstitialBanner()
        .then(() => resolve(true))
        .catch(() => resolve(false));
    } catch {
      resolve(false);
    }
  });
}
