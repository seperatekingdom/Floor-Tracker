// js/scanner.js
import { state } from './state.js';
import { config } from './config.js';
import { dom } from './dom.js';
import { showLoader, hideLoader, showScanner, hideScanner } from './ui.js';

/**
 * Processes a video frame to isolate text for OCR.
 * This version includes blurring and dilation to fix "hollow text".
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

    // Declare all Mat objects here to ensure they are cleaned up in the 'finally' block
    let src = null, hsv = null, mask = null, dst = null, kernel = null, low = null, high = null;

    try {
        src = cv.imread(canvas);
        hsv = new cv.Mat();
        mask = new cv.Mat();
        dst = new cv.Mat();

        // 1. Convert from RGB to HSV color space
        cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
        cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);

        // 2. Apply a Median Blur to reduce noise and help prevent outlining
        cv.medianBlur(hsv, hsv, 5);

        // 3. Create a mask to find the red background areas
        low = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [0, 100, 100, 0]);
        high = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [10, 255, 255, 255]);
        cv.inRange(hsv, low, high, mask);
        
        // 4. Invert the mask to get the text shape (text is now white, background is black)
        cv.bitwise_not(mask, dst);

        // 5. DILATE the text shape. This expands the white pixels, filling in any
        //    hollow parts of the letters.
        kernel = cv.Mat.ones(2, 2, cv.CV_8U);
        cv.dilate(dst, dst, kernel, new cv.Point(-1, -1), 1);

        // 6. Invert the image one last time. This turns the now-solid white text
        //    into solid black text, ready for OCR.
        cv.bitwise_not(dst, dst);
        
        // 7. Draw the final, clean image to the canvas
        cv.imshow(canvas, dst);

    } finally {
        // 8. Clean up all allocated memory to prevent crashes
        if (src) src.delete();
        if (hsv) hsv.delete();
        if (mask) mask.delete();
        if (dst) dst.delete();
        if (kernel) kernel.delete();
        if (low) low.delete();
        if (high) high.delete();
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
