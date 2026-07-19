package com.gekirennomad.trenote

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.net.Uri
import android.widget.RemoteViews
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.concurrent.thread

class WaterWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_QUICK_ADD = "com.gekirennomad.trenote.ACTION_QUICK_ADD"
        private const val DB_NAME = "gymtracker.db"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == ACTION_QUICK_ADD) {
            // UIスレッドをブロックしないように非同期スレッドで処理を実行
            thread {
                val db = getDatabase(context, writable = true) ?: return@thread
                try {
                    // デッドロック防止：トランザクション開始前にSELECTクエリを実行してクイック追加量を取得
                    val quickAddAmount = getQuickAddAmount(db)

                    db.beginTransaction()
                    try {
                        val sdf = SimpleDateFormat("yyyy/MM/dd", Locale.US)
                        val todayStr = sdf.format(Date())
                        val nowMs = System.currentTimeMillis()

                        // water_logsテーブルへ直接インサート (caffeineは0固定)
                        val sql = "INSERT INTO water_logs (amount, timestamp, date, caffeine) VALUES (?, ?, ?, 0)"
                        db.execSQL(sql, arrayOf(quickAddAmount, nowMs, todayStr))
                        db.setTransactionSuccessful()
                    } finally {
                        db.endTransaction()
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                } finally {
                    db.close()
                }

                // 登録完了後に自身を更新
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val thisWidget = ComponentName(context, WaterWidgetProvider::class.java)
                val allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
                for (widgetId in allWidgetIds) {
                    updateAppWidget(context, appWidgetManager, widgetId)
                }
            }
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.water_widget)

        // 背景/全体タップ時のPendingIntent設定 (アプリ起動 -> 水分補給画面へ)
        val clickIntent = Intent(Intent.ACTION_VIEW).apply {
            data = Uri.parse("gymtracker://lifelog/water")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        val clickFlag = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val clickPendingIntent = PendingIntent.getActivity(context, 1, clickIntent, clickFlag)
        views.setOnClickPendingIntent(R.id.widget_root, clickPendingIntent)

        thread {
            val db = getDatabase(context, writable = false)
            var todayTotal = 0
            var goal = 2000
            var quickAddAmount = 200

            if (db != null) {
                try {
                    val sdf = SimpleDateFormat("yyyy/MM/dd", Locale.US)
                    val todayStr = sdf.format(Date())

                    // 1. 本日の摂取水分量の合計を取得
                    val cursorWater = db.rawQuery("SELECT SUM(amount) FROM water_logs WHERE date = ?", arrayOf(todayStr))
                    if (cursorWater.moveToFirst()) {
                        todayTotal = cursorWater.getInt(0)
                    }
                    cursorWater.close()

                    // 2. 目標値の取得
                    val cursorGoal = db.rawQuery("SELECT value FROM settings WHERE key = 'water_goal'", null)
                    if (cursorGoal.moveToFirst()) {
                        goal = cursorGoal.getString(0).toIntOrNull() ?: 2000
                    }
                    cursorGoal.close()

                    // 3. クイック追加量の取得
                    quickAddAmount = getQuickAddAmount(db)
                } catch (e: Exception) {
                    e.printStackTrace()
                } finally {
                    db.close()
                }
            }

            // UIへの表示適用
            views.setTextViewText(R.id.widget_water_amount, "$todayTotal ml")
            views.setTextViewText(R.id.widget_water_goal, "目標: ${goal}ml")
            views.setTextViewText(R.id.widget_quick_add_btn, "+$quickAddAmount")

            // クイック追加PendingIntentの設定 (Android M 以降のFLAG_IMMUTABLE制限を満たす)
            val quickAddIntent = Intent(context, WaterWidgetProvider::class.java).apply {
                action = ACTION_QUICK_ADD
            }
            val flag = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val pendingIntent = PendingIntent.getBroadcast(context, 0, quickAddIntent, flag)
            views.setOnClickPendingIntent(R.id.widget_quick_add_btn, pendingIntent)

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
        // 候補1: noBackupFilesDir/SQLite/gymtracker.db (Expo SDK 50+ 新しいSQLiteの保存先)
        val noBackupFile = File(context.noBackupFilesDir, "SQLite/$DB_NAME")
        if (noBackupFile.exists()) {
            return noBackupFile
        }

        // 候補2: filesDir/SQLite/gymtracker.db (古い形式または一部のプラットフォーム)
        val filesFile = File(context.filesDir, "SQLite/$DB_NAME")
        if (filesFile.exists()) {
            return filesFile
        }

        // 候補3: databases/gymtracker.db (Android標準のデータベースディレクトリ)
        val dbDirFile = context.getDatabasePath(DB_NAME)
        if (dbDirFile.exists()) {
            return dbDirFile
        }

        // アプリ初回起動前などでDBファイルがまだ存在しない場合
        return null
    }

    private fun getQuickAddAmount(db: SQLiteDatabase): Int {
        var amount = 200
        try {
            val cursor = db.rawQuery("SELECT value FROM settings WHERE key = 'widget_quick_add_amount'", null)
            if (cursor.moveToFirst()) {
                amount = cursor.getString(0).toIntOrNull() ?: 200
            }
            cursor.close()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return amount
    }
}
