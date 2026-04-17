const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to copy native assets to the android folder during prebuild.
 * Specifically used for Google Play Console ownership verification (adi-registration.properties).
 */
const withAndroidAssets = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const { projectRoot } = config.modRequest;
      
      // Source file in the project root
      const srcFile = path.join(projectRoot, 'native-assets', 'adi-registration.properties');
      
      // Destination in the native Android assets folder
      const destDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets');
      const destFile = path.join(destDir, 'adi-registration.properties');

      if (fs.existsSync(srcFile)) {
        // Ensure destination directory exists
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        
        // Copy the file
        fs.copyFileSync(srcFile, destFile);
        console.log(`[withAndroidAssets] Successfully copied adi-registration.properties to native assets.`);
      } else {
        console.warn(`[withAndroidAssets] Source file not found: ${srcFile}`);
      }
      
      return config;
    },
  ]);
};

module.exports = withAndroidAssets;
