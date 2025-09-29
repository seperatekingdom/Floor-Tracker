// js/ui.js
import { dom } from './dom.js';

export function showLoader(message) {
    dom.loaderTextLive.textContent = message;
    dom.ocrLoaderLive.classList.remove('hidden');
}

export function hideLoader() {
    dom.ocrLoaderLive.classList.add('hidden');
}

export function showScanner() {
    dom.liveScannerContainer.classList.remove('hidden');
}

export function hideScanner() {
    dom.liveScannerContainer.classList.add('hidden');
}
