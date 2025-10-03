// js/dom.js
export const dom = {
    productNameInput: document.getElementById('product-name-input'),
    tileLocationSelect: document.getElementById('tile-location-select'),
    addItemBtn: document.getElementById('add-item-btn'),
    itemList: document.getElementById('item-list'),
    exportBtn: document.getElementById('export-btn'),
    emptyMessage: document.getElementById('empty-message'),
    scanTextBtn: document.getElementById('scan-text-btn'),
    scanTextBtnText: document.getElementById('scan-text-btn-text'),
    liveScannerContainer: document.getElementById('live-scanner-container'),
    videoStream: document.getElementById('video-stream'),
    cancelScanBtn: document.getElementById('cancel-scan-btn'),
    scanFrameBtn: document.getElementById('scan-frame-btn'),
    ocrLoaderLive: document.getElementById('ocr-loader-live'),
    loaderTextLive: document.getElementById('loader-text-live'),
    // Multi-stage debugger elements
    debugFrameBtn: document.getElementById('debug-frame-btn'),
    debugGray: document.getElementById('debug-gray'),
    debugClahe: document.getElementById('debug-clahe'),
    debugOtsu: document.getElementById('debug-otsu'),
    debugDilate: document.getElementById('debug-dilate'),
    debugFinal: document.getElementById('debug-final'),
};
