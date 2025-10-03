// js/scanner.js (DEFINITIVE FIX - Friday 1:15 PM)
import { state } from './state.js';
import { config } from './config.js';
import { dom } from './dom.js';
import { showLoader, hideLoader, showScanner, hideScanner } from './ui.js';

function _processFrame(canvas) {
    const video = dom.videoStream;
    const roiWidth = video.videoWidth * 0.30;
    const roiHeight = video.videoHeight * 0.10;
    const roiX = (video.videoWidth - roiWidth) / 2;
    const roiY = (video.videoHeight - roiHeight) / 2;
    canvas.width = roiWidth; canvas.height = roiHeight;
    canvas.getContext('2d').drawImage(video, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);

    let src = null, gray = null, blurred = null, enhanced = null;
    let dst = null, kernel = null, clahe = null;
    
    try {
        src = cv.imread(canvas); gray = new cv.Mat(); blurred = new cv.Mat();
        enhanced = new cv.Mat(); dst = new cv.Mat();
        
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
        
        clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
        clahe.apply(blurred, enhanced);
        
        cv.threshold(enhanced, dst, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
        
        const dilateConfig = config.opencv.dilation;
        kernel = cv.Mat.ones(dilateConfig.kernelSize, dilateConfig.kernelSize, cv.CV_8U);
        cv.dilate(dst, dst, kernel, new cv.Point(-1, -1), dilateConfig.iterations);
        
        // --- THE FINAL FIX ---
        // We are replacing the faulty cv.bitwise_not() with a reliable inversion using cv.threshold().
        cv.threshold(dst, dst, 127, 255, cv.THRESH_BINARY_INV);
        
        cv.imshow(canvas, dst);
    } finally {
        if (src) src.delete(); if (gray) gray.delete(); if (blurred) blurred.delete();
        if (enhanced) enhanced.delete(); if (dst) dst.delete(); if (kernel) kernel.delete();
        if (clahe) clahe.delete();
    }
}

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
    showLoader('Running multi-stage debug...');

    const tempCanvas = document.createElement('canvas');
    const show = (mat, element) => { cv.imshow(tempCanvas, mat); element.src = tempCanvas.toDataURL(); };

    const video = dom.videoStream;
    const roiWidth = video.videoWidth * 0.30; const roiHeight = video.videoHeight * 0.10;
    const roiX = (video.videoWidth - roiWidth) / 2; const roiY = (video.videoHeight - roiHeight) / 2;
    const mainCanvas = document.createElement('canvas');
    mainCanvas.width = roiWidth; mainCanvas.height = roiHeight;
    mainCanvas.getContext('2d').drawImage(video, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);

    let src = null, gray = null, enhanced = null, otsu_inv = null, dilated = null, final = null;
    let kernel = null, clahe = null;

    try {
        src = cv.imread(mainCanvas); gray = new cv.Mat(); enhanced = new cv.Mat();
        otsu_inv = new cv.Mat(); dilated = new cv.Mat(); final = new cv.Mat();

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY); show(gray, dom.debugGray);
        clahe = new cv.CLAHE(2.0, new cv.Size(8, 8)); clahe.apply(gray, enhanced); show(enhanced, dom.debugClahe);
        cv.threshold(enhanced, otsu_inv, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU); show(otsu_inv, dom.debugOtsu);
        const dilateConfig = config.opencv.dilation;
        kernel = cv.Mat.ones(dilateConfig.kernelSize, dilateConfig.kernelSize, cv.CV_8U);
        cv.dilate(otsu_inv, dilated, kernel, new cv.Point(-1, -1), dilateConfig.iterations); show(dilated, dom.debugDilate);
        
        // Using the new reliable inversion method for the final debug step
        cv.threshold(dilated, final, 127, 255, cv.THRESH_BINARY_INV);
        show(final, dom.debugFinal);

    } catch (error) {
        console.error("Error during multi-stage debug:", error);
    } finally {
        if (src) src.delete(); if (gray) gray.delete(); if (enhanced) enhanced.delete();
        if (otsu_inv) otsu_inv.delete(); if (dilated) dilated.delete(); if (final) final.delete();
        if (kernel) kernel.delete(); if (clahe) clahe.delete();
        hideLoader();
    }
}

export async function scanFrame() {
    if (!state.cvReady) { alert("Image processing library not ready."); return; }
    showLoader('Processing frame...'); const canvas = document.createElement('canvas');
    try {
        _processFrame(canvas);
        const { data: { text } } = await state.worker.recognize(canvas, { tessedit_ocr_engine_mode: config.tesseract.engineMode, }, { tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234s -', tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE });
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
