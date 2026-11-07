# Duo Lockscreen Creator

Duo Lockscreen Creator joins a portrait photo and a landscape photo into one wallpaper for the iPhone Duo. The portrait is for the closed screen, and the landscape is for the inside screen when it's open. You can frame each part of the combined image when you set up your lock screen in iOS.

You don't need to install anything. Pick two photos in your browser, join them, and save the result. The app makes the image; wallpaper setup stays in iOS.

[Open Duo Lockscreen Creator](https://shanethe.dev/duo-lockscreen-creator/).

## Make a wallpaper

1. Tap **Portrait** and **Landscape** to pick a photo for each.
2. Tap **Join Photos** when both previews are ready.
3. Use **Replace**, **Swap**, or **Crop** if you want to change the result. Replacing a photo takes you back to selection so you can check the new pair before joining again.
4. Tap **Save or Share** to save a copy or send it somewhere else.

The photos sit side by side at the same height without being stretched. You get a JPEG with no gap between them. Cropping is optional.

Where your browser supports it, **Save or Share** opens your device's share sheet. Otherwise, it shows the full image with a download button. On a phone, you can also touch and hold that image to save it.

## Your photos stay on your device

The app joins and crops photos in your browser. It doesn't upload them, ask for an account, or track how you use it. Closing or reloading the app clears your current pair, so save the finished image before you leave.

You can add the app to your home screen, but that's optional. On a secure connection, it caches the app for offline use. Your photos aren't part of that cache.

## Run it locally

The app uses Ionic 9, React, TypeScript, and Vite. It doesn't use Capacitor or need a backend.

```sh
npm install --cache .npm-cache
npm run dev
```

The dev server listens on `0.0.0.0:43187`, so you can open it from another device using your computer's LAN or Tailscale address.

To check types and run the browser tests:

```sh
npm run typecheck
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium webkit
npm test
```

The tests run in Chromium and WebKit on port `43188`. They use real image decoding and JPEG exports, with the native share sheet simulated at the browser boundary.

To build and preview the app:

```sh
npm run build
npm run preview
```

The preview also uses port `43187`, so stop the dev server first. Run `npm run test:production` in another terminal to check that the built app can reload and join new photos offline.

## GitHub Pages

Pushes to `main` run the browser tests, build the app, check offline use, and deploy to GitHub Pages. You can also run the workflow from the repository's Actions tab. Only the built app in `dist/` is published.

The workflow gets the site's path from GitHub Pages and passes it to Vite through `APP_BASE_PATH`. Local builds use `/` by default. To check a build under a different path, set `APP_BASE_PATH` when building and previewing, then point `PLAYWRIGHT_PRODUCTION_URL` at that URL for `npm run test:production`.

## License

The source code is licensed under the [MIT License](LICENSE). The sample photos in `tests/fixtures/` use the [Unsplash License](https://unsplash.com/license). Their sources are listed in `tests/fixtures/sources.json`.
