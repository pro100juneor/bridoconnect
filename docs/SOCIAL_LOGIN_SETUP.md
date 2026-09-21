# Настройка входа через Apple и Google

Код, натив-конфиг Capacitor и онбординг уже сделаны. Чтобы вход **реально заработал**,
нужно настроить провайдеров в трёх кабинетах (Apple Developer, Google Cloud, Supabase)
и заполнить env. Без этого кнопки видны, но нажатие вернёт «Вход недоступен».

Ключевой факт про нативный iOS-вход: приложение получает `id_token` от Apple/Google и
меняет его на сессию Supabase (`signInWithIdToken`). Supabase проверяет **`aud`**
(audience) токена по списку разрешённых client-id. Поэтому:

- у **Google** нативный `aud` = **iOS client ID** → его нужно добавить в Supabase;
- у **Apple** нативный `aud` = **bundle id** `de.brido.connect` → его нужно добавить в Supabase.

---

## 1. Apple Developer (developer.apple.com)

1. **Certificates, Identifiers & Profiles → Identifiers → App ID `de.brido.connect`**
   → включить capability **Sign in with Apple** → Save.
2. **Identifiers → «+» → Services IDs** — создать Services ID для веба, например
   `de.brido.connect.web`. Описание любое.
   - Включить **Sign in with Apple** → Configure:
     - **Primary App ID**: `de.brido.connect`.
     - **Domains**: `<PROJECT>.supabase.co` и прод-домен (`bridoconnect.vercel.app`).
     - **Return URLs**: `https://<PROJECT>.supabase.co/auth/v1/callback`.
3. **Keys → «+»** — создать ключ с включённым **Sign in with Apple**.
   - Скачать **`.p8`** (только один раз!). Записать **Key ID** и **Team ID**.

## 2. Google Cloud (console.cloud.google.com)

1. **APIs & Services → OAuth consent screen** — заполнить (External), добавить домены.
2. **Credentials → Create credentials → OAuth client ID → iOS**
   - Bundle ID: `de.brido.connect`.
   - Получить **iOS client ID** (`xxxx.apps.googleusercontent.com`) и **reversed client ID**
     (`com.googleusercontent.apps.xxxx`) — reversed нужен для URL-scheme в Xcode.
3. **Credentials → Create credentials → OAuth client ID → Web application**
   - **Authorized redirect URIs**: `https://<PROJECT>.supabase.co/auth/v1/callback`.
   - Получить **Web client ID** и **Web client secret**.

## 3. Supabase Dashboard → Authentication → Providers

1. **Apple** → Enable:
   - **Client IDs**: `de.brido.connect.web` (Services ID) **и** `de.brido.connect` (bundle id — для нативного iOS).
   - **Secret Key (.p8)** + **Key ID** + **Team ID** — из шага 1.3.
2. **Google** → Enable:
   - **Client ID (Web)** и **Client Secret** — из шага 2.3.
   - **Authorized Client IDs**: добавить **iOS client ID** из шага 2.2 (иначе нативный вход отвалится по `aud`).
3. **Authentication → URL Configuration → Redirect URLs** — добавить:
   - `http://localhost:5173/*`, `http://localhost:5174/*` (локальная разработка),
   - `https://bridoconnect.vercel.app/*` (прод).

## 4. Env (для нативного iOS)

В `.env.production` (и `.env.local` для локали) заполнить:

```
VITE_GOOGLE_IOS_CLIENT_ID=<iOS client ID из шага 2.2>
VITE_GOOGLE_WEB_CLIENT_ID=<Web client ID из шага 2.3>
```

Веб-сборке эти переменные не нужны — веб идёт через redirect Supabase.

## 5. Xcode (натив-iOS)

Открыть `ios/App/App.xcodeproj` (или `.xcworkspace`), таргет **App**:

1. **Signing & Capabilities → «+ Capability» → Sign in with Apple.**
   (Xcode сам создаст и подключит `App.entitlements` — вручную pbxproj не трогаем.)
2. **Info → URL Types → «+»** — добавить **reversed client ID** Google
   (`com.googleusercontent.apps.xxxx` из шага 2.2) в поле **URL Schemes**.
3. Пересобрать по пайплайну из `SESSION_HANDOFF`:
   ```
   npm run build && npx cap sync ios
   xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
     -destination 'generic/platform=iOS' -allowProvisioningUpdates \
     -derivedDataPath /tmp/bc-ios-dd build
   ```

## 6. Проверка

- **Web** (`npm run dev`): на `/auth` и `/register` жать Apple/Google → редирект в провайдера →
  возврат в приложение с сессией. Новый пользователь попадает на `/welcome` (роль + согласие).
- **iOS** (сборка на устройство): системная шторка Apple/Google → сессия без браузера →
  новый пользователь → `/welcome` → `/app`.
- Повторный вход тем же провайдером `/welcome` не показывает (онбординг уже завершён).

---

## Что уже сделано в коде (не требует действий)

- `src/lib/socialAuth.ts` — нативный `signInWithIdToken` (iOS) / `signInWithOAuth` (web), nonce для Apple.
- Кнопки Apple + Google на `/auth` и `/register` (обе платформы).
- Экран `/welcome` + RPC `complete_social_onboarding` + миграция `048_social_login_onboarding.sql`
  (роль/согласие 18+ для соц-пользователей; существующие пользователи забэкфилены).
- Плагин `@capgo/capacitor-social-login` подключён (`cap sync ios` выполнен).

> ⚠️ Миграция `048` применена **только к локальной БД**. На прод-Supabase её нужно применить
> отдельно (по явному «да»), иначе соц-вход на проде упадёт на отсутствии колонок/RPC.
