// Monetag Direct Link Integration
// Direct link: https://crn77.com/4/10652500

const DIRECT_LINK = 'https://crn77.com/4/10652500';

export const openDirectLink = (): void => {
  const tg = (window as any).Telegram?.WebApp;
  if (tg) {
    tg.openLink(DIRECT_LINK);
  } else {
    window.open(DIRECT_LINK, '_blank');
  }
};

// Wait timer - returns promise that resolves after given seconds
export const waitForAdView = (seconds: number = 7): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), seconds * 1000);
  });
};
