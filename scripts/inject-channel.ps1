param(
    [string]$channelName = "production"
)

# Path definitions
$manifestPath = "android/app/src/main/AndroidManifest.xml"
$buildGradlePath = "android/app/build.gradle"
$assetsDir = "android/app/src/main/assets"
$propertiesPath = "$assetsDir/expo-updates.properties"

# 1. Inject EXPO_CHANNEL_NAME, EXPO_RELEASE_CHANNEL, and requestHeaders into AndroidManifest.xml
if (Test-Path $manifestPath) {
    $content = Get-Content $manifestPath -Raw
    $hasChanged = $false

    if ($content -notmatch 'EXPO_CHANNEL_NAME') {
        $newLine = "        <meta-data android:name=`"expo.modules.updates.EXPO_CHANNEL_NAME`" android:value=`"$channelName`"/>"
        $pattern = '(<meta-data\s+android:name="expo.modules.updates.EXPO_UPDATE_URL"\s+android:value="[^"]*"\s*/>)'
        
        if ($content -match $pattern) {
            $content = $content -replace $pattern, "`$1`n$newLine"
            $hasChanged = $true
            Write-Host "Success: EXPO_CHANNEL_NAME injected to AndroidManifest.xml" -ForegroundColor Green
        }
    }

    if ($content -notmatch 'EXPO_RELEASE_CHANNEL') {
        $newLine = "        <meta-data android:name=`"expo.modules.updates.EXPO_RELEASE_CHANNEL`" android:value=`"$channelName`"/>"
        $pattern = '(<meta-data\s+android:name="expo.modules.updates.EXPO_UPDATE_URL"\s+android:value="[^"]*"\s*/>)'
        
        if ($content -match $pattern) {
            $content = $content -replace $pattern, "`$1`n$newLine"
            $hasChanged = $true
            Write-Host "Success: EXPO_RELEASE_CHANNEL injected to AndroidManifest.xml" -ForegroundColor Green
        }
    }

    # Inject requestHeaders inside AndroidManifest with XML entity references for quotes (&quot;)
    # &quot; is the correct XML escape for " -- Android will decode it to " before JSON parsing.
    if ($content -notmatch 'expo.modules.updates.requestHeaders') {
        $newLine = "        <meta-data android:name=`"expo.modules.updates.requestHeaders`" android:value=`"{&quot;expo-channel-name&quot;:&quot;$channelName&quot;,&quot;expo-release-channel&quot;:&quot;$channelName&quot;}`"/>"
        $pattern = '(<meta-data\s+android:name="expo.modules.updates.EXPO_UPDATE_URL"\s+android:value="[^"]*"\s*/>)'
        
        if ($content -match $pattern) {
            $content = $content -replace $pattern, "`$1`n$newLine"
            $hasChanged = $true
            Write-Host "Success: requestHeaders injected to AndroidManifest.xml" -ForegroundColor Green
        }
    }

    # Inject UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY inside AndroidManifest to work around expo-updates library typo
    if ($content -notmatch 'expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY') {
        $newLine = "        <meta-data android:name=`"expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY`" android:value=`"{&quot;expo-channel-name&quot;:&quot;$channelName&quot;,&quot;expo-release-channel&quot;:&quot;$channelName&quot;}`"/>"
        $pattern = '(<meta-data\s+android:name="expo.modules.updates.EXPO_UPDATE_URL"\s+android:value="[^"]*"\s*/>)'
        
        if ($content -match $pattern) {
            $content = $content -replace $pattern, "`$1`n$newLine"
            $hasChanged = $true
            Write-Host "Success: UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY injected to AndroidManifest.xml" -ForegroundColor Green
        }
    }

    if ($hasChanged) {
        Set-Content $manifestPath $content -NoNewline
    } else {
        Write-Host "Info: Channel metadata already exists in AndroidManifest.xml, skipping." -ForegroundColor Yellow
    }
} else {
    Write-Warning "Warning: AndroidManifest.xml not found."
}

# 2. Configure release signing in build.gradle
if (Test-Path $buildGradlePath) {
    $gradleContent = Get-Content $buildGradlePath -Raw
    $hasChanged = $false

    # Add release signing config
    if ($gradleContent -notmatch 'release\s*\{\s*storeFile\s+file') {
        $signingPattern = 'debug\s*\{\s*storeFile\s+file\(\''debug\.keystore\''\)\s*storePassword\s+\''android\''\s*keyAlias\s+\''androiddebugkey\''\s*keyPassword\s+\''android\''\s*\}'
        
        # Using single quotes to safely include double quotes without PowerShell escaping issues
        $releaseSigningConfig = 'debug {
            storeFile file(''debug.keystore'')
            storePassword ''android''
            keyAlias ''androiddebugkey''
            keyPassword ''android''
        }
        release {
            storeFile file(''../../@gekirennomads-organization__gym-tracker.jks'')
            storePassword System.getenv("KEYSTORE_PASSWORD") ?: findProperty("MYAPP_UPLOAD_STORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS") ?: findProperty("MYAPP_UPLOAD_KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD") ?: findProperty("MYAPP_UPLOAD_KEY_PASSWORD")
        }'
        
        if ($gradleContent -match $signingPattern) {
            $gradleContent = $gradleContent -replace $signingPattern, $releaseSigningConfig
            $hasChanged = $true
            Write-Host "Success: Release signing config added to build.gradle" -ForegroundColor Green
        } else {
            Write-Warning "Warning: Could not find signingConfigs.debug pattern in build.gradle"
        }
    }

    # Change buildTypes.release to use release signing config
    if ($gradleContent -match 'signingConfig\s+signingConfigs\.debug') {
        $gradleContent = $gradleContent -replace 'signingConfig\s+signingConfigs\.debug', 'signingConfig signingConfigs.release'
        $hasChanged = $true
        Write-Host "Success: Updated buildTypes.release to use signingConfigs.release" -ForegroundColor Green
    }

    if ($hasChanged) {
        Set-Content $buildGradlePath $gradleContent -NoNewline
    } else {
        Write-Host "Info: build.gradle signing configuration already updated, skipping." -ForegroundColor Yellow
    }
} else {
    Write-Warning "Warning: build.gradle not found."
}

# 3. Create or update expo-updates.properties
if (!(Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}

# Write simplified config properties without requestHeaders JSON to prevent parsing issues with colon in properties file.
# Native SDK fallback will correctly load requestHeaders from AndroidManifest metadata we injected.
$propertiesContent = "expo.modules.updates.ENABLED=true`r`n" +
                     "expo.modules.updates.EXPO_CHANNEL_NAME=$channelName`r`n" +
                     "expo.modules.updates.EXPO_RELEASE_CHANNEL=$channelName`r`n" +
                     "expo.modules.updates.EXPO_UPDATE_URL=https://u.expo.dev/63f2d7a0-124d-4187-92f7-911a1a1733d5"

Set-Content -Path $propertiesPath -Value $propertiesContent -NoNewline
Write-Host "Success: expo-updates.properties created/updated (Channel: $channelName)" -ForegroundColor Green

# 4. Redirect buildDir to a short path to prevent Windows MAX_PATH (260 chars) error
$topBuildGradlePath = "android/build.gradle"
if (Test-Path $topBuildGradlePath) {
    $gradleContent = Get-Content $topBuildGradlePath -Raw
    if ($gradleContent -notmatch 'buildDir\s*=') {
        if (!(Test-Path "C:\t")) {
            New-Item -ItemType Directory -Path "C:\t" -Force | Out-Null
        }
        $redirectConfig = "`r`n`r`nallprojects {`r`n    buildDir = `"C:/t/`${rootProject.name}/`${project.name}`"`r`n}"
        $gradleContent = $gradleContent + $redirectConfig
        Set-Content $topBuildGradlePath $gradleContent -NoNewline
        Write-Host "Success: Redirected buildDir to C:/t in android/build.gradle" -ForegroundColor Green
    } else {
        Write-Host "Info: buildDir redirection already configured in android/build.gradle, skipping." -ForegroundColor Yellow
    }
}
