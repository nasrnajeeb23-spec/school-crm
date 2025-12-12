
Write-Host "Starting build process for Mobile Apps..."

# Fix for Arabic/Special characters in User Home path (Gradle Cache issue)
$LocalGradleHome = Join-Path $PWD ".gradle_cache"
if (-not (Test-Path $LocalGradleHome)) {
    Write-Host "Creating local Gradle cache directory to avoid encoding issues: $LocalGradleHome"
    New-Item -ItemType Directory -Force -Path $LocalGradleHome | Out-Null
}
$env:GRADLE_USER_HOME = $LocalGradleHome
Write-Host "Set GRADLE_USER_HOME to: $env:GRADLE_USER_HOME"

# Set JAVA_HOME to Android Studio's JBR
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
Write-Host "Set JAVA_HOME to: $env:JAVA_HOME"

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
            # Use JBR explicitly
            $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
            .\gradlew.bat assembleRelease -Dorg.gradle.java.home="C:\Program Files\Android\Android Studio\jbr"
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

Write-Host "Updating app hashes in apps.json..."
node admin/scripts/update_apps_hash.js

Write-Host "Build process completed."
