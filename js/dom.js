// js/dom.js
export const dom = {
    // Main UI
    productNameInput: document.getElementById('product-name-input'),
    tileLocationInput: document.getElementById('tile-location-input'),
    addItemBtn: document.getElementById('add-item-btn'),
    itemList: document.getElementById('item-list'),
    exportBtn: document.getElementById('export-btn'),
    emptyMessage: document.getElementById('empty-message'),
    // Scanner UI
    scanTextBtn: document.getElementById('scan-text-btn'),
    scanTextBtnText: document.getElementById('scan-text-btn-text'),
    liveScannerContainer: document.getElementById('live-scanner-container'),
    videoStream: document.getElementById('video-stream'),
    cancelScanBtn: document.getElementById('cancel-scan-btn'),
    scanFrameBtn: document.getElementById('scan-frame-btn'),
    ocrLoaderLive: document.getElementById('ocr-loader-live'),
    loaderTextLive: document.getElementById('loader-text-live'),
    // Debug UI
    debugFrameBtn: document.getElementById('debug-frame-btn'),
    debugPreview: document.getElementById('debug-preview'),
};
