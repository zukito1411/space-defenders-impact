# Android APK release signing — permanent key

**Current setup (November 2026):** Android APKs are built with `assembleRelease`, and a single signing certificate is persisted in a **private, unpublished GitHub draft release** named `space-impact-private-signing-vault-v1`. Future workflows always restore that exact signing key. The user's old `ANDROID_DEBUG_KEYSTORE_BASE64` value (a fingerprint) is intentionally ignored.

## Why v19 and earlier cannot update normally

Before v20, the workflow generated a **fresh temporary signing key for every build**, then discarded it. Android correctly rejects in-place installation when signing certificates differ. Those private keys were not retained, so their certificates cannot be reproduced. **An installed v19 or earlier needs one final uninstall before installing the first persistent-key build.** Back up or sync local game saves first.

Once a persistent-key APK is installed, higher-version-code APKs signed with this same key should install **without uninstalling or losing local saves**.

## How permanent signing works

1. The first workflow run creates a 3072-bit RSA PKCS12 Android signing key with a random password (or imports four complete production Actions secrets if supplied at first initialization).
2. The key, alias and passwords are saved as a single asset on an **unpublished draft GitHub Release**. The asset is not included in the public APK releases.
3. Every subsequent run checks that the vault is still a **draft**, downloads the key, checks that it can be opened, and signs the APK with it.
4. `apksigner verify` and a comparison against the keytool certificate fingerprint must succeed before publishing.
5. Only the three latest published releases tagged `android-vN` are kept; the vault is on a separate tag and is excluded from cleanup.

Workflow: `.github/workflows/android-release.yml`

## CRITICAL security and recovery guidance

The draft vault contains **the private signing key and passwords**, protected by GitHub draft-release access controls: repository collaborators with write access can read it. It must **never be published, shared, or deleted**. This is a convenient persistence fallback, but it is **not equivalent to GitHub Actions Secrets or an HSM**. Protect repository write access and back up the vault securely when possible. Later migration to dedicated secrets must use the **same existing certificate**, not generate a new one.

If the vault is missing or made public after APKs have shipped, stop releasing, investigate, and recover/secure the key. Do not silently rotate signing credentials. The Actions workflow now prevents simultaneous signing-vault initialization from concurrent pushes.

## Performance diagnostics

Air Raid caps high-refresh Android requestAnimationFrame execution at approximately 60 Hz. When sustained frame cost is too high on a small viewport, visual draws can adapt to around 30 Hz while gameplay/input still run at up to 60 Hz. High-volume GPU particles use shared textures rather than per-frame Pixi vector tessellation.

In Air Raid, open **Pause → Settings → Show FPS and performance timings (Air Raid)**. The overlay reports actual displayed FPS, average simulation CPU time, average render CPU time, and the maximum frame interval over a one-second window. These help distinguish logic/CPU costs from drawing/GPU/thermal limits; the build process cannot measure physical-device FPS.

## Links

- [Latest Android releases](https://github.com/zukito1411/space-defenders-impact/releases)
- [Build and signature verification](https://github.com/zukito1411/space-defenders-impact/actions/workflows/android-release.yml)
