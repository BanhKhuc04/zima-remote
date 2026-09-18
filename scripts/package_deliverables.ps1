$targetReleaseDir = "d:\Status OS\src-tauri\target\release"
$bundleNsis = Join-Path $targetReleaseDir "bundle\nsis\Zima Remote_3.0.0_x64-setup.exe"
$bundleMsi = Join-Path $targetReleaseDir "bundle\msi\Zima Remote_3.0.0_x64_en-US.msi"
$exePath = Join-Path $targetReleaseDir "zima-remote.exe"

$outSetup = "d:\Status OS\ZimaRemote_3.0.0_x64-setup.exe"
$outMsi = "d:\Status OS\ZimaRemote_3.0.0_x64_en-US.msi"
$outExe = "d:\Status OS\zima-remote.exe"
$outZip = "d:\Status OS\ZimaRemote_3.0.0_Source.zip"

Write-Host "Copying binary deliverables..."
Copy-Item $bundleNsis $outSetup -Force
Copy-Item $bundleMsi $outMsi -Force
Copy-Item $exePath $outExe -Force

Write-Host "Creating Source Zip archive..."
if (Test-Path $outZip) { Remove-Item $outZip -Force }

$sourceItems = @(
    "d:\Status OS\src",
    "d:\Status OS\src-tauri\src",
    "d:\Status OS\src-tauri\icons",
    "d:\Status OS\src-tauri\capabilities",
    "d:\Status OS\src-tauri\Cargo.toml",
    "d:\Status OS\src-tauri\tauri.conf.json",
    "d:\Status OS\src-tauri\build.rs",
    "d:\Status OS\public",
    "d:\Status OS\scripts",
    "d:\Status OS\package.json",
    "d:\Status OS\tsconfig.json",
    "d:\Status OS\vite.config.ts",
    "d:\Status OS\index.html",
    "d:\Status OS\README.md"
)

Compress-Archive -Path $sourceItems -DestinationPath $outZip -Force

Write-Host "Calculating SHA-256 hashes and file sizes..."

$deliverables = @($outSetup, $outMsi, $outExe, $outZip)

foreach ($f in $deliverables) {
    if (Test-Path $f) {
        $item = Get-Item $f
        $hash = (Get-FileHash $f -Algorithm SHA256).Hash
        Write-Host "File: $($item.FullName)"
        Write-Host "Size: $($item.Length) bytes ($([math]::Round($item.Length/1MB, 2)) MB)"
        Write-Host "SHA256: $hash"
        Write-Host "Modified: $($item.LastWriteTime.ToString('o'))"
        Write-Host "--------------------------------------------------"
    } else {
        Write-Error "File not found: $f"
    }
}
