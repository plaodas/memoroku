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
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
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

private val horizontalPadding = 12.dp
private val verticalPadding = 12.dp

class MemoWidget : GlanceAppWidget() {
  override val sizeMode: SizeMode = SizeMode.Exact
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val memos = MemoWidgetStore.read(context)
    provideContent {
      MemoCard(memos = memos, packageName = context.packageName)
    }
  }
}

@Composable
private fun MemoCard(memos: List<WidgetMemo>, packageName: String) {
  val fontSp = memoFontSize(longestLine(memos))
  val style = memoTextStyle(fontSp)
  val visible = memos.take(rowsThatFit(fontSp))
  Column(
    modifier = GlanceModifier
      .fillMaxSize()
      .background(ColorProvider(Color(0xFFF6F3EE)))
      .padding(start = horizontalPadding, top = verticalPadding, end = horizontalPadding, bottom = verticalPadding),
  ) {
    if (visible.isEmpty()) {
      Text(
        text = "メモはまだありません",
        maxLines = 2,
        modifier = GlanceModifier.fillMaxWidth().clickable(openMemo(packageName, "memoroku://")),
        style = style,
      )
    } else {
      visible.forEach { memo ->
        Text(
          text = memo.text,
          maxLines = 1,
          modifier = GlanceModifier
            .fillMaxWidth()
            .padding(top = 2.dp, bottom = 2.dp)
            .clickable(openMemo(packageName, "memoroku://memo/${memo.memoId}")),
          style = style,
        )
      }
    }
  }
}

private fun longestLine(memos: List<WidgetMemo>): Int {
  if (memos.isEmpty()) {
    return "メモはまだありません".length
  }
  return memos.maxOf { it.text.length }
}

@Composable
private fun rowsThatFit(fontSp: Float): Int {
  val height = LocalSize.current.height.value
  val row = fontSp * 1.55f + 4f
  val available = (height - verticalPadding.value * 2).coerceAtLeast(row)
  return (available / row).toInt().coerceAtLeast(1)
}

@Composable
private fun memoFontSize(charCount: Int): Float {
  val inner = (LocalSize.current.width - horizontalPadding * 2).value.coerceAtLeast(48f)
  return (inner / charCount.coerceAtLeast(1) * 0.92f).coerceIn(11f, 16f)
}

private fun memoTextStyle(fontSp: Float): TextStyle {
  return TextStyle(
    color = ColorProvider(Color(0xFF1A1A1A)),
    fontSize = fontSp.sp,
    fontWeight = FontWeight.Medium,
  )
}

private fun openMemo(packageName: String, destination: String) = actionStartActivity(
  Intent(Intent.ACTION_VIEW, Uri.parse(destination)).apply {
    setPackage(packageName)
    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
  },
)
