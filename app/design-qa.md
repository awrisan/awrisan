# Design QA

## Review context

- Source visual truth: `design/selected-landing.png`
- Final web implementation: `design/implementation-landing-final.jpg`
- Desktop viewport: 1488 by 1057
- State: public landing page at `/`, before sign-in
- Full-view evidence: the final implementation screenshot captures the full desktop viewport from the header through the start of the culture section.
- Focused-region evidence: the full viewport is also the relevant focused region because the selected source is a single landing hero composition. Hero geometry was additionally measured in the browser.
- Final measured hero geometry: image x 585, y 114, width 887, height 720. Preview card x 1059, y 464, width 342, height 370.

## Comparison history

1. P2: The initial hero sat too low and did not reveal the culture section boundary. The header and hero spacing were corrected so the culture section starts at the same visual point as the source.
2. P2: The first normalized comparison showed an unwanted right gutter and incorrect copy-to-image proportions. The hero was widened to the right edge and the grid was changed to match the selected composition.
3. P2: The proportion change caused a four-line headline and horizontal preview-card drift. The headline scale and preview-card right offset were corrected to restore the selected three-line wrap and x position.
4. P2: The preview card was about 52 pixels lower and shorter than the selected source. Its top, bottom, minimum height, and internal button placement were corrected. The final card top is 464 and it ends with the hero image at 834.
5. P2: A generic security icon was being used where the source showed the Stellar identity. It was replaced with the unaltered official Stellar black and white assets from the Stellar Brand Resource Hub. The required trademark and independent-software notices were added to the footer.
6. P2: Text bullets were used for the room menu. They were replaced with the matching Phosphor `DotsThree` icon so the product uses one consistent icon family.

## Final visual findings

- P0: none.
- P1: none.
- P2: none.
- P3: the documentary arisan photo and room-preview copy are product-specific rather than pixel-identical to the generated concept. Subject, crop, hierarchy, palette, density, and component anatomy match the selected direction.
- Official Stellar logo natural dimensions verified in the browser: 6231 by 1560.
- Browser console errors and warnings: none. Only Vite debug messages and the React development information message were present.

## Functional browser evidence

The following primary flows were exercised with realistic local mock data:

- Sign in and three-step onboarding
- Dashboard navigation
- Open an arisan room
- Confirm and lock a funded room
- Run the draw and inspect the winner result
- Open the simulated receipt
- Join-room invalid-code error
- Join-room success
- Create-room three-step success

## Android emulator evidence

- Emulator: `CatatuApi35`, Android 15, 1080 by 1920
- Package: `com.awrisan.test`
- Final cold launch: successful
- Resumed activity: `com.awrisan.test/.MainActivity`
- Crash buffer: empty
- Fatal exception and WebView error scan: empty
- Final landing screenshot: `design/android-final-landing.png`
- Additional flow screenshots: `design/android-home.png`, `design/android-room-ready.png`, `design/android-result.png`, and `design/android-receipt.png`
- The Android flow was exercised from landing through sign-in, onboarding, dashboard, room lock, draw, result, and receipt.

## Automated checks

- Vitest: 4 tests passed
- Vite production build: passed
- Capacitor Android sync: passed
- Gradle debug install: passed on one emulator
- Em dash and en dash scan in app source and project documentation: clean
- TODO, FIXME, HACK, placeholder, and lorem ipsum scan in app source and project documentation: clean

## Mobile optimization iteration

- Baseline evidence: `design/audit-mobile-2026-07-15/08-iphone-landing-top.jpg` and `design/audit-mobile-2026-07-15/10-iphone-culture.jpg`
- Final implementation evidence: `design/audit-mobile-2026-07-15/12-iphone-optimized-top.png` and `design/audit-mobile-2026-07-15/14-iphone-optimized-culture.png`
- Combined comparison input: `design/audit-mobile-2026-07-15/40-mobile-before-after-comparison.png`
- Responsive viewport: 390 by 844
- Landing height before: 6,919 CSS pixels, 8.2 viewports
- Landing height after: 4,864 CSS pixels, 5.8 viewports
- Hero height before: 1,094 CSS pixels
- Hero height after: 809 CSS pixels
- Culture section height before: 1,527 CSS pixels
- Culture section height after: 1,009 CSS pixels
- Final visual finding P0: none
- Final visual finding P1: none
- Final visual finding P2: none
- The hero now completes in the first mobile viewport with one primary CTA and one text link.
- The cultural explanation now appears before its image on mobile. The image uses a 16:9 crop after the three cultural points.
- Mobile section spacing, typography, timeline rows, business path, final CTA, and footer were compacted without removing the business narrative.
- Desktop landing rules and the already healthy dashboard and sign-in layouts were preserved.

## Final Android mobile evidence

- Emulator: `CatatuApi35`, Android 15, 1080 by 1920, density 420
- Optimized landing: `design/audit-mobile-2026-07-15/32-android-final-root-state.png`
- Consent state evidence: `design/audit-mobile-2026-07-15/37-android-final-consent-checked.xml`
- Final dashboard: `design/audit-mobile-2026-07-15/39-android-final-dashboard.png`
- The WebView accessibility exporter continued to report `checked=false` for an ARIA checkbox. The control now exposes an explicit dynamic accessible name that changes from `Belum dipilih` to `Dipilih`, and this change was verified in the Android UI tree.
- The complete Android path from landing through sign-in, three onboarding steps, consent, and dashboard passed.
- Crash buffer: empty
- Fatal exception and WebView script error scan: empty
- Browser console errors and warnings: none

final result: passed
