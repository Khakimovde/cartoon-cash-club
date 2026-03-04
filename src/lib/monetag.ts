// Monetag Direct Link Integration
// Direct link: https://crn77.com/4/10652500

const DIRECT_LINK = 'https://crn77.com/4/10652500';

export const openDirectLink = (): void => {
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.openLink) {
    // Force open in external browser, not in Telegram's WebView
    tg.openLink(DIRECT_LINK, { try_instant_view: false });
  } else {
    window.open(DIRECT_LINK, '_blank');
  }
};

// Track when user left for ad
let adOpenTime: number | null = null;

export const markAdOpened = (): void => {
  adOpenTime = Date.now();
};

export const getAdViewDuration = (): number => {
  if (!adOpenTime) return 0;
  return Math.floor((Date.now() - adOpenTime) / 1000);
};

export const resetAdTimer = (): void => {
  adOpenTime = null;
};

// Wait timer - returns promise that resolves after given seconds
export const waitForAdView = (seconds: number = 7): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), seconds * 1000);
  });
};
