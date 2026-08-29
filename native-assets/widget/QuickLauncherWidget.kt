package com.gekirennomad.trenote

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import java.io.File
import kotlin.concurrent.thread

class QuickLauncherWidget : AppWidgetProvider() {

    companion object {
        const val ACTION_UPDATE_QUICK_LAUNCHER = "com.gekirennomad.trenote.ACTION_UPDATE_QUICK_LAUNCHER"
        private const val DB_NAME = "gymtracker.db"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_UPDATE_QUICK_LAUNCHER || intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE) {
            thread {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val thisWidget = ComponentName(context, QuickLauncherWidget::class.java)
                val allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)
                for (widgetId in allWidgetIds) {
                    updateAppWidget(context, appWidgetManager, widgetId)
                }
            }
        }
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_quick_launcher)

        thread {
            val db = getDatabase(context, writable = false)
            // Default slots (7 slots)
            var slots = listOf("workout", "water", "nutrition", "zikan", "routine", "body", "voice_ai")

            if (db != null) {
                try {
                    val cursor = db.rawQuery("SELECT value FROM settings WHERE key = 'widget_launcher_slots'", null)
                    if (cursor.moveToFirst()) {
                        val jsonStr = cursor.getString(0)
                        if (jsonStr != null && jsonStr.isNotBlank()) {
                            val jsonArray = JSONArray(jsonStr)
                            val loadedSlots = mutableListOf<String>()
                            for (i in 0 until jsonArray.length()) {
                                loadedSlots.add(jsonArray.getString(i))
                            }
                            // Keep max 7
                            slots = loadedSlots.take(7)
                        }
                    }
                    cursor.close()
                } catch (e: Exception) {
                    e.printStackTrace()
                } finally {
                    db.close()
                }
            }

            val slotLayoutIds = intArrayOf(
                R.id.ql_slot_0,
                R.id.ql_slot_1,
                R.id.ql_slot_2,
                R.id.ql_slot_3,
                R.id.ql_slot_4,
                R.id.ql_slot_5,
                R.id.ql_slot_6
            )
            
            val slotIconIds = intArrayOf(
                R.id.ql_icon_0,
                R.id.ql_icon_1,
                R.id.ql_icon_2,
                R.id.ql_icon_3,
                R.id.ql_icon_4,
                R.id.ql_icon_5,
                R.id.ql_icon_6
            )

            // Define features mapping
            val featureMap = mapOf(
                "workout" to Pair(R.drawable.ic_ql_workout, "gymtracker://start-workout"),
                "water" to Pair(R.drawable.ic_ql_water, "gymtracker://lifelog/water"),
                "nutrition" to Pair(R.drawable.ic_ql_nutrition, "gymtracker://lifelog/nutrition"),
                "zikan" to Pair(R.drawable.ic_ql_zikan, "gymtracker://lifelog/zikan"),
                "routine" to Pair(R.drawable.ic_ql_routine, "gymtracker://lifelog/routine"),
                "habit" to Pair(R.drawable.ic_ql_habit, "gymtracker://lifelog/habit"),
                "body" to Pair(R.drawable.ic_ql_body, "gymtracker://lifelog/body"),
                "voice_ai" to Pair(R.drawable.ic_ql_voice_ai, "gymtracker://lifelog/voice-assistant")
            )

            for (i in 0 until 7) {
                val layoutId = slotLayoutIds[i]
                val iconId = slotIconIds[i]

                if (i < slots.size) {
                    val featureId = slots[i]
                    val feature = featureMap[featureId]
                    
                    if (feature != null) {
                        // Visible
                        views.setViewVisibility(layoutId, View.VISIBLE)
                        views.setImageViewResource(iconId, feature.first)

                        // Set intent
                        val clickIntent = Intent(Intent.ACTION_VIEW).apply {
                            data = Uri.parse(feature.second)
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        }
                        val flag = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                        } else {
                            PendingIntent.FLAG_UPDATE_CURRENT
                        }
                        val clickPendingIntent = PendingIntent.getActivity(context, i, clickIntent, flag)
                        views.setOnClickPendingIntent(layoutId, clickPendingIntent)
                    } else {
                        // Unknown feature, hide
                        views.setViewVisibility(layoutId, View.GONE)
                    }
                } else {
                    // Empty slot, hide
                    views.setViewVisibility(layoutId, View.GONE)
                }
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
        if (noBackupFile.exists()) {
            return noBackupFile
        }
        val filesFile = File(context.filesDir, "SQLite/$DB_NAME")
        if (filesFile.exists()) {
            return filesFile
        }
        val dbDirFile = context.getDatabasePath(DB_NAME)
        if (dbDirFile.exists()) {
            return dbDirFile
        }
        return null
    }
}
