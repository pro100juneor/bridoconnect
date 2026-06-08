# iOS build & deploy — BridoConnect

> Capacitor 8 обгортає Vite-bundle в native iOS shell. Native APIs у
> `src/lib/native.ts` (haptics, share, status-bar, keyboard).

## Поточний стан (стенд 2026-06-06)

| Параметр              | Значення                                                  |
| --------------------- | --------------------------------------------------------- |
| Bundle ID             | `de.brido.connect`                                        |
| Team ID               | `T2LC85X323` (Oleksii Kusov, $99 Apple Developer Program) |
| Signing               | Automatic (вже в `project.pbxproj`)                       |
| iOS deployment target | 15.0                                                      |
| Capacitor plugins     | App, Haptics, Keyboard, Share, StatusBar                  |
| iPhone 15 Pro Max     | UDID `00008130-000C71E93CE0001C`, доступний по WiFi       |
| iPhone 12 Pro         | UDID `00008101-...`, наразі unavailable                   |

## ⚠️ Один раз — твоя дія в Xcode

CLI **не може** залогінити Apple ID в Xcode-account, навіть якщо cert вже в Keychain.
Поточна помилка xcodebuild: `No Account for Team "T2LC85X323"`.

1. Відкрий Xcode:
   ```sh
   open ~/bridoconnect/ios/App/App.xcodeproj
   ```
2. `Xcode → Settings…` (`⌘,`) → вкладка **Accounts**
3. `+` ліворуч знизу → **Apple ID**
4. Залогінься Apple ID привʼязаним до $99 Developer Program
5. У списку команд повинно зʼявитись **Team `T2LC85X323`** з типом «Apple Developer Program»
6. Закрий Settings

Provisioning profile для `de.brido.connect` буде створено автоматично при першому build з `-allowProvisioningUpdates`.

## Deploy на iPhone 15 Pro Max (по WiFi)

```sh
cd ~/bridoconnect

# 1. Build web + sync iOS
npm run build && npx cap sync ios

# 2. Build + sign + install + launch — все одною командою
xcodebuild -project ios/App/App.xcodeproj \
  -scheme App -configuration Debug \
  -destination "id=00008130-000C71E93CE0001C" \
  -allowProvisioningUpdates \
  -derivedDataPath ios/DerivedData build

APP_PATH=$(find ios/DerivedData/Build/Products/Debug-iphoneos -name "App.app" -type d | head -1)
xcrun devicectl device install app --device 19F9CA69-764D-5A51-9DC8-5457C9270EBA "$APP_PATH"
xcrun devicectl device process launch --device 19F9CA69-764D-5A51-9DC8-5457C9270EBA de.brido.connect
```

Перший раз на iPhone: **Settings → General → VPN & Device Management → Apple Development: Oleksii Kusov → Trust**.

## Deploy на iPhone 12 Pro (по USB)

1. Підключи кабель
2. На iPhone: «Trust this computer» + passcode
3. Перевір видимість:
   ```sh
   xcrun devicectl list devices | grep "iPhone 12"
   ```
   має бути `available`, не `unavailable`
4. Запам'ятай UDID (паттерн `00008101-...`) — старий UDID міг зміниться після нової пари
5. Використай ту ж команду xcodebuild що для iPhone 15, замінивши обидва `destination` UDID і `devicectl` UDID

## Live-reload (швидкий dev цикл)

iPhone завантажує JS з Mac'а напряму — без rebuild за кожну зміну.

```sh
# Terminal 1 — dev server видимий у WiFi
npm run dev -- --host 0.0.0.0 --port 8080

# Terminal 2 — оновити Mac IP в capacitor.config.ts якщо змінився
ipconfig getifaddr en0   # порівняй з CAP_DEV_URL у config

# Terminal 3 — sync + build + install
CAP_LIVE_RELOAD=1 npx cap sync ios
CAP_LIVE_RELOAD=1 xcodebuild -project ios/App/App.xcodeproj \
  -scheme App -configuration Debug \
  -destination "id=00008130-000C71E93CE0001C" \
  -allowProvisioningUpdates \
  -derivedDataPath ios/DerivedData build

APP_PATH=$(find ios/DerivedData/Build/Products/Debug-iphoneos -name "App.app" -type d | head -1)
xcrun devicectl device install app --device 19F9CA69-764D-5A51-9DC8-5457C9270EBA "$APP_PATH"
xcrun devicectl device process launch --device 19F9CA69-764D-5A51-9DC8-5457C9270EBA de.brido.connect
```

Тепер кожна зміна у `src/` миттєво в iPhone — без rebuild.

## TestFlight (для розсилки тестерам)

Має $99 Developer Program — окрема ручна реєстрація:

1. https://appstoreconnect.apple.com → My Apps → `+` → New App
2. Bundle ID: `de.brido.connect`, SKU: будь-який унікальний
3. CLI archive + upload:
   ```sh
   xcodebuild -project ios/App/App.xcodeproj -scheme App \
     -configuration Release -archivePath build/App.xcarchive \
     -destination "generic/platform=iOS" -allowProvisioningUpdates archive
   xcodebuild -exportArchive -archivePath build/App.xcarchive \
     -exportOptionsPlist ios/ExportOptions.plist \
     -exportPath build/ipa -allowProvisioningUpdates
   xcrun altool --upload-app --type ios -f build/ipa/App.ipa \
     --apiKey <key> --apiIssuer <issuer>
   ```
4. App Store Connect обробляє ~10 хв
5. TestFlight → додаєш Internal Testers (до 100 чол) — їм приходить email

Для CLI upload потрібен App Store Connect API key (.p8 file) — це окремий setup.

## Native APIs (через `src/lib/native.ts`)

| Helper              | Call site                        | Capacitor plugin        |
| ------------------- | -------------------------------- | ----------------------- |
| `tap('medium')`     | кожен primary CTA, swipe-confirm | `@capacitor/haptics`    |
| `notify('success')` | donation confirmed, KYC approved | `@capacitor/haptics`    |
| `share({...})`      | PublicProfile «Поделиться»       | `@capacitor/share`      |
| `setStatusBar()`    | route change                     | `@capacitor/status-bar` |
| `onKeyboard()`      | Chat composer lift               | `@capacitor/keyboard`   |

`isNative` = true тільки в Xcode-builded app. Кожен helper — no-op у web Safari.

## Troubleshooting

| Симптом                                         | Причина / fix                                                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `No Account for Team "T2LC85X323"`              | Apple ID не доданий в Xcode → Settings → Accounts (див. «Один раз» вище)                             |
| `No profiles for 'de.brido.connect'`            | Пропущено `-allowProvisioningUpdates` у xcodebuild                                                   |
| iPhone `unavailable` у `devicectl list devices` | Не paired АБО не на одній WiFi. USB → Trust → потім Xcode → Window → Devices → «Connect via Network» |
| Builds дуже довгі                               | Норма перший раз (~3-5 хв). Incremental — ~30 сек.                                                   |
| `Untrusted developer` на iPhone при запуску     | Settings → General → VPN & Device Management → Trust Apple Development: Oleksii Kusov                |
| Live-reload не вантажиться                      | IP Mac'а змінився → онови `CAP_DEV_URL` у `capacitor.config.ts`. Перевір `ipconfig getifaddr en0`    |
