package expo.modules.memorokuwidget

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WidgetBridgeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WidgetBridge")

    Function("setMemos") { memosJson: String ->
      val context = appContext.reactContext?.applicationContext ?: return@Function
      context
        .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_MEMOS, memosJson)
        .commit()
      refreshWidget(context)
    }
  }

  private fun refreshWidget(context: Context) {
    val intent = Intent(ACTION_REFRESH).apply {
      component = ComponentName(context.packageName, RECEIVER)
    }
    context.sendBroadcast(intent)
  }

  companion object {
    private const val PREFS = "memoroku_widget"
    private const val KEY_MEMOS = "memos"
    private const val RECEIVER = "com.memoroku.widgets.MemoReceiver"
    private const val ACTION_REFRESH = "com.memoroku.widgets.action.REFRESH"
  }
}
