const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RECEIVER_TAG = '<receiver android:name=".GymTrackerWidget"';

const RECEIVER_XML = `
        <receiver android:name=".GymTrackerWidget" android:exported="true" android:label="@string/gym_widget_label">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/gym_tracker_widget_info"/>
        </receiver>`;

const WATER_RECEIVER_TAG = '<receiver android:name=".WaterWidgetProvider"';

const WATER_RECEIVER_XML = `
        <receiver android:name=".WaterWidgetProvider" android:exported="true" android:label="@string/water_widget_label">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>
                <action android:name="com.gekirennomad.trenote.ACTION_QUICK_ADD"/>
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/water_widget_info"/>
        </receiver>`;

// Strings XML tags and strings
const STRINGS_RESOURCE_MARKER = '</resources>';

const STRINGS_PATCHES = [
  { tag: 'name="widget_description"', value: '  <string name="widget_description">TreNote - \u7b4b\u30c8\u30ec\u3092\u59cb\u3081\u308b</string>' },
  { tag: 'name="water_widget_description"', value: '  <string name="water_widget_description">TreNote - \u6c34\u5206\u88dc\u7d66\u3092\u8a18\u9332\u3059\u308b</string>' },
  { tag: 'name="gym_widget_label"', value: '  <string name="gym_widget_label">TreNote - \u7b4b\u30c8\u30ec\u958b\u59cb</string>' },
  { tag: 'name="water_widget_label"', value: '  <string name="water_widget_label">TreNote - \u6c34\u5206\u88dc\u7d66</string>' }
];

/**
 * Expo Config Plugin: withAndroidWidget
 *
 * Copies the native widget files into the Android project during prebuild:
 *   - GymTrackerWidget.kt   -> android/app/src/main/java/com/gekirennomad/trenote/
 *   - WaterWidgetProvider.kt -> android/app/src/main/java/com/gekirennomad/trenote/
 *   - widget_gym_tracker.xml -> android/app/src/main/res/layout/
 *   - water_widget.xml       -> android/app/src/main/res/layout/
 *   - gym_tracker_widget_info.xml -> android/app/src/main/res/xml/
 *   - water_widget_info.xml       -> android/app/src/main/res/xml/
 *   - widget_background.xml       -> android/app/src/main/res/drawable/
 *   - widget_button_round.xml     -> android/app/src/main/res/drawable/
 *
 * Also patches:
 *   - AndroidManifest.xml: adds <receiver> elements for the widgets (idempotent)
 *   - strings.xml: adds widget strings (idempotent)
 *   - MainActivity.kt: adds lifecycle listeners to force widget updates on app resume/pause (idempotent)
 */
const withAndroidWidget = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidRoot = path.join(projectRoot, 'android');
      const sourceDir = path.join(projectRoot, 'native-assets', 'widget');

      // If the android directory doesn't exist yet, skip silently.
      if (!fs.existsSync(androidRoot)) {
        console.warn(
          '[withAndroidWidget] android/ directory not found. Skipping.'
        );
        return config;
      }

      // --- Destination paths ---
      const ktDest = path.join(
        androidRoot,
        'app', 'src', 'main', 'java',
        'com', 'gekirennomad', 'trenote',
        'GymTrackerWidget.kt'
      );
      const waterKtDest = path.join(
        androidRoot,
        'app', 'src', 'main', 'java',
        'com', 'gekirennomad', 'trenote',
        'WaterWidgetProvider.kt'
      );
      const layoutDest = path.join(
        androidRoot,
        'app', 'src', 'main', 'res', 'layout',
        'widget_gym_tracker.xml'
      );
      const waterLayoutDest = path.join(
        androidRoot,
        'app', 'src', 'main', 'res', 'layout',
        'water_widget.xml'
      );
      const xmlDir = path.join(
        androidRoot,
        'app', 'src', 'main', 'res', 'xml'
      );
      const xmlDest = path.join(xmlDir, 'gym_tracker_widget_info.xml');
      const waterXmlDest = path.join(xmlDir, 'water_widget_info.xml');
      const drawableDir = path.join(
        androidRoot,
        'app', 'src', 'main', 'res', 'drawable'
      );
      const bgDrawableDest = path.join(drawableDir, 'widget_background.xml');
      const btnDrawableDest = path.join(drawableDir, 'widget_button_round.xml');
      const manifestPath = path.join(
        androidRoot,
        'app', 'src', 'main', 'AndroidManifest.xml'
      );
      const stringsPath = path.join(
        androidRoot,
        'app', 'src', 'main', 'res', 'values', 'strings.xml'
      );
      const mainActivityPath = path.join(
        androidRoot,
        'app', 'src', 'main', 'java',
        'com', 'gekirennomad', 'trenote',
        'MainActivity.kt'
      );

      // --- Source paths ---
      const ktSrc = path.join(sourceDir, 'GymTrackerWidget.kt');
      const waterKtSrc = path.join(sourceDir, 'WaterWidgetProvider.kt');
      const layoutSrc = path.join(sourceDir, 'widget_gym_tracker.xml');
      const waterLayoutSrc = path.join(sourceDir, 'water_widget.xml');
      const xmlSrc = path.join(sourceDir, 'gym_tracker_widget_info.xml');
      const waterXmlSrc = path.join(sourceDir, 'water_widget_info.xml');
      const bgDrawableSrc = path.join(sourceDir, 'widget_background.xml');
      const btnDrawableSrc = path.join(sourceDir, 'widget_button_round.xml');

      // --- Copy GymTrackerWidget.kt ---
      if (fs.existsSync(ktSrc)) {
        fs.mkdirSync(path.dirname(ktDest), { recursive: true });
        fs.copyFileSync(ktSrc, ktDest);
        console.log('[withAndroidWidget] Copied GymTrackerWidget.kt');
      } else {
        console.warn(`[withAndroidWidget] Source not found: ${ktSrc}`);
      }

      // --- Copy WaterWidgetProvider.kt ---
      if (fs.existsSync(waterKtSrc)) {
        fs.mkdirSync(path.dirname(waterKtDest), { recursive: true });
        fs.copyFileSync(waterKtSrc, waterKtDest);
        console.log('[withAndroidWidget] Copied WaterWidgetProvider.kt');
      } else {
        console.warn(`[withAndroidWidget] Source not found: ${waterKtSrc}`);
      }

      // --- Copy widget_gym_tracker.xml ---
      if (fs.existsSync(layoutSrc)) {
        fs.mkdirSync(path.dirname(layoutDest), { recursive: true });
        fs.copyFileSync(layoutSrc, layoutDest);
        console.log('[withAndroidWidget] Copied widget_gym_tracker.xml');
      } else {
        console.warn(`[withAndroidWidget] Source not found: ${layoutSrc}`);
      }

      // --- Copy water_widget.xml ---
      if (fs.existsSync(waterLayoutSrc)) {
        fs.mkdirSync(path.dirname(waterLayoutDest), { recursive: true });
        fs.copyFileSync(waterLayoutSrc, waterLayoutDest);
        console.log('[withAndroidWidget] Copied water_widget.xml');
      } else {
        console.warn(`[withAndroidWidget] Source not found: ${waterLayoutSrc}`);
      }

      // --- Copy gym_tracker_widget_info.xml ---
      if (fs.existsSync(xmlSrc)) {
        fs.mkdirSync(xmlDir, { recursive: true });
        fs.copyFileSync(xmlSrc, xmlDest);
        console.log('[withAndroidWidget] Copied gym_tracker_widget_info.xml');
      } else {
        console.warn(`[withAndroidWidget] Source not found: ${xmlSrc}`);
      }

      // --- Copy water_widget_info.xml ---
      if (fs.existsSync(waterXmlSrc)) {
        fs.mkdirSync(xmlDir, { recursive: true });
        fs.copyFileSync(waterXmlSrc, waterXmlDest);
        console.log('[withAndroidWidget] Copied water_widget_info.xml');
      } else {
        console.warn(`[withAndroidWidget] Source not found: ${waterXmlSrc}`);
      }

      // --- Copy widget drawables ---
      if (fs.existsSync(bgDrawableSrc)) {
        fs.mkdirSync(drawableDir, { recursive: true });
        fs.copyFileSync(bgDrawableSrc, bgDrawableDest);
        console.log('[withAndroidWidget] Copied widget_background.xml');
      }
      if (fs.existsSync(btnDrawableSrc)) {
        fs.mkdirSync(drawableDir, { recursive: true });
        fs.copyFileSync(btnDrawableSrc, btnDrawableDest);
        console.log('[withAndroidWidget] Copied widget_button_round.xml');
      }

      // --- Patch AndroidManifest.xml: add <receiver>s (idempotent) ---
      if (fs.existsSync(manifestPath)) {
        let manifest = fs.readFileSync(manifestPath, 'utf8');
        let modified = false;

        // Apply GymTrackerWidget patch first (clean existing first if present without label to allow update)
        if (manifest.includes(RECEIVER_TAG)) {
          if (!manifest.includes('android:label="@string/gym_widget_label"')) {
            // Remove old receiver and apply new one with label
            console.log('[withAndroidWidget] Replacing old GymTrackerWidget receiver to add label.');
            const oldReceiverPattern = /<receiver\s+android:name="\.GymTrackerWidget"[\s\S]*?<\/receiver>/;
            manifest = manifest.replace(oldReceiverPattern, RECEIVER_XML.trim());
            modified = true;
          } else {
            console.log('[withAndroidWidget] GymTrackerWidget <receiver> already present in AndroidManifest.xml. Skipping.');
          }
        } else if (!manifest.includes('</application>')) {
          console.warn('[withAndroidWidget] </application> not found. Cannot patch AndroidManifest.xml.');
        } else {
          manifest = manifest.replace('</application>', `${RECEIVER_XML}\n    </application>`);
          modified = true;
          console.log('[withAndroidWidget] Patched AndroidManifest.xml with GymTrackerWidget <receiver>.');
        }

        // Apply WaterWidgetProvider patch
        if (manifest.includes(WATER_RECEIVER_TAG)) {
          console.log('[withAndroidWidget] WaterWidgetProvider <receiver> already present in AndroidManifest.xml. Skipping.');
        } else if (manifest.includes('</application>')) {
          manifest = manifest.replace('</application>', `${WATER_RECEIVER_XML}\n    </application>`);
          modified = true;
          console.log('[withAndroidWidget] Patched AndroidManifest.xml with WaterWidgetProvider <receiver>.');
        }

        if (modified) {
          fs.writeFileSync(manifestPath, manifest, 'utf8');
        }
      } else {
        console.warn('[withAndroidWidget] AndroidManifest.xml not found.');
      }

      // --- Patch strings.xml: add widget description and labels (idempotent) ---
      if (fs.existsSync(stringsPath)) {
        let strings = fs.readFileSync(stringsPath, 'utf8');
        let modified = false;

        for (const patch of STRINGS_PATCHES) {
          if (strings.includes(patch.tag)) {
            console.log(`[withAndroidWidget] string ${patch.tag} already in strings.xml. Skipping.`);
          } else if (!strings.includes(STRINGS_RESOURCE_MARKER)) {
            console.warn(`[withAndroidWidget] ${STRINGS_RESOURCE_MARKER} not found in strings.xml. Cannot patch.`);
            break;
          } else {
            strings = strings.replace(STRINGS_RESOURCE_MARKER, `${patch.value}\n${STRINGS_RESOURCE_MARKER}`);
            modified = true;
            console.log(`[withAndroidWidget] Patched strings.xml with ${patch.tag}.`);
          }
        }

        if (modified) {
          fs.writeFileSync(stringsPath, strings, 'utf8');
        }
      } else {
        console.warn('[withAndroidWidget] strings.xml not found.');
      }      // --- Patch MainActivity.kt: trigger widget updates and watch DB file with FileObserver (idempotent) ---
      if (fs.existsSync(mainActivityPath)) {
        let content = fs.readFileSync(mainActivityPath, 'utf8');

        if (content.includes('dbObserver: FileObserver?')) {
          console.log('[withAndroidWidget] MainActivity.kt already patched with FileObserver. Skipping.');
        } else {
          // Remove old updateWidgets patch if present
          content = content.replace(/\n\s*override fun onResume\(\)[\s\S]*?private fun updateWidgets\(\)[\s\S]*?\}\s*\}\s*$/, '\n}');
          content = content.replace(/import android\.appwidget\.AppWidgetManager[\s\S]*?import android\.content\.Intent\n/, '');

          // Add imports
          const imports = `\nimport android.appwidget.AppWidgetManager\nimport android.content.ComponentName\nimport android.content.Intent\nimport android.os.FileObserver\nimport java.io.File`;
          content = content.replace('package com.gekirennomad.trenote', `package com.gekirennomad.trenote${imports}`);

          // Add startDatabaseObserver call inside onCreate
          if (content.includes('super.onCreate(null)')) {
            content = content.replace('super.onCreate(null)', 'super.onCreate(null)\n    startDatabaseObserver()');
          } else if (content.includes('super.onCreate(savedInstanceState)')) {
            content = content.replace('super.onCreate(savedInstanceState)', 'super.onCreate(savedInstanceState)\n    startDatabaseObserver()');
          }

          // Define modern observer + widget updater code
          const injectedCode = `
  private var dbObserver: FileObserver? = null

  override fun onResume() {
    super.onResume()
    updateWidgets()
  }

  override fun onPause() {
    super.onPause()
    updateWidgets()
  }

  override fun onDestroy() {
    dbObserver?.stopWatching()
    super.onDestroy()
  }

  private fun startDatabaseObserver() {
    try {
      val dbFile = findDatabaseFile()
      if (dbFile != null) {
        dbObserver = object : FileObserver(dbFile.parentFile?.absolutePath, FileObserver.CLOSE_WRITE or FileObserver.MODIFY) {
          override fun onEvent(event: Int, path: String?) {
            if (path != null && (path == dbFile.name || path.startsWith(dbFile.name))) {
              updateWidgets()
            }
          }
        }
        dbObserver?.startWatching()
      }
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  private fun findDatabaseFile(): File? {
    val dbName = "gymtracker.db"
    val noBackupFile = File(noBackupFilesDir, "SQLite/$dbName")
    if (noBackupFile.exists()) return noBackupFile

    val filesFile = File(filesDir, "SQLite/$dbName")
    if (filesFile.exists()) return filesFile

    val dbDirFile = getDatabasePath(dbName)
    if (dbDirFile.exists()) return dbDirFile

    return null
  }

  private fun updateWidgets() {
    try {
      val intent = Intent(this, WaterWidgetProvider::class.java).apply {
        action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
      }
      val ids = AppWidgetManager.getInstance(application)
        .getAppWidgetIds(ComponentName(application, WaterWidgetProvider::class.java))
      intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
      sendBroadcast(intent)
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }
`;

          // Inject methods just before the final enclosing brace of the class
          const lastBraceIdx = content.lastIndexOf('}');
          if (lastBraceIdx !== -1) {
            content = content.substring(0, lastBraceIdx) + injectedCode + "\n}" + content.substring(lastBraceIdx + 1);
            fs.writeFileSync(mainActivityPath, content, 'utf8');
            console.log('[withAndroidWidget] Patched MainActivity.kt with FileObserver and updateWidgets.');
          } else {
            console.warn('[withAndroidWidget] Could not find closing brace in MainActivity.kt.');
          }
        }
      } else {
        console.warn('[withAndroidWidget] MainActivity.kt not found.');
      }
      return config;
    },
  ]);
};

module.exports = withAndroidWidget;
