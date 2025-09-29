// js/main.js
import { state } from './state.js';
import { dom } from './dom.js';
import * as itemManager from './itemManager.js';
import * as scanner from './scanner.js';

function bindEvents() {
    dom.addItemBtn.addEventListener('click', itemManager.add);
    dom.exportBtn.addEventListener('click', itemManager.exportToCSV);
    dom.scanTextBtn.addEventListener('click', scanner.start);
    dom.scanFrameBtn.addEventListener('click', scanner.scanFrame);
    dom.cancelScanBtn.addEventListener('click', scanner.stop);
    dom.debugFrameBtn.addEventListener('click', scanner.debugFrame);
}

function loadOpenCV() {
    return new Promise((resolve, reject) => {
        if (window.cv) {
            state.cvReady = true;
            return resolve();
        }
        const script = document.createElement('script');
        script.src = 'https://docs.opencv.org/4.9.0/opencv.js';
        script.async = true;
        script.onload = () => {
            state.cvReady = true;
            console.log("OpenCV.js is ready.");
            resolve();
        };
        script.onerror = () => reject(new Error("OpenCV.js script failed to load."));
        document.head.appendChild(script);
    });
}

async function loadMasterList() {
    dom.scanTextBtn.disabled = true;
    dom.scanTextBtnText.textContent = 'Loading Products...';
    try {
        const response = await fetch('products.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const products = await response.json();
        state.masterProductList = products;
        console.log(`Successfully loaded ${products.length} products.`);
        dom.scanTextBtn.disabled = false;
        dom.scanTextBtnText.textContent = 'Scan Product Name';
    } catch (error) {
        console.error("Could not load master product list:", error);
        alert("Error: Could not load `products.json`. Please ensure it exists and is in the same directory as your HTML file.");
        dom.scanTextBtnText.textContent = 'Error Loading Products';
    }
}

async function init() {
    itemManager.load();
    itemManager.render();
    bindEvents();
    try {
        await loadOpenCV();
        await loadMasterList();
    } catch (error) {
        console.error("Initialization failed:", error);
    }
}

// Start the application once the DOM is fully loaded.
window.addEventListener('DOMContentLoaded', init);
