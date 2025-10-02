// js/scanner.js
import { state } from './state.js';
import { config } from './config.js';
import { dom } from './dom.js';
import { showLoader, hideLoader, showScanner, hideScanner } from './ui.js';
import Fuse from 'fuse.js'; // Assuming Fuse.js is imported if used in this module scope
import Tesseract from 'tesseract.js'; // Assuming Tesseract is imported if used in this module scope


/**
 * Processes a video frame to isolate text for OCR.
 * This revised version is more robust to changing light conditions.
 * @param {HTMLCanvasElement} canvas The canvas to draw the processed image onto.
 */
function _processFrame(canvas) {
    const video = dom.videoStream;
    // Keep the ROI logic, it's efficient
    const roiWidth = video.videoWidth * 0.30;
    const roiHeight = video.videoHeight * 0.10;
    const roiX = (video.videoWidth - roiWidth) / 2;
    const roiY = (video.videoHeight - roiHeight) / 2;
    canvas.width = roiWidth;
    canvas.height = roiHeight;
    canvas.getContext('2d').drawImage(video, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);

    // Declare all Mat objects here to ensure they are cleaned up in the 'finally' block
    let src = null, hsv = null, gray = null, mask = null, mask1 = null, mask2 = null;
    let dst = null, kernel = null, clahe = null, hsv_planes = null, V = null;
    // Declare Mats for HSV ranges
    let low1 = null, high1 = null, low2 = null, high2 = null;
    
    try {
        src = cv.imread(canvas);
        hsv = new cv.Mat();
        dst = new cv.Mat();

        // 1. Convert from RGB to HSV color space
        cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
        cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);
        
        // 2. (NEW) Normalize brightness/contrast using CLAHE on the Value channel
        // This makes the image much more resilient to low or uneven lighting.
        hsv_planes = new cv.MatVector();
        cv.split(hsv, hsv_planes);
        V = hsv_planes.get(2); // Get the V channel
        clahe = new cv.CLAHE(2.0, new cv.Size(8, 8)); // clipLimit, tileGridSize
        clahe.apply(V, V); // Apply CLAHE in-place
        hsv_planes.set(2, V); // Put the enhanced V channel back
        cv.merge(hsv_planes, hsv);

        // 3. Create a mask for the red background areas.
        // We now use more forgiving S and V values and handle the "wrap-around" hue for red.
        
        // Lower range (more red-pinks)
        low1 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [0, 70, 50, 0]);
        high1 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [10, 255, 255, 255]);
        mask1 = new cv.Mat();
        cv.inRange(hsv, low1, high1, mask1);

        // Upper range (more red-purples)
        low2 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [170, 70, 50, 0]);
        high2 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [180, 255, 255, 255]);
        mask2 = new cv.Mat();
        cv.inRange(hsv, low2, high2, mask2);
        
        // Combine the two masks to get all reds
        mask = new cv.Mat();
        cv.bitwise_or(mask1, mask2, mask);

        // 4. Invert the mask to get the text shape (text is now white, background is black)
        cv.bitwise_not(mask, dst);

        // 5. (NEW) Use Adaptive Thresholding for a cleaner binary image.
        // This is much better than the simple inversion, especially with imperfect masks.
        // Our inverted mask `dst` is already a single-channel grayscale image.
        let temp = new cv.Mat(); // Temporary Mat for the threshold result
        cv.adaptiveThreshold(dst, temp, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
        dst.delete(); // delete old dst
        dst = temp; // reassign dst

        // 6. DILATE the text shape to fill in hollow parts.
        kernel = cv.Mat.ones(2, 2, cv.CV_8U);
        cv.dilate(dst, dst, kernel, new cv.Point(-1, -1), 1);

        // 7. Invert the image. This turns the solid white text into solid black text
        //    on a white background, which is ideal for Tesseract.
        cv.bitwise_not(dst, dst);
        
        // 8. Draw the final, clean image to the canvas
        cv.imshow(canvas, dst);

    } finally {
        // 9. Clean up all allocated memory to prevent crashes
        if (src) src.delete();
        if (hsv) hsv.delete();
        if (gray) gray.delete();
        if (mask) mask.delete();
        if (mask1) mask1.delete();
        if (mask2) mask2.delete();
        if (dst) dst.delete();
        if (kernel) kernel.delete();
        if (clahe) clahe.delete();
        if (hsv_planes) hsv_planes.delete();
        if (V) V.delete();
        // Clean up HSV range Mats
        if (low1) low1.delete();
        if (high1) high1.delete();
        if (low2) low2.delete();
        if (high2) high2.delete();
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
