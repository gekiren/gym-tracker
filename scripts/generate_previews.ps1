Add-Type -AssemblyName System.Drawing

$src = "C:\Users\toshi\.gemini\antigravity\brain\7d4ff011-1576-41bf-b164-96d16d29f80b\.user_uploaded\media_1787525136067.png"
$fs = [System.IO.File]::OpenRead($src)
$bmp = New-Object System.Drawing.Bitmap($fs)

$outDir = "C:\TreNote\native-assets\widget\previews"
if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$drawableDir = "C:\TreNote\android\app\src\main\res\drawable"
if (!(Test-Path $drawableDir)) {
    New-Item -ItemType Directory -Path $drawableDir -Force | Out-Null
}

function Create-Rounded-Cropped-Png($name, $x, $y, $w, $h, $radius, $transparentCorners) {
    $rect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
    $cropped = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($cropped)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    if ($transparentCorners -and $radius -gt 0) {
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $d = $radius * 2
        $path.AddArc(0, 0, $d, $d, 180, 90)
        $path.AddArc($w - $d, 0, $d, $d, 270, 90)
        $path.AddArc($w - $d, $h - $d, $d, $d, 0, 90)
        $path.AddArc(0, $h - $d, $d, $d, 90, 90)
        $path.CloseFigure()
        
        $g.SetClip($path)
    }

    $destRect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
    $g.DrawImage($bmp, $destRect, $rect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    # Save to native-assets/widget/previews
    $outPath1 = Join-Path $outDir "$name.png"
    $cropped.Save($outPath1, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Also save directly to android/app/src/main/res/drawable
    $outPath2 = Join-Path $drawableDir "$name.png"
    $cropped.Save($outPath2, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $cropped.Dispose()
    Write-Host "Generated: $name.png ($($w)x$($h), corner radius=$radius)"
}

# 1. Zikan Large (開始ボタン): X=56, Y=62, W=214, H=153 (角丸 ~24px)
Create-Rounded-Cropped-Png "widget_preview_zikan_large" 56 62 214 153 24 $true

# 2. Zikan Small (停止中): X=293, Y=62, W=96, H=153 (角丸 ~24px)
Create-Rounded-Cropped-Png "widget_preview_zikan_small" 293 62 96 153 24 $true

# 3. Gym Tracker (アイコン): X=433, Y=112, W=52, H=53 (角丸 ~12px)
Create-Rounded-Cropped-Png "widget_preview_gym_tracker" 433 112 52 53 12 $true

# 4. Quick Launcher (バー): X=56, Y=270, W=451, H=86 (角丸 ~24px)
Create-Rounded-Cropped-Png "widget_preview_quick_launcher" 56 270 451 86 24 $true

# 5. Water (水分補給): X=55, Y=412, W=215, H=152 (角丸 ~24px)
Create-Rounded-Cropped-Png "widget_preview_water" 55 412 215 152 24 $true

$bmp.Dispose()
$fs.Close()
$fs.Dispose()

Write-Host "All 5 widget preview images generated successfully!"
