
Write-Host "Starting build process for Mobile Apps..."

# Check for Arabic characters in path
if ($PWD.Path -match "[^\x00-\x7F]") {
    Write-Warning "Your project path contains non-English characters: $($PWD.Path)"
    Write-Warning "This is known to cause failures with Android Gradle build tools."
    Write-Warning "Please move the entire 'school-crm' folder to a path like 'C:\school-crm' and run this script again."
    exit 1
}

$ErrorActionPreference = "Stop"

function Build-App {
    param($appName)
    Write-Host "Building $appName..."
    
    $projectDir = Join-Path $PWD "mobile-$appName"
    $androidDir = Join-Path $projectDir "android"
    
    if (-not (Test-Path $androidDir)) {
        Write-Error "Android directory not found for $appName"
        return
    }

    Push-Location $androidDir
    try {
        if ($IsWindows) {
            .\gradlew.bat assembleRelease
        } else {
            ./gradlew assembleRelease
        }
    } catch {
        Write-Error "Build failed for $appName. Check logs."
        Pop-Location
        return
    }
    Pop-Location

    # Find APK
    $apkPath = Join-Path $androidDir "app\build\outputs\apk\release\app-release.apk"
    if (Test-Path $apkPath) {
        $destDir = Join-Path $PWD "admin\public\apps\android"
        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
        
        Copy-Item $apkPath -Destination (Join-Path $destDir "$appName.apk") -Force
        Write-Host "Success! $appName APK copied to admin/public/apps/android/$appName.apk"
    } else {
        Write-Error "APK file not found after build for $appName"
    }
}

Build-App "parent"
Build-App "teacher"

Write-Host "Build process completed."
