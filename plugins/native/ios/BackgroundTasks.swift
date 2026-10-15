import BackgroundTasks
import Foundation

enum BackgroundTasks {
  static let cleanupIdentifier = "com.memoroku.cleanup"

  static func scheduleCleanup() {
    BGTaskScheduler.shared.register(forTaskWithIdentifier: cleanupIdentifier, using: nil) { task in
      task.setTaskCompleted(success: true)
      submitRequest()
    }
    submitRequest()
  }

  private static func submitRequest() {
    let request = BGProcessingTaskRequest(identifier: cleanupIdentifier)
    request.earliestBeginDate = Date(timeIntervalSinceNow: 24 * 60 * 60)
    try? BGTaskScheduler.shared.submit(request)
  }
}
