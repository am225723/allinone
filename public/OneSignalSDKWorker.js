// Chrome requires message listeners to be attached during initial worker evaluation.
self.addEventListener("message", () => {});

importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
