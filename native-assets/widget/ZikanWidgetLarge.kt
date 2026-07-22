package com.gekirennomad.trenote

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.net.Uri
import android.os.Build
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.concurrent.thread

class ZikanWidgetLarge : AppWidgetProvider() {

    companion object {
        const val ACTION_START_LARGE = "com.gekirennomad.trenote.ACTION_START_LARGE"
        const val ACTION_UPDATE_ZIKAN_LARGE_WIDGET = "com.gekirennomad.trenote.ACTION_UPDATE_ZIKAN_LARGE_WIDGET"
        private const val DB_NAME = "gymtracker.db"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == ACTION_START_LARGE) {
            thread {
                val db = getDatabase(context, writable = true) ?: return@thread
                try {
                    val sdfDate = SimpleDateFormat("yyyy/MM/dd", Locale.US)
                    val sdfTime = SimpleDateFormat("HH:mm", Locale.US)
                    val todayStr = sdfDate.format(Date())
                    val timeStr = sdfTime.format(Date())

                    db.beginTransaction()
                    try {
                        // 1. settingsテーブルから現在の打刻データを取得
                        var punchesArray = JSONArray()
                        val cursor = db.rawQuery("SELECT value FROM settings WHERE key = 'widget_time_punches'", null)
                        if (cursor.moveToFirst()) {
                            val jsonStr = cursor.getString(0)
                            punchesArray = JSONArray(jsonStr)
                        }
                        cursor.close()

                        // 開始が押されたら開始時刻のみをstatus="closed"として即時打刻保存
                        val newObj = JSONObject().apply {
                            put("start", timeStr)
                            put("end", "")
                            put("date", todayStr)
                            put("status", "closed")
                        }
                        punchesArray.put(newObj)

                        // データを保存
                        val sql = "INSERT OR REPLACE INTO settings (key, value) VALUES ('widget_time_punches', ?)"
                        db.execSQL(sql, arrayOf(punchesArray.toString()))
                        db.setTransactionSuccessful()
                    } finally {
                        db.endTransaction()
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                } finally {
                    db.close()
                }

                // 画面表示を更新
                updateAllWidgets(context)
            }
        } else if (intent.action == ACTION_UPDATE_ZIKAN_LARGE_WIDGET || intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE) {
            thread {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val thisWidget = ComponentName(context, ZikanWidgetLarge::class.java)
                val allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
                for (widgetId in allWidgetIds) {
                    updateAppWidget(context, appWidgetManager, widgetId)
                }
            }
        }
    }

    private fun updateAllWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        
        // LargeWidgetの更新
        val thisWidgetLarge = ComponentName(context, ZikanWidgetLarge::class.java)
        val allWidgetIdsLarge = appWidgetManager.getAppWidgetIds(thisWidgetLarge)
        for (widgetId in allWidgetIdsLarge) {
            updateAppWidget(context, appWidgetManager, widgetId)
        }

        // 相互連動するためSmallWidgetも更新する
        val thisWidgetSmall = ComponentName(context, ZikanWidgetSmall::class.java)
        val allWidgetIdsSmall = appWidgetManager.getAppWidgetIds(thisWidgetSmall)
        for (widgetId in allWidgetIdsSmall) {
            val intentSmall = Intent(context, ZikanWidgetSmall::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(widgetId))
            }
            context.sendBroadcast(intentSmall)
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_zikan_large)

        // 背景/全体タップ時のPendingIntent設定 (アプリ起動 -> 時間管理画面へ)
        val clickIntent = Intent(Intent.ACTION_VIEW).apply {
            data = Uri.parse("gymtracker://lifelog/zikan")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        val flag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val clickPendingIntent = PendingIntent.getActivity(context, 20, clickIntent, flag)
        views.setOnClickPendingIntent(R.id.widget_root, clickPendingIntent)

        // 開始ボタンPendingIntentの設定
        val startIntent = Intent(context, ZikanWidgetLarge::class.java).apply {
            action = ACTION_START_LARGE
        }
        val startPendingIntent = PendingIntent.getBroadcast(context, 21, startIntent, flag)
        views.setOnClickPendingIntent(R.id.widget_start_btn, startPendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun getDatabase(context: Context, writable: Boolean): SQLiteDatabase? {
        val dbFile = findDatabaseFile(context) ?: return null
        val flags = if (writable) SQLiteDatabase.OPEN_READWRITE else SQLiteDatabase.OPEN_READONLY
        return try {
            SQLiteDatabase.openDatabase(dbFile.absolutePath, null, flags)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    private fun findDatabaseFile(context: Context): File? {
        val noBackupFile = File(context.noBackupFilesDir, "SQLite/$DB_NAME")
        if (noBackupFile.exists()) return noBackupFile

        val filesFile = File(context.filesDir, "SQLite/$DB_NAME")
        if (filesFile.exists()) return filesFile

        val dbDirFile = context.getDatabasePath(DB_NAME)
        if (dbDirFile.exists()) return dbDirFile

        return null
    }
}
