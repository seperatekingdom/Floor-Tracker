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

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function loadMasterList(fileName) {
    try {
        const response = await fetch(fileName);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Could not load ${fileName}:`, error);
        alert(`Error: Could not load ${fileName}. Please ensure it exists and is valid.`);
        throw error;
    }
}

function populateLocationDropdown() {
    const { masterLocationList } = state;
    const { tileLocationSelect } = dom;
    tileLocationSelect.innerHTML = '';
    if (masterLocationList && masterLocationList.length > 0) {
        masterLocationList.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            tileLocationSelect.appendChild(option);
        });
    } else {
        const option = document.createElement('option');
        option.textContent = 'No locations loaded';
        option.disabled = true;
        tileLocationSelect.appendChild(option);
    }
}

async function init() {
    itemManager.load();
    itemManager.render();
    bindEvents();
    dom.scanTextBtn.disabled = true;
    dom.scanTextBtnText.textContent = 'Loading Libraries...';
    try {
        await loadScript('https://docs.opencv.org/4.9.0/opencv.js');
        state.cvReady = true;
        console.log("OpenCV.js is ready.");
        
        dom.scanTextBtnText.textContent = 'Loading Data...';
        state.masterProductList = await loadMasterList('products.json');
        state.masterLocationList = await loadMasterList('locations.json');
        
        populateLocationDropdown();
        
        dom.scanTextBtn.disabled = false;
        dom.scanTextBtnText.textContent = 'Scan Product Name';
    } catch (error) {
        console.error("Initialization failed:", error);
        dom.scanTextBtnText.textContent = 'Initialization Failed';
    }
}

window.addEventListener('DOMContentLoaded', init);
