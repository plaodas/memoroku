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
      next.setAudioSource(MediaRecorder.AudioSource.MIC)
      next.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
      next.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
      next.setOutputFile(file.absolutePath)
      next.prepare()
      next.start()
      recorder = next
      outputPath = file.absolutePath
      true
    }

    AsyncFunction("stopRecording") {
      recorder?.run {
        stop()
        release()
      }
      recorder = null
      outputPath
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
