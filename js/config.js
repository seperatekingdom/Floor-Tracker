// js/config.js
export const config = {
    opencv: {
        // Dilation settings
        dilation: {
            kernelSize: 3, 
            iterations: 1,
        },

        // NEW: Inversion Switch
        // Set to 'true' to get the standard black-on-white image.
        // Set to 'false' to get the inverted white-on-black image.
        invertFinal: true, // Let's start with true as our first test
    },
    tesseract: {
        engineMode: Tesseract.OEM.LSTM_ONLY,
    },
    fuse: {
        includeScore: true,
        threshold: 0.6,
    }
};
