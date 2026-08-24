const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WATER_RECEIVER_TAG = '<receiver android:name=".WaterWidgetProvider"';

const WATER_RECEIVER_XML = `
        <receiver android:name=".WaterWidgetProvider" android:exported="true" android:label="@string/water_widget_label">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>
                <action android:name="com.gekirennomad.trenote.ACTION_QUICK_ADD"/>
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/water_widget_info"/>
        </receiver>`;

const ZIKAN_SMALL_RECEIVER_TAG = '<receiver android:name=".ZikanWidgetSmall"';

const ZIKAN_SMALL_RECEIVER_XML = `
        <receiver android:name=".ZikanWidgetSmall" android:exported="true" android:label="@string/zikan_widget_small_label">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>
                <action android:name="com.gekirennomad.trenote.ACTION_PUNCH_SMALL"/>
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/zikan_widget_small_info"/>
        </receiver>`;

const QUICK_LAUNCHER_RECEIVER_TAG = '<receiver android:name=".QuickLauncherWidget"';

const QUICK_LAUNCHER_RECEIVER_XML = `
        <receiver android:name=".QuickLauncherWidget" android:exported="true" android:label="@string/quick_launcher_widget_label">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>
                <action android:name="com.gekirennomad.trenote.ACTION_UPDATE_QUICK_LAUNCHER"/>
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/quick_launcher_widget_info"/>
        </receiver>`;

// Strings XML tags and strings
const STRINGS_RESOURCE_MARKER = '</resources>';

const STRINGS_PATCHES = [
  { tag: 'name="water_widget_description"', value: '  <string name="water_widget_description">TreNote - \\u6c34\\u5206\\u88dc\\u7d66\\u3092\\u8a18\\u9332\\u3059\\u308b</string>' },
  { tag: 'name="water_widget_label"', value: '  <string name="water_widget_label">TreNote - \\u6c34\\u5206\\u88dc\\u7d66</string>' },
  { tag: 'name="zikan_widget_small_description"', value: '  <string name="zikan_widget_small_description">TreNote - 24\\u6642\\u9593\\u9023\\u7d9a\\u8a18\\u9332\\u3092\\u6253\\u523b\\u3059\\u308b</string>' },
  { tag: 'name="zikan_widget_small_label"', value: '  <string name="zikan_widget_small_label">TreNote - 24H\\u9023\\u7d9a\\u8a18\\u9332</string>' },
  { tag: 'name="quick_launcher_widget_description"', value: '  <string name="quick_launcher_widget_description">TreNote - \\u7e261\\u6a2a5\\u30af\\u30a4\\u30c3\\u30af\\u30e9\\u30f3\\u30c1\\u30e3\\u30fc</string>' },
  { tag: 'name="quick_launcher_widget_label"', value: '  <string name="quick_launcher_widget_label">TreNote - \\u30af\\u30a4\\u30c3\\u30af\\u30e9\\u30f3\\u30c1\\u30e3\\u30fc</string>' }
];

/**
 * Expo Config Plugin: withAndroidWidget
 *
 * Copies the native widget files into the Android project during prebuild:
 *   - WaterWidgetProvider.kt -> android/app/src/main/java/com/gekirennomad/trenote/
 *   - ZikanWidgetSmall.kt    -> android/app/src/main/java/com/gekirennomad/trenote/
 *   - QuickLauncherWidget.kt -> android/app/src/main/java/com/gekirennomad/trenote/
 *   - water_widget.xml       -> android/app/src/main/res/layout/
 *   - widget_zikan_small.xml -> android/app/src/main/res/layout/
 *   - widget_quick_launcher.xml -> android/app/src/main/res/layout/
 *   - water_widget_info.xml       -> android/app/src/main/res/xml/
 *   - zikan_widget_small_info.xml -> android/app/src/main/res/xml/
 *   - quick_launcher_widget_info.xml -> android/app/src/main/res/xml/
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
      const waterKtDest = path.join(
        androidRoot,
        'app', 'src', 'main', 'java',
        'com', 'gekirennomad', 'trenote',
        'WaterWidgetProvider.kt'
      );
      const zikanSmallKtDest = path.join(
        androidRoot,
        'app', 'src', 'main', 'java',
        'com', 'gekirennomad', 'trenote',
        'ZikanWidgetSmall.kt'
      );
      const waterLayoutDest = path.join(
        androidRoot,
        'app', 'src', 'main', 'res', 'layout',
        'water_widget.xml'
      );
      const zikanSmallLayoutDest = path.join(
        androidRoot,
        'app', 'src', 'main', 'res', 'layout',
        'widget_zikan_small.xml'
      );
      const quickLauncherLayoutDest = path.join(
        androidRoot,
        'app', 'src', 'main', 'res', 'layout',
        'widget_quick_launcher.xml'
      );
      const quickLauncherKtDest = path.join(
        androidRoot,
        'app', 'src', 'main', 'java',
        'com', 'gekirennomad', 'trenote',
        'QuickLauncherWidget.kt'
      );
      const xmlDir = path.join(
        androidRoot,
        'app', 'src', 'main', 'res', 'xml'
      );
      const waterXmlDest = path.join(xmlDir, 'water_widget_info.xml');
      const zikanSmallXmlDest = path.join(xmlDir, 'zikan_widget_small_info.xml');
      const quickLauncherXmlDest = path.join(xmlDir, 'quick_launcher_widget_info.xml');
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
      const waterKtSrc = path.join(sourceDir, 'WaterWidgetProvider.kt');
      const zikanSmallKtSrc = path.join(sourceDir, 'ZikanWidgetSmall.kt');
      const waterLayoutSrc = path.join(sourceDir, 'water_widget.xml');
      const zikanSmallLayoutSrc = path.join(sourceDir, 'widget_zikan_small.xml');
      const quickLauncherLayoutSrc = path.join(sourceDir, 'widget_quick_launcher.xml');
      const quickLauncherKtSrc = path.join(sourceDir, 'QuickLauncherWidget.kt');
      const waterXmlSrc = path.join(sourceDir, 'water_widget_info.xml');
      const zikanSmallXmlSrc = path.join(sourceDir, 'zikan_widget_small_info.xml');
      const quickLauncherXmlSrc = path.join(sourceDir, 'quick_launcher_widget_info.xml');
      const bgDrawableSrc = path.join(sourceDir, 'widget_background.xml');
      const btnDrawableSrc = path.join(sourceDir, 'widget_button_round.xml');

      // --- Clean up removed widget files from android/ ---
      const filesToDelete = [
        path.join(androidRoot, 'app', 'src', 'main', 'java', 'com', 'gekirennomad', 'trenote', 'GymTrackerWidget.kt'),
        path.join(androidRoot, 'app', 'src', 'main', 'java', 'com', 'gekirennomad', 'trenote', 'ZikanWidgetLarge.kt'),
        path.join(androidRoot, 'app', 'src', 'main', 'res', 'layout', 'widget_gym_tracker.xml'),
        path.join(androidRoot, 'app', 'src', 'main', 'res', 'layout', 'widget_zikan_large.xml'),
        path.join(xmlDir, 'gym_tracker_widget_info.xml'),
        path.join(xmlDir, 'zikan_widget_large_info.xml'),
        path.join(drawableDir, 'widget_btn_start.xml'),
        path.join(drawableDir, 'widget_btn_end.xml'),
        path.join(drawableDir, 'widget_preview_gym_tracker.png'),
        path.join(drawableDir, 'widget_preview_zikan_large.png'),
      ];
      for (const delPath of filesToDelete) {
        if (fs.existsSync(delPath)) {
          try {
            fs.unlinkSync(delPath);
            console.log(`[withAndroidWidget] Removed obsolete widget file: ${delPath}`);
          } catch (e) {
            console.warn(`[withAndroidWidget] Failed to remove ${delPath}:`, e);
          }
        }
      }

      // --- Copy WaterWidgetProvider.kt ---
      if (fs.existsSync(waterKtSrc)) {
        fs.mkdirSync(path.dirname(waterKtDest), { recursive: true });
        fs.copyFileSync(waterKtSrc, waterKtDest);
        console.log('[withAndroidWidget] Copied WaterWidgetProvider.kt');
      } else {
        console.warn(`[withAndroidWidget] Source not found: ${waterKtSrc}`);
      }

      // --- Copy ZikanWidgetSmall.kt ---
      if (fs.existsSync(zikanSmallKtSrc)) {
        fs.mkdirSync(path.dirname(zikanSmallKtDest), { recursive: true });
        fs.copyFileSync(zikanSmallKtSrc, zikanSmallKtDest);
        console.log('[withAndroidWidget] Copied ZikanWidgetSmall.kt');
      } else {
        console.warn(`[withAndroidWidget] Source not found: ${zikanSmallKtSrc}`);
      }

      // --- Copy water_widget.xml ---
      if (fs.existsSync(waterLayoutSrc)) {
        fs.mkdirSync(path.dirname(waterLayoutDest), { recursive: true });
        fs.copyFileSync(waterLayoutSrc, waterLayoutDest);
        console.log('[withAndroidWidget] Copied water_widget.xml');
      } else {
        console.warn(`[withAndroidWidget] Source not found: ${waterLayoutSrc}`);
      }

      // --- Copy widget_zikan_small.xml ---
      if (fs.existsSync(zikanSmallLayoutSrc)) {
        fs.mkdirSync(path.dirname(zikanSmallLayoutDest), { recursive: true });
        fs.copyFileSync(zikanSmallLayoutSrc, zikanSmallLayoutDest);
        console.log('[withAndroidWidget] Copied widget_zikan_small.xml');
      } else {
        console.warn(`[withAndroidWidget] Source not found: ${zikanSmallLayoutSrc}`);
      }

      // --- Copy water_widget_info.xml ---
      if (fs.existsSync(waterXmlSrc)) {
        fs.mkdirSync(xmlDir, { recursive: true });
        fs.copyFileSync(waterXmlSrc, waterXmlDest);
        console.log('[withAndroidWidget] Copied water_widget_info.xml');
      } else {
        console.warn(`[withAndroidWidget] Source not found: ${waterXmlSrc}`);
      }

      // --- Copy zikan_widget_small_info.xml ---
      if (fs.existsSync(zikanSmallXmlSrc)) {
        fs.mkdirSync(xmlDir, { recursive: true });
        fs.copyFileSync(zikanSmallXmlSrc, zikanSmallXmlDest);
        console.log('[withAndroidWidget] Copied zikan_widget_small_info.xml');
      } else {
        console.warn(`[withAndroidWidget] Source not found: ${zikanSmallXmlSrc}`);
      }

      // --- Copy QuickLauncher files ---
      if (fs.existsSync(quickLauncherKtSrc)) {
        fs.mkdirSync(path.dirname(quickLauncherKtDest), { recursive: true });
        fs.copyFileSync(quickLauncherKtSrc, quickLauncherKtDest);
        console.log('[withAndroidWidget] Copied QuickLauncherWidget.kt');
      }
      if (fs.existsSync(quickLauncherLayoutSrc)) {
        fs.mkdirSync(path.dirname(quickLauncherLayoutDest), { recursive: true });
        fs.copyFileSync(quickLauncherLayoutSrc, quickLauncherLayoutDest);
        console.log('[withAndroidWidget] Copied widget_quick_launcher.xml');
      }
      if (fs.existsSync(quickLauncherXmlSrc)) {
        fs.mkdirSync(xmlDir, { recursive: true });
        fs.copyFileSync(quickLauncherXmlSrc, quickLauncherXmlDest);
        console.log('[withAndroidWidget] Copied quick_launcher_widget_info.xml');
      }

      // Copy all icons for QuickLauncher
      const iconsDir = path.join(sourceDir, 'icons');
      if (fs.existsSync(iconsDir)) {
        fs.mkdirSync(drawableDir, { recursive: true });
        const iconFiles = fs.readdirSync(iconsDir);
        for (const file of iconFiles) {
          if (file.endsWith('.xml')) {
            fs.copyFileSync(path.join(iconsDir, file), path.join(drawableDir, file));
          }
        }
        console.log('[withAndroidWidget] Copied QuickLauncher icons');
      }

      // Copy all preview images for widgets
      const previewsDir = path.join(sourceDir, 'previews');
      if (fs.existsSync(previewsDir)) {
        fs.mkdirSync(drawableDir, { recursive: true });
        const previewFiles = fs.readdirSync(previewsDir);
        for (const file of previewFiles) {
          if (file.endsWith('.png')) {
            fs.copyFileSync(path.join(previewsDir, file), path.join(drawableDir, file));
          }
        }
        console.log('[withAndroidWidget] Copied widget preview images');
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

        // Clean up removed receivers if present
        const oldGymPattern = /<receiver\s+android:name="\.GymTrackerWidget"[\s\S]*?<\/receiver>\s*/g;
        if (oldGymPattern.test(manifest)) {
          manifest = manifest.replace(oldGymPattern, '');
          modified = true;
          console.log('[withAndroidWidget] Removed GymTrackerWidget from AndroidManifest.xml.');
        }

        const oldZikanLargePattern = /<receiver\s+android:name="\.ZikanWidgetLarge"[\s\S]*?<\/receiver>\s*/g;
        if (oldZikanLargePattern.test(manifest)) {
          manifest = manifest.replace(oldZikanLargePattern, '');
          modified = true;
          console.log('[withAndroidWidget] Removed ZikanWidgetLarge from AndroidManifest.xml.');
        }

        // Apply WaterWidgetProvider patch
        if (manifest.includes(WATER_RECEIVER_TAG)) {
          console.log('[withAndroidWidget] WaterWidgetProvider <receiver> already present in AndroidManifest.xml. Skipping.');
        } else if (manifest.includes('</application>')) {
          manifest = manifest.replace('</application>', `${WATER_RECEIVER_XML}\n    </application>`);
          modified = true;
          console.log('[withAndroidWidget] Patched AndroidManifest.xml with WaterWidgetProvider <receiver>.');
        }

        // Apply ZikanWidgetSmall patch
        if (manifest.includes(ZIKAN_SMALL_RECEIVER_TAG)) {
          console.log('[withAndroidWidget] ZikanWidgetSmall <receiver> already present in AndroidManifest.xml. Skipping.');
        } else if (manifest.includes('</application>')) {
          manifest = manifest.replace('</application>', `${ZIKAN_SMALL_RECEIVER_XML}\n    </application>`);
          modified = true;
          console.log('[withAndroidWidget] Patched AndroidManifest.xml with ZikanWidgetSmall <receiver>.');
        }

        // Apply QuickLauncherWidget patch
        if (manifest.includes(QUICK_LAUNCHER_RECEIVER_TAG)) {
          console.log('[withAndroidWidget] QuickLauncherWidget <receiver> already present in AndroidManifest.xml. Skipping.');
        } else if (manifest.includes('</application>')) {
          manifest = manifest.replace('</application>', `${QUICK_LAUNCHER_RECEIVER_XML}\n    </application>`);
          modified = true;
          console.log('[withAndroidWidget] Patched AndroidManifest.xml with QuickLauncherWidget <receiver>.');
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

        // Clean up obsolete strings
        const obsoleteStrings = [
          /\s*<string name="widget_description">.*?<\/string>/g,
          /\s*<string name="gym_widget_label">.*?<\/string>/g,
          /\s*<string name="zikan_widget_large_description">.*?<\/string>/g,
          /\s*<string name="zikan_widget_large_label">.*?<\/string>/g
        ];
        for (const pattern of obsoleteStrings) {
          if (pattern.test(strings)) {
            strings = strings.replace(pattern, '');
            modified = true;
          }
        }

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
      }

      // --- Patch MainActivity.kt: trigger widget updates on app resume/pause (idempotent) ---
      if (fs.existsSync(mainActivityPath)) {
        let content = fs.readFileSync(mainActivityPath, 'utf8');

        // Always ensure clean updateWidgets without Zikan Large
        const injectedCode = `
  override fun onResume() {
    super.onResume()
    updateWidgets()
  }

  override fun onPause() {
    super.onPause()
    updateWidgets()
  }

  private fun updateWidgets() {
    try {
      // Water
      val intentWater = Intent("com.gekirennomad.trenote.ACTION_UPDATE_WATER_WIDGET").apply {
        component = ComponentName(this@MainActivity, WaterWidgetProvider::class.java)
      }
      sendBroadcast(intentWater)

      // Zikan Small
      val intentSmall = Intent("com.gekirennomad.trenote.ACTION_UPDATE_ZIKAN_SMALL_WIDGET").apply {
        component = ComponentName(this@MainActivity, ZikanWidgetSmall::class.java)
      }
      sendBroadcast(intentSmall)

      // Quick Launcher
      val intentLauncher = Intent("com.gekirennomad.trenote.ACTION_UPDATE_QUICK_LAUNCHER").apply {
        component = ComponentName(this@MainActivity, QuickLauncherWidget::class.java)
      }
      sendBroadcast(intentLauncher)
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }
`;

        // Replace existing updateWidgets block or inject new
        if (content.includes('private fun updateWidgets()')) {
          content = content.replace(/\n\s*override fun onResume\(\)[\s\S]*?private fun updateWidgets\(\)[\s\S]*?\}\s*\}/, `${injectedCode}\n}`);
          fs.writeFileSync(mainActivityPath, content, 'utf8');
          console.log('[withAndroidWidget] Updated MainActivity.kt updateWidgets.');
        } else {
          // Add imports if needed
          if (!content.includes('import android.appwidget.AppWidgetManager')) {
            const imports = `\nimport android.appwidget.AppWidgetManager\nimport android.content.ComponentName\nimport android.content.Intent`;
            content = content.replace('package com.gekirennomad.trenote', `package com.gekirennomad.trenote${imports}`);
          }
          const lastBraceIdx = content.lastIndexOf('}');
          if (lastBraceIdx !== -1) {
            content = content.substring(0, lastBraceIdx) + injectedCode + "\n}" + content.substring(lastBraceIdx + 1);
            fs.writeFileSync(mainActivityPath, content, 'utf8');
            console.log('[withAndroidWidget] Patched MainActivity.kt with updateWidgets.');
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