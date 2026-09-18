Add-Type -AssemblyName System.Drawing

$srcDir = "d:\Status OS\src\assets"
$iconsDir = "d:\Status OS\src-tauri\icons"
$publicDir = "d:\Status OS\public"

if (!(Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

$whiteLogoPath = Join-Path $srcDir "k4_logo_white.png"
if (!(Test-Path $whiteLogoPath)) {
    Write-Error "k4_logo_white.png not found in $srcDir"
    exit 1
}

$logoImg = [System.Drawing.Bitmap]::FromFile($whiteLogoPath)

Function Create-RoundedRectPath([float]$x, [float]$y, [float]$width, [float]$height, [float]$radius) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $radius * 2.0
    $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
    $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
    $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

Function Create-AppIcon([int]$dimension) {
    $bmp = New-Object System.Drawing.Bitmap($dimension, $dimension, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $g.Clear([System.Drawing.Color]::Transparent)

    # Dark Navy Rounded Rect Background (#0F141C)
    $bgColor = [System.Drawing.Color]::FromArgb(255, 15, 20, 28)
    $brush = New-Object System.Drawing.SolidBrush($bgColor)
    $radius = [math]::Max(2.0, $dimension * 0.20)
    $path = Create-RoundedRectPath 0 0 $dimension $dimension $radius
    $g.FillPath($brush, $path)

    # Draw White K4 Logo in Center (occupying ~62% of area)
    $targetSize = $dimension * 0.62
    $offsetX = ($dimension - $targetSize) / 2.0
    $offsetY = ($dimension - $targetSize) / 2.0
    $g.DrawImage($logoImg, $offsetX, $offsetY, $targetSize, $targetSize)

    $g.Dispose()
    return $bmp
}

Function Create-TrayIcon([int]$dimension, [string]$statusColorHex) {
    $bmp = New-Object System.Drawing.Bitmap($dimension, $dimension, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $g.Clear([System.Drawing.Color]::Transparent)

    # Draw K4 Logo fill ~82% of tray icon space
    $logoSize = $dimension * 0.82
    $offsetX = ($dimension - $logoSize) / 2.0
    $offsetY = ($dimension - $logoSize) / 2.0
    $g.DrawImage($logoImg, $offsetX, $offsetY, $logoSize, $logoSize)

    # If status color specified, add dot indicator at bottom right
    if ($statusColorHex) {
        $dotRadius = [math]::Max(3.0, $dimension * 0.25)
        $dotX = $dimension - $dotRadius - 1.0
        $dotY = $dimension - $dotRadius - 1.0

        # Dot border (dark background)
        $borderBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 17, 19, 21))
        $g.FillEllipse($borderBrush, [float]($dotX - 1.0), [float]($dotY - 1.0), [float]($dotRadius + 2.0), [float]($dotRadius + 2.0))

        # Dot fill
        $c = [System.Drawing.ColorTranslator]::FromHtml($statusColorHex)
        $dotBrush = New-Object System.Drawing.SolidBrush($c)
        $g.FillEllipse($dotBrush, [float]$dotX, [float]$dotY, [float]$dotRadius, [float]$dotRadius)
    }

    $g.Dispose()
    return $bmp
}

Write-Host "Generating App Icons..."

$sizes = @(16, 20, 24, 32, 40, 48, 64, 128, 256, 512)
foreach ($s in $sizes) {
    $bmp = Create-AppIcon $s
    $outPath = Join-Path $iconsDir "$($s)x$($s).png"
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    if ($s -eq 128) {
        $bmp.Save((Join-Path $iconsDir "128x128@2x.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    }
    if ($s -eq 512) {
        $bmp.Save((Join-Path $iconsDir "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Save((Join-Path $publicDir "logo.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    }
    $bmp.Dispose()
}

# Tauri Windows Store / Square icons mapping
$squareMap = @{
    "Square30x30Logo.png" = 30;
    "Square44x44Logo.png" = 44;
    "Square71x71Logo.png" = 71;
    "Square89x89Logo.png" = 89;
    "Square107x107Logo.png" = 107;
    "Square142x142Logo.png" = 142;
    "Square150x150Logo.png" = 150;
    "Square284x284Logo.png" = 284;
    "Square310x310Logo.png" = 310;
    "StoreLogo.png" = 50;
}

foreach ($entry in $squareMap.GetEnumerator()) {
    $bmp = Create-AppIcon $entry.Value
    $bmp.Save((Join-Path $iconsDir $entry.Key), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

Write-Host "Generating Tray Status Icons..."
$trayOnline = Create-TrayIcon 32 "#26D07C"
$trayOnline.Save((Join-Path $iconsDir "tray_online.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$trayOnline.Dispose()

$trayOffline = Create-TrayIcon 32 "#737780"
$trayOffline.Save((Join-Path $iconsDir "tray_offline.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$trayOffline.Dispose()

$trayWarning = Create-TrayIcon 32 "#FFB020"
$trayWarning.Save((Join-Path $iconsDir "tray_warning.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$trayWarning.Dispose()

$trayError = Create-TrayIcon 32 "#FF625A"
$trayError.Save((Join-Path $iconsDir "tray_error.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$trayError.Dispose()

$trayDefault = Create-TrayIcon 32 $null
$trayDefault.Save((Join-Path $iconsDir "tray_default.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$trayDefault.Dispose()

Write-Host "Generating multi-resolution icon.ico..."

Function Build-MultiResIco([string[]]$pngPaths, [string]$outIcoPath) {
    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($ms)

    # ICO Header: Reserved (2 bytes, 0), Type (2 bytes, 1 = ICO), Count (2 bytes)
    $bw.Write([uint16]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]$pngPaths.Count)

    $imageDataList = @()
    $offset = 6 + ($pngPaths.Count * 16)

    foreach ($p in $pngPaths) {
        $bytes = [System.IO.File]::ReadAllBytes($p)
        $imageDataList += ,$bytes

        $img = [System.Drawing.Image]::FromFile($p)
        $w = if ($img.Width -ge 256) { 0 } else { [byte]$img.Width }
        $h = if ($img.Height -ge 256) { 0 } else { [byte]$img.Height }
        $img.Dispose()

        $bw.Write([byte]$w)
        $bw.Write([byte]$h)
        $bw.Write([byte]0) # Color count
        $bw.Write([byte]0) # Reserved
        $bw.Write([uint16]1) # Color planes
        $bw.Write([uint16]32) # Bits per pixel
        $bw.Write([uint32]$bytes.Length) # Image data size
        $bw.Write([uint32]$offset) # Offset to PNG image data

        $offset += $bytes.Length
    }

    foreach ($data in $imageDataList) {
        $bw.Write($data)
    }

    [System.IO.File]::WriteAllBytes($outIcoPath, $ms.ToArray())
    $bw.Dispose()
    $ms.Dispose()
}

$icoPngs = @(
    (Join-Path $iconsDir "16x16.png"),
    (Join-Path $iconsDir "32x32.png"),
    (Join-Path $iconsDir "48x48.png"),
    (Join-Path $iconsDir "64x64.png"),
    (Join-Path $iconsDir "128x128.png"),
    (Join-Path $iconsDir "256x256.png")
)

Build-MultiResIco $icoPngs (Join-Path $iconsDir "icon.ico")

$logoImg.Dispose()
Write-Host "All icons generated successfully!"
