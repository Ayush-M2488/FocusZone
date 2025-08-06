chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'playSound') {
        const audio = document.getElementById('alert-sound');
        if (audio) {
            audio.play();
        }
    }
});