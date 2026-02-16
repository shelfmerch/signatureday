
(async () => {
    try {
        await import('./services/sharpRenderService.js');
        console.log('Successfully imported sharpRenderService');
    } catch (error) {
        console.error('Import failed with error:');
        console.error(error);
    }
})();
