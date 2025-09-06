// PWA-related functions

// Service Worker Registration for PWA (simplified)
export function registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        // Skip service worker for now to avoid registration issues
        console.log('Service Worker support detected but skipped for compatibility');
    }
}

// PWA Install Prompt
let deferredPrompt;

export function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallPrompt();
    });
}

export function showInstallPrompt() {
    document.getElementById('installPrompt').style.display = 'block';
}

export function hideInstallPrompt() {
    document.getElementById('installPrompt').style.display = 'none';
}

export async function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        hideInstallPrompt();
    }
}