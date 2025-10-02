// js/scanner.js
import { state } from './state.js';
import { config } from './config.js';
import { dom } from './dom.js';
import { showLoader, hideLoader, showScanner, hideScanner } from './ui.js';

/**
 * Processes a video frame to isolate text for OCR.
 * This universal version uses a professional-grade pipeline to handle
 * a wide variety of colors and lighting conditions.
 * @param {HTMLCanvasElement} canvas The canvas to draw the processed image onto.
 */
function _processFrame(canvas) {
    const video = dom.videoStream;
    const roiWidth = video.videoWidth * 0.30;
    const roiHeight = video.videoHeight * 0.10;
    const roiX = (video.videoWidth - roiWidth) / 2;
    const roiY = (video.videoHeight - roiHeight) / 2;
    canvas.width = roiWidth;
    canvas.height = roiHeight;
    canvas.getContext('2d').drawImage(video, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);

    // Declare all Mat objects to ensure they are cleaned up in the 'finally' block
    let src = null, gray = null, blurred = null, enhanced = null;
    let dst = null, kernel = null, clahe = null;
    
    try {
        src = cv.imread(canvas);
        gray = new cv.Mat();
        blurred = new cv.Mat();
        enhanced = new cv.Mat();
        dst = new cv.Mat();

        // 1. Convert to Grayscale - This makes the process color-independent.
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        // 2. Apply a Gaussian Blur to reduce minor camera noise.
        cv.GaussianBlur(gray, blurred, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT);

        // 3. Enhance Contrast using CLAHE - A powerful technique for uneven lighting.
        clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
        clahe.apply(blurred, enhanced);
        
        // 4. Use Adaptive Thresholding to create a binary image.
        // We use THRESH_BINARY_INV so the darker text becomes the white "object of interest".
        cv.adaptiveThreshold(enhanced, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, config.opencv.blockSize, config.opencv.C);

        // 5. Dilate the text shape. This expands the white pixels (our text) to fill any gaps or holes.
        kernel = cv.Mat.ones(2, 2, cv.CV_8U);
        cv.dilate(dst, dst, kernel, new cv.Point(-1, -1), 1);

        // 6. Final Inversion. Flips the solid white text to solid black on a white background,
        // which is the ideal format for Tesseract.
        cv.bitwise_not(dst, dst);
        
        // 7. Draw the final, clean image to the canvas for processing.
        cv.imshow(canvas, dst);

    } finally {
        // 8. Clean up all allocated memory to prevent crashes.
        if (src) src.delete();
        if (gray) gray.delete();
        if (blurred) blurred.delete();
        if (enhanced) enhanced.delete();
        if (dst) dst.delete();
        if (kernel) kernel.delete();
        if (clahe) clahe.delete();
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
    } catch (err). {
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
    _processFrame(canvas);
    dom.debugPreview.src = canvas.toDataURL();
    dom.debugPreview.style.display = 'block';
    hideLoader();
}

export async function scanFrame() {
    if (!state.cvReady) {
        alert("Image processing library not ready.");
        return;
    }
    showLoader('Processing frame...');
    const canvas = document.createElement('canvas');
    try {
        _processFrame(canvas);
        const { data: { text } } = await state.worker.recognize(canvas, {
            tessedit_ocr_engine_mode: config.tesseract.engineMode,
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
