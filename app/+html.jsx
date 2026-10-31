import { ScrollViewStyleReset } from "expo-router/html";

// Web (PWA) only: the HTML page the website is served in. Expo Router uses
// this file for the web build and ignores it on Android/iOS. It links the
// manifest and icons (in public/) so the site can be installed from
// Chrome ("Install app") or Safari ("Add to Home Screen") with the Shinde
// name and icon, opening full-screen like an app.
export default function Root({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <title>Shinde Procurement</title>

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8a3230" />

        {/* iPhone: full-screen app from "Add to Home Screen" */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Shinde" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <ScrollViewStyleReset />
        <style>{"body { background-color: #f5f3f0; }"}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
