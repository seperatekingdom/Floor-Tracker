// js/config.js (Bulletproof Version)
export const config = {
    opencv: {
        // Dilation settings to fill in "hollow" text.
        dilation: {
            kernelSize: 3,
            iterations: 1,
        },

        // Inversion Switch. 'false' gives the white-on-black image.
        invertFinal: false,
    },

    tesseract: {
        // Use a simple string to avoid dependency issues on load.
        // The scanner.js file will handle converting this to the correct Tesseract value.
        // Valid options: 'LSTM_ONLY', 'TESSERACT_ONLY', 'TESSERACT_LSTM_COMBINED'
        engineMode: 'LSTM_ONLY',
    },

    fuse: {
        // Fuzzy search settings.
        includeScore: true,
        threshold: 0.6,
    }
};
