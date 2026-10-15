package com.memoroku

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

class BackgroundWorker(
  context: Context,
  params: WorkerParameters,
) : CoroutineWorker(context, params) {
  override suspend fun doWork(): Result {
    // Placeholder: memos older than 24 hours are deleted from SQLite on the JS side.
    return Result.success()
  }

  companion object {
    private const val UNIQUE_NAME = "memoroku-cleanup"

    fun schedule(context: Context) {
      val request = PeriodicWorkRequestBuilder<BackgroundWorker>(24, TimeUnit.HOURS).build()
      WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        UNIQUE_NAME,
        ExistingPeriodicWorkPolicy.UPDATE,
        request,
      )
    }
  }
}
