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
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

private val paper = Color(0xFFF6F3EE)
private val ink = Color(0xFF1A1A1A)
private val mark = Color(0xFF0EA5A1)
private val horizontalPadding = 12.dp
private val verticalPadding = 12.dp
private val rowPadding = 4.dp
private val markSize = 6.dp

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
  val fontSp = memoFontSize()
  val visible = memos.take(rowsThatFit(fontSp))
  Column(
    modifier = GlanceModifier
      .fillMaxSize()
      .background(ColorProvider(paper))
      .padding(start = horizontalPadding, top = verticalPadding, end = horizontalPadding, bottom = verticalPadding),
  ) {
    if (visible.isEmpty()) {
      Text(
        text = "メモはまだありません",
        maxLines = 2,
        modifier = GlanceModifier.fillMaxWidth().clickable(openMemo(packageName, "memoroku://")),
        style = memoTextStyle(fontSp, emphasized = false),
      )
    } else {
      visible.forEachIndexed { index, memo ->
        MemoLine(
          memo = memo,
          emphasized = index == 0,
          fontSp = fontSp,
          packageName = packageName,
        )
      }
    }
  }
}

@Composable
private fun MemoLine(memo: WidgetMemo, emphasized: Boolean, fontSp: Float, packageName: String) {
  Row(
    modifier = GlanceModifier
      .fillMaxWidth()
      .padding(top = rowPadding, bottom = rowPadding)
      .clickable(openMemo(packageName, "memoroku://memo/${memo.memoId}")),
    verticalAlignment = Alignment.CenterVertically,
  ) {
    Box(
      modifier = GlanceModifier
        .size(markSize)
        .cornerRadius(markSize / 2)
        .background(ColorProvider(mark)),
    ) {}
    Spacer(modifier = GlanceModifier.width(8.dp))
    Text(
      text = memo.text,
      maxLines = 1,
      modifier = GlanceModifier.defaultWeight(),
      style = memoTextStyle(fontSp, emphasized),
    )
  }
}

@Composable
private fun rowsThatFit(fontSp: Float): Int {
  val height = LocalSize.current.height.value
  val row = fontSp * 1.35f + rowPadding.value * 2
  val available = (height - verticalPadding.value * 2).coerceAtLeast(row)
  return (available / row).toInt().coerceAtLeast(1)
}

@Composable
private fun memoFontSize(): Float {
  val width = LocalSize.current.width.value
  return when {
    width >= 280f -> 16f
    width >= 180f -> 14f
    else -> 13f
  }
}

private fun memoTextStyle(fontSp: Float, emphasized: Boolean): TextStyle {
  return TextStyle(
    color = ColorProvider(ink),
    fontSize = fontSp.sp,
    fontWeight = if (emphasized) FontWeight.Bold else FontWeight.Normal,
  )
}

private fun openMemo(packageName: String, destination: String) = actionStartActivity(
  Intent(Intent.ACTION_VIEW, Uri.parse(destination)).apply {
    setPackage(packageName)
    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
  },
)
