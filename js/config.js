// js/config.js
export const config = {
    opencv: {
        blockSize: 15,
        C: 5,
    },
    tesseract: {
        engineMode: Tesseract.OEM.LSTM_ONLY,
    },
    fuse: {
        includeScore: true,
        threshold: 0.6,
    }
};
