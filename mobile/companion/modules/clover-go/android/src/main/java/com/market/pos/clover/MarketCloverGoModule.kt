package com.market.pos.clover

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MarketCloverGoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MarketCloverGo")
    AsyncFunction("status") {
      mapOf("available" to false, "reason" to "Clover Go developer API credentials and native authorization qualification required")
    }
    AsyncFunction("cleanup") { /* No authorized SDK or reader exists in this boundary. */ }
  }
}
