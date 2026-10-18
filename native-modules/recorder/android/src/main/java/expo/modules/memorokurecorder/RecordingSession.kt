package expo.modules.memorokurecorder

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Build
import androidx.core.content.ContextCompat
import java.io.File

object RecordingSession {
  private val lock = Any()
  private var recorder: MediaRecorder? = null
  private var outputPath: String? = null
  private var startedAtMs: Long = 0

  fun startFromIntent(context: Context, intent: Intent?) {
    val data = intent?.dataString ?: return
    if (data != "memoroku://record" && !data.startsWith("memoroku://record?")) {
      return
    }
    try {
      start(context)
    } catch (_: Exception) {
      // The screen asks for permission or shows the error if this start cannot run.
    }
  }

  fun start(context: Context): Boolean {
    synchronized(lock) {
      if (recorder != null) {
        return true
      }
      val granted =
        ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
          PackageManager.PERMISSION_GRANTED
      if (!granted) {
        return false
      }
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
      startedAtMs = System.currentTimeMillis()
      return true
    }
  }

  fun startedAtMs(): Long {
    synchronized(lock) {
      return if (recorder == null) 0 else startedAtMs
    }
  }

  fun stop(): String? {
    synchronized(lock) {
      val current = recorder
      val path = outputPath
      if (current == null) {
        return null
      }
      var captured = false
      try {
        current.stop()
        captured = true
      } catch (_: RuntimeException) {
        // stop() throws when the recorder never received audio.
      } finally {
        try {
          current.release()
        } catch (_: RuntimeException) {
        }
        if (recorder === current) {
          recorder = null
          outputPath = null
          startedAtMs = 0
        }
      }
      if (!captured) {
        if (path != null) {
          File(path).delete()
        }
        return null
      }
      return path
    }
  }

  fun readLevel(): Double {
    synchronized(lock) {
      val current = recorder ?: return 0.0
      return try {
        current.maxAmplitude / 32767.0
      } catch (_: RuntimeException) {
        0.0
      }
    }
  }

  private fun createRecorder(context: Context): MediaRecorder {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      MediaRecorder(context)
    } else {
      @Suppress("DEPRECATION")
      MediaRecorder()
    }
  }
}
