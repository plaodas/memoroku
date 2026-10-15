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
  }
}

private enum RecorderError: Error {
  case failedToStart
}
