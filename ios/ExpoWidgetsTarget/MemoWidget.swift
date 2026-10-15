import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct MemoWidget: Widget {
  let name: String = "MemoWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      WidgetsEntryView(entry: entry)
    }
    .configurationDisplayName("Memoroku")
    .description("最新の文字起こし")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}