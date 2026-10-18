import AVFoundation
import Foundation

private let targetSampleRate: Double = 16_000

func convertRecordingToWav(_ path: String) throws -> String {
  let inputURL = recordingURL(path)
  let inputFile = try AVAudioFile(forReading: inputURL)
  guard let outputFormat = AVAudioFormat(
    commonFormat: .pcmFormatInt16,
    sampleRate: targetSampleRate,
    channels: 1,
    interleaved: true
  ) else {
    throw AudioConversionError.failed
  }
  let outputURL = FileManager.default.temporaryDirectory
    .appendingPathComponent("memo-\(UUID().uuidString).wav")
  let outputFile = try AVAudioFile(forWriting: outputURL, settings: outputFormat.settings)
  let inputFormat = inputFile.processingFormat
  guard let converter = AVAudioConverter(from: inputFormat, to: outputFormat) else {
    throw AudioConversionError.failed
  }

  let inputCapacity: AVAudioFrameCount = 4096
  while inputFile.framePosition < inputFile.length {
    guard let inputBuffer = AVAudioPCMBuffer(pcmFormat: inputFormat, frameCapacity: inputCapacity) else {
      throw AudioConversionError.failed
    }
    try inputFile.read(into: inputBuffer, frameCount: inputCapacity)
    if inputBuffer.frameLength == 0 {
      break
    }
    let ratio = outputFormat.sampleRate / inputFormat.sampleRate
    let outputCapacity = AVAudioFrameCount(Double(inputBuffer.frameLength) * ratio) + 32
    guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: outputFormat, frameCapacity: outputCapacity) else {
      throw AudioConversionError.failed
    }
    var conversionError: NSError?
    var consumed = false
    let status = converter.convert(to: outputBuffer, error: &conversionError) { _, outStatus in
      if consumed {
        outStatus.pointee = .noDataNow
        return nil
      }
      consumed = true
      outStatus.pointee = .haveData
      return inputBuffer
    }
    if let conversionError {
      throw conversionError
    }
    if status == .error {
      throw AudioConversionError.failed
    }
    if outputBuffer.frameLength > 0 {
      try outputFile.write(from: outputBuffer)
    }
  }

  return outputURL.absoluteString
}

private func recordingURL(_ path: String) -> URL {
  if path.hasPrefix("file://"), let url = URL(string: path) {
    return url
  }
  return URL(fileURLWithPath: path)
}

private enum AudioConversionError: Error {
  case failed
}
