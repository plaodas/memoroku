package com.memoroku.widgets

import android.content.Context

object MemoWidgetStore {
  const val PREFS = "memoroku_widget"
  const val KEY_TEXT = "text"
  const val KEY_ID = "memoId"

  fun read(context: Context): Pair<String, String> {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val text = prefs.getString(KEY_TEXT, "") ?: ""
    val memoId = prefs.getString(KEY_ID, "") ?: ""
    return text to memoId
  }
}
