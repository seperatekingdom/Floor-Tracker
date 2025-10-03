// js/config.js
export const config = {
    opencv: {
        /*
        // These parameters are for adaptiveThreshold, which we are no longer using.
        // They are kept here in case you want to experiment with it again later.
        blockSize: 15,
        C: 5,
        */

        // Dilation settings to fill in "hollow" text.
        // With the new Otsu method, you can likely reduce this. Start with 2.
        dilation: {
            kernelSize: 2, 
            iterations: 1,
        }
    },
    tesseract: {
        engineMode: Tesseract.OEM.LSTM_ONLY,
    },
    fuse: {
        includeScore: true,
        threshold: 0.6,
    }
};
