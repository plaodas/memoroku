import AVFoundation
import ExpoModulesCore

public final class NativeRecorderModule: Module {
  private var recorder: AVAudioRecorder?

  public func definition() -> ModuleDefinition {
    Name("NativeRecorder")

    AsyncFunction("startRecording") { () -> Bool in
      if self.recorder?.isRecording == true {
        return true
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
      recorder.isMeteringEnabled = true
      recorder.prepareToRecord()
      guard recorder.record() else {
        throw RecorderError.failedToStart
      }
      self.recorder = recorder
      return true
    }.runOnQueue(.main)

    AsyncFunction("stopRecording") { () -> String? in
      self.recorder?.stop()
      let uri = self.recorder?.url.absoluteString
      self.recorder = nil
      return uri
    }.runOnQueue(.main)

    AsyncFunction("microphoneGranted") { () -> Bool in
      AVAudioSession.sharedInstance().recordPermission == .granted
    }

    AsyncFunction("readLevel") { () -> Double in
      guard let recorder = self.recorder, recorder.isRecording else {
        return 0
      }
      recorder.updateMeters()
      let decibels = recorder.averagePower(forChannel: 0)
      let clamped = min(0, max(-50, decibels))
      return Double((clamped + 50) / 50)
    }.runOnQueue(.main)

    AsyncFunction("convertToWav") { (path: String) -> String in
      try convertRecordingToWav(path)
    }
  }
}

private enum RecorderError: Error {
  case failedToStart
}
