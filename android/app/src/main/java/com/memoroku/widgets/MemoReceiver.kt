package com.memoroku.widgets

import android.content.Context
import android.content.Intent
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MemoReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = MemoWidget()

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION_REFRESH) {
      super.onReceive(context, intent)
      return
    }
    val pending = goAsync()
    CoroutineScope(Dispatchers.IO).launch {
      try {
        glanceAppWidget.updateAll(context)
      } finally {
        pending.finish()
      }
    }
  }

  companion object {
    const val ACTION_REFRESH = "com.memoroku.widgets.action.REFRESH"
  }
}
