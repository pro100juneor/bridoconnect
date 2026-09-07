#!/usr/bin/env bash
# Release-архів → TestFlight. Один запуск = архів, експорт .ipa, завантаження.
#
# Потрібні змінні оточення (від користувача):
#   ASC_KEY_ID     — Key ID .p8 (напр. J5S7JVYFJJ або T2V5QDMHN3)
#   ASC_ISSUER_ID  — Issuer ID (UUID з App Store Connect → Integrations → API)
#   ASC_KEY_PATH   — шлях до AuthKey_<KEY_ID>.p8
#
# Приклад:
#   ASC_KEY_ID=T2V5QDMHN3 \
#   ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
#   ASC_KEY_PATH=~/Downloads/AuthKey_T2V5QDMHN3.p8 \
#   scripts/testflight-release.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="/tmp/brido-release"
ARCHIVE="$BUILD/App.xcarchive"
IPA_DIR="$BUILD/ipa"
TEAM="XHR4JQAKJM"

: "${ASC_KEY_ID:?потрібен ASC_KEY_ID}"
: "${ASC_ISSUER_ID:?потрібен ASC_ISSUER_ID}"
: "${ASC_KEY_PATH:?потрібен ASC_KEY_PATH}"

echo "==> 1/4 web build + cap sync"
cd "$ROOT"
npm run build
npx cap sync ios

echo "==> 2/4 archive (Release)"
cd "$ROOT/ios/App"
xcodebuild -scheme App -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  -allowProvisioningUpdates \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID" \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  DEVELOPMENT_TEAM="$TEAM" \
  ${BUILD_NUM:+CURRENT_PROJECT_VERSION=$BUILD_NUM} \
  archive

echo "==> 3/4 export .ipa (app-store-connect)"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist "$ROOT/ios/ExportOptions.plist" \
  -exportPath "$IPA_DIR" \
  -allowProvisioningUpdates \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID" \
  -authenticationKeyPath "$ASC_KEY_PATH"

echo "==> 4/4 upload → TestFlight"
xcrun altool --upload-app --type ios \
  -f "$IPA_DIR"/*.ipa \
  --apiKey "$ASC_KEY_ID" \
  --apiIssuer "$ASC_ISSUER_ID"

echo "✅ Завантажено. Обробка в App Store Connect ~5–15 хв, потім зʼявиться в TestFlight."
