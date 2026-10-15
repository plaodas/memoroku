import AVFoundation
import Foundation

final class NativeRecorder {
  private var recorder: AVAudioRecorder?

  func startRecording() throws {
    if recorder?.isRecording == true {
      return
    }

    let session = AVAudioSession.sharedInstance()
    try session.setCategory(.playAndRecord, mode: .default)
    try session.setActive(true)

    let url = FileManager.default.temporaryDirectory
      .appendingPathComponent("memo-\(UUID().uuidString).m4a")
    let settings: [String: Any] = [
      AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
      AVSampleRateKey: 44_100,
      AVNumberOfChannelsKey: 1,
    ]
    let recorder = try AVAudioRecorder(url: url, settings: settings)
    recorder.prepareToRecord()
    guard recorder.record() else {
      throw RecorderError.failedToStart
    }
    self.recorder = recorder
  }

  func stopRecording() -> String? {
    recorder?.stop()
    let uri = recorder?.url.absoluteString
    recorder = nil
    return uri
  }
}

private enum RecorderError: Error {
  case failedToStart
}
