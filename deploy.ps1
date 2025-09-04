<<<<<<< HEAD
# 🚀 Script de Déploiement ORIGINALE PLUS
Write-Host "🚀 Déploiement ORIGINALE PLUS sur Vercel" -ForegroundColor Green
Write-Host ""

# Vérification des fichiers
Write-Host "📋 Vérification des fichiers..." -ForegroundColor Yellow

$requiredFiles = @(
    "server-test-local.js",
    "frontend",
    "vercel.json",
    "package.json"
)

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "❌ Erreur: $file introuvable" -ForegroundColor Red
        Read-Host "Appuyez sur Entrée pour quitter"
        exit 1
    }
}

Write-Host "✅ Tous les fichiers sont présents" -ForegroundColor Green
Write-Host ""

# Installation de Vercel CLI
Write-Host "🔧 Installation de Vercel CLI..." -ForegroundColor Yellow
try {
    npm install -g vercel
    Write-Host "✅ Vercel CLI installé" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de l'installation de Vercel CLI" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host ""

# Déploiement
Write-Host "🌐 Déploiement sur Vercel..." -ForegroundColor Yellow
try {
    vercel --prod
    Write-Host "✅ Déploiement terminé !" -ForegroundColor Green
    Write-Host "🌐 Votre site est maintenant en ligne" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors du déploiement" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host ""
Read-Host "Appuyez sur Entrée pour quitter"
=======
# 🚀 Script de Déploiement ORIGINALE PLUS
Write-Host "🚀 Déploiement ORIGINALE PLUS sur Vercel" -ForegroundColor Green
Write-Host ""

# Vérification des fichiers
Write-Host "📋 Vérification des fichiers..." -ForegroundColor Yellow

$requiredFiles = @(
    "server-test-local.js",
    "frontend",
    "vercel.json",
    "package.json"
)

foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "❌ Erreur: $file introuvable" -ForegroundColor Red
        Read-Host "Appuyez sur Entrée pour quitter"
        exit 1
    }
}

Write-Host "✅ Tous les fichiers sont présents" -ForegroundColor Green
Write-Host ""

# Installation de Vercel CLI
Write-Host "🔧 Installation de Vercel CLI..." -ForegroundColor Yellow
try {
    npm install -g vercel
    Write-Host "✅ Vercel CLI installé" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de l'installation de Vercel CLI" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host ""

# Déploiement
Write-Host "🌐 Déploiement sur Vercel..." -ForegroundColor Yellow
try {
    vercel --prod
    Write-Host "✅ Déploiement terminé !" -ForegroundColor Green
    Write-Host "🌐 Votre site est maintenant en ligne" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors du déploiement" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host ""
Read-Host "Appuyez sur Entrée pour quitter"
>>>>>>> 8caf11544141f039e68816aed69f1eb89e7940e7
