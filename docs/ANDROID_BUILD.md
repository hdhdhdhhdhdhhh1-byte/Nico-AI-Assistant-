# Android Build Guide — Nico AI

## المتطلبات

- Node 20+ / Bun 1.1+
- Android Studio (Ladybug+) أو `sdkmanager` + `gradle` عبر Termux/CLI
- Android SDK 34، Build Tools 34.0.0
- JDK 17
- Keystore للتوقيع (release فقط)

## البناء

```bash
bun install
bun run build              # → dist/
npx cap add android        # أول مرة فقط
npx cap sync android

# ادمج ملفات المرحلة 8
cp apps/mobile/android/AndroidManifest.additions.xml \
   android/app/src/main/AndroidManifest.xml        # ادمج يدوياً
cp apps/mobile/android/MainActivity.java \
   android/app/src/main/java/com/nico/ai/MainActivity.java
cp apps/mobile/android/NicoVoiceServicePlugin.kt \
   android/app/src/main/java/com/nico/ai/NicoVoiceServicePlugin.kt
cp apps/mobile/android/VoiceBackgroundService.kt \
   android/app/src/main/java/com/nico/ai/VoiceBackgroundService.kt

cd android
./gradlew assembleRelease        # APK
./gradlew bundleRelease          # AAB (Google Play)
```

## Application ID & Versioning

`android/app/build.gradle`:

```gradle
defaultConfig {
    applicationId "com.nico.ai"
    versionCode 1
    versionName "1.0.0"
    minSdkVersion 24
    targetSdkVersion 34
}
```

زد `versionCode` مع كل نشر.

## Signing

```bash
keytool -genkey -v -keystore nico-release.keystore \
  -alias nico -keyalg RSA -keysize 2048 -validity 10000
```

`android/keystore.properties` (لا يُلتزم في Git):

```
storeFile=../../nico-release.keystore
storePassword=***
keyAlias=nico
keyPassword=***
```

## Icon & Splash

- Icon: 1024×1024 في `apps/mobile/android/resources/icon.png` ثم
  `npx capacitor-assets generate --android`.
- Splash: 2732×2732 في `resources/splash.png`. اللون `#070B18`.

## Permissions Review

راجع `apps/mobile/android/AndroidManifest.additions.xml` وأزل ما لا يستخدم
(مثال: BLUETOOTH_CONNECT / READ_CALENDAR / LOCATION اختيارية).

## Google Play Checklist

- [ ] Privacy Policy URL (يشير إلى `/privacy`)
- [ ] Data Safety form
- [ ] Target SDK 34
- [ ] AAB موقّع
- [ ] Screenshots 1080×1920
- [ ] Feature graphic 1024×500
- [ ] Content rating
- [ ] Foreground service justification (wake-word)

## APK vs AAB

- APK للتوزيع المباشر / testing / Termux.
- AAB مطلوب من Google Play (أصغر بعد التقسيم).

## Troubleshooting

- Duplicate class: احذف `android/build/` و `~/.gradle/caches/`.
- Wake-word في الخلفية: تأكّد من `FOREGROUND_SERVICE_MICROPHONE`.
- شاشة بيضاء بعد install: تأكد أن `server.url` معلّق في `capacitor.config.ts`.
