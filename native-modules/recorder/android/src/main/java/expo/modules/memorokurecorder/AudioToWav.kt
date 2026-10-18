package expo.modules.memorokurecorder

import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

private const val TARGET_SAMPLE_RATE = 16000

fun convertM4aToWav(cacheDir: File, inputUri: String): String {
  val input = File(localPath(inputUri))
  if (!input.exists()) {
    error("録音ファイルがありません。")
  }
  val extractor = MediaExtractor()
  val codec: MediaCodec
  try {
    extractor.setDataSource(input.absolutePath)
    val track = audioTrack(extractor)
    extractor.selectTrack(track)
    val format = extractor.getTrackFormat(track)
    val mime = format.getString(MediaFormat.KEY_MIME) ?: error("音声の形式が分かりません。")
    codec = MediaCodec.createDecoderByType(mime)
    codec.configure(format, null, null, 0)
    codec.start()
  } catch (error: Exception) {
    extractor.release()
    throw error
  }

  try {
    val samples = decodeMonoPcm(extractor, codec)
    if (samples.pcm.isEmpty()) {
      error("録音から音声を取り出せませんでした。")
    }
    val resampled = resample(samples.pcm, samples.sampleRate, TARGET_SAMPLE_RATE)
    val output = File(cacheDir, "memo-${System.currentTimeMillis()}.wav")
    writeWav(output, resampled, TARGET_SAMPLE_RATE)
    return "file://${output.absolutePath}"
  } finally {
    try {
      codec.stop()
    } catch (_: Exception) {
    }
    codec.release()
    extractor.release()
  }
}

private fun localPath(uri: String): String {
  val raw = if (uri.startsWith("file://")) uri.removePrefix("file://") else uri
  return try {
    java.net.URLDecoder.decode(raw, Charsets.UTF_8.name())
  } catch (_: Exception) {
    raw
  }
}

private fun audioTrack(extractor: MediaExtractor): Int {
  for (index in 0 until extractor.trackCount) {
    val mime = extractor.getTrackFormat(index).getString(MediaFormat.KEY_MIME) ?: continue
    if (mime.startsWith("audio/")) {
      return index
    }
  }
  error("音声トラックがありません。")
}

private data class DecodedAudio(val pcm: ShortArray, val sampleRate: Int)

private fun decodeMonoPcm(extractor: MediaExtractor, codec: MediaCodec): DecodedAudio {
  val bufferInfo = MediaCodec.BufferInfo()
  val pcm = ArrayList<Short>()
  var sampleRate = 0
  var channels = 1
  var encoding = AudioFormat.ENCODING_PCM_16BIT
  var inputDone = false
  var outputDone = false

  while (!outputDone) {
    if (!inputDone) {
      val inputIndex = codec.dequeueInputBuffer(10_000)
      if (inputIndex >= 0) {
        val inputBuffer = codec.getInputBuffer(inputIndex) ?: error("音声の入力バッファがありません。")
        val size = extractor.readSampleData(inputBuffer, 0)
        if (size < 0) {
          codec.queueInputBuffer(inputIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
          inputDone = true
        } else {
          codec.queueInputBuffer(inputIndex, 0, size, extractor.sampleTime, extractor.sampleFlags)
          extractor.advance()
        }
      }
    }

    when (val outputIndex = codec.dequeueOutputBuffer(bufferInfo, 10_000)) {
      MediaCodec.INFO_TRY_AGAIN_LATER -> Unit
      MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
        val outputFormat = codec.outputFormat
        sampleRate = outputFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
        channels = outputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT).coerceAtLeast(1)
        encoding = if (outputFormat.containsKey(MediaFormat.KEY_PCM_ENCODING)) {
          outputFormat.getInteger(MediaFormat.KEY_PCM_ENCODING)
        } else {
          AudioFormat.ENCODING_PCM_16BIT
        }
      }
      else -> {
        if (outputIndex < 0) {
          continue
        }
        val outputBuffer = codec.getOutputBuffer(outputIndex)
        if (outputBuffer != null && bufferInfo.size > 0) {
          outputBuffer.position(bufferInfo.offset)
          outputBuffer.limit(bufferInfo.offset + bufferInfo.size)
          appendMono(pcm, outputBuffer, channels, encoding)
        }
        codec.releaseOutputBuffer(outputIndex, false)
        if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
          outputDone = true
        }
      }
    }
  }

  if (sampleRate <= 0) {
    error("音声のサンプルレートが分かりません。")
  }
  return DecodedAudio(pcm.toShortArray(), sampleRate)
}

private fun appendMono(pcm: ArrayList<Short>, buffer: ByteBuffer, channels: Int, encoding: Int) {
  buffer.order(ByteOrder.nativeOrder())
  if (encoding == AudioFormat.ENCODING_PCM_FLOAT) {
    val floats = buffer.asFloatBuffer()
    val frameCount = floats.remaining() / channels
    for (frame in 0 until frameCount) {
      var sum = 0f
      for (channel in 0 until channels) {
        sum += floats.get()
      }
      pcm.add(floatToShort(sum / channels))
    }
    return
  }

  val shorts = buffer.asShortBuffer()
  val frameCount = shorts.remaining() / channels
  for (frame in 0 until frameCount) {
    var sum = 0
    for (channel in 0 until channels) {
      sum += shorts.get().toInt()
    }
    pcm.add((sum / channels).toShort())
  }
}

private fun floatToShort(sample: Float): Short {
  val clamped = sample.coerceIn(-1f, 1f)
  return (clamped * Short.MAX_VALUE).toInt().toShort()
}

private fun resample(input: ShortArray, sourceRate: Int, targetRate: Int): ShortArray {
  if (input.isEmpty() || sourceRate == targetRate) {
    return input
  }
  val length = (input.size.toLong() * targetRate / sourceRate).toInt().coerceAtLeast(1)
  val output = ShortArray(length)
  val step = sourceRate.toDouble() / targetRate.toDouble()
  for (index in output.indices) {
    val position = index * step
    val left = position.toInt().coerceAtMost(input.lastIndex)
    val right = (left + 1).coerceAtMost(input.lastIndex)
    val fraction = position - left
    val mixed = input[left].toDouble() + (input[right] - input[left]).toDouble() * fraction
    output[index] = mixed.toInt().toShort()
  }
  return output
}

private fun writeWav(file: File, samples: ShortArray, sampleRate: Int) {
  val dataBytes = samples.size * 2
  FileOutputStream(file).use { output ->
    val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
    header.put("RIFF".toByteArray(Charsets.US_ASCII))
    header.putInt(36 + dataBytes)
    header.put("WAVE".toByteArray(Charsets.US_ASCII))
    header.put("fmt ".toByteArray(Charsets.US_ASCII))
    header.putInt(16)
    header.putShort(1)
    header.putShort(1)
    header.putInt(sampleRate)
    header.putInt(sampleRate * 2)
    header.putShort(2)
    header.putShort(16)
    header.put("data".toByteArray(Charsets.US_ASCII))
    header.putInt(dataBytes)
    output.write(header.array())
    val body = ByteBuffer.allocate(dataBytes).order(ByteOrder.LITTLE_ENDIAN)
    for (sample in samples) {
      body.putShort(sample)
    }
    output.write(body.array())
  }
}
