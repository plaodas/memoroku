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
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

class MemoWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val (text, memoId) = MemoWidgetStore.read(context)
    provideContent {
      MemoCard(text = text, memoId = memoId, packageName = context.packageName)
    }
  }
}

@Composable
private fun MemoCard(text: String, memoId: String, packageName: String) {
  val display = if (text.isBlank()) "メモはまだありません" else text
  val destination = if (memoId.isBlank()) "memoroku://" else "memoroku://memo/$memoId"
  val open = actionStartActivity(
    Intent(Intent.ACTION_VIEW, Uri.parse(destination)).apply {
      setPackage(packageName)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    },
  )
  Column(
    modifier = GlanceModifier
      .fillMaxSize()
      .background(ColorProvider(Color(0xFFF6F3EE)))
      .padding(16.dp)
      .clickable(open),
  ) {
    Text(
      text = display,
      maxLines = 6,
      style = TextStyle(
        color = ColorProvider(Color(0xFF1A1A1A)),
        fontSize = 16.sp,
        fontWeight = FontWeight.Medium,
      ),
    )
  }
}
