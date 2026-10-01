document.addEventListener('DOMContentLoaded', () => {
    // Interactive Background
    document.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        requestAnimationFrame(() => {
            document.documentElement.style.setProperty('--mouse-x', x);
            document.documentElement.style.setProperty('--mouse-y', y);
        });
    });

    // Touch support for mobile
    document.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            const x = e.touches[0].clientX / window.innerWidth;
            const y = e.touches[0].clientY / window.innerHeight;

            requestAnimationFrame(() => {
                document.documentElement.style.setProperty('--mouse-x', x);
                document.documentElement.style.setProperty('--mouse-y', y);
            });
        }
    });

    const urlInput = document.getElementById('urlInput');
    const generateBtn = document.getElementById('generateBtn');
    const inputSection = document.getElementById('inputSection');
    const qrSection = document.getElementById('qrSection');
    const qrContainer = document.getElementById('qrCode');

    let qrCodeObj = null;

    function generateQR() {
        const url = urlInput.value.trim();

        if (!url) {
            alert('URL을 입력해주세요.');
            return;
        }

        // Start Animation
        inputSection.classList.add('moved-down');

        // Wait for input to move slightly before showing QR
        setTimeout(() => {
            // Clear previous QR
            qrContainer.innerHTML = '';

            // Generate new QR
            qrCodeObj = new QRCode(qrContainer, {
                text: url,
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            qrSection.classList.add('visible');
        }, 300);
    }

    generateBtn.addEventListener('click', generateQR);

    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            generateQR();
        }
    });

    // Download functionality
    qrContainer.addEventListener('click', () => {
        const img = qrContainer.querySelector('img');
        if (img && img.src) {
            const link = document.createElement('a');
            // Use the actually generated base64 src from the img tag
            // QRCode.js generates an image, sometimes it takes a split second to render from canvas to img, 
            // but usually it puts an img tag. 
            // If it uses canvas, we might need to handle that. QRCode.js usually appends an img or canvas.

            let downloadUrl = img.src;

            // If the library generates a canvas but hides it and shows img, we are good.
            // If it only shows canvas:
            if (!downloadUrl || downloadUrl.length < 100) {
                const canvas = qrContainer.querySelector('canvas');
                if (canvas) {
                    downloadUrl = canvas.toDataURL("image/jpeg");
                }
            }

            link.href = downloadUrl;
            link.download = 'smart-qr-code.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });
});
