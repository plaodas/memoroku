package expo.modules.memorokurecorder

import android.media.MediaRecorder
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class NativeRecorderModule : Module() {
  private var recorder: MediaRecorder? = null
  private var outputPath: String? = null

  override fun definition() = ModuleDefinition {
    Name("NativeRecorder")

    AsyncFunction("startRecording") {
      if (recorder != null) {
        return@AsyncFunction true
      }
      val context = appContext.reactContext ?: error("React context is unavailable")
      val file = File(context.cacheDir, "memo-${System.currentTimeMillis()}.m4a")
      val next = createRecorder(context)
      try {
        next.setAudioSource(MediaRecorder.AudioSource.MIC)
        next.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        next.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        next.setOutputFile(file.absolutePath)
        next.prepare()
        next.start()
      } catch (error: Exception) {
        next.release()
        file.delete()
        throw error
      }
      recorder = next
      outputPath = file.absolutePath
      true
    }

    AsyncFunction("stopRecording") {
      val current = recorder
      val path = outputPath
      if (current == null) {
        return@AsyncFunction null
      }
      var captured = false
      try {
        current.stop()
        captured = true
      } catch (_: RuntimeException) {
        // stop() throws when the recorder never received audio, which happens
        // if the finger lifts immediately or the activity is in a bubble.
      } finally {
        try {
          current.release()
        } catch (_: RuntimeException) {
        }
        if (recorder === current) {
          recorder = null
          outputPath = null
        }
      }
      if (!captured) {
        if (path != null) {
          File(path).delete()
        }
        return@AsyncFunction null
      }
      path
    }

    AsyncFunction("readLevel") {
      val current = recorder ?: return@AsyncFunction 0.0
      try {
        current.maxAmplitude / 32767.0
      } catch (_: RuntimeException) {
        0.0
      }
    }
  }

  private fun createRecorder(context: android.content.Context): MediaRecorder {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      MediaRecorder(context)
    } else {
      @Suppress("DEPRECATION")
      MediaRecorder()
    }
  }
}
