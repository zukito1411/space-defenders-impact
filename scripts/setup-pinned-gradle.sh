#!/usr/bin/env bash
set -euo pipefail

# GitHub's direct Gradle distribution download has intermittently returned HTTP
# 504. Reuse an official Gradle Docker image as a verified, cacheable source of
# the pinned toolchain, without building the Android app inside Docker.
GRADLE_VERSION="8.14.3"
GRADLE_IMAGE="gradle:${GRADLE_VERSION}-jdk21"
GRADLE_HOME_DIR="$HOME/.cache/space-impact-gradle/${GRADLE_VERSION}"

if [[ ! -x "$GRADLE_HOME_DIR/bin/gradle" ]]; then
  echo "Installing pinned Gradle $GRADLE_VERSION from the official Docker image..."
  mkdir -p "$GRADLE_HOME_DIR"
  container="$(docker create "$GRADLE_IMAGE")"
  trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
  docker cp "$container:/opt/gradle/." "$GRADLE_HOME_DIR/"
  docker rm "$container" >/dev/null
  trap - EXIT
fi

if [[ ! -x "$GRADLE_HOME_DIR/bin/gradle" ]]; then
  echo "::error::Could not extract pinned Gradle distribution."
  exit 1
fi

ACTUAL_VERSION="$("$GRADLE_HOME_DIR/bin/gradle" --version | sed -n 's/^Gradle //p' | head -n 1)"
if [[ "$ACTUAL_VERSION" != "$GRADLE_VERSION" ]]; then
  echo "::error::Expected Gradle $GRADLE_VERSION, got $ACTUAL_VERSION."
  exit 1
fi

echo "Gradle $ACTUAL_VERSION ready."
echo "SPACE_IMPACT_GRADLE=$GRADLE_HOME_DIR/bin/gradle" >> "$GITHUB_ENV"
