// js/config.js (Simplified for Pure JS Pipeline)
export const config = {
    // This section is for our new Pure JS pipeline
    pre_processing: {
        // Set to 'true' to get a black-on-white image.
        // Set to 'false' to get a white-on-black image.
        invertFinal: false,
    },
    tesseract: {
        // Tesseract engine settings
        engineMode: 'LSTM_ONLY',
    },
    fuse: {
        // Fuzzy search settings
        includeScore: true,
        threshold: 0.6,
    }
};
