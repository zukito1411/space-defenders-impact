# Signed Android APK releases

This repository publishes **one production-signed APK for each push to `main`** after the one-time signing secrets are configured. GitHub Releases automatically retains only the **three newest automated Android releases**; publishing the fourth removes the oldest release and its Git tag.

Workflow: `.github/workflows/android-release.yml`  
Release tags: `android-v1`, `android-v2`, etc.  
APK file name: `SpaceImpactDefender-v<run number>-release.apk`

## 1. Provision a permanent production keystore (one time)

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

## 2. Create GitHub Actions repository secrets

Open [Repository settings → Actions secrets](https://github.com/zukito1411/space-defenders-impact/settings/secrets/actions) and add **four separate secrets**:

| Secret name | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | The full base64-encoded contents of the keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | The keystore's password |
| `ANDROID_KEY_ALIAS` | The alias inside the keystore (e.g. `spaceimpactdefender`) |
| `ANDROID_KEY_PASSWORD` | The key password (often the same as the store password for PKCS12) |

Never commit the keystore or these values to GitHub. Missing or incorrect credentials cause the workflow to fail **rather than uploading an unsigned or debug-signed APK**.

## 3. Release on each code change

After merging the workflow into `main`, every new push to `main`:

1. Builds the Vite app from locked npm dependencies.
2. Copies the production web bundle into Android with `npx cap sync android`.
3. Reconstructs the permanent keystore from the secret.
4. Builds `assembleRelease` with a monotonic Android version code.
5. Uses Android's `apksigner verify` to ensure the APK has a valid signature.
6. Publishes a GitHub Release containing exactly one APK.
7. Deletes Android releases older than the three newest, including their tags.

You can also manually trigger the workflow from GitHub Actions on `main`. Other releases (desktop or unrelated tags) are **not** deleted.

The retention rule is for releases tagged `android-v<run number>` and not drafts. It does not delete action logs, artifacts from unrelated workflows, or manually created non-Android releases.

## 4. Installing updates

Android requires the same package ID and signing certificate for an in-place APK update, and a higher `versionCode`. The workflow keeps the package ID `com.zukito.spaceimpactdefender`, reuses your signing key and increases the version code each run.

**Previously installed debug-signed APKs cannot be upgraded in place to this production key.** Back up any local saves first; then uninstall the debug-signed app and install the production APK. Once on the production signing key, later APK releases can update normally.

## 5. Check results

- View [GitHub Actions](https://github.com/zukito1411/space-defenders-impact/actions/workflows/android-release.yml) for build failures.
- View [GitHub Releases](https://github.com/zukito1411/space-defenders-impact/releases) for signed APKs.
- Keep a private backup of your keystore and credentials. If you lose them, signing future compatible updates may be impossible.

For publishing to Google Play, consider Play App Signing requirements separately; this workflow targets APK distribution through GitHub Releases.
