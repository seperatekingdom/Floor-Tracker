// js/scanner.js (DIAGNOSTIC - Step-by-Step Test - CORRECTED SYNTAX)
import { state } from './state.js';
import { config } from './config.js';
import { dom } from './dom.js';
import { showLoader, hideLoader, showScanner, hideScanner } from './ui.js';

function _processFrame(canvas) {
    console.log("--- Starting Step-by-Step Debug ---");
    const video = dom.videoStream;
    const roiWidth = video.videoWidth * 0.30;
    const roiHeight = video.videoHeight * 0.10;
    const roiX = (video.videoWidth - roiWidth) / 2;
    const roiY = (video.videoHeight - roiHeight) / 2;
    canvas.width = roiWidth; canvas.height = roiHeight;
    canvas.getContext('2d').drawImage(video, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);

    let src = null, dst = null, clahe = null, kernel = null;
    
    try {
        src = cv.imread(canvas);
        dst = src.clone(); // Start by working on a copy

        // --- INSTRUCTIONS ---
        // Uncomment ONE section at a time (from Test 1 to Test 5).
        // After uncommenting a section, save, hard reload, and press 'Debug Frame'.
        // If you get the "error occurred" alert, the section you just uncommented is the problem.

        // --- TEST 1: Grayscale ---
        // cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY);
        
        // --- TEST 2: CLAHE (Contrast Enhancement) ---
        // clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
        // clahe.apply(dst, dst);
        
        // --- TEST 3: Otsu's Threshold ---
        // cv.threshold(dst, dst, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);

        // --- TEST 4: Dilation ---
        // const dilateConfig = config.opencv.dilation;
        // kernel = cv.Mat.ones(dilateConfig.kernelSize, dilateConfig.kernelSize, cv.CV_8U);
        // cv.dilate(dst, dst, kernel, new cv.Point(-1, -1), dilateConfig.iterations);
        
        // --- TEST 5: Final Inversion ---
        // if (config.opencv.invertFinal) {
        //     cv.threshold(dst, dst, 127, 255, cv.THRESH_BINARY_INV);
        // }

        // Show the result of the last successful step
        cv.imshow(canvas, dst);

    } finally {
        // Clean up memory
        if (src) src.delete();
        if (dst) dst.delete();
        if (clahe) clahe.delete();
        if (kernel) kernel.delete();
    }
}


export async function start() {
    showScanner();
    showLoader('Initializing camera...');
    try {
        if (!state.cvReady) throw new Error("OpenCV.js is not ready.");
        state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        dom.videoStream.srcObject = state.stream;
        dom.videoStream.onloadedmetadata = () => {
            dom.videoStream.play();
            hideLoader();
        };
        if (!state.worker) {
            state.worker = await Tesseract.createWorker('eng');
        }
    } catch (err) {
        console.error("Scanner failed to start:", err);
        alert("Could not start scanner. Please ensure camera permissions are granted.");
        stop();
    }
}

export function stop() {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
    }
    if (state.worker) {
        state.worker.terminate();
        state.worker = null;
    }
    hideScanner();
}

export function debugFrame() {
    if (!state.cvReady) return;
    showLoader('Creating debug image...');
    const canvas = document.createElement('canvas');
    try {
        _processFrame(canvas);
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
    if (!state.cvReady) {
        alert("Image processing library not ready.");
        return;
    }
    showLoader('Processing frame...');
    const canvas = document.createElement('canvas');
    try {
        _processFrame(canvas); // Note: This will use the commented-out version for now
        const engineModeValue = Tesseract.OEM[config.tesseract.engineMode];
        const { data: { text } } = await state.worker.recognize(canvas, {
            tessedit_ocr_engine_mode: engineModeValue,
        }, {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234s -',
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE
        });
        const ocrResult = text.split('\n')[0].trim();
        if (ocrResult && ocrResult.length > 3) {
            const fuse = new Fuse(state.masterProductList, config.fuse);
            const results = fuse.search(ocrResult);
            if (results.length > 0) {
                const bestMatch = results[0].item;
                hideLoader();
                const isConfirmed = confirm(`Scanned: "${bestMatch}"\n\n(Corrected from: "${ocrResult}")\nIs this correct?`);
                if (isConfirmed) {
                    dom.productNameInput.value = bestMatch;
                    stop();
                    dom.tileLocationSelect.focus();
                } else {
                    showLoader('Scan rejected. Try again.');
                    setTimeout(hideLoader, 1500);
                }
            } else {
                hideLoader();
                const useAsIs = confirm(`No close match found for: "${ocrResult}"\n\nDo you want to add this new product name as is?`);
                if (useAsIs) {
                    dom.productNameInput.value = ocrResult;
                    stop();
                    dom.tileLocationSelect.focus();
                } else {
                    showLoader('Scan rejected. Try again.');
                    setTimeout(hideLoader, 1500);
                }
            }
        } else {
            showLoader('Text not found. Try again.');
            setTimeout(hideLoader, 1500);
        }
    } catch (error) {
        console.error("OCR Error:", error);
        showLoader('Scan failed. Please try again.');
        setTimeout(hideLoader, 1500);
    }
}
