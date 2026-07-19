const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RECEIVER_TAG = '<receiver android:name=".GymTrackerWidget"';

const RECEIVER_XML = `
        <receiver android:name=".GymTrackerWidget" android:exported="true">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/gym_tracker_widget_info"/>
        </receiver>`;

const WIDGET_DESCRIPTION_TAG = 'name="widget_description"';
const WIDGET_DESCRIPTION_STRING = '  <string name="widget_description">TreNote - \u7b4b\u30c8\u30ec\u3092\u59cb\u3081\u308b</string>';

/**
 * Expo Config Plugin: withAndroidWidget
 *
 * Copies the following native widget files into the Android project during prebuild:
 *   - GymTrackerWidget.kt   -> android/app/src/main/java/com/gekirennomad/trenote/
 *   - widget_gym_tracker.xml -> android/app/src/main/res/layout/
 *   - gym_tracker_widget_info.xml -> android/app/src/main/res/xml/
 *
 * Also patches:
 *   - AndroidManifest.xml: adds <receiver> for the widget (idempotent)
 *   - strings.xml: adds widget_description string resource (idempotent)
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
      const layoutDest = path.join(
        androidRoot,
        'app', 'src', 'main', 'res', 'layout',
        'widget_gym_tracker.xml'
      );
      const xmlDir = path.join(
        androidRoot,
        'app', 'src', 'main', 'res', 'xml'
      );
      const xmlDest = path.join(xmlDir, 'gym_tracker_widget_info.xml');
      const manifestPath = path.join(
        androidRoot,
        'app', 'src', 'main', 'AndroidManifest.xml'
      );
      const stringsPath = path.join(
        androidRoot,
        'app', 'src', 'main', 'res', 'values', 'strings.xml'
      );

      // --- Source paths ---
      const ktSrc = path.join(sourceDir, 'GymTrackerWidget.kt');
      const layoutSrc = path.join(sourceDir, 'widget_gym_tracker.xml');
      const xmlSrc = path.join(sourceDir, 'gym_tracker_widget_info.xml');

      // --- Copy GymTrackerWidget.kt ---
      if (fs.existsSync(ktSrc)) {
        fs.mkdirSync(path.dirname(ktDest), { recursive: true });
        fs.copyFileSync(ktSrc, ktDest);
        console.log('[withAndroidWidget] Copied GymTrackerWidget.kt');
      } else {
        console.warn(`[withAndroidWidget] Source not found: ${ktSrc}`);
      }

      // --- Copy widget_gym_tracker.xml ---
      if (fs.existsSync(layoutSrc)) {
        fs.mkdirSync(path.dirname(layoutDest), { recursive: true });
        fs.copyFileSync(layoutSrc, layoutDest);
        console.log('[withAndroidWidget] Copied widget_gym_tracker.xml');
      } else {
        console.warn(`[withAndroidWidget] Source not found: ${layoutSrc}`);
      }

      // --- Copy gym_tracker_widget_info.xml ---
      if (fs.existsSync(xmlSrc)) {
        fs.mkdirSync(xmlDir, { recursive: true });
        fs.copyFileSync(xmlSrc, xmlDest);
        console.log('[withAndroidWidget] Copied gym_tracker_widget_info.xml');
      } else {
        console.warn(`[withAndroidWidget] Source not found: ${xmlSrc}`);
      }

      // --- Patch AndroidManifest.xml: add <receiver> (idempotent) ---
      if (fs.existsSync(manifestPath)) {
        let manifest = fs.readFileSync(manifestPath, 'utf8');

        if (manifest.includes(RECEIVER_TAG)) {
          console.log('[withAndroidWidget] <receiver> already present in AndroidManifest.xml. Skipping.');
        } else if (!manifest.includes('</application>')) {
          console.warn('[withAndroidWidget] </application> not found. Cannot patch AndroidManifest.xml.');
        } else {
          manifest = manifest.replace('</application>', `${RECEIVER_XML}\n    </application>`);
          fs.writeFileSync(manifestPath, manifest, 'utf8');
          console.log('[withAndroidWidget] Patched AndroidManifest.xml with widget <receiver>.');
        }
      } else {
        console.warn('[withAndroidWidget] AndroidManifest.xml not found.');
      }

      // --- Patch strings.xml: add widget_description (idempotent) ---
      if (fs.existsSync(stringsPath)) {
        let strings = fs.readFileSync(stringsPath, 'utf8');

        if (strings.includes(WIDGET_DESCRIPTION_TAG)) {
          console.log('[withAndroidWidget] widget_description already in strings.xml. Skipping.');
        } else if (!strings.includes('</resources>')) {
          console.warn('[withAndroidWidget] </resources> not found in strings.xml. Cannot patch.');
        } else {
          strings = strings.replace('</resources>', `${WIDGET_DESCRIPTION_STRING}\n</resources>`);
          fs.writeFileSync(stringsPath, strings, 'utf8');
          console.log('[withAndroidWidget] Patched strings.xml with widget_description.');
        }
      } else {
        console.warn('[withAndroidWidget] strings.xml not found.');
      }

      return config;
    },
  ]);
};

module.exports = withAndroidWidget;
