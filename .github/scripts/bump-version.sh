#!/bin/bash
# bump-version.sh — Update app version across all config files.
# Usage: bump-version.sh <version> [version_code]
# Example: bump-version.sh 5.3.0 53000
# If version_code is omitted, it is guessed as major*10000 + minor*1000 + patch*100

set -euo pipefail

VERSION="${1:-}"
VERSION_CODE="${2:-}"

if [[ -z "$VERSION" ]]; then
    echo "Usage: $0 <version> [version_code]"
    echo "Example: $0 5.3.0 53000"
    exit 1
fi

# Validate version format (X.Y.Z)
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: version must be in X.Y.Z format (got '$VERSION')"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Guess version code from version if not provided
# e.g. 5.3.0 -> 53000, 5.2.1 -> 52001
if [[ -z "$VERSION_CODE" ]]; then
    CURRENT_XML_VERSION="$(sed -n 's/.* version="\([^"]*\)".*/\1/p' "${ROOT_DIR}/config.xml" | head -1)"
    CURRENT_XML_VCODE="$(sed -n 's/.* versionCode="\([^"]*\)".*/\1/p' "${ROOT_DIR}/config.xml" | head -1)"
    if [[ "$CURRENT_XML_VERSION" == "$VERSION" && -n "$CURRENT_XML_VCODE" ]]; then
        VERSION_CODE=$(( CURRENT_XML_VCODE + 1 ))
        echo "Version code not provided, using config.xml version code + 1: ${VERSION_CODE}"
    else
        IFS='.' read -r V_MAJOR V_MINOR V_PATCH <<< "$VERSION"
        VERSION_CODE=$(( (V_MAJOR * 10000) + (V_MINOR * 1000) + (V_PATCH * 100) ))
        echo "Version code not provided, guessing: ${VERSION_CODE}"
    fi
fi

# Validate version code (integer)
if ! [[ "$VERSION_CODE" =~ ^[0-9]+$ ]]; then
    echo "Error: version_code must be an integer (got '$VERSION_CODE')"
    exit 1
fi

# Compute ios-CFBundleVersion: X.Y.Z.<last digits of version code>
IOS_VERSION="${VERSION}.$(( VERSION_CODE % 100 ))"

echo "Bumping version to ${VERSION} (${VERSION_CODE}), ios-CFBundleVersion=${IOS_VERSION}"

# Cross-platform in-place sed
inplace_sed() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "$@"
    else
        sed -i "$@"
    fi
}

# --- config.xml ---
CONFIG_XML="${ROOT_DIR}/config.xml"
inplace_sed "s/android-versionCode=\"[^\"]*\"/android-versionCode=\"${VERSION_CODE}\"/" "${CONFIG_XML}"
inplace_sed "s/ios-CFBundleVersion=\"[^\"]*\"/ios-CFBundleVersion=\"${IOS_VERSION}\"/" "${CONFIG_XML}"
inplace_sed "s/ version=\"[^\"]*\"/ version=\"${VERSION}\"/" "${CONFIG_XML}"
inplace_sed "s/ versionCode=\"[^\"]*\"/ versionCode=\"${VERSION_CODE}\"/" "${CONFIG_XML}"
inplace_sed "s/MoodleMobile [^ ]* ([^)]*)/MoodleMobile ${VERSION} (${VERSION_CODE})/" "${CONFIG_XML}"
# Replace <string>X.Y.Z</string> used for CFBundleShortVersionString
inplace_sed "s|<string>[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*</string>|<string>${VERSION}</string>|" "${CONFIG_XML}"

# --- moodle.config.json ---
MOODLE_CONFIG="${ROOT_DIR}/moodle.config.json"
jq --indent 4 --arg v "${VERSION}" --argjson c "${VERSION_CODE}" \
    '.versionname = $v | .versioncode = $c' \
    "${MOODLE_CONFIG}" > "${MOODLE_CONFIG}.tmp" && mv "${MOODLE_CONFIG}.tmp" "${MOODLE_CONFIG}"

# --- package.json ---
PACKAGE_JSON="${ROOT_DIR}/package.json"
jq --indent 4 --arg v "${VERSION}" '.version = $v' \
    "${PACKAGE_JSON}" > "${PACKAGE_JSON}.tmp" && mv "${PACKAGE_JSON}.tmp" "${PACKAGE_JSON}"

# --- package-lock.json ---
PACKAGE_LOCK="${ROOT_DIR}/package-lock.json"
jq --indent 4 --arg v "${VERSION}" '.version = $v | .packages[""].version = $v' \
    "${PACKAGE_LOCK}" > "${PACKAGE_LOCK}.tmp" && mv "${PACKAGE_LOCK}.tmp" "${PACKAGE_LOCK}"

echo "Done."
