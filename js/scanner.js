// js/scanner.js
import { state } from './state.js';
import { config } from './config.js';
import { dom } from './dom.js';
import { showLoader, hideLoader, showScanner, hideScanner } from './ui.js';

/**
 * NEW: Processes the frame using color channel extraction for high-contrast text.
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

    let src = cv.imread(canvas);
    let dst = new cv.Mat();
    let channelPlane = new cv.Mat();
    
    // 1. Create a MatVector to hold the individual color channels
    let channels = new cv.MatVector();
    
    // 2. Split the source image into its R, G, B, and Alpha channels
    cv.split(src, channels);
    
    // 3. Isolate the BLUE channel. For "white on red", the blue channel provides
    //    excellent contrast (white text is bright, red background is dark).
    //    You could also use channels.get(1) for the GREEN channel.
    channelPlane = channels.get(2); // 0=R, 1=G, 2=B, 3=A
    
    // 4. Apply adaptive thresholding on ONLY the blue channel
    cv.adaptiveThreshold(channelPlane, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, config.opencv.blockSize, config.opencv.C);
    
    // Note: We use THRESH_BINARY_INV here because the text (bright in the blue channel) should become black.
    
    // 5. Draw the final, clean black-and-white image back to the canvas
    cv.imshow(canvas, dst);
    
    // 6. Clean up memory
    src.delete();
    dst.delete();
    channels.delete();
    channelPlane.delete();
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
                    dom.tileLocationInput.focus();
                } else {
                    showLoader('Scan rejected. Try again.');
                    setTimeout(hideLoader, 1500);
                }
            } else {
                showLoader(`No match found for "${ocrResult}"`);
                setTimeout(hideLoader, 2000);
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
