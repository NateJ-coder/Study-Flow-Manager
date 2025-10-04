# StudyFlow Development Server
# Toggles assets on for development, off for space-saving

Write-Host " Enabling assets for local development..." -ForegroundColor Yellow
git sparse-checkout set /*

Write-Host " Starting server at http://localhost:8080" -ForegroundColor Green  
Write-Host "Press Ctrl+C to stop and return to space-saving mode" -ForegroundColor Cyan

try {
    python -m http.server 8080
} finally {
    Write-Host "`n Returning to space-saving mode..." -ForegroundColor Yellow
    git sparse-checkout set /* !assets/ !build-tools/ !docs/development/
    Write-Host " Assets excluded - local space optimized" -ForegroundColor Green
}
