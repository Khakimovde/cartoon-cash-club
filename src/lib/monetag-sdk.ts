// Monetag SDK Integration for Tasks section ads
// Uses zone 10582666 loaded via SDK script in index.html

declare global {
  interface Window {
    show_10582666: (() => Promise<void>) | undefined;
  }
}

/**
 * Show Monetag SDK ad (for Tasks section).
 * Returns true if ad was shown, false otherwise.
 */
export function showMonetagAd(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (typeof window.show_10582666 === 'function') {
        window.show_10582666()
          .then(() => resolve(true))
          .catch(() => resolve(false));
      } else {
        resolve(false);
      }
    } catch {
      resolve(false);
    }
  });
}
