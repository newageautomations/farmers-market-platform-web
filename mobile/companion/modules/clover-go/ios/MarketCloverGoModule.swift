import ExpoModulesCore

public class MarketCloverGoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MarketCloverGo")
    AsyncFunction("status") { ["available": false, "reason": "Clover Go credentials and native authorization qualification required"] as [String: Any] }
    AsyncFunction("cleanup") { /* No authorized SDK or reader exists. */ }
  }
}
