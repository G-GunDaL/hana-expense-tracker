document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const selectBtn = document.getElementById('file-select-btn');
    const ratioBtns = document.querySelectorAll('.ratio-btn');
    const customRatioBtn = document.getElementById('custom-ratio-btn');
    const customRatioContainer = document.getElementById('custom-ratio-container');
    const customWidthInput = document.getElementById('custom-width');
    const customHeightInput = document.getElementById('custom-height');
    const sizeBtns = document.querySelectorAll('.size-btn');
    const customSizeBtn = document.getElementById('custom-size-btn');
    const customSizeContainer = document.getElementById('custom-size-container');
    const customLongSideInput = document.getElementById('custom-long-side');
    const modeRadios = document.querySelectorAll('input[name="resize-mode"]');
    const bgColorControl = document.getElementById('bg-color-control');
    const bgColorInput = document.getElementById('bg-color-input');
    const bgColorHex = document.getElementById('bg-color-hex');
    const resultsSection = document.getElementById('results-section');
    const imageList = document.getElementById('image-list');
    const startProcessBtn = document.getElementById('start-process-btn');

    // State
    let currentFiles = [];
    let processedImages = [];
    let currentRatio = 1; // Default 1:1
    let isCustomRatio = false;
    let currentSize = 'origin'; // 'origin', number, or 'custom'
    let customSizeValue = null;
    let currentMode = 'padding';
    let currentBgColor = '#ffffff';

    // --- Init & Event Listeners ---

    // Upload Interactions
    selectBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        fileInput.value = ''; // Reset to allow selecting same file again
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    // Size Selection
    sizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (btn.id === 'custom-size-btn') {
                currentSize = 'custom';
                customSizeContainer.classList.remove('hidden');
                if (customLongSideInput.value) customSizeValue = Number(customLongSideInput.value);
            } else {
                currentSize = btn.dataset.size;
                customSizeContainer.classList.add('hidden');
                customSizeValue = (currentSize === 'origin') ? null : Number(currentSize);
                resetProcessingStatus();
            }
        });
    });

    customLongSideInput.addEventListener('input', () => {
        const val = parseFloat(customLongSideInput.value);
        if (val > 0) {
            customSizeValue = val;
            resetProcessingStatus();
        }
    });

    // Ratio Selection
    ratioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Update
            ratioBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Logic
            if (btn.id === 'custom-ratio-btn') {
                isCustomRatio = true;
                customRatioContainer.classList.remove('hidden');
            } else {
                isCustomRatio = false;
                customRatioContainer.classList.add('hidden');

                const [w, h] = btn.dataset.ratio.split(':').map(Number);
                currentRatio = w / h;

                // Reset to allow re-processing with new settings
                resetProcessingStatus();
            }
        });
    });

    // Custom Ratio Inputs
    [customWidthInput, customHeightInput].forEach(input => {
        input.addEventListener('input', () => {
            const w = parseFloat(customWidthInput.value);
            const h = parseFloat(customHeightInput.value);
            if (w > 0 && h > 0) {
                currentRatio = w / h;
                resetProcessingStatus();
            }
        });
    });

    // Mode Selection
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentMode = e.target.value;
            if (currentMode === 'padding') {
                bgColorControl.classList.remove('hidden');
            } else {
                bgColorControl.classList.add('hidden');
            }
            resetProcessingStatus();
        });
    });

    // Background Color
    bgColorInput.addEventListener('input', (e) => {
        currentBgColor = e.target.value;
        bgColorHex.textContent = currentBgColor.toUpperCase();
        if (currentMode === 'padding') resetProcessingStatus();
    });

    // Start Process
    startProcessBtn.addEventListener('click', processAllFiles);

    // Download All
    downloadAllBtn.addEventListener('click', createZipAndDownload);


    // --- Core Logic ---

    function resetProcessingStatus() {
        // If settings change, we allow user to process again
        startProcessBtn.disabled = false;
        startProcessBtn.textContent = 'Start Processing';

        // Hide download button until re-processed
        downloadAllBtn.classList.add('hidden');

        // Reset progress bars visually (optional, but good feedback)
        currentFiles.forEach(file => {
            updateProgress(file.id, 0);
            const downloadLink = document.getElementById(`download-${file.id}`);
            if (downloadLink) {
                downloadLink.classList.remove('ready');
                downloadLink.href = '#';
            }
        });
        processedImages = [];
    }

    function handleFiles(files) {
        const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (validFiles.length === 0) return;

        currentFiles = [...currentFiles, ...validFiles];
        resultsSection.classList.remove('hidden');

        // Render UI items first for new files
        validFiles.forEach(file => {
            const item = createListItem(file);
            imageList.appendChild(item.element);
            // Store reference to update later
            file.uiElement = item;
        });

        // Show start button if hidden
        startProcessBtn.classList.remove('hidden');
        startProcessBtn.disabled = false;
        startProcessBtn.textContent = 'Start Processing';
        // Hide download button until processing
        downloadAllBtn.classList.add('hidden');
    }

    function createListItem(file) {
        const li = document.createElement('div');
        li.className = 'image-item';

        // Unique ID for this file's operation
        const id = Math.random().toString(36).substr(2, 9);
        file.id = id;

        li.innerHTML = `
            <img src="" alt="Thumbnail" class="thumbnail" id="thumb-${id}">
            <div class="item-info">
                <div class="file-name">${file.name}</div>
                <div class="progress-container">
                    <div class="progress-bar" id="progress-${id}"></div>
                </div>
            </div>
            <a href="#" class="download-link" id="download-${id}" download="processed_${file.name}">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </a>
        `;

        // Generate initial thumbnail
        const reader = new FileReader();
        reader.onload = (e) => {
            li.querySelector(`#thumb-${id}`).src = e.target.result;
        };
        reader.readAsDataURL(file);

        return { element: li, id: id };
    }

    async function processAllFiles() {
        if (currentFiles.length === 0) return;

        startProcessBtn.disabled = true;
        startProcessBtn.textContent = 'Processing...';
        processedImages = []; // Clear previous batch

        // Process sequentially to be safe, but could be parallel
        const promises = currentFiles.map(async (file) => {
            updateProgress(file.id, 20); // Started
            try {
                const blob = await processImage(file);
                updateProgress(file.id, 100); // Done

                // Update download link
                const url = URL.createObjectURL(blob);
                const downloadBtn = document.getElementById(`download-${file.id}`);
                downloadBtn.href = url;
                downloadBtn.classList.add('ready');

                processedImages.push({
                    name: `processed_${file.name}`,
                    blob: blob
                });
            } catch (error) {
                console.error('Error processing file:', file.name, error);
            }
        });

        await Promise.all(promises);

        // All done
        startProcessBtn.classList.add('hidden'); // Hide start button
        downloadAllBtn.classList.remove('hidden'); // Show download button
        downloadAllBtn.disabled = false;
        downloadAllBtn.textContent = 'Download All (ZIP)';
    }

    function updateProgress(id, percent) {
        const bar = document.getElementById(`progress-${id}`);
        if (bar) bar.style.width = `${percent}%`;
    }

    function processImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const srcW = img.width;
                const srcH = img.height;

                // Determine Target Long Side
                let targetLongSide;
                if (currentSize === 'origin') {
                    targetLongSide = Math.max(srcW, srcH);
                } else if (currentSize === 'custom') {
                    targetLongSide = customSizeValue || Math.max(srcW, srcH); // Fallback
                } else {
                    targetLongSide = Number(currentSize);
                }

                // Determine Target Width & Height based on Ratio and Long Side
                let targetW, targetH;
                if (currentRatio >= 1) { // Landscape or Square target
                    targetW = targetLongSide;
                    targetH = targetLongSide / currentRatio;
                } else { // Portrait target
                    targetH = targetLongSide;
                    targetW = targetLongSide * currentRatio;
                }

                targetW = Math.round(targetW);
                targetH = Math.round(targetH);

                canvas.width = targetW;
                canvas.height = targetH;

                let drawX, drawY, drawW, drawH;

                if (currentMode === 'padding') {
                    // Fill background
                    ctx.fillStyle = currentBgColor;
                    ctx.fillRect(0, 0, targetW, targetH);

                    // Fit image into target
                    const scale = Math.min(targetW / srcW, targetH / srcH);
                    drawW = srcW * scale;
                    drawH = srcH * scale;
                    drawX = (targetW - drawW) / 2;
                    drawY = (targetH - drawH) / 2;

                    ctx.drawImage(img, drawX, drawY, drawW, drawH);

                } else { // Crop
                    // Fill target with image (cover)
                    const scale = Math.max(targetW / srcW, targetH / srcH);
                    drawW = srcW * scale;
                    drawH = srcH * scale;

                    // Center crop (draw image larger than canvas if needed, centered)
                    drawX = (targetW - drawW) / 2;
                    drawY = (targetH - drawH) / 2;

                    ctx.drawImage(img, drawX, drawY, drawW, drawH);
                }

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, file.type);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    async function createZipAndDownload() {
        if (processedImages.length === 0) return;

        const zip = new JSZip();

        processedImages.forEach(img => {
            zip.file(img.name, img.blob);
        });

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "resized_images.zip");
    }
});
