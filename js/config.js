// js/config.js
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
        // Engine Mode: Tesseract's OCR model.
        engineMode: Tesseract.OEM.LSTM_ONLY,
    },

    fuse: {
        // Fuzzy search settings.
        includeScore: true,
        threshold: 0.6,
    }
};

