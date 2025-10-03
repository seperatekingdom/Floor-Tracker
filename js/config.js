// js/config.js
export const config = {
    opencv: {
        // --- Adaptive Threshold parameters ---
        // blockSize: The size of the area to calculate the threshold. Must be an odd number.
        // Try values like 11, 15, 21, 25.
        blockSize: 15,

        // C: A constant subtracted from the mean. A "fudge factor" to fine-tune the threshold.
        // Try values like 2, 5, 7.
        C: 5,

        // --- NEW: Dilation settings to fill in "hollow" text ---
        dilation: {
            // The size of the 'brush' used to thicken the text outlines.
            // Increase this number to make the fill effect stronger.
            // Good values to test are 2, 3, or 4.
            kernelSize: 4, 

            // How many times to apply the dilation. 1 is usually enough.
            // Try 2 for a very strong effect if kernelSize isn't enough.
            iterations: 2,
        }
    },
    tesseract: {
        // --- Engine Mode: Tesseract's OCR model ---
        // LSTM_ONLY is the modern AI-based one and usually best.
        // Options: Tesseract.OEM.LSTM_ONLY, Tesseract.OEM.TESSERACT_ONLY, Tesseract.OEM.TESSERACT_LSTM_COMBINED
        engineMode: Tesseract.OEM.LSTM_ONLY,
    },
    fuse: {
        // --- Fuzzy search settings ---
        includeScore: true,
        // Lower number = stricter match. Higher number = looser match. (Range: 0.0 to 1.0)
        threshold: 0.6,
    }
};
