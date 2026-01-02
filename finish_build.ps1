Write-Host "Checking NDK installation status..."

$ndkPath = "D:\school-crm (1)\android-sdk\ndk\26.1.10909125"
if (-not (Test-Path $ndkPath)) {
    Write-Warning "NDK is not fully installed yet. Please wait for the download to finish in the background."
    Write-Host "You can check the download progress in the terminal."
    exit
}

$sourceProp = Join-Path $ndkPath "source.properties"
if (-not (Test-Path $sourceProp)) {
    Write-Warning "NDK folder exists but source.properties0 is missing. Download/Extraction might still be in progress."
    exit
}

Write-Host "NDK is ready. Starting build..."
./build_apks.ps1
