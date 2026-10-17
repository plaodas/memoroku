package com.memoroku.widgets

import android.content.Context
import org.json.JSONArray
import org.json.JSONException

data class WidgetMemo(val text: String, val memoId: String)

object MemoWidgetStore {
  const val PREFS = "memoroku_widget"
  const val KEY_MEMOS = "memos"

  fun read(context: Context): List<WidgetMemo> {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_MEMOS, null)
      ?: return emptyList()
    return try {
      val array = JSONArray(raw)
      buildList {
        for (index in 0 until array.length()) {
          val item = array.optJSONObject(index) ?: continue
          val text = item.optString("text")
          val memoId = item.optString("memoId")
          if (text.isNotBlank() && memoId.isNotBlank()) {
            add(WidgetMemo(text, memoId))
          }
        }
      }
    } catch (_: JSONException) {
      emptyList()
    }
  }
}
