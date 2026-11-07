# Duo Lockscreen Creator

A small Ionic 9 React web app. People choose a portrait photo and a landscape photo, join them side by side, and save the resulting image. The landscape photo is intended for the iPhone Duo's open inner display. Wallpaper setup happens in iOS.

## Product decisions

- Follow concept A in `output/imagegen/a-quick-join.png`.
- No Capacitor, accounts, uploads, analytics, or server-side image processing.
- Installation is optional. The core tool works in a browser.
- Preserve proportions, match photo heights, and keep the seam gapless.
- Each placeholder picks a single photo for that slot. Selecting photos does not join them. Join Photos is a separate action, enabled only after both photos finish loading.
- Replacing a photo returns to the two-photo selection view and requires joining again.
- Offer replace, swap, and optional crop controls.
- Prepare the export before the share-button tap. Use file sharing when available, and show the generated image with a browser-save fallback otherwise.
- Never infer a successful Photos save from a resolved share-sheet promise.
- The save fallback uses a self-contained image data URL. Download navigation must stay contained and never replace the editor if a browser ignores the download hint.

## Verification

Use behavior-driven TDD in vertical slices. Browser tests exercise real image decoding, canvas output, and user actions. Mock only browser/OS boundaries such as the share sheet. Render mobile, landscape, and desktop layouts and compare with the selected concept.
