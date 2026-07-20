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
        const val ACTION_END_LARGE = "com.gekirennomad.trenote.ACTION_END_LARGE"
        private const val DB_NAME = "gymtracker.db"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == ACTION_START_LARGE || intent.action == ACTION_END_LARGE) {
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

                        if (intent.action == ACTION_START_LARGE) {
                            // 終了が打刻されずに開始ボタンが再び打刻された場合は
                            // 最初の開始ボタン打刻は開始時間のみ記録し、終了時間を打刻しない
                            for (i in 0 until punchesArray.length()) {
                                val obj = punchesArray.getJSONObject(i)
                                if (obj.optString("status") == "open") {
                                    // endは変更せず空のままstatusをclosedにする
                                    obj.put("status", "closed")
                                }
                            }

                            val newObj = JSONObject().apply {
                                put("start", timeStr)
                                put("end", "")
                                put("date", todayStr)
                                put("status", "open")
                            }
                            punchesArray.put(newObj)
                        } else if (intent.action == ACTION_END_LARGE) {
                            // 進行中の記録を探して終了(closed)にする
                            var foundOpen = false
                            for (i in 0 until punchesArray.length()) {
                                val obj = punchesArray.getJSONObject(i)
                                if (obj.optString("status") == "open") {
                                    obj.put("end", timeStr)
                                    obj.put("status", "closed")
                                    foundOpen = true
                                    break
                                }
                            }
                            // 開始ボタンが押されていない状態で終了ボタンが押された場合も終了時間のみ打刻する
                            if (!foundOpen) {
                                val newObj = JSONObject().apply {
                                    put("start", "")
                                    put("end", timeStr)
                                    put("date", todayStr)
                                    put("status", "closed")
                                }
                                punchesArray.put(newObj)
                            }
                        }

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

        // 終了ボタンPendingIntentの設定
        val endIntent = Intent(context, ZikanWidgetLarge::class.java).apply {
            action = ACTION_END_LARGE
        }
        val endPendingIntent = PendingIntent.getBroadcast(context, 22, endIntent, flag)
        views.setOnClickPendingIntent(R.id.widget_end_btn, endPendingIntent)

        thread {
            val db = getDatabase(context, writable = false)
            var isOpen = false
            var latestStart = ""

            if (db != null) {
                try {
                    val cursor = db.rawQuery("SELECT value FROM settings WHERE key = 'widget_time_punches'", null)
                    if (cursor.moveToFirst()) {
                        val jsonStr = cursor.getString(0)
                        val array = JSONArray(jsonStr)
                        for (i in 0 until array.length()) {
                            val obj = array.getJSONObject(i)
                            if (obj.optString("status") == "open") {
                                isOpen = true
                                latestStart = obj.optString("start")
                                break
                            }
                        }
                    }
                    cursor.close()
                } catch (e: Exception) {
                    e.printStackTrace()
                } finally {
                    db.close()
                }
            }

            // UIへの表示適用
            if (isOpen) {
                views.setTextViewText(R.id.widget_status_text, "記録中 ($latestStart～)")
            } else {
                views.setTextViewText(R.id.widget_status_text, "停止中")
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
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
