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

class ZikanWidgetSmall : AppWidgetProvider() {

    companion object {
        const val ACTION_PUNCH_SMALL = "com.gekirennomad.trenote.ACTION_PUNCH_SMALL"
        const val ACTION_UPDATE_ZIKAN_SMALL_WIDGET = "com.gekirennomad.trenote.ACTION_UPDATE_ZIKAN_SMALL_WIDGET"
        private const val DB_NAME = "gymtracker.db"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == ACTION_PUNCH_SMALL) {
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

                        // 2. 進行中(open)の記録を探す
                        var openIndex = -1
                        for (i in 0 until punchesArray.length()) {
                            val obj = punchesArray.getJSONObject(i)
                            if (obj.optString("status") == "open") {
                                openIndex = i
                                break
                            }
                        }

                        if (openIndex != -1) {
                            // 進行中の記録を終了(closed)にする
                            val openObj = punchesArray.getJSONObject(openIndex)
                            openObj.put("end", timeStr)
                            openObj.put("status", "closed")
                        } else {
                            // 新規の記録を開始(open)する
                            val newObj = JSONObject().apply {
                                put("start", timeStr)
                                put("end", "")
                                put("date", todayStr)
                                put("status", "open")
                            }
                            punchesArray.put(newObj)
                        }

                        // 3. データを保存
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
        } else if (intent.action == ACTION_UPDATE_ZIKAN_SMALL_WIDGET || intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE) {
            thread {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val thisWidget = ComponentName(context, ZikanWidgetSmall::class.java)
                val allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
                for (widgetId in allWidgetIds) {
                    updateAppWidget(context, appWidgetManager, widgetId)
                }
            }
        }
    }

    private fun updateAllWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        
        // SmallWidgetの更新
        val thisWidgetSmall = ComponentName(context, ZikanWidgetSmall::class.java)
        val allWidgetIdsSmall = appWidgetManager.getAppWidgetIds(thisWidgetSmall)
        for (widgetId in allWidgetIdsSmall) {
            updateAppWidget(context, appWidgetManager, widgetId)
        }

        // LargeWidgetも更新する
        val thisWidgetLarge = ComponentName(context, ZikanWidgetLarge::class.java)
        val allWidgetIdsLarge = appWidgetManager.getAppWidgetIds(thisWidgetLarge)
        for (widgetId in allWidgetIdsLarge) {
            val intentLarge = Intent(context, ZikanWidgetLarge::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(widgetId))
            }
            context.sendBroadcast(intentLarge)
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_zikan_small)

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
        val clickPendingIntent = PendingIntent.getActivity(context, 10, clickIntent, flag)
        views.setOnClickPendingIntent(R.id.widget_root, clickPendingIntent)

        // 打刻ボタンのPendingIntent設定
        val punchIntent = Intent(context, ZikanWidgetSmall::class.java).apply {
            action = ACTION_PUNCH_SMALL
        }
        val punchPendingIntent = PendingIntent.getBroadcast(context, 11, punchIntent, flag)
        views.setOnClickPendingIntent(R.id.widget_punch_btn, punchPendingIntent)

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
                views.setTextViewText(R.id.widget_status_indicator, "🟢")
                views.setTextViewText(R.id.widget_status_text, "記録中")
                views.setTextViewText(R.id.widget_time_info, latestStart)
            } else {
                views.setTextViewText(R.id.widget_status_indicator, "⬜")
                views.setTextViewText(R.id.widget_status_text, "停止中")
                views.setTextViewText(R.id.widget_time_info, "--:--")
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
