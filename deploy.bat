<<<<<<< HEAD
@echo off
echo 🚀 Déploiement ORIGINALE PLUS sur Vercel
echo.

echo 📋 Vérification des fichiers...
if not exist "server-test-local.js" (
    echo ❌ Erreur: server-test-local.js introuvable
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ❌ Erreur: Dossier frontend introuvable
    pause
    exit /b 1
)

if not exist "vercel.json" (
    echo ❌ Erreur: vercel.json introuvable
    pause
    exit /b 1
)

echo ✅ Tous les fichiers sont présents
echo.

echo 🔧 Installation de Vercel CLI...
npm install -g vercel
echo.

echo 🌐 Déploiement sur Vercel...
vercel --prod

echo.
echo ✅ Déploiement terminé !
echo 🌐 Votre site est maintenant en ligne
echo.
pause
=======
@echo off
echo 🚀 Déploiement ORIGINALE PLUS sur Vercel
echo.

echo 📋 Vérification des fichiers...
if not exist "server-test-local.js" (
    echo ❌ Erreur: server-test-local.js introuvable
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ❌ Erreur: Dossier frontend introuvable
    pause
    exit /b 1
)

if not exist "vercel.json" (
    echo ❌ Erreur: vercel.json introuvable
    pause
    exit /b 1
)

echo ✅ Tous les fichiers sont présents
echo.

echo 🔧 Installation de Vercel CLI...
npm install -g vercel
echo.

echo 🌐 Déploiement sur Vercel...
vercel --prod

echo.
echo ✅ Déploiement terminé !
echo 🌐 Votre site est maintenant en ligne
echo.
pause
>>>>>>> 8caf11544141f039e68816aed69f1eb89e7940e7
