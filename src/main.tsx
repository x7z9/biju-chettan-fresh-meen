import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let hasReloaded = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || hasReloaded) return;
    hasReloaded = true;
    window.location.reload();
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateSW(true);
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const checkForUpdate = () => {
        if (navigator.onLine) {
          void registration.update().catch(() => {});
        }
      };

      // Check immediately, whenever user returns to app, when regaining connectivity, and periodically
      checkForUpdate();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkForUpdate();
        }
      });
      window.addEventListener('online', checkForUpdate);
      window.setInterval(checkForUpdate, 30 * 60 * 1000);
    },
  });
} else {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(<App />);
