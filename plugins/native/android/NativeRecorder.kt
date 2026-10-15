package com.memoroku

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import java.io.File

class NativeRecorder(private val context: Context) {
  private var recorder: MediaRecorder? = null
  private var outputPath: String? = null

  fun startRecording() {
    if (recorder != null) {
      return
    }
    val file = File(context.cacheDir, "memo-${System.currentTimeMillis()}.m4a")
    val next = createRecorder()
    next.setAudioSource(MediaRecorder.AudioSource.MIC)
    next.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
    next.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
    next.setOutputFile(file.absolutePath)
    next.prepare()
    next.start()
    recorder = next
    outputPath = file.absolutePath
  }

  fun stopRecording(): String? {
    recorder?.run {
      stop()
      release()
    }
    recorder = null
    return outputPath
  }

  private fun createRecorder(): MediaRecorder {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      MediaRecorder(context)
    } else {
      @Suppress("DEPRECATION")
      MediaRecorder()
    }
  }
}
