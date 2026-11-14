# PWA implementation notes

Use `manifest.webmanifest.example` as the starting template for the final `manifest.webmanifest`.

`beforeinstallprompt` is not supported by all browsers and is not supported on iOS Safari. On Chromium browsers, capture the event and show the app's install button only when the event is available. For iOS, show the manual instructions: Safari → Share → Add to Home Screen → Add. The install button must not pretend it installed the app.

Serve the app over HTTPS (or localhost during development) for service-worker and install support. Use `display: standalone`. Register a versioned service worker to cache the app shell and the public static assets. Keep private user photos and day records in IndexedDB, not the service-worker cache.
