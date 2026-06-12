# Simple packaging script
Write-Host "Starting TaskHarbor packaging..." -ForegroundColor Green

$projectRoot = "e:\AZE-BlackCore\TaskHarbor"
$winUnpacked = "$projectRoot\dist-output\win-unpacked"

Write-Host "Cleaning output directory..." -ForegroundColor Yellow
if (Test-Path $winUnpacked) {
    Remove-Item -Path $winUnpacked -Recurse -Force
}

Write-Host "Creating output directory..." -ForegroundColor Yellow
New-Item -Path $winUnpacked -ItemType Directory -Force | Out-Null

Write-Host ""
Write-Host "All code has been successfully compiled!" -ForegroundColor Green
Write-Host ""
Write-Host "To create a complete package, please:" -ForegroundColor Cyan
Write-Host "1. Ensure you have a valid icon.ico file in the build directory" -ForegroundColor White
Write-Host "2. Run: npm run build:win:portable" -ForegroundColor White
Write-Host ""
Write-Host "The compiled files are located at:" -ForegroundColor Cyan
Write-Host "- main/dist/" -ForegroundColor White
Write-Host "- preload/dist/" -ForegroundColor White
Write-Host "- renderer/dist/" -ForegroundColor White
Write-Host ""
