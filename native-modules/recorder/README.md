# memoroku-recorder

JavaScript entry for the native audio recorder. `startRecording()` and `stopRecording()` call the Expo module named `NativeRecorder`.

The compiling implementations live next to this package:

- iOS: `ios/NativeRecorderModule.swift`
- Android: `android/src/main/java/expo/modules/memorokurecorder/NativeRecorderModule.kt`

Matching starter classes are also copied into the bare app during `expo prebuild`:

- `ios/memoroku/NativeRecorder.swift`
- `android/app/src/main/java/com/memoroku/NativeRecorder.kt`

Widget and background-task starters are copied from `plugins/native` by `plugins/withMemorokuNative.js`, so `expo prebuild --clean` restores them. The iOS widget SwiftUI views are added to the app target as a starter. A home-screen extension target is still required before the widget appears in the gallery.
