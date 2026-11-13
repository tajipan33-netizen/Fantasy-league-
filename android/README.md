# SUPER LEAGUE Android APK

This WebView app opens https://super-league-results.vercel.app and supports the site's image upload picker.

The app uses the live SUPER LEAGUE website, so website features such as the club-to-club transfer market, seller responses, administrator approval, and completed transfer history are delivered through the existing app without embedding backend credentials.

Build from this directory with `gradle assembleDebug`.
APK output: `app/build/outputs/apk/debug/app-debug.apk`.
GitHub Actions automatically builds and publishes the APK as an artifact when Android files are pushed to main.
