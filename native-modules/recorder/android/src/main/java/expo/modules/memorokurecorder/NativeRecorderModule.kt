package expo.modules.memorokurecorder

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NativeRecorderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NativeRecorder")

    AsyncFunction("startRecording") {
      val context = appContext.reactContext ?: error("React context is unavailable")
      if (!RecordingSession.start(context)) {
        error("録音を開始できませんでした。")
      }
      true
    }

    AsyncFunction("stopRecording") {
      RecordingSession.stop()
    }

    AsyncFunction("recordingStartedAt") {
      RecordingSession.startedAtMs().toDouble()
    }

    AsyncFunction("readLevel") {
      RecordingSession.readLevel()
    }

    AsyncFunction("convertToWav") { inputUri: String ->
      val context = appContext.reactContext ?: error("React context is unavailable")
      convertM4aToWav(context.cacheDir, inputUri)
    }
  }
}
