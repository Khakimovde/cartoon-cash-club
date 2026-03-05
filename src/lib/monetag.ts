// Monetag Direct Link Integration
import { showInterstitialAd } from './richads';
// Main direct link (for tasks/ads)
const DIRECT_LINK_MAIN = 'https://crn77.com/4/10652500';
// Secondary direct link (for promo & bonus sections)
const DIRECT_LINK_ALT = 'https://omg10.com/4/10684278';

// Rotation counter for promo/bonus sections
let rotationIndex = 0;

// Open the main direct link (used in tasks/ads section only)
export const openDirectLink = (): void => {
  showInterstitialAd(); // trigger RichAds interstitial
  openInExternalBrowser(DIRECT_LINK_MAIN);
};

// Open rotating direct link (alternates between main and alt) - used in promo & bonus sections
export const openRotatingDirectLink = (): void => {
  showInterstitialAd(); // trigger RichAds interstitial
  const link = rotationIndex % 2 === 0 ? DIRECT_LINK_MAIN : DIRECT_LINK_ALT;
  rotationIndex++;
  openInExternalBrowser(link);
};

function openInExternalBrowser(url: string): void {
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.openLink) {
    tg.openLink(url, { try_instant_view: false });
  } else {
    window.open(url, '_blank');
  }
}

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
