# memoroku

[日本語](README.ja.md)

A phone app for short voice memos. It keeps each recording on the device, sends it to minutes for transcription, and shows the short result on a home-screen widget.

The transcription backend is [minutes](https://github.com/plaodas/minutes). This repository holds only the phone app. It does not call speaker diarization, summaries, or Word export.

The product promises are in [docs/promises.md](docs/promises.md).

## Related repositories

- [minutes](https://github.com/plaodas/minutes): the backend that transcribes audio. memoroku uploads recordings here.
- [minutes-ext-access](https://github.com/plaodas/minutes-ext-access): a sample React / Laravel app that calls minutes. The browser never holds a minutes token.

## What it does

- Records audio. The file stays in the device's storage and can be played from the list. After the microphone permission is granted, hold-to-record is the default
- Uploads to minutes and waits until transcription finishes
- Notifies when a memo is ready and shows a short line on the widget. A tap opens that memo
- Deletes memos after 24 hours. They can also be deleted from the list, which removes the recording file

The widget has no record button. The widget does not call minutes.

Recording and playback work before the server URL and token are saved. Uploads resume after those settings are saved.

## Requirements

- Node.js 20.19 or later, 22.13 or later, 24.3 or later, or 25 or later
- Android Studio, with an SDK of API 31 or later. Check on an emulator or device at API 31 or later
- [minutes](https://github.com/plaodas/minutes) running as the transcription server. From the Android emulator, the host is `10.0.2.2` when minutes runs in WSL

Expo Go does not run this app, because it uses a widget and native recording. Use a development build.

Check iOS on a device after a Mac and an iPhone are available. On Windows, do not run `expo run:ios` or `pod install`.

## Setup on Windows

Keep the working copy on a Windows disk. Do not continue from a WSL path or `\\wsl$\`.

```powershell
npm ci --legacy-peer-deps
```

`react` is pinned to `19.2.3`. `@expo/ui` optionally pulls `react-dom@19.3.1`, and that peer dependency conflicts. Do not use `npm install`. Install from the lockfile with the command above.

Set these user environment variables so the terminal can see Gradle and the SDK. Open a new terminal after changing them.

- `JAVA_HOME` is the JDK bundled with Android Studio (`C:\Program Files\Android\Android Studio\jbr`)
- `JAVA_TOOL_OPTIONS` is `--enable-native-access=ALL-UNNAMED`. Without it, CMake configuration fails on this JDK
- `ANDROID_HOME` is `%LOCALAPPDATA%\Android\Sdk`
- Add `%JAVA_HOME%\bin`, `%ANDROID_HOME%\platform-tools`, and `%ANDROID_HOME%\emulator` to PATH

Keep line endings as LF. Do not let `core.autocrlf` convert `gradlew` to CRLF.

## Run

```powershell
npx expo run:android
```

The first run builds a development build and installs it on an emulator or device. The Android SDK installs CMake during the build. A separate install is unnecessary.

## Connection

In the app's settings screen, enter the base URL and service token for [minutes](https://github.com/plaodas/minutes). Authentication is `Authorization: Bearer`. There is no login screen.

When minutes runs in WSL and the Android emulator connects to it, set the server URL to `http://10.0.2.2:<minutes public port>`.

## License

[MIT](LICENSE)
