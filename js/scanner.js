// js/scanner.js (FINAL DIAGNOSTIC - "Hello, OpenCV" Test)
import { state } from './state.js';
import { config } from './config.js';
import { dom } from './dom.js';
import { showLoader, hideLoader, showScanner, hideScanner } from './ui.js';

/**
 * The simplest possible test to see if core OpenCV functions are working.
 */
function _processFrame(canvas) {
    console.log("--- Running 'Hello, OpenCV' Test ---");
    let blankImage = null;
    try {
        // We are NOT reading from the video.
        // We are creating a simple 100x50 black rectangle from scratch.
        blankImage = new cv.Mat(50, 100, cv.CV_8UC4, new cv.Scalar(0, 0, 0, 255));
        
        // We are trying to display this simple black rectangle.
        cv.imshow(canvas, blankImage);

        console.log("'Hello, OpenCV' Test SUCCEEDED.");

    } catch (err) {
        console.error("'Hello, OpenCV' Test FAILED:", err);
        throw err; // Re-throw the error to trigger the alert in debugFrame
    } finally {
        if (blankImage) blankImage.delete();
    }
}


// The rest of the file is unchanged.
export async function start() {
    showScanner(); showLoader('Initializing camera...');
    try {
        if (!state.cvReady) throw new Error("OpenCV.js is not ready.");
        state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        dom.videoStream.srcObject = state.stream;
        dom.videoStream.onloadedmetadata = () => { dom.videoStream.play(); hideLoader(); };
        if (!state.worker) { state.worker = await Tesseract.createWorker('eng'); }
    } catch (err) { console.error("Scanner failed to start:", err); alert("Could not start scanner. Please ensure camera permissions are granted."); stop(); }
}

export function stop() {
    if (state.stream) { state.stream.getTracks().forEach(track => track.stop()); state.stream = null; }
    if (state.worker) { state.worker.terminate(); state.worker = null; }
    hideScanner();
}

export function debugFrame() {
    if (!state.cvReady) return;
    showLoader('Creating debug image...');
    const canvas = document.createElement('canvas');
    try {
        _processFrame(canvas);
        // We now set the debug preview's src to the result of the test.
        dom.debugPreview.src = canvas.toDataURL();
        dom.debugPreview.style.display = 'block';
    } catch(err) {
        console.error("Error during debugFrame:", err);
        alert("An error occurred while creating the debug image. Check the console if possible.");
    } finally {
        hideLoader();
    }
}

export async function scanFrame() {
    // Note: scanFrame will also show the black rectangle for this test.
    if (!state.cvReady) { alert("Image processing library not ready."); return; }
    showLoader('Processing frame...'); const canvas = document.createElement('canvas');
    try {
        _processFrame(canvas);
        const engineModeValue = Tesseract.OEM[config.tesseract.engineMode];
        const { data: { text } } = await state.worker.recognize(canvas, { tessedit_ocr_engine_mode: engineModeValue, }, { tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234s -', tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE });
        const ocrResult = text.split('\n')[0].trim();
        if (ocrResult && ocrResult.length > 3) {
            const fuse = new Fuse(state.masterProductList, config.fuse);
            const results = fuse.search(ocrResult);
            if (results.length > 0) {
                const bestMatch = results[0].item; hideLoader();
                const isConfirmed = confirm(`Scanned: "${bestMatch}"\n\n(Corrected from: "${ocrResult}")\nIs this correct?`);
                if (isConfirmed) { dom.productNameInput.value = bestMatch; stop(); dom.tileLocationSelect.focus(); } else { showLoader('Scan rejected. Try again.'); setTimeout(hideLoader, 1500); }
            } else {
                hideLoader();
                const useAsIs = confirm(`No close match found for: "${ocrResult}"\n\nDo you want to add this new product name as is?`);
                if (useAsIs) { dom.productNameInput.value = ocrResult; stop(); dom.tileLocationSelect.focus(); } else { showLoader('Scan rejected. Try again.'); setTimeout(hideLoader, 1500); }
            }
        } else { showLoader('Text not found. Try again.'); setTimeout(hideLoader, 1500); }
    } catch (error) { console.error("OCR Error:", error); showLoader('Scan failed. Please try again.'); setTimeout(hideLoader, 1500); }
}
