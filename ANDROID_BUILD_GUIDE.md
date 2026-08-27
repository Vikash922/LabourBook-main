# 📱 LabourBook — Real Android App Build & Deployment Guide

This guide explains how to build, test, sign, and export the **LabourBook** Native Android Application (`com.labourbook.app`) directly on your Android phone using **Termux** or on any machine.

---

## 🏗️ 1. Project Specifications

| Property | Value |
| :--- | :--- |
| **App Name** | `LabourBook` |
| **Package ID / Application ID** | `com.labourbook.app` |
| **Min SDK** | `24` (Android 7.0+) |
| **Target / Compile SDK** | `36` (Android 14/15+) |
| **Gradle Version** | `8.14.3` |
| **Android Gradle Plugin (AGP)** | `8.13.0` |
| **Required JDK** | `OpenJDK 17` or `OpenJDK 21` |
| **Architecture** | React 18 + TypeScript + Vite + Zustand + Capacitor 8 + Firebase |

---

## ⚡ 2. Quick Workflow (React Build & Android Sync)

Before compiling the APK or AAB, ensure your web assets and Capacitor bridge are up-to-date:

```bash
# Navigate to the project root
cd ~/LabourBook-WEB-main

# Install dependencies (if not already done)
npm install

# Compile React TypeScript & Sync to Android Native Project in one step:
npm run build:android
```

---

## 📲 3. Building on Android via Termux

### Step A: Install OpenJDK & Build Tools in Termux
```bash
# Update Termux packages
pkg update -y

# Install OpenJDK 17 or 21
pkg install openjdk-17 -y

# Verify Java version (must be Java 17 or 21)
java -version
```

---

### Step B: Build Debug APK (For Testing on Your Phone)

```bash
# 1. Enter the Android directory
cd ~/LabourBook-WEB-main/android

# 2. Make Gradle wrapper executable
chmod +x gradlew

# 3. Build Debug APK
./gradlew assembleDebug
```

#### 📍 Locate and Install Debug APK:
The compiled Debug APK will be generated at:
```
~/LabourBook-WEB-main/android/app/build/outputs/apk/debug/app-debug.apk
```

To copy the APK to your phone's **Downloads** folder and install it:
```bash
cp ~/LabourBook-WEB-main/android/app/build/outputs/apk/debug/app-debug.apk /sdcard/Download/LabourBook-Debug.apk
```
*Open your phone's **Files / Downloads** app and tap `LabourBook-Debug.apk` to install!*

---

## 🔐 4. Building Release APK & Google Play AAB

### Step A: Generate a Secure Keystore (One-Time)
Run this command in Termux to create your private signing key:

```bash
keytool -genkey -v -keystore ~/labourbook-release-key.jks \
  -alias labourbook_key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```
*(Enter a secure password and remember it! Keep `labourbook-release-key.jks` safe and NEVER share it or commit it to GitHub).*

---

### Step B: Build Production Release APK (`assembleRelease`)

```bash
cd ~/LabourBook-WEB-main/android
./gradlew assembleRelease
```

#### Sign the Release APK using `apksigner` (or `jarsigner`):
```bash
# Copy unsigned APK
cp app/build/outputs/apk/release/app-release-unsigned.apk ~/LabourBook-Release-Unsigned.apk

# Sign with your keystore
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore ~/labourbook-release-key.jks \
  ~/LabourBook-Release-Unsigned.apk labourbook_key

# Copy to phone storage for installation
cp ~/LabourBook-Release-Unsigned.apk /sdcard/Download/LabourBook-Release.apk
```

---

### Step C: Build Google Play Android App Bundle (`bundleRelease`)

For publishing to the Google Play Store:

```bash
cd ~/LabourBook-WEB-main/android
./gradlew bundleRelease
```

#### 📍 Locate Google Play Bundle (`.aab`):
```
~/LabourBook-WEB-main/android/app/build/outputs/bundle/release/app-release.aab
```

Copy the `.aab` to your Downloads folder to upload directly on **Google Play Console**:
```bash
cp ~/LabourBook-WEB-main/android/app/build/outputs/bundle/release/app-release.aab /sdcard/Download/LabourBook-Release.aab
```

---

## 🛡️ 5. Firebase & Firestore Security Rules

Your Firestore security rules remain strictly isolated per user UID:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🚀 6. Feature Checklist

- [x] **App ID**: `com.labourbook.app`
- [x] **Official App Icons**: High-res logo configured across all Android mipmap densities (`hdpi`, `mdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`).
- [x] **Native Status Bar**: Royal Blue `#1656D6` matching branding.
- [x] **Multi-Level Android Back Button**: Closes bottom sheets & modals first, navigates screen history, and prompts double-tap to exit on Home.
- [x] **3 Daily Native Reminders**: 9:00 AM (Morning), 2:00 PM (Afternoon break), 6:00 PM (Evening checkout) with stable IDs.
- [x] **Universal PDF Generation**: Saves to device cache and opens Native Android Share Sheet (WhatsApp, Drive, Gmail, Files).
- [x] **Native Clipboard**: Instant copying with system clipboard integration.
- [x] **Offline-First Storage**: Local data persists in localForage/IndexedDB; auto-syncs with Firebase on reconnect.
