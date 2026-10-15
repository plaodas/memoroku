package expo.modules.memorokuwidget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WidgetBridgeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WidgetBridge")

    Function("setLatestMemo") { text: String, memoId: String ->
      val context = appContext.reactContext?.applicationContext ?: return@Function
      context
        .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_TEXT, text)
        .putString(KEY_ID, memoId)
        .commit()
      refreshWidget(context)
    }
  }

  private fun refreshWidget(context: Context) {
    val component = ComponentName(context.packageName, RECEIVER)
    val manager = AppWidgetManager.getInstance(context)
    val ids = manager.getAppWidgetIds(component)
    if (ids.isEmpty()) {
      return
    }
    val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
      this.component = component
      putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
    }
    context.sendBroadcast(intent)
  }

  companion object {
    private const val PREFS = "memoroku_widget"
    private const val KEY_TEXT = "text"
    private const val KEY_ID = "memoId"
    private const val RECEIVER = "com.memoroku.widgets.MemoReceiver"
  }
}
