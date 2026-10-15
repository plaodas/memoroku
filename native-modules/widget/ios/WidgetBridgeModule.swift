import ExpoModulesCore

public final class WidgetBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WidgetBridge")

    Function("setLatestMemo") { (_: String, _: String) in
    }
  }
}
