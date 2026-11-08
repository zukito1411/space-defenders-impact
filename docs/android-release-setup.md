# Signed Android APK releases

This repository publishes **one Android release-variant APK for each push to `main`** after signing is configured. A production certificate is preferred, but the workflow can also reuse an existing Android debug keystore for development builds. A debug-signed release variant is **not** a production-signed APK. GitHub Releases automatically retains only the **three newest automated Android releases**; publishing the fourth removes the oldest release and its Git tag.

Workflow: `.github/workflows/android-release.yml`  
Release tags: `android-v1`, `android-v2`, etc.  
APK file name: `SpaceImpactDefender-v<run number>-release.apk`

## 1. Existing `ANDROID_DEBUG_KEYSTORE_BASE64` secret (development fallback)

The workflow now accepts the repository's existing `ANDROID_DEBUG_KEYSTORE_BASE64` GitHub Actions secret as a fallback when no production key has been configured. The secret must contain the base64-encoded Android debug keystore using the standard **`androiddebugkey`** alias and **`android`** store/key passwords. The workflow checks the keystore and verifies that the APK signing certificate matches it.

This builds the `assembleRelease` variant, rather than `assembleDebug`, but it is **still signed with a debug certificate**. The GitHub Release notes explicitly warn that the APK is for development/testing only. Anyone with access to the signing key can distribute an update accepted by Android. Avoid publicly distributing debug-signed APKs as production releases.

If the debug keystore uses nonstandard passwords or an alias, configure the four production secrets below instead.

## 2. Provision a permanent production keystore (recommended)

**Do not use the Android debug keystore.** Keep the *same* private signing key and passwords for every future release. Replacing the key will prevent existing installs from upgrading in place. Back up the keystore in a secure location.

If you already have a **production** keystore used for distributing this app, reuse it rather than generating another one. Otherwise generate a new one:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore SpaceImpactDefender-release.jks \
  -alias spaceimpactdefender -keyalg RSA -keysize 3072 -validity 10000 \
  -dname "CN=Space Impact Defender, O=Space Impact Defenders"
```

Afterward, encode the **binary** keystore file for the GitHub secret:

```bash
base64 -w 0 SpaceImpactDefender-release.jks
```

On macOS, use `base64 < SpaceImpactDefender-release.jks | tr -d '\n'`. On Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('SpaceImpactDefender-release.jks'))
```

## 3. Create GitHub Actions production repository secrets

Open [Repository settings → Actions secrets](https://github.com/zukito1411/space-defenders-impact/settings/secrets/actions) and add **four separate secrets**:

| Secret name | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | The full base64-encoded contents of the keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | The keystore's password |
| `ANDROID_KEY_ALIAS` | The alias inside the keystore (e.g. `spaceimpactdefender`) |
| `ANDROID_KEY_PASSWORD` | The key password (often the same as the store password for PKCS12) |

Never commit the keystore or these values to GitHub. If production secrets are present but incomplete or invalid, the workflow fails rather than silently falling back. If production secrets are absent and `ANDROID_DEBUG_KEYSTORE_BASE64` exists, the workflow explicitly uses and labels the debug-signed development fallback.

## 4. Release on each code change

After merging the workflow into `main`, every new push to `main`:

1. Builds the Vite app from locked npm dependencies.
2. Copies the production web bundle into Android with `npx cap sync android`.
3. Reconstructs the production keystore, or the explicitly labeled debug-key fallback, from the GitHub Actions secret.
4. Builds `assembleRelease` with a monotonic Android version code.
5. Uses Android's `apksigner verify` and a certificate fingerprint comparison to ensure the APK uses the selected key.
6. Publishes a GitHub Release containing exactly one APK.
7. Deletes Android releases older than the three newest, including their tags.

You can also manually trigger the workflow from GitHub Actions on `main`. Other releases (desktop or unrelated tags) are **not** deleted.

The retention rule is for releases tagged `android-v<run number>` and not drafts. It does not delete action logs, artifacts from unrelated workflows, or manually created non-Android releases.

## 5. Installing updates

Android requires the same package ID and signing certificate for an in-place APK update, and a higher `versionCode`. The workflow keeps the package ID `com.zukito.spaceimpactdefender`, reuses your signing key and increases the version code each run.

**Debug-signed APKs cannot be upgraded in place to an APK signed with a different production key.** Back up your local saves before switching signing certificates; typically you must uninstall the earlier APK first. APKs signed repeatedly with the same debug keystore can update each other for testing, but production users should transition to a permanent production key.

## 6. Check results

- View [GitHub Actions](https://github.com/zukito1411/space-defenders-impact/actions/workflows/android-release.yml) for build failures.
- View [GitHub Releases](https://github.com/zukito1411/space-defenders-impact/releases) for signed APKs.
- Keep a private backup of your keystore and credentials. If you lose them, signing future compatible updates may be impossible.

For publishing to Google Play, consider Play App Signing requirements separately; this workflow targets APK distribution through GitHub Releases.
