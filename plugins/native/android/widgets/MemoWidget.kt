package com.memoroku.widgets

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

class MemoWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val memos = MemoWidgetStore.read(context)
    provideContent {
      MemoCard(memos = memos, packageName = context.packageName)
    }
  }
}

@Composable
private fun MemoCard(memos: List<WidgetMemo>, packageName: String) {
  Column(
    modifier = GlanceModifier
      .fillMaxSize()
      .background(ColorProvider(Color(0xFFF6F3EE)))
      .padding(16.dp),
  ) {
    if (memos.isEmpty()) {
      Text(
        text = "メモはまだありません",
        maxLines = 1,
        modifier = GlanceModifier.fillMaxWidth().clickable(openMemo(packageName, "memoroku://")),
        style = memoTextStyle(),
      )
    } else {
      memos.forEach { memo ->
        Text(
          text = memo.text,
          maxLines = 1,
          modifier = GlanceModifier
            .fillMaxWidth()
            .padding(top = 4.dp, bottom = 4.dp)
            .clickable(openMemo(packageName, "memoroku://memo/${memo.memoId}")),
          style = memoTextStyle(),
        )
      }
    }
  }
}

private fun memoTextStyle(): TextStyle {
  return TextStyle(
    color = ColorProvider(Color(0xFF1A1A1A)),
    fontSize = 16.sp,
    fontWeight = FontWeight.Medium,
  )
}

private fun openMemo(packageName: String, destination: String) = actionStartActivity(
  Intent(Intent.ACTION_VIEW, Uri.parse(destination)).apply {
    setPackage(packageName)
    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
  },
)
