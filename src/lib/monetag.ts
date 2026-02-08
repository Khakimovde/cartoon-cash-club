// Monetag SDK Integration
// Zone ID: 10582666

declare global {
  interface Window {
    show_10582666?: () => Promise<any>;
  }
}

let sdkLoaded = false;
let sdkLoading = false;
let loadPromise: Promise<boolean> | null = null;

export const loadMonetag = (): Promise<boolean> => {
  if (sdkLoaded) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    if (sdkLoading) {
      const checkInterval = setInterval(() => {
        if (sdkLoaded) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
      return;
    }

    sdkLoading = true;

    const script = document.createElement('script');
    script.src = '//munqu.com/sdk.js';
    script.setAttribute('data-zone', '10582666');
    script.setAttribute('data-sdk', 'show_10582666');
    script.async = true;

    script.onload = () => {
      sdkLoaded = true;
      sdkLoading = false;
      console.log('[Monetag] SDK loaded successfully');
      resolve(true);
    };

    script.onerror = () => {
      sdkLoading = false;
      console.error('[Monetag] Failed to load SDK');
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};

export const showAd = (): Promise<boolean> => {
  return new Promise(async (resolve) => {
    try {
      const loaded = await loadMonetag();
      if (!loaded) {
        console.log('[Monetag] SDK not loaded');
        resolve(false);
        return;
      }

      // Wait for the show function to become available
      let attempts = 0;
      while (!window.show_10582666 && attempts < 50) {
        await new Promise((r) => setTimeout(r, 100));
        attempts++;
      }

      if (typeof window.show_10582666 === 'function') {
        console.log('[Monetag] Calling show_10582666...');
        
        try {
          const result = await window.show_10582666();
          console.log('[Monetag] Raw result:', JSON.stringify(result));
          
          // Monetag returns different formats:
          // 1. { zone_id, event_type: "impression" } - ad was shown (impression)
          // 2. { success: true } - explicit success
          // 3. true/false - boolean result
          
          if (result) {
            // Check for impression event - this means ad was shown
            if (result.event_type === 'impression') {
              console.log('[Monetag] Ad impression recorded');
              resolve(true);
              return;
            }
            
            // Check for explicit success
            if (result.success === true) {
              resolve(true);
              return;
            }
            
            // Check for zone_id presence (indicates successful call)
            if (result.zone_id) {
              console.log('[Monetag] Ad shown for zone:', result.zone_id);
              resolve(true);
              return;
            }
            
            // Boolean true
            if (result === true) {
              resolve(true);
              return;
            }
            
            // Any truthy object response is considered success
            if (typeof result === 'object') {
              console.log('[Monetag] Ad response received');
              resolve(true);
              return;
            }
          }
          
          resolve(false);
        } catch (adError) {
          console.error('[Monetag] Ad playback error:', adError);
          resolve(false);
        }
      } else {
        console.warn('[Monetag] show_10582666 not available');
        resolve(false);
      }
    } catch (error) {
      console.error('[Monetag] Error in showAd:', error);
      resolve(false);
    }
  });
};

// Initialize SDK on module load
if (typeof window !== 'undefined') {
  loadMonetag();
}
