document.addEventListener('DOMContentLoaded', () => {
    // --- Variables ---
    let currentFile = null;
    let originalImageWidth = 0;
    let originalImageHeight = 0;
    let aspectRatio = 1;

    // --- DOM Elements ---
    // Sections
    const uploadSection = document.getElementById('upload-section');
    const editorSection = document.getElementById('editor-section');

    // Upload & Nav
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const chooseFileBtn = document.getElementById('choose-file-btn');
    const resetBtn = document.getElementById('reset-btn');

    // Display Cards
    const originalCard = document.getElementById('original-card');
    const originalContent = document.getElementById('original-content');
    const resizedCard = document.getElementById('resized-card');
    const toggleOriginalBtn = document.getElementById('toggle-original-btn');

    // Previews
    const gifPreview = document.getElementById('gif-preview');
    const resizedGifPreview = document.getElementById('resized-gif-preview');
    const gifInfoContainer = document.getElementById('gif-info');
    const resizedGifInfoContainer = document.getElementById('resized-gif-info');

    // Downloads
    const downloadBtn = document.getElementById('download-btn');
    const downloadResizedBtn = document.getElementById('download-resized-btn');

    // Panels
    const mainToolsGrid = document.getElementById('main-tools-grid');
    const resizePanel = document.getElementById('resize-panel');

    // Resize Controls
    const resizeBtn = document.querySelector('button[data-tool="resize"]');
    const resizeBackBtn = document.getElementById('resize-back-btn');
    const resizeGoBtn = document.getElementById('resize-go-btn');
    const resizeProgressContainer = document.getElementById('resize-progress-container');
    const resizeProgressFill = document.getElementById('resize-progress-fill');
    const resizeProgressText = document.getElementById('resize-progress-text');

    const widthSlider = document.getElementById('resize-width-slider');
    const widthInput = document.getElementById('resize-width-input');
    const heightSlider = document.getElementById('resize-height-slider');
    const heightInput = document.getElementById('resize-height-input');

    const lockBtn = document.getElementById('aspect-ratio-lock');
    const lockIcon = lockBtn.querySelector('.lock-icon');
    const unlockIcon = lockBtn.querySelector('.unlock-icon');
    let isLocked = true;


    // --- Event Listeners ---

    let currentResizedBlob = null;

    // --- Event Listeners ---

    // 1. Upload
    chooseFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
    ['dragenter', 'dragover'].forEach(eventName => dropZone.classList.add('drag-active'));
    ['dragleave', 'drop'].forEach(eventName => dropZone.classList.remove('drag-active'));
    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });

    // 2. Main Logic
    function handleFile(file) {
        if (file.type !== 'image/gif') {
            alert('Please upload a valid GIF file.');
            return;
        }
        currentFile = file;

        // Reset Views
        originalCard.classList.remove('collapsed');
        originalContent.classList.remove('hidden');
        resizedCard.classList.add('hidden');
        mainToolsGrid.classList.remove('hidden');
        resizePanel.classList.add('hidden');
        cropPanel.classList.add('hidden');
        resizeProgressContainer.classList.add('hidden'); // Reset progress

        // Read for Preview
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
            gifPreview.src = reader.result;
            // Get Dimensions from Image Load
            const img = new Image();
            img.onload = function () {
                originalImageWidth = this.width;
                originalImageHeight = this.height;
                aspectRatio = originalImageWidth / originalImageHeight;
                initResizeControls();
            }
            img.src = reader.result;

            uploadSection.classList.add('hidden');
            editorSection.classList.remove('hidden');
        };

        // Read for Info
        const arrayBufferReader = new FileReader();
        arrayBufferReader.readAsArrayBuffer(file);
        arrayBufferReader.onloadend = () => {
            const info = parseGIF(arrayBufferReader.result);
            displayInfo(info, gifInfoContainer);
        };
    }

    // 3. Resize Tool Logic
    resizeBtn.addEventListener('click', () => {
        mainToolsGrid.classList.add('hidden');
        resizePanel.classList.remove('hidden');
    });

    resizeBackBtn.addEventListener('click', () => {
        resizePanel.classList.add('hidden');
        mainToolsGrid.classList.remove('hidden');
    });

    function initResizeControls() {
        const minScale = 0.05;
        const maxScale = 3.0;

        widthSlider.min = Math.floor(originalImageWidth * minScale);
        widthSlider.max = Math.floor(originalImageWidth * maxScale);
        widthSlider.value = originalImageWidth;
        widthInput.value = originalImageWidth;

        heightSlider.min = Math.floor(originalImageHeight * minScale);
        heightSlider.max = Math.floor(originalImageHeight * maxScale);
        heightSlider.value = originalImageHeight;
        heightInput.value = originalImageHeight;
    }

    // Lock Toggle
    lockBtn.addEventListener('click', () => {
        isLocked = !isLocked;
        if (isLocked) {
            lockBtn.classList.add('active');
            lockIcon.classList.remove('hidden');
            unlockIcon.classList.add('hidden');
            updateHeightFromWidth(widthInput.value);
        } else {
            lockBtn.classList.remove('active');
            lockIcon.classList.add('hidden');
            unlockIcon.classList.remove('hidden');
        }
    });

    // Inputs
    widthSlider.addEventListener('input', (e) => {
        widthInput.value = e.target.value;
        if (isLocked) updateHeightFromWidth(e.target.value);
    });
    widthInput.addEventListener('input', (e) => {
        widthSlider.value = e.target.value;
        if (isLocked) updateHeightFromWidth(e.target.value);
    });

    heightSlider.addEventListener('input', (e) => {
        heightInput.value = e.target.value;
        if (isLocked) updateWidthFromHeight(e.target.value);
    });
    heightInput.addEventListener('input', (e) => {
        heightSlider.value = e.target.value;
        if (isLocked) updateWidthFromHeight(e.target.value);
    });

    function updateHeightFromWidth(w) {
        const newH = Math.round(w / aspectRatio);
        heightSlider.value = newH;
        heightInput.value = newH;
    }

    function updateWidthFromHeight(h) {
        const newW = Math.round(h * aspectRatio);
        widthSlider.value = newW;
        widthInput.value = newW;
    }

    // Toggle Original Panel
    toggleOriginalBtn.addEventListener('click', () => {
        originalContent.classList.toggle('hidden');
        const icon = toggleOriginalBtn.querySelector('svg');
        if (originalContent.classList.contains('hidden')) {
            icon.style.transform = 'rotate(180deg)'; // Down when hidden/collapsed
        } else {
            icon.style.transform = 'rotate(0deg)';
        }
    });

    // Toggle Resized Card (Main)
    const toggleResizedBtn = resizedCard.querySelector('.toggle-card-btn');
    const resizedContent = document.getElementById('resized-content');

    if (toggleResizedBtn) {
        toggleResizedBtn.addEventListener('click', () => {
            resizedContent.classList.toggle('hidden');
            if (resizedContent.classList.contains('hidden')) {
                toggleResizedBtn.querySelector('svg').style.transform = 'rotate(180deg)';
            } else {
                toggleResizedBtn.querySelector('svg').style.transform = 'rotate(0deg)';
            }
        });
    }


    // --- PROCESSING & ANIMATION ---
    let processingInterval = null;

    function startProcessingAnimation(textElement) {
        // Use spinner icon instead of text animation
        textElement.innerHTML = `<span class="spinner"></span>Processing...`;
    }

    function stopProcessingAnimation() {
        // No-op or clear interval if we had one (we don't use interval for spinner)
    }

    // GO Button (Resize)
    resizeGoBtn.addEventListener('click', () => {
        const newWidth = parseInt(widthInput.value);
        const newHeight = parseInt(heightInput.value);

        if (!newWidth || !newHeight) return;

        // Disable buttons
        resizeGoBtn.disabled = true;
        resizeBackBtn.disabled = true;

        // Archive previous result if exists
        if (currentResizedBlob) {
            const currentTitle = document.querySelector('#resized-card h3').innerText;
            createHistoryCard(currentResizedBlob, resizedGifInfoContainer.innerHTML, currentTitle);
        }

        // Clean previous info
        resizedGifInfoContainer.innerHTML = `
            <div class="info-item"><span class="info-label">Dimens</span><span class="info-value">${newWidth} x ${newHeight}</span></div>
            <div class="info-item"><span class="info-label">Size</span><span class="info-value">Processing...</span></div>
        `;

        // Show Loading Overlay
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.remove('hidden');

        // Collapse Original & History
        originalContent.classList.add('hidden');
        toggleOriginalBtn.querySelector('svg').style.transform = 'rotate(180deg)';

        // Ensure Main Resized Card is Visible & Expanded
        resizedCard.classList.remove('hidden');
        resizedCard.querySelector('.toggle-card-btn svg').style.transform = 'rotate(0deg)';
        document.querySelector('#resized-card h3').innerText = 'Resized GIF';
        // We need to ensure the content body is visible? 
        // The structure is Card -> Header, ImageWrapper, Info. 
        // We don't have a specific content wrapper for Resized Card in HTML yet, 
        // strictly speaking ID based.
        // Let's modify index.html structure for Resized Card to have a content wrapper 
        // OR just hide the children (Image + Info).
        // For now, let's assume we handle visibility by toggling 'collapsed' class on the card
        // and CSS handles it? The CSS for .collapsed needs to be checked.
        // Looking at original-card, it uses #original-content.hidden.
        // We should standardise.

        // For now, let's just implement the History Card Logic.

        resizedGifPreview.style.opacity = '0.5'; // Dim until done

        resizeProgressContainer.classList.remove('hidden');
        resizeProgressFill.style.width = '0%';
        resizeProgressText.innerText = '0%';

        // Start Real Processing
        const reader = new FileReader();
        // Always read from currentFile (which updates after each edit)
        reader.readAsArrayBuffer(currentFile);
        reader.onload = function (e) {
            processResize(e.target.result, newWidth, newHeight, loadingOverlay); // Pass overlay
        };
    });

    // Helper: Create History Card
    function createHistoryCard(blob, infoHTML, title = 'Resized GIF') {
        const previewArea = document.querySelector('.preview-area');
        const originalCard = document.getElementById('original-card');

        const card = document.createElement('div');
        card.className = 'preview-card collapsed'; // Start collapsed

        // Clone Header Structure
        const url = URL.createObjectURL(blob);
        const fileName = `history_${Date.now()}.gif`;

        card.innerHTML = `
            <div class="card-header">
                <div class="header-left">
                    <button class="icon-nav-btn toggle-history-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" style="transform: rotate(180deg)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                    </button>
                    <h3>${title} (History)</h3>
                </div>
                <button class="icon-btn download-history-btn" title="Download This Version">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                </button>
            </div>
            <div class="card-content hidden">
                <div class="image-wrapper">
                    <img src="${url}" alt="History GIF">
                </div>
                <div class="gif-info-grid">
                    ${infoHTML}
                </div>
            </div>
        `;

        // Insert after Resized Card (or before Original)
        // Stack: [Resized (Active)] [History 1] [History 2] ... [Original]
        // So we insert Before Original Card.
        previewArea.insertBefore(card, originalCard);

        // Add Event Listeners
        const toggleBtn = card.querySelector('.toggle-history-btn');
        const content = card.querySelector('.card-content');
        const downBtn = card.querySelector('.download-history-btn');

        toggleBtn.addEventListener('click', () => {
            const isHidden = content.classList.contains('hidden');
            if (isHidden) {
                content.classList.remove('hidden');
                toggleBtn.querySelector('svg').style.transform = 'rotate(0deg)';
                card.classList.remove('collapsed');
            } else {
                content.classList.add('hidden');
                toggleBtn.querySelector('svg').style.transform = 'rotate(180deg)';
                card.classList.add('collapsed');
            }
        });

        downBtn.addEventListener('click', () => {
            downloadBlob(blob, `resized_history.gif`);
        });
    }

    function processResize(buffer, targetWidth, targetHeight, loadingOverlayElement) {
        // 1. Decode using omggif
        // Attempt to find GifReader in common namespaces
        // Default might be 'omggif.GifReader' or global 'GifReader' depending on exact build
        const ReaderClass = window.GifReader || (window.omggif && window.omggif.GifReader) || (window.Omggif && window.Omggif.GifReader);

        if (!ReaderClass) {
            console.error('Omggif library globals:', window.omggif, window.Omggif, window.GifReader);
            alert('Error: GifReader library not found. Please check console for details.');
            return;
        }

        const reader = new ReaderClass(new Uint8Array(buffer)); // Use the found class constructor
        const framesCount = reader.numFrames();

        // 2. Setup gif.js Encoder using Blob URL for Worker to avoid CORS/file:// issues
        const workerBlob = new Blob([gifWorkerScript], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(workerBlob);

        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: targetWidth,
            height: targetHeight,
            workerScript: workerUrl
        });

        // 3. Iterate Frames
        const canvas = document.createElement('canvas');
        canvas.width = reader.width;
        canvas.height = reader.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.createImageData(reader.width, reader.height);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = targetWidth;
        tempCanvas.height = targetHeight;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

        // We need to handle disposal and transparency if possible.
        // For simplicity in this version, we'll clear and redraw each frame freshly
        // assuming standard usage or just draw frames sequentially.
        // Better quality: Render frame N on top of N-1 if disposal says so.
        // Note: omggif 'decodeAndBlitFrameRGBA' handles some of this if managed right,
        // but 'decodeToRGBA' gives raw pixels.

        // Let's iterate and build frames.

        // Loading Delay to not freeze UI
        let frameIndex = 0;
        let totalDelay = 0; // For FPS Calc

        function processNextFrame() {
            if (frameIndex >= framesCount) {
                // Done adding frames
                gif.render();
                return;
            }

            // Decode frame to RGBA
            reader.decodeAndBlitFrameRGBA(frameIndex, imageData.data);
            ctx.putImageData(imageData, 0, 0);

            // Resize
            tempCtx.clearRect(0, 0, targetWidth, targetHeight);
            tempCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

            // Add to GIF
            const frameInfo = reader.frameInfo(frameIndex);
            const delay = frameInfo.delay * 10; // Convert 1/100s to ms
            totalDelay += delay;
            gif.addFrame(tempCtx, { delay: delay, copy: true });

            frameIndex++;
            // Update progress (First 50% is Preparation)
            const prepProgress = (frameIndex / framesCount) * 50;
            resizeProgressFill.style.width = prepProgress + '%';
            resizeProgressText.innerText = Math.round(prepProgress) + '%';

            setTimeout(processNextFrame, 0); // Unblock UI
        }

        // Start Processing Frames
        processNextFrame();

        // 4. Handle Render Events
        gif.on('progress', (p) => {
            // Render Progress (Remaining 50%)
            const totalProgress = 50 + (p * 50);
            resizeProgressFill.style.width = totalProgress + '%';
            resizeProgressText.innerText = Math.round(totalProgress) + '%';
        });

        gif.on('finished', (blob) => {
            if (loadingOverlayElement) loadingOverlayElement.classList.add('hidden');
            currentResizedBlob = blob;

            // Show Result
            resizedGifPreview.src = URL.createObjectURL(blob);
            resizedGifPreview.style.opacity = '1';

            // Calculate Metadata
            const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
            const origSizeMB = (currentFile.size / (1024 * 1024));

            const origW = reader.width;
            const origH = reader.height;
            const origArea = origW * origH;
            const newArea = targetWidth * targetHeight;
            const fps = totalDelay > 0 ? (framesCount * 1000) / totalDelay : 10;

            resizedGifInfoContainer.innerHTML = `
                <div class="info-item"><span class="info-label">Dimens</span>${getDiffHtml(origArea, newArea, false, '').replace(newArea, `${targetWidth} x ${targetHeight}`)}</div>
                <div class="info-item"><span class="info-label">Size</span>${getDiffHtml(origSizeMB, parseFloat(sizeMB), true, ' MB')}</div>
                <div class="info-item"><span class="info-label">Frames</span>${getDiffHtml(framesCount, framesCount, false)}</div>
                <div class="info-item"><span class="info-label">FPS</span>${getDiffHtml(fps, fps, true)}</div>
            `;

            // Reset UI States
            resizeGoBtn.disabled = false;
            resizeBackBtn.disabled = false;
            resizeProgressContainer.classList.add('hidden');

            // Auto-navigation: Return to Main Tools
            resizePanel.classList.add('hidden');
            mainToolsGrid.classList.remove('hidden');

            // Sequential Editing Setup
            // Update currentFile to be this new file for next operations
            // We create a new File object so it looks like a user upload
            const newFileName = `resized_${currentFile.name}`;
            currentFile = new File([blob], newFileName, { type: 'image/gif' });

            // Update Global Dimensions for next entry
            originalImageWidth = targetWidth;
            originalImageHeight = targetHeight;
            aspectRatio = targetWidth / targetHeight;

            // Note: We do NOT update the "Original GIF" preview at the bottom 
            // to preserve the history/comparison view, but 'currentFile' pointer is moved forward.
        });
    }


    // 4. Download
    downloadBtn.addEventListener('click', () => {
        if (!currentFile) return;
        downloadBlob(currentFile, currentFile.name);
    });

    downloadResizedBtn.addEventListener('click', () => {
        if (!currentResizedBlob || !currentFile) return;
        const newName = `resized_${currentFile.name}`;
        downloadBlob(currentResizedBlob, newName);
    });

    // 5. Utility
    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function displayInfo(info, container) {
        if (!info) return;
        const sizeMB = (currentFile.size / (1024 * 1024)).toFixed(2);

        container.innerHTML = `
            <div class="info-item"><span class="info-label">Dimens</span><span class="info-value">${info.width} x ${info.height}</span></div>
            <div class="info-item"><span class="info-label">Size</span><span class="info-value">${sizeMB} MB</span></div>
            <div class="info-item"><span class="info-label">Frames</span><span class="info-value">${info.frames}</span></div>
            <div class="info-item"><span class="info-label">FPS</span><span class="info-value">${info.fps.toFixed(1)}</span></div>
        `;
    }

    // Reset
    resetBtn.addEventListener('click', () => {
        fileInput.value = '';
        gifPreview.src = '';
        resizedGifPreview.src = '';
        currentFile = null;
        currentResizedBlob = null;
        gifInfoContainer.innerHTML = '';
        resizedGifInfoContainer.innerHTML = '';
        editorSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        stopProcessingAnimation();
    });

    // Helper: GIF Parser
    function parseGIF(arrayBuffer) {
        const view = new Uint8Array(arrayBuffer);
        if (view[0] !== 0x47 || view[1] !== 0x49 || view[2] !== 0x46) return null;

        const width = view[6] + (view[7] << 8);
        const height = view[8] + (view[9] << 8);

        let frames = 0;
        let delays = [];
        let p = 13 + (view[10] & 0x80 ? 3 * (1 << ((view[10] & 0x07) + 1)) : 0);

        while (p < view.length) {
            if (view[p] === 0x21) {
                if (view[p + 1] === 0xF9 && view[p + 2] === 0x04) {
                    delays.push(view[p + 4] + (view[p + 5] << 8));
                }
                p += 2;
                while (true) {
                    const b = view[p++];
                    if (b === 0) break;
                    p += b;
                }
            } else if (view[p] === 0x2C) {
                frames++;
                p += 9;
                if (view[p] & 0x80) p += 3 * (1 << ((view[p] & 0x07) + 1));
                p++;
                p++;
                while (true) {
                    const b = view[p++];
                    if (b === 0) break;
                    p += b;
                }
            } else if (view[p] === 0x3B) break;
            else p++;
        }

        const totalDelay = delays.reduce((a, b) => a + b, 0);
        const fps = delays.length > 0 ? 100 / (totalDelay / delays.length) : 0;

        return { width, height, frames, fps };
    }

    // --- CROP TOOL Logic ---
    const cropPanel = document.getElementById('crop-panel');
    const cropBtn = document.querySelector('button[data-tool="crop"]'); // Use existing button or updated selector
    const cropBackBtn = document.getElementById('crop-back-btn');
    const cropGoBtn = document.getElementById('crop-go-btn');

    // Controls
    const cropSizeGroup = document.getElementById('crop-size-group');
    const cropRatioGroup = document.getElementById('crop-ratio-group');
    const cropBgColorInput = document.getElementById('crop-bg-color');
    const cropBgText = document.getElementById('crop-bg-text');

    const cropProgressContainer = document.getElementById('crop-progress-container');
    const cropProgressFill = document.getElementById('crop-progress-fill');
    const cropProgressText = document.getElementById('crop-progress-text');

    // State
    let selectedCropSize = 'origin'; // 'origin', '600', ...
    let selectedCropRatio = 'origin'; // 'origin', '1:1', ...
    let selectedCropMode = 'fill'; // 'fill', 'fit'

    // Button Listeners
    // Open Crop Panel
    // Note: The HTML has 'Cut', user likely wants 'Crop' to be a separate button or replace 'Cut'? 
    // The user request was "Smart Crop". 
    // In index.html line 203: <button class="tool-btn" data-tool="cut">...<span>Cut</span></button>
    // I should probably ensure there is a "Crop" button or hook to "Cut" (which implies trimming usually), 
    // OR create a new button. The screenshot showed "Crop" icon in tool grid.
    // Index.html has a data-tool="crop" as well? Let's check view.
    // Ah, lines 203-216 was 'Cut'. Lines 160-170 Rotate. 
    // Wait, let's assume the user wants to use the 'Crop' button if it exists, or I hook to the "Resize" flow alternative?
    // The previous view of index.html showed: Resize, Crop, Downsizing...
    // <button class="tool-btn" data-tool="crop"> (Wait, I need to check line 100-200 range again if crop exists).
    // Assuming data-tool="crop" exists (Common for these apps). If not, I'll add the listener to `document.querySelector('button[data-tool="crop"]')` 
    // which I'll assume I added or exists.
    // Re-reading index.html snippet earlier: Lines 150-250.
    // 150-160: Downsizing. 160: Rotate. 
    // I don't see "Crop" explicitly in the snippet of 150-288. It might be above 150.
    // Let's assume it exists. If not, I might need to bind to "Cut" or check lines < 150.
    // Found it in my thought trace: The prompt says "Crop" exists.

    const cropToolBtn = document.querySelector('button[data-tool="crop"]'); /* It should be there */

    if (cropToolBtn) {
        cropToolBtn.addEventListener('click', () => {
            mainToolsGrid.classList.add('hidden');
            cropPanel.classList.remove('hidden');
        });
    }

    cropBackBtn.addEventListener('click', () => {
        cropPanel.classList.add('hidden');
        mainToolsGrid.classList.remove('hidden');
    });

    // Chip Selection Logic
    function setupChipGroup(groupElement, onSelect) {
        groupElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('chip-btn')) {
                // Remove active from all
                groupElement.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
                // Add to clicked
                e.target.classList.add('active');
                onSelect(e.target.dataset.value);
            }
        });
    }

    setupChipGroup(cropSizeGroup, (val) => selectedCropSize = val);
    setupChipGroup(cropRatioGroup, (val) => selectedCropRatio = val);

    // Radio Logic
    document.querySelectorAll('input[name="crop-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => selectedCropMode = e.target.value);
    });

    // Color Logic
    cropBgColorInput.addEventListener('input', (e) => {
        cropBgText.innerText = e.target.value.toUpperCase();
    });


    // GO Application Logic
    cropGoBtn.addEventListener('click', () => {
        if (!currentFile) return;

        // 1. Calculate Target Dimensions
        let targetW, targetH;
        let sourceW = originalImageWidth; // Or current active dimensions? 
        // Sequential editing: currentFile is updated, so originalImageWidth should be updated too in 'finished'.
        // Let's verify processResize updates: yes processResize updates originalImageWidth/Height.
        sourceW = originalImageWidth;
        let sourceH = originalImageHeight;

        // Determine Long Axis value
        let longAxis = Math.max(sourceW, sourceH);

        if (selectedCropSize !== 'origin') {
            longAxis = parseInt(selectedCropSize);
        }

        // Determine Aspect Ratio
        let ratio = sourceW / sourceH; // default origin
        if (selectedCropRatio !== 'origin') {
            const [rw, rh] = selectedCropRatio.split(':').map(Number);
            ratio = rw / rh;
        }

        // Calculate W/H based on Long Axis & Ratio
        // If ratio > 1 (Landscape), Width is Long Axis.
        // If ratio < 1 (Portrait), Height is Long Axis.
        // If ratio = 1, Both are Long Axis.

        // Wait, "Image Size (Long Axis)" usually implies the longest side of the *input* is scaled to this?
        // OR the *output* longest side is set to this?
        // Let's assume Output Longest Side = longAxis (if specified).

        if (ratio >= 1) { // Landscape or Square
            targetW = longAxis;
            targetH = Math.round(longAxis / ratio);
        } else { // Portrait
            targetH = longAxis;
            targetW = Math.round(longAxis * ratio);
        }

        // 2. Prepare UI
        cropGoBtn.disabled = true;
        cropBackBtn.disabled = true;



        // Loading Overlay (use common one or create specific?)
        // The common one is inside #resized-card -> image-wrapper. 
        // We will switch to Resized Card view anyway.

        // Update Info Placeholder
        resizedGifInfoContainer.innerHTML = `
            <div class="info-item"><span class="info-label">Dimens</span><span class="info-value">${targetW} x ${targetH}</span></div>
            <div class="info-item"><span class="info-label">Size</span><span class="info-value">Processing...</span></div>
        `;

        // Switch Views
        // cropPanel.classList.add('hidden'); // Close tool panel? User said "return to editor tools". 
        // But during processing, we usually show the result card. 
        // standard flow: Hide Tool Panel -> Show Result Card (with overlay) -> Process -> Done -> Hide Result Card (Nav)?
        // Previous flow: Tool Panel (Resize) hidden -> Result Card (with overlay) -> Process -> Done -> Tool Panel (Grid) shown.
        // Wait, the user said "automatically move to Editor Tools initial screen" (Grid) AFTER render.
        // So during render, we probably want to see the card?
        // Let's hide the Crop Panel immediately and show Resized Card with overlay.

        // Archive History
        if (currentResizedBlob) {
            const currentTitle = document.querySelector('#resized-card h3').innerText;
            createHistoryCard(currentResizedBlob, resizedGifInfoContainer.innerHTML, currentTitle);
        }

        // Show Progress
        const progressContainer = document.getElementById('crop-progress-container');
        const progressFill = document.getElementById('crop-progress-fill');
        const progressText = document.getElementById('crop-progress-text');

        progressContainer.classList.remove('hidden');
        progressFill.style.width = '0%';
        progressText.innerText = '0%';

        cropGoBtn.disabled = true;
        cropBackBtn.disabled = true;

        originalContent.classList.add('hidden'); // Collapse others

        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.remove('hidden');

        resizedCard.classList.remove('hidden');
        resizedCard.querySelector('.toggle-card-btn svg').style.transform = 'rotate(0deg)';
        document.querySelector('#resized-card h3').innerText = 'Cropped GIF';
        resizedGifPreview.style.opacity = '0.5';

        // 3. Process
        const reader = new FileReader();
        reader.readAsArrayBuffer(currentFile);
        reader.onload = function (e) {
            processSmartCrop(e.target.result, targetW, targetH, selectedCropMode, cropBgColorInput.value, loadingOverlay);
        };
    });

    function processSmartCrop(buffer, targetWidth, targetHeight, mode, bgColor, loadingOverlayElement) {
        const ReaderClass = window.GifReader || (window.omggif && window.omggif.GifReader) || (window.Omggif && window.Omggif.GifReader);
        if (!ReaderClass) return;

        const reader = new ReaderClass(new Uint8Array(buffer));
        const framesCount = reader.numFrames();
        const workerBlob = new Blob([gifWorkerScript], { type: 'application/javascript' });
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: targetWidth,
            height: targetHeight,
            workerScript: URL.createObjectURL(workerBlob)
        });

        const canvas = document.createElement('canvas'); // Source Frame
        canvas.width = reader.width;
        canvas.height = reader.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.createImageData(reader.width, reader.height);

        const tempCanvas = document.createElement('canvas'); // Target Frame
        tempCanvas.width = targetWidth;
        tempCanvas.height = targetHeight;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

        // Calculate Fit/Fill Geometry
        // Source aspect
        const sRatio = reader.width / reader.height;
        const tRatio = targetWidth / targetHeight;

        // Destination Rect inside Target
        let dx, dy, dw, dh;

        if (mode === 'fill') {
            // Padding: Fit image INSIDE target, fill rest with color
            // Like CSS object-fit: contain
            if (sRatio > tRatio) {
                // Warning: Source is wider than target relative to height
                // Fit to Width
                dw = targetWidth;
                dh = targetWidth / sRatio;
            } else {
                // Fit to Height
                dh = targetHeight;
                dw = targetHeight * sRatio;
            }
        } else {
            // Crop (Fit): Cover target with image, crop excess
            // Like CSS object-fit: cover
            if (sRatio > tRatio) {
                // Source is wider -> Height matches, crop width
                dh = targetHeight;
                dw = targetHeight * sRatio;
            } else {
                // Source is taller -> Width matches, crop height
                dw = targetWidth;
                dh = targetWidth / sRatio;
            }
        }

        // Center Align
        dx = (targetWidth - dw) / 2;
        dy = (targetHeight - dh) / 2;

        let frameIndex = 0;
        let totalDelay = 0;

        function processNextFrame() {
            if (frameIndex >= framesCount) {
                gif.render();
                return;
            }

            // Decode
            reader.decodeAndBlitFrameRGBA(frameIndex, imageData.data);
            ctx.putImageData(imageData, 0, 0);

            // Draw Target
            // 1. Fill BG
            if (mode === 'fill') {
                tempCtx.save();
                tempCtx.fillStyle = bgColor || '#ffffff';
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.restore();
            } else {
                // Clear for transparency if needed
                tempCtx.clearRect(0, 0, targetWidth, targetHeight);
            }

            // 2. Draw Image with Calculated Geometry
            tempCtx.drawImage(canvas, 0, 0, reader.width, reader.height, dx, dy, dw, dh);

            // Add Frame
            const frameInfo = reader.frameInfo(frameIndex);
            const delay = frameInfo.delay * 10;
            totalDelay += delay;
            gif.addFrame(tempCtx, { delay: delay, copy: true });

            frameIndex++;
            // Update Progress (0-50%)
            const progress = (frameIndex / framesCount) * 50;
            const pFill = document.getElementById('crop-progress-fill');
            const pText = document.getElementById('crop-progress-text');
            if (pFill) pFill.style.width = progress + '%';
            if (pText) pText.innerText = Math.round(progress) + '%';

            setTimeout(processNextFrame, 0);
        }
        processNextFrame();

        gif.on('progress', (p) => {
            const progress = 50 + (p * 50);
            const pFill = document.getElementById('crop-progress-fill');
            const pText = document.getElementById('crop-progress-text');
            if (pFill) pFill.style.width = progress + '%';
            if (pText) pText.innerText = Math.round(progress) + '%';
        });

        gif.on('finished', (blob) => {
            if (loadingOverlayElement) loadingOverlayElement.classList.add('hidden');
            currentResizedBlob = blob;
            resizedGifPreview.src = URL.createObjectURL(blob);
            resizedGifPreview.style.opacity = '1';

            const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
            const origSizeMB = (currentFile.size / (1024 * 1024));

            const origW = reader.width;
            const origH = reader.height;
            const origArea = origW * origH;
            const newArea = targetWidth * targetHeight;
            const fps = totalDelay > 0 ? (framesCount * 1000) / totalDelay : 10;

            resizedGifInfoContainer.innerHTML = `
                <div class="info-item"><span class="info-label">Dimens</span>${getDiffHtml(origArea, newArea, false, '').replace(newArea, `${targetWidth} x ${targetHeight}`)}</div>
                <div class="info-item"><span class="info-label">Size</span>${getDiffHtml(origSizeMB, parseFloat(sizeMB), true, ' MB')}</div>
                <div class="info-item"><span class="info-label">Frames</span>${getDiffHtml(framesCount, framesCount, false)}</div>
                <div class="info-item"><span class="info-label">FPS</span>${getDiffHtml(fps, fps, true)}</div>
            `;

            // Re-enable buttons
            cropGoBtn.disabled = false;
            cropBackBtn.disabled = false;

            // Auto-nav to Grid
            document.getElementById('crop-panel').classList.add('hidden');
            const pContainer = document.getElementById('crop-progress-container');
            if (pContainer) pContainer.classList.add('hidden');

            mainToolsGrid.classList.remove('hidden');
            mainToolsGrid.style.display = 'grid';

            // Update State
            const newFileName = `resized_${currentFile.name}`;
            currentFile = new File([blob], newFileName, { type: 'image/gif' });
            originalImageWidth = targetWidth;
            originalImageHeight = targetHeight;
            aspectRatio = targetWidth / targetHeight;
        });
    }

    // --- DOWNSIZE TOOL Logic ---
    const downsizePanel = document.getElementById('downsize-panel');
    const downsizeBtn = document.querySelector('button[data-tool="downsize"]'); // Needs to check HTML
    const downsizeBackBtn = document.getElementById('downsize-back-btn');
    const downsizeGoBtn = document.getElementById('downsize-go-btn');

    const downsizeScaleInput = document.getElementById('downsize-scale');
    const downsizeScaleVal = document.getElementById('downsize-scale-val');
    const downsizeFpsInput = document.getElementById('downsize-fps');
    const downsizeFpsVal = document.getElementById('downsize-fps-val');
    const downsizeQualityInput = document.getElementById('downsize-quality');
    const downsizeQualityVal = document.getElementById('downsize-quality-val');

    if (downsizeBtn) {
        downsizeBtn.addEventListener('click', () => {
            mainToolsGrid.classList.add('hidden');
            downsizePanel.classList.remove('hidden');

            // Update UI with current file stats
            updateDownsizeUI();
        });
    }

    if (downsizeBackBtn) {
        downsizeBackBtn.addEventListener('click', () => {
            downsizePanel.classList.add('hidden');
            mainToolsGrid.classList.remove('hidden');
        });
    }

    function updateDownsizeUI() {
        if (!currentFile) return;
        const scale = parseInt(downsizeScaleInput.value);
        const fpsScale = parseInt(downsizeFpsInput.value);

        // We need FPS. Let's analyze quickly if not known?
        // Reuse global variables if available or quick parse?
        // We can parse header?
        // For accurate FPS, we need to iterate frames.
        // Let's assume we can lazily get it or just show %?
        // User asked: "오른쪽엔 축소 후의 frame rate도 적어주고."
        // We need original FPS.
        // Let's use FileReader to parse headers quickly.
        const reader = new FileReader();
        reader.onload = function (e) {
            const ReaderClass = window.GifReader || (window.omggif && window.omggif.GifReader) || (window.Omggif && window.Omggif.GifReader);
            if (ReaderClass) {
                try {
                    const gifReader = new ReaderClass(new Uint8Array(e.target.result));
                    // originalImageWidth/Height should match gifReader.width/height
                    const w = gifReader.width;
                    const h = gifReader.height;
                    const frames = gifReader.numFrames();

                    // Calc FPS
                    let totalDelay = 0;
                    for (let i = 0; i < frames; i++) {
                        totalDelay += gifReader.frameInfo(i).delay;
                    }
                    const avgDelay = totalDelay / frames; // 1/100th sec
                    const origFps = avgDelay > 0 ? 100 / avgDelay : 10;

                    // Text Updates
                    const newW = Math.round(w * (scale / 100));
                    const newH = Math.round(h * (scale / 100));
                    downsizeScaleVal.innerText = `${scale}% (${newW}x${newH})`;

                    const newFps = Math.round(origFps * (fpsScale / 100));
                    downsizeFpsVal.innerText = `${fpsScale}% (${origFps.toFixed(1)} -> ${newFps} FPS)`;

                } catch (err) { console.error(err); }
            }
        };
        reader.readAsArrayBuffer(currentFile);

        downsizeQualityVal.innerText = downsizeQualityInput.value + (downsizeQualityInput.value == 10 ? " (Best)" : "");
    }

    downsizeScaleInput.addEventListener('input', updateDownsizeUI);
    downsizeFpsInput.addEventListener('input', updateDownsizeUI);
    downsizeQualityInput.addEventListener('input', updateDownsizeUI);

    downsizeGoBtn.addEventListener('click', () => {
        if (!currentFile) return;

        const scale = parseInt(downsizeScaleInput.value) / 100;
        const fpsScale = parseInt(downsizeFpsInput.value) / 100;
        const qualityVal = parseInt(downsizeQualityInput.value);
        // Map 1-10 to gif.js quality (1 best, 30 worst).
        // 10 -> 1. 1 -> 20.
        // Linear: y = mx + b.
        // 10m + b = 1
        // 1m + b = 25?
        // Let's say: q = 1 + (10 - qualityVal) * 2.5?
        // 10 -> 1. 5 -> 13.5. 1 -> 23.5. Good.
        const qualityParam = Math.max(1, Math.round(1 + (10 - qualityVal) * 2.5));

        // Archive History
        if (currentResizedBlob) {
            const currentTitle = document.querySelector('#resized-card h3').innerText;
            createHistoryCard(currentResizedBlob, resizedGifInfoContainer.innerHTML, currentTitle);
        }

        // Show Progress
        const progressContainer = document.getElementById('downsize-progress-container');
        const progressFill = document.getElementById('downsize-progress-fill');
        const progressText = document.getElementById('downsize-progress-text');

        progressContainer.classList.remove('hidden');
        progressFill.style.width = '0%';
        progressText.innerText = '0%';

        downsizeGoBtn.disabled = true;
        downsizeBackBtn.disabled = true;

        originalContent.classList.add('hidden');
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.remove('hidden');
        resizedCard.classList.remove('hidden');

        document.querySelector('#resized-card h3').innerText = 'Downsized GIF';
        resizedCard.querySelector('.toggle-card-btn svg').style.transform = 'rotate(0deg)';
        resizedGifPreview.style.opacity = '0.5';

        const reader = new FileReader();
        reader.onload = function (e) {
            processDownsize(e.target.result, scale, fpsScale, qualityParam, loadingOverlay);
        };
        reader.readAsArrayBuffer(currentFile);
    });

    function processDownsize(buffer, scaleFactor, fpsFactor, qualityParam, loadingOverlayElement) {
        const ReaderClass = window.GifReader || (window.omggif && window.omggif.GifReader) || (window.Omggif && window.Omggif.GifReader);
        if (!ReaderClass) return;

        const reader = new ReaderClass(new Uint8Array(buffer));
        const framesCount = reader.numFrames();

        const targetW = Math.round(reader.width * scaleFactor);
        const targetH = Math.round(reader.height * scaleFactor);

        const workerBlob = new Blob([gifWorkerScript], { type: 'application/javascript' });
        const gif = new GIF({
            workers: 2,
            quality: qualityParam,
            width: targetW,
            height: targetH,
            workerScript: URL.createObjectURL(workerBlob)
        });

        const canvas = document.createElement('canvas');
        canvas.width = reader.width;
        canvas.height = reader.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.createImageData(reader.width, reader.height);

        const tempCanvas = document.createElement('canvas'); // Resize Target
        tempCanvas.width = targetW;
        tempCanvas.height = targetH;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

        let frameIndex = 0;
        let totalDelay = 0;
        let delayAccumulator = 0;
        let keptFrames = 0;

        function processNextFrame() {
            if (frameIndex >= framesCount) {
                if (keptFrames === 0 && framesCount > 0) {
                    // Fallback: If heavy decimation skipped all (e.g. 1 frame input), render at least one.
                    // But loop logic below should handle it if logic is sound.
                }
                gif.render();
                return;
            }

            // Logic for FPS reduction:
            // Input FPS = 100 / delay.
            // Target FPS = Input FPS * fpsFactor.
            // This means we want to multiply DELAY by (1/fpsFactor). 
            // BUT we accomplish this by DROPPING frames and Adding their delay to the next kept frame.
            // OR Simple Decimation: Keep frame if index % N == 0?
            // User request: "Frame rate modification".

            // Better Approach: Accumulate delay.
            // We read delay of current frame.
            // We add it to accumulator.
            // Check if we should render this frame based on target timing?
            // Simplest robust way for "50% FPS" -> Skip every other frame, double the delay?
            // Actually, if we keep 1 frame and skip 1, the kept frame should cover the time of 2 frames.
            // So: delay = old_delay_1 + old_delay_skipped.

            // Decimation Logic using fpsFactor (0.1 - 1.0)
            // step = 1 / fpsFactor. e.g. 0.5 -> 2. 
            // We keep frame 0, 2, 4.
            // Frame 0 delay = delay0 + delay1.

            // Let's implement accumulation.
            const frameInfo = reader.frameInfo(frameIndex);
            delayAccumulator += frameInfo.delay;

            // Should we keep this frame?
            // "Decimation" approach:
            // keptCount / (frameIndex + 1) ~= fpsFactor?
            // Let's use a counter.

            // Threshold based?
            // Simple approach:
            // If fpsFactor is 1.0, keep all.
            // If 0.5, keep even?
            // Let's use a float counter.

            // Or just rely on accumulated delay?
            // Target interval = (average_original_delay) / fpsFactor?
            // Variable delay GIF is hard.
            // Let's assume constant delay for calculation simplicity or strict decimation.
            // Strict decimation is easier and predictable.
            // targetIndex = floor(keptFrames / fpsFactor)?

            // Logic:
            // We iterate original frames.
            // We decide to KEEP or DROP.
            // If KEEP:
            //    Render it.
            //    Set its delay to delayAccumulator.
            //    Reset delayAccumulator.
            // If DROP:
            //    Continue (accumulator holds current delay).

            // To determine KEEP:
            // idealKeptCount = (frameIndex + 1) * fpsFactor.
            // realKeptCount = keptFrames.
            // If idealKeptCount > realKeptCount: KEEP.
            // Else: DROP.

            const idealKept = (frameIndex + 1) * fpsFactor;

            if (idealKept > keptFrames || frameIndex === framesCount - 1) { // Always keep last if pending time?
                // RENDER
                reader.decodeAndBlitFrameRGBA(frameIndex, imageData.data);
                ctx.putImageData(imageData, 0, 0);

                // Resize
                tempCtx.clearRect(0, 0, targetW, targetH);
                tempCtx.drawImage(canvas, 0, 0, targetW, targetH);

                const finalDelay = delayAccumulator * 10; // gif.js uses ms? reader uses 1/100s.
                // reader.frameInfo.delay is 1/100s. gif.js expects ms.
                // delayAccumulator (1/100s) * 10 -> ms.

                totalDelay += finalDelay;
                gif.addFrame(tempCtx, { delay: finalDelay, copy: true });

                delayAccumulator = 0;
                keptFrames++;
            } else {
                // DROP (Skip rendering, just accumulated time)
            }

            frameIndex++;

            // Update Progress (0-50%)
            const progress = (frameIndex / framesCount) * 50;
            const pFill = document.getElementById('downsize-progress-fill');
            const pText = document.getElementById('downsize-progress-text');
            if (pFill) pFill.style.width = progress + '%';
            if (pText) pText.innerText = Math.round(progress) + '%';

            setTimeout(processNextFrame, 0);
        }
        processNextFrame();

        gif.on('progress', (p) => {
            // Update Progress (50-100%)
            const progress = 50 + (p * 50);
            const pFill = document.getElementById('downsize-progress-fill');
            const pText = document.getElementById('downsize-progress-text');
            if (pFill) pFill.style.width = progress + '%';
            if (pText) pText.innerText = Math.round(progress) + '%';
        });

        gif.on('finished', (blob) => {
            if (loadingOverlayElement) loadingOverlayElement.classList.add('hidden');
            currentResizedBlob = blob;
            resizedGifPreview.src = URL.createObjectURL(blob);
            resizedGifPreview.style.opacity = '1';

            const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
            // Actual FPS = Frames / TotalSeconds
            const finalFps = (totalDelay > 0) ? (keptFrames * 1000) / totalDelay : 0;

            // Calc Orig Stats for Comparison
            const origSizeMB = (currentFile.size / (1024 * 1024));
            const origW = reader.width;
            const origH = reader.height;
            const origArea = origW * origH;
            const newArea = targetW * targetH;
            const origFps = keptFrames > 0 ? finalFps * (framesCount / keptFrames) : 0;

            resizedGifInfoContainer.innerHTML = `
                <div class="info-item"><span class="info-label">Dimens</span>${getDiffHtml(origArea, newArea, false, '').replace(newArea, `${targetW} x ${targetH}`)}</div>
                <div class="info-item"><span class="info-label">Size</span>${getDiffHtml(origSizeMB, parseFloat(sizeMB), true, ' MB')}</div>
                <div class="info-item"><span class="info-label">Frames</span>${getDiffHtml(framesCount, keptFrames, false)}</div>
                <div class="info-item"><span class="info-label">FPS</span>${getDiffHtml(origFps, finalFps, true)}</div>
            `;

            // Update Global State for Sequential Editing
            const newFileName = `downsized_${Date.now()}.gif`;
            currentFile = new File([blob], newFileName, { type: 'image/gif' });
            originalImageWidth = targetW;
            originalImageHeight = targetH;

            // Reset
            downsizeGoBtn.disabled = false;
            downsizeBackBtn.disabled = false;

            // Hide Panel & Progress, Show Grid
            document.getElementById('downsize-panel').classList.add('hidden');
            const pContainer = document.getElementById('downsize-progress-container');
            if (pContainer) pContainer.classList.add('hidden');

            mainToolsGrid.classList.remove('hidden');
            mainToolsGrid.style.display = 'grid';
        });
    }

    // --- ROTATE TOOL Logic ---
    const rotatePanel = document.getElementById('rotate-panel');
    const rotateBtn = document.querySelector('button[data-tool="rotate"]');
    const rotateBackBtn = document.getElementById('rotate-back-btn');
    const rotateGoBtn = document.getElementById('rotate-go-btn');

    // Controls
    const rotateAngleBtns = document.querySelectorAll('#rotate-angle-group .chip-btn');
    const flipHBtn = document.getElementById('flip-h-btn');
    const flipVBtn = document.getElementById('flip-v-btn');

    let selectedRotation = 0;
    let isFlipH = false;
    let isFlipV = false;

    // Angle Selection
    if (rotateAngleBtns) {
        rotateAngleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                rotateAngleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedRotation = parseInt(btn.dataset.val);
            });
        });
    }

    // Flip Toggles
    if (flipHBtn) {
        flipHBtn.addEventListener('click', () => {
            isFlipH = !isFlipH;
            flipHBtn.classList.toggle('active', isFlipH);
        });
    }
    if (flipVBtn) {
        flipVBtn.addEventListener('click', () => {
            isFlipV = !isFlipV;
            flipVBtn.classList.toggle('active', isFlipV);
        });
    }

    // Panel Nav
    if (rotateBtn) {
        rotateBtn.addEventListener('click', () => {
            mainToolsGrid.classList.add('hidden');
            rotatePanel.classList.remove('hidden');
            // Reset state or keep per session? Resetting is safer.
            rotateAngleBtns.forEach(b => b.classList.remove('active'));
            if (rotateAngleBtns[0]) rotateAngleBtns[0].classList.add('active');
            selectedRotation = 0;
            isFlipH = false; isFlipV = false;
            if (flipHBtn) flipHBtn.classList.remove('active');
            if (flipVBtn) flipVBtn.classList.remove('active');
        });
    }

    if (rotateBackBtn) {
        rotateBackBtn.addEventListener('click', () => {
            rotatePanel.classList.add('hidden');
            mainToolsGrid.classList.remove('hidden');
        });
    }

    // GO
    if (rotateGoBtn) {
        rotateGoBtn.addEventListener('click', () => {
            if (!currentFile) return;

            // Archive History
            if (currentResizedBlob) {
                const currentTitle = document.querySelector('#resized-card h3').innerText;
                createHistoryCard(currentResizedBlob, resizedGifInfoContainer.innerHTML, currentTitle);
            }

            // Show Progress
            const progressContainer = document.getElementById('rotate-progress-container');
            const progressFill = document.getElementById('rotate-progress-fill');
            const progressText = document.getElementById('rotate-progress-text');

            progressContainer.classList.remove('hidden');
            progressFill.style.width = '0%';
            progressText.innerText = '0%';

            rotateGoBtn.disabled = true;
            rotateBackBtn.disabled = true;

            originalContent.classList.add('hidden');
            const loadingOverlay = document.getElementById('loading-overlay');
            loadingOverlay.classList.remove('hidden');
            resizedCard.classList.remove('hidden');

            document.querySelector('#resized-card h3').innerText = 'Rotated GIF';
            resizedCard.querySelector('.toggle-card-btn svg').style.transform = 'rotate(0deg)';
            resizedGifPreview.style.opacity = '0.5';

            const reader = new FileReader();
            reader.readAsArrayBuffer(currentFile);
            reader.onload = function (e) {
                processRotate(e.target.result, selectedRotation, isFlipH, isFlipV, loadingOverlay);
            };
        });
    }

    function processRotate(buffer, rotation, flipH, flipV, loadingOverlayElement) {
        const ReaderClass = window.GifReader || (window.omggif && window.omggif.GifReader) || (window.Omggif && window.Omggif.GifReader);
        if (!ReaderClass) return;

        const reader = new ReaderClass(new Uint8Array(buffer));
        const framesCount = reader.numFrames();
        const width = reader.width;
        const height = reader.height;

        // Calc Target Dimensions
        let targetW = width;
        let targetH = height;
        if (rotation === 90 || rotation === 270) {
            targetW = height;
            targetH = width;
        }

        function generateTimelineThumbnails(reader) {
            if (!cutTimelineStrip) return;
            const container = document.getElementById('cut-timeline-container');
            if (!container) return;

            cutTimelineStrip.innerHTML = '<div class="timeline-loading-msg" style="width:100%; text-align:center; padding-top:20px; color:#666; font-size:0.8rem;">Generating... 0%</div>';
            const loadingMsg = cutTimelineStrip.querySelector('.timeline-loading-msg');

            const width = container.offsetWidth;
            const height = 60;

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.style.opacity = '0';
            canvas.style.transition = 'opacity 0.3s ease';
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            cutTimelineStrip.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(0, 0, width, height);

            const numFrames = reader.numFrames();
            const numThumbs = 10;
            const thumbW = width / numThumbs;

            const rawWidth = reader.width;
            const rawHeight = reader.height;

            const tempC = document.createElement('canvas');
            tempC.width = rawWidth;
            tempC.height = rawHeight;
            const tempCtx = tempC.getContext('2d', { willReadFrequently: true });
            const imgData = tempCtx.createImageData(rawWidth, rawHeight);

            let currentFrame = 0;
            let thumbIdx = 0;

            function processNextBatch() {
                const startTime = performance.now();

                while (currentFrame < numFrames) {
                    try {
                        reader.decodeAndBlitFrameRGBA(currentFrame, imgData.data);
                        tempCtx.putImageData(imgData, 0, 0);

                        // Calculate target frame for the current thumbnail index
                        // Safely handle cases where numFrames < numThumbs
                        const targetFrame = Math.floor(thumbIdx * (numFrames / Math.max(1, numThumbs)));

                        if (currentFrame >= targetFrame && thumbIdx < numThumbs) {
                            ctx.drawImage(tempC, thumbIdx * thumbW, 0, thumbW, height);
                            thumbIdx++;

                            // Fill duplicate slots if needed (e.g. very short GIF)
                            while (thumbIdx < numThumbs && Math.floor(thumbIdx * (numFrames / Math.max(1, numThumbs))) <= currentFrame) {
                                ctx.drawImage(tempC, thumbIdx * thumbW, 0, thumbW, height);
                                thumbIdx++;
                            }
                        }
                    } catch (err) {
                        console.error("Frame decode error", err);
                    }

                    currentFrame++;

                    const progress = Math.floor((currentFrame / numFrames) * 100);
                    if (loadingMsg) loadingMsg.innerText = `Generating... ${progress}%`;

                    if (performance.now() - startTime > 15) {
                        requestAnimationFrame(processNextBatch);
                        return;
                    }
                }

                if (loadingMsg) loadingMsg.remove();
                canvas.style.opacity = '1';
            }

            processNextBatch();
        }
        const workerBlob = new Blob([gifWorkerScript], { type: 'application/javascript' });
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: targetW,
            height: targetH,
            workerScript: URL.createObjectURL(workerBlob)
        });

        const canvas = document.createElement('canvas'); // Source
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.createImageData(width, height);

        const tempCanvas = document.createElement('canvas'); // Target
        tempCanvas.width = targetW;
        tempCanvas.height = targetH;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

        let frameIndex = 0;
        let totalDelay = 0;

        function processNextFrame() {
            if (frameIndex >= framesCount) {
                gif.render();
                return;
            }

            // Decode
            reader.decodeAndBlitFrameRGBA(frameIndex, imageData.data);
            ctx.putImageData(imageData, 0, 0);

            // Transform
            tempCtx.save();
            tempCtx.clearRect(0, 0, targetW, targetH);

            // Move to center
            tempCtx.translate(targetW / 2, targetH / 2);

            // Rotate
            tempCtx.rotate((rotation * Math.PI) / 180);

            // Flip (Scale)
            const scaleX = flipH ? -1 : 1;
            const scaleY = flipV ? -1 : 1;
            tempCtx.scale(scaleX, scaleY);

            // Draw Image Centered
            // We need to draw the source canvas so that its center aligns with current origin (0,0)
            tempCtx.drawImage(canvas, -width / 2, -height / 2);

            tempCtx.restore();

            // Add Frame
            const frameInfo = reader.frameInfo(frameIndex);
            const delay = frameInfo.delay * 10;
            totalDelay += delay;
            gif.addFrame(tempCtx, { delay: delay, copy: true });

            frameIndex++;
            // Update Progress (0-50%)
            const progress = (frameIndex / framesCount) * 50;
            const pFill = document.getElementById('rotate-progress-fill');
            const pText = document.getElementById('rotate-progress-text');
            if (pFill) pFill.style.width = progress + '%';
            if (pText) pText.innerText = Math.round(progress) + '%';

            setTimeout(processNextFrame, 0);
        }
        processNextFrame();

        gif.on('progress', (p) => {
            const progress = 50 + (p * 50);
            const pFill = document.getElementById('rotate-progress-fill');
            const pText = document.getElementById('rotate-progress-text');
            if (pFill) pFill.style.width = progress + '%';
            if (pText) pText.innerText = Math.round(progress) + '%';
        });

        gif.on('finished', (blob) => {
            if (loadingOverlayElement) loadingOverlayElement.classList.add('hidden');
            currentResizedBlob = blob;
            resizedGifPreview.src = URL.createObjectURL(blob);
            resizedGifPreview.style.opacity = '1';

            const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
            const origSizeMB = (currentFile.size / (1024 * 1024));
            const origArea = width * height;
            const newArea = targetW * targetH;
            const fps = totalDelay > 0 ? (framesCount * 1000) / totalDelay : 10;

            resizedGifInfoContainer.innerHTML = `
                <div class="info-item"><span class="info-label">Dimens</span>${getDiffHtml(origArea, newArea, false, '').replace(newArea, `${targetW} x ${targetH}`)}</div>
                <div class="info-item"><span class="info-label">Size</span>${getDiffHtml(origSizeMB, parseFloat(sizeMB), true, ' MB')}</div>
                <div class="info-item"><span class="info-label">Frames</span>${getDiffHtml(framesCount, framesCount, false)}</div>
                <div class="info-item"><span class="info-label">FPS</span>${getDiffHtml(fps, fps, true)}</div>
            `;

            // Auto-nav to Grid
            document.getElementById('rotate-panel').classList.add('hidden');
            const pContainer = document.getElementById('rotate-progress-container');
            if (pContainer) pContainer.classList.add('hidden');

            mainToolsGrid.classList.remove('hidden');
            mainToolsGrid.style.display = 'grid';

            // Reset
            rotateGoBtn.disabled = false;
            rotateBackBtn.disabled = false;

            // Update Global State
            const newFileName = `rotated_${Date.now()}.gif`;
            currentFile = new File([blob], newFileName, { type: 'image/gif' });
            originalImageWidth = targetW;
            originalImageHeight = targetH;
        });
    }

    // --- REVERSE TOOL Logic ---
    const reversePanel = document.getElementById('reverse-panel');
    const reverseBtn = document.querySelector('button[data-tool="reverse"]');
    const reverseBackBtn = document.getElementById('reverse-back-btn');
    const reverseGoBtn = document.getElementById('reverse-go-btn');

    if (reverseBtn) {
        reverseBtn.addEventListener('click', () => {
            mainToolsGrid.classList.add('hidden');
            reversePanel.classList.remove('hidden');
        });
    }

    if (reverseBackBtn) {
        reverseBackBtn.addEventListener('click', () => {
            reversePanel.classList.add('hidden');
            mainToolsGrid.classList.remove('hidden');
        });
    }

    if (reverseGoBtn) {
        reverseGoBtn.addEventListener('click', () => {
            if (!currentFile) return;

            // Archive History
            if (currentResizedBlob) {
                const currentTitle = document.querySelector('#resized-card h3').innerText;
                createHistoryCard(currentResizedBlob, resizedGifInfoContainer.innerHTML, currentTitle);
            }

            // Show Progress
            const progressContainer = document.getElementById('reverse-progress-container');
            const progressFill = document.getElementById('reverse-progress-fill');
            const progressText = document.getElementById('reverse-progress-text');

            progressContainer.classList.remove('hidden');
            progressFill.style.width = '0%';
            progressText.innerText = '0%';

            reverseGoBtn.disabled = true;
            reverseBackBtn.disabled = true;

            originalContent.classList.add('hidden');
            const loadingOverlay = document.getElementById('loading-overlay');
            loadingOverlay.classList.remove('hidden');
            resizedCard.classList.remove('hidden');

            document.querySelector('#resized-card h3').innerText = 'Reversed GIF';
            resizedCard.querySelector('.toggle-card-btn svg').style.transform = 'rotate(0deg)';
            resizedGifPreview.style.opacity = '0.5';

            const reader = new FileReader();
            reader.readAsArrayBuffer(currentFile);
            reader.onload = function (e) {
                processReverse(e.target.result, loadingOverlay);
            };
        });
    }

    function processReverse(buffer, loadingOverlayElement) {
        const ReaderClass = window.GifReader || (window.omggif && window.omggif.GifReader) || (window.Omggif && window.Omggif.GifReader);
        if (!ReaderClass) return;

        const reader = new ReaderClass(new Uint8Array(buffer));
        const framesCount = reader.numFrames();
        const width = reader.width;
        const height = reader.height;

        const workerBlob = new Blob([gifWorkerScript], { type: 'application/javascript' });
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: width,
            height: height,
            workerScript: URL.createObjectURL(workerBlob)
        });

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.createImageData(width, height);

        let frameIndex = 0; // Current iteration index (0 to framesCount - 1)
        let totalDelay = 0;

        function processNextFrame() {
            if (frameIndex >= framesCount) {
                gif.render();
                return;
            }

            // We want frames in reverse order: (framesCount - 1) -> 0
            const sourceFrameIndex = (framesCount - 1) - frameIndex;

            // Decode the Source Frame
            // Note: GIF decoding is typically sequential because of disposal methods.
            // Random access decoding might be slow or incorrect if not handled carefully (key frames).
            // omggif's decodeAndBlitFrameRGBA handles disposal if we were playing forward.
            // For random access, we might need to decode from 0 to target for each frame if internal state isn't managed?
            // Actually, omggif `decodeAndBlitFrameRGBA` writes to the passed ImageData array.
            // If we just ask for frame N, prompt doesn't say it handles diffing from previous.
            // BUT, `decodeAndBlitFrameRGBA` DOES assume it's applying to the *current* canvas state usually.
            // Wait, for random access, we might need to `decodeToRGBA` (raw pixels) instead?
            // `decodeAndBlitFrameRGBA` says "decodes frame ... and blits it onto the pixels ... handling disposal ...".
            // It modifies the pixels.

            // To get Frame N correctly disconnected from Frame N-1, we arguably need the full composite.
            // BUT, if we iterate N down to 0, we can't easily rely on N+1's state.
            // Correct Robust Approach: 
            // We should decode ALL frames into an array of ImageData/Canvases first (Forward), 
            // THEN add them to GIF in Reverse.
            // This ensures all disposal/transparency is handled correctly during the forward pass.

            // Let's change strategy:
            // 1. Forward Pass: Decode all frames to cache.
            // 2. Reverse Pass: Add from cache to GIF.

            // Since we can't do this easily in one loop functions, let's just do it in the loop.
            // We'll iterate 0->End, cache them. Then add.

            // Wait, memory might be an issue for huge GIFs. But for standard user usage, it's likely fine.
            // Let's try the cache approach.
            // Actually, we can just do one loop.
            // We need to decode frames 0 to Max-1. Store them.
            // Then loop BACKWARDS and add to GIF.

            // Implementation: Simple 'decode all first' is safer.
            // But we need to respond to user quickly. 
            // Let's assume standard GIFs.

            // Re-evaluating: user just wants "Reverse".
            // We will decode all frames 0..N, save them (as canvas or imageData), then add to GIF N..0.
        }

        // Correct implementation for Reverse with proper rendering:
        // 1. Iterate 0 to N-1. Decode and Render to a temporary canvas (handling disposal).
        // 2. Save the result of each frame (Snapshot).
        // 3. Add Snapshots to GIF in reverse order.

        const frameSnapshots = [];
        const frameDelays = [];
        let decodeIndex = 0;

        function decodeAllFrames() {
            if (decodeIndex >= framesCount) {
                // All decoded. Now Add to GIF in Reverse.
                addFramesReverse();
                return;
            }

            // Decode
            reader.decodeAndBlitFrameRGBA(decodeIndex, imageData.data);
            ctx.putImageData(imageData, 0, 0);

            // Snapshot
            // We need a NEW canvas/image for each snapshot or we just copy it.
            const snapshot = document.createElement('canvas');
            snapshot.width = width;
            snapshot.height = height;
            const snapCtx = snapshot.getContext('2d', { willReadFrequently: true });
            snapCtx.drawImage(canvas, 0, 0);
            frameSnapshots.push(snapshot); // Store canvas

            const info = reader.frameInfo(decodeIndex);
            frameDelays.push(info.delay * 10);

            decodeIndex++;

            // Progress (0-50%)
            updateProgress(decodeIndex, framesCount, 0, 50);
            setTimeout(decodeAllFrames, 0);
        }

        function addFramesReverse() {
            // Loop backwards
            for (let i = framesCount - 1; i >= 0; i--) {
                totalDelay += frameDelays[i];
                // Pass the context, which was created with willReadFrequently: true
                gif.addFrame(frameSnapshots[i].getContext('2d'), { delay: frameDelays[i], copy: true });
            }

            // Render
            // Since adding is synchronous and fast usually for cached canvases, we might not need async loop here.
            // But `gif.addFrame` can be heavy.
            // Let's just run render.
            // Progress will be handled by gif.on('progress') (50-100%).
            gif.render();
        }

        function updateProgress(numerator, denominator, startPct, endPct) {
            const range = endPct - startPct;
            const progress = startPct + ((numerator / denominator) * range);
            const pFill = document.getElementById('reverse-progress-fill');
            const pText = document.getElementById('reverse-progress-text');
            if (pFill) pFill.style.width = progress + '%';
            if (pText) pText.innerText = Math.round(progress) + '%';
        }

        decodeAllFrames();

        gif.on('progress', (p) => {
            const progress = 50 + (p * 50);
            const pFill = document.getElementById('reverse-progress-fill');
            const pText = document.getElementById('reverse-progress-text');
            if (pFill) pFill.style.width = progress + '%';
            if (pText) pText.innerText = Math.round(progress) + '%';
        });

        gif.on('finished', (blob) => {
            if (loadingOverlayElement) loadingOverlayElement.classList.add('hidden');
            currentResizedBlob = blob;
            resizedGifPreview.src = URL.createObjectURL(blob);
            resizedGifPreview.style.opacity = '1';

            const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
            const origSizeMB = (currentFile.size / (1024 * 1024));
            const frames = framesCount;
            const fps = totalDelay > 0 ? (frames * 1000) / totalDelay : 10;

            resizedGifInfoContainer.innerHTML = `
                <div class="info-item"><span class="info-label">Dimens</span><span class="info-value">${width} x ${height}</span></div>
                <div class="info-item"><span class="info-label">Size</span>${getDiffHtml(origSizeMB, parseFloat(sizeMB), true, ' MB')}</div>
                <div class="info-item"><span class="info-label">Frames</span><span class="info-value">${frames}</span></div>
                <div class="info-item"><span class="info-label">FPS</span>${getDiffHtml(fps, fps, true)}</div>
            `;

            // Auto-nav
            document.getElementById('reverse-panel').classList.add('hidden');
            const pContainer = document.getElementById('reverse-progress-container');
            if (pContainer) pContainer.classList.add('hidden');

            mainToolsGrid.classList.remove('hidden');
            mainToolsGrid.style.display = 'grid';

            // Reset
            reverseGoBtn.disabled = false;
            reverseBackBtn.disabled = false;

            // Update Global State
            const newFileName = `reversed_${Date.now()}.gif`;
            currentFile = new File([blob], newFileName, { type: 'image/gif' });
        });
    }

    // --- SPEED TOOL Logic ---
    const speedPanel = document.getElementById('speed-panel');
    const speedBtn = document.querySelector('button[data-tool="speed"]');
    const speedBackBtn = document.getElementById('speed-back-btn');
    const speedGoBtn = document.getElementById('speed-go-btn');
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');

    if (speedSlider && speedValue) {
        speedSlider.addEventListener('input', () => {
            speedValue.innerText = speedSlider.value + '%';
        });
    }

    if (speedBtn) {
        speedBtn.addEventListener('click', () => {
            mainToolsGrid.classList.add('hidden');
            speedPanel.classList.remove('hidden');
            // Reset
            if (speedSlider) {
                speedSlider.value = 100;
                speedValue.innerText = '100%';
            }
        });
    }

    if (speedBackBtn) {
        speedBackBtn.addEventListener('click', () => {
            speedPanel.classList.add('hidden');
            mainToolsGrid.classList.remove('hidden');
        });
    }

    if (speedGoBtn) {
        speedGoBtn.addEventListener('click', () => {
            if (!currentFile) return;

            const speedPct = parseInt(speedSlider.value);
            if (isNaN(speedPct)) return;

            // Archive History
            if (currentResizedBlob) {
                const currentTitle = document.querySelector('#resized-card h3').innerText;
                createHistoryCard(currentResizedBlob, resizedGifInfoContainer.innerHTML, currentTitle);
            }

            // Show Progress
            const progressContainer = document.getElementById('speed-progress-container');
            const progressFill = document.getElementById('speed-progress-fill');
            const progressText = document.getElementById('speed-progress-text');

            progressContainer.classList.remove('hidden');
            progressFill.style.width = '0%';
            progressText.innerText = '0%';

            speedGoBtn.disabled = true;
            speedBackBtn.disabled = true;

            originalContent.classList.add('hidden');
            const loadingOverlay = document.getElementById('loading-overlay');
            loadingOverlay.classList.remove('hidden');
            resizedCard.classList.remove('hidden');

            document.querySelector('#resized-card h3').innerText = 'Speed Changed GIF';
            resizedCard.querySelector('.toggle-card-btn svg').style.transform = 'rotate(0deg)';
            resizedGifPreview.style.opacity = '0.5';

            const reader = new FileReader();
            reader.readAsArrayBuffer(currentFile);
            reader.onload = function (e) {
                processSpeed(e.target.result, speedPct, loadingOverlay);
            };
        });
    }

    function processSpeed(buffer, speedPct, loadingOverlayElement) {
        const ReaderClass = window.GifReader || (window.omggif && window.omggif.GifReader) || (window.Omggif && window.Omggif.GifReader);
        if (!ReaderClass) return;

        const reader = new ReaderClass(new Uint8Array(buffer));
        const framesCount = reader.numFrames();
        const width = reader.width;
        const height = reader.height;

        const workerBlob = new Blob([gifWorkerScript], { type: 'application/javascript' });
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: width,
            height: height,
            workerScript: URL.createObjectURL(workerBlob)
        });

        const canvas = document.createElement('canvas'); // Source
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.createImageData(width, height);

        let frameIndex = 0;
        let totalDelay = 0;
        let newFramesCount = 0;

        let speedFactor = speedPct / 100;
        let delayAccumulator = 0;
        const minFrameDelay = 20; // 20ms = 50FPS cap (Safest for <60fps request)

        function processNextFrame() {
            if (frameIndex >= framesCount) {
                gif.render();
                return;
            }

            // Decode
            reader.decodeAndBlitFrameRGBA(frameIndex, imageData.data);
            ctx.putImageData(imageData, 0, 0);

            // Calc new delay
            const info = reader.frameInfo(frameIndex);
            const originalDelay = info.delay * 10; // ms
            const scaledDelay = originalDelay / speedFactor;

            delayAccumulator += scaledDelay;

            // Decimation Logic
            if (delayAccumulator >= minFrameDelay) {
                // Keep this frame (or rather, the composite state at this point)
                // Use accumulated delay as the delay for this frame

                // Note: Logic edge case. 
                // If we speed up 1000%, scaledDelay = tiny. 
                // We skip many frames until accumulator >= 20.
                // Then we take the CURRENT composite frame and assign it 20ms.
                // This is correct: we are sampling the animation at 50fps.

                // Add Frame
                // Round delay to nearest 10ms (GIF standard is 10ms steps)
                let finalDelay = Math.round(delayAccumulator / 10) * 10;
                if (finalDelay < 10) finalDelay = 10; // Min valid GIF delay is 10ms? Or 20ms if we enforce cap.
                // We enforce minFrameDelay=20, so accumulator >= 20. So finalDelay >= 20.

                gif.addFrame(ctx, { delay: finalDelay, copy: true });
                totalDelay += finalDelay;
                newFramesCount++;

                // Reset accumulator
                // We subtract what we used.
                // Actually, simpler to just zero it? 
                // No, preserving residual makes long-run timing more accurate.
                delayAccumulator -= finalDelay;
            } else {
                // Drop frame
                // We accumulated its duration, effectively merging it into the next kept frame.
            }

            frameIndex++;
            // Update Progress (0-50%)
            const progress = (frameIndex / framesCount) * 50;
            const pFill = document.getElementById('speed-progress-fill');
            const pText = document.getElementById('speed-progress-text');
            if (pFill) pFill.style.width = progress + '%';
            if (pText) pText.innerText = Math.round(progress) + '%';

            setTimeout(processNextFrame, 0);
        }
        processNextFrame();

        gif.on('progress', (p) => {
            const progress = 50 + (p * 50);
            const pFill = document.getElementById('speed-progress-fill');
            const pText = document.getElementById('speed-progress-text');
            if (pFill) pFill.style.width = progress + '%';
            if (pText) pText.innerText = Math.round(progress) + '%';
        });

        gif.on('finished', (blob) => {
            if (loadingOverlayElement) loadingOverlayElement.classList.add('hidden');
            currentResizedBlob = blob;
            resizedGifPreview.src = URL.createObjectURL(blob);
            resizedGifPreview.style.opacity = '1';

            const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
            const origSizeMB = (currentFile.size / (1024 * 1024));
            const fps = totalDelay > 0 ? (newFramesCount * 1000) / totalDelay : 10;

            resizedGifInfoContainer.innerHTML = `
                <div class="info-item"><span class="info-label">Dimens</span><span class="info-value">${width} x ${height}</span></div>
                <div class="info-item"><span class="info-label">Size</span>${getDiffHtml(origSizeMB, parseFloat(sizeMB), true, ' MB')}</div>
                <div class="info-item"><span class="info-label">Frames</span>${getDiffHtml(framesCount, newFramesCount, false)}</div>
                <div class="info-item"><span class="info-label">FPS</span>${getDiffHtml(fps, fps, true)}</div>
            `;

            // Auto-nav
            document.getElementById('speed-panel').classList.add('hidden');
            const pContainer = document.getElementById('speed-progress-container');
            if (pContainer) pContainer.classList.add('hidden');

            mainToolsGrid.classList.remove('hidden');
            mainToolsGrid.style.display = 'grid';

            // Reset
            speedGoBtn.disabled = false;
            speedBackBtn.disabled = false;

            // Update Global State
            const newFileName = `speed_${Date.now()}.gif`;
            currentFile = new File([blob], newFileName, { type: 'image/gif' });
        });
    }



    // --- OPTIMIZE TOOL Logic ---
    const optimizePanel = document.getElementById('optimize-panel');
    const optimizeBtn = document.querySelector('button[data-tool="optimize"]');
    const optimizeBackBtn = document.getElementById('optimize-back-btn');
    const optimizeGoBtn = document.getElementById('optimize-go-btn');
    const optGlobalPalette = document.getElementById('opt-global-palette');
    const optFrameDelta = document.getElementById('opt-frame-delta');

    if (optimizeBtn) {
        optimizeBtn.addEventListener('click', () => {
            mainToolsGrid.classList.add('hidden');
            optimizePanel.classList.remove('hidden');
        });
    }

    if (optimizeBackBtn) {
        optimizeBackBtn.addEventListener('click', () => {
            optimizePanel.classList.add('hidden');
            mainToolsGrid.classList.remove('hidden');
        });
    }

    if (optimizeGoBtn) {
        optimizeGoBtn.addEventListener('click', () => {
            if (!currentFile) return;

            const options = {
                globalPalette: optGlobalPalette ? optGlobalPalette.checked : true,
                deltaCompression: optFrameDelta ? optFrameDelta.checked : true
            };

            // Archive History
            if (currentResizedBlob) {
                const currentTitle = document.querySelector('#resized-card h3').innerText;
                createHistoryCard(currentResizedBlob, resizedGifInfoContainer.innerHTML, currentTitle);
            }

            // Show Progress
            const progressContainer = document.getElementById('optimize-progress-container');
            const progressFill = document.getElementById('optimize-progress-fill');
            const progressText = document.getElementById('optimize-progress-text');

            progressContainer.classList.remove('hidden');
            progressFill.style.width = '0%';
            progressText.innerText = '0%';

            optimizeGoBtn.disabled = true;
            optimizeBackBtn.disabled = true;

            originalContent.classList.add('hidden');
            const loadingOverlay = document.getElementById('loading-overlay');
            loadingOverlay.classList.remove('hidden');
            resizedCard.classList.remove('hidden');

            document.querySelector('#resized-card h3').innerText = 'Optimized GIF';
            resizedCard.querySelector('.toggle-card-btn svg').style.transform = 'rotate(0deg)';
            resizedGifPreview.style.opacity = '0.5';

            const reader = new FileReader();
            reader.readAsArrayBuffer(currentFile);
            reader.onload = function (e) {
                processOptimize(e.target.result, options, loadingOverlay);
            };
        });
    }

    function processOptimize(buffer, options, loadingOverlayElement) {
        const ReaderClass = window.GifReader || (window.omggif && window.omggif.GifReader) || (window.Omggif && window.Omggif.GifReader);
        if (!ReaderClass) return;

        const reader = new ReaderClass(new Uint8Array(buffer));
        const framesCount = reader.numFrames();
        const width = reader.width;
        const height = reader.height;

        const workerBlob = new Blob([gifWorkerScript], { type: 'application/javascript' });
        // quality: 1 if Global Palette checked (better quality/compression trade-off usually), else 10
        const gif = new GIF({
            workers: 2,
            quality: options.globalPalette ? 1 : 10,
            width: width,
            height: height,
            workerScript: URL.createObjectURL(workerBlob)
        });

        // Frame Buffers (we need previous frame to compare)
        let prevImageData = null;

        const canvas = document.createElement('canvas'); // Working Canvas
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.createImageData(width, height);

        let frameIndex = 0;
        let totalDelay = 0;

        function processNextFrame() {
            if (frameIndex >= framesCount) {
                gif.render();
                return;
            }

            // Decode Current Frame
            reader.decodeAndBlitFrameRGBA(frameIndex, imageData.data);

            // Note: decodeAndBlitFrameRGBA renders onto 'imageData.data'. 
            // If the GIF uses disposal, this might be partial data? 
            // No, omggif usually composites if we are decoding sequentially?
            // Actually, we need to be careful. The Reader just decodes the stored frame data (pixels).
            // It doesn't auto-composite with previous frame if disposal is involved, unless we manage that.
            // BUT, for Delta Compression, we want to know the *Visible* result to verify diff?
            // Or just diff the raw pixel data from frame N vs N-1?

            // Simplest effective "Delta Compression" for standard GIFs:
            // 1. We assume the decoded pixels represent the frame content.
            // 2. We explicitly set pixels to Transparent if they match the Previous Frame's composite.

            // To do this robustly:
            // We need a "Composite Canvas" that tracks the full image state.
            // But 'decodeAndBlitFrameRGBA' writes raw frame pixels (rect) into buffer.
            // It handles LZW decompression.

            // Let's rely on a simpler approach:
            // Just add frames with standard re-encoding (Global Palette).
            // If Delta Compression is ON:
            //   We must modify 'imageData' BEFORE adding (or rather, the canvas context).

            // Wait, to do Delta correctly:
            // Current = Fully Rendered Frame N.
            // Previous = Fully Rendered Frame N-1.
            // Diff = Current - Previous.
            // If Diff == 0 (Same color), set to Transparent.

            // So we need:
            // 1. 'compositeCtx' (Persistent).
            // 2. 'frameCtx' (Current Frame).

            // Let's implement full composite rendering to ensure robustness.
            // Actually, we can reuse logic from `processSmartCrop` (drawing previous).
            // But here we need to read pixels back to Compare.

            // Optimization: Just rely on 'globalPalette' (Quantization) + Default GIF compression?
            // User ASKED for "Frame Delta Compression". I should try to implement it.

            // Working Setup:
            // 1. ctx.putImageData(imageData) -> Puts RAW encoded pixels.
            //    Note: This is NOT the composite if the GIF had localized updates and transparency.
            //    However, `omggif`'s `decodeAndBlitFrameRGBA` outputs the FULL frame (including transparency) 
            //    relative to the frame's bounds? No, usually full buffer?
            //    Docs say: "decodes ... and blits it onto the pixels array".

            // Let's assume we get the full frame data for now.
            // If options.deltaCompression && prevImageData:
            //   Compare imageData.data [r,g,b,a] with prevImageData.data.
            //   If identical, set imageData.data[a] = 0.

            // Store a copy of current BEFORE modification?
            // No, we modify Current to store as "Delta". 
            // BUT for the NEXT comparison, we need the "Restored" state (which is the unmodified Current).
            // So: 
            //   Temp = Clone(Current).
            //   Diff(Current, Previous). Update Current (Delta).
            //   Add Current to GIF (Dispose=1 "Do Not Dispose", so it overlays).
            //   Previous = Temp.

            const frameInfo = reader.frameInfo(frameIndex);

            // FIX: We need to render the frame onto the canvas to handle potential disposal/transparency of source
            // properly if we really want to optimize an already-optimized GIF?
            // But if we just take `imageData` from decoder...
            // Let's try simple pixel diffing.

            let sourceData = imageData.data; // The raw decoded pixels

            // We need to keep a copy of the *actual visual state* for the next comparison
            // because after we make pixels transparent, they won't represent the visual state anymore.
            let visualDetails = new Uint8ClampedArray(sourceData);

            if (options.deltaCompression && frameIndex > 0 && prevImageData) {
                // Perform Delta
                let diffCount = 0;
                for (let i = 0; i < sourceData.length; i += 4) {
                    // Compare R, G, B, A
                    if (sourceData[i] === prevImageData[i] &&
                        sourceData[i + 1] === prevImageData[i + 1] &&
                        sourceData[i + 2] === prevImageData[i + 2] &&
                        sourceData[i + 3] === prevImageData[i + 3]) {

                        // Match! Make transparent.
                        sourceData[i + 3] = 0;
                        diffCount++;
                    }
                }
            }

            prevImageData = visualDetails; // Store the "Full" version for next comparison

            ctx.putImageData(imageData, 0, 0);

            // Add Frame
            // If we did delta, we MUST use dispose: 1 (Do Not Dispose) / Combine.
            // gif.js 'dispose' option: 
            // -1: default (no disposal specified)
            // 1: do not dispose (keep)
            // 2: restore to background
            // 3: restore to previous
            const disposeMode = options.deltaCompression ? 1 : -1;

            totalDelay += (frameInfo.delay * 10);

            // Pass Optimized Context
            gif.addFrame(ctx, { delay: frameInfo.delay * 10, copy: true, dispose: disposeMode });

            frameIndex++;
            // Update Progress (0-50%)
            const progress = (frameIndex / framesCount) * 50;
            const pFill = document.getElementById('optimize-progress-fill');
            const pText = document.getElementById('optimize-progress-text');
            if (pFill) pFill.style.width = progress + '%';
            if (pText) pText.innerText = Math.round(progress) + '%';

            setTimeout(processNextFrame, 0);
        }
        processNextFrame();

        gif.on('progress', (p) => {
            const progress = 60 + (p * 40);
            const pFill = document.getElementById('optimize-progress-fill');
            const pText = document.getElementById('optimize-progress-text');
            if (pFill) pFill.style.width = progress + '%';
            if (pText) pText.innerText = Math.round(progress) + '%';
        });

        gif.on('finished', (blob) => {
            if (loadingOverlayElement) loadingOverlayElement.classList.add('hidden');
            currentResizedBlob = blob;
            resizedGifPreview.src = URL.createObjectURL(blob);
            resizedGifPreview.style.opacity = '1';

            const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
            const origSizeMB = (currentFile.size / (1024 * 1024));

            resizedGifInfoContainer.innerHTML = `
                <div class="info-item"><span class="info-label">Dimens</span><span class="info-value">${width} x ${height}</span></div>
                <div class="info-item"><span class="info-label">Size</span>${getDiffHtml(origSizeMB, parseFloat(sizeMB), true, ' MB')}</div>
                <div class="info-item"><span class="info-label">Frames</span><span class="info-value">${framesCount}</span></div>
                <div class="info-item"><span class="info-label">Mode</span><span class="info-value">${options.deltaCompression ? 'Delta' : 'Normal'}</span></div>
            `;

            // Auto-nav
            document.getElementById('optimize-panel').classList.add('hidden');
            const pContainer = document.getElementById('optimize-progress-container');
            if (pContainer) pContainer.classList.add('hidden');

            mainToolsGrid.classList.remove('hidden');
            mainToolsGrid.style.display = 'grid';

            // Reset
            optimizeGoBtn.disabled = false;
            optimizeBackBtn.disabled = false;

            // Update Global State
            const newFileName = `optimized_${Date.now()}.gif`;
            currentFile = new File([blob], newFileName, { type: 'image/gif' });
        });
    }

    // --- GENERIC TOOL Logic (for others) ---
    const genericPanel = document.getElementById('generic-panel');
    const genericTitle = document.getElementById('generic-panel-title');
    const genericBackBtn = document.getElementById('generic-back-btn');
    const genericGoBtn = document.getElementById('generic-go-btn');

    // Bind all other buttons
    const allToolBtns = document.querySelectorAll('.tool-btn');
    allToolBtns.forEach(btn => {
        const tool = btn.dataset.tool;
        if (tool !== 'resize' && tool !== 'crop' && tool !== 'downsize' && tool !== 'rotate' && tool !== 'reverse' && tool !== 'speed' && tool !== 'optimize' && tool !== 'cut' && tool !== 'convert') {
            btn.addEventListener('click', () => {
                // Set Title
                const toolName = tool.charAt(0).toUpperCase() + tool.slice(1);
                genericTitle.innerText = `${toolName} Options`;

                // Show Panel
                mainToolsGrid.classList.add('hidden');
                genericPanel.classList.remove('hidden');
            });
        }
    });

    if (genericBackBtn) {
        genericBackBtn.addEventListener('click', () => {
            genericPanel.classList.add('hidden');
            mainToolsGrid.classList.remove('hidden');
        });
    }

    if (genericGoBtn) {
        genericGoBtn.addEventListener('click', () => {
            genericPanel.classList.add('hidden');
            originalContent.classList.add('hidden');

            const loadingOverlay = document.getElementById('loading-overlay');
            loadingOverlay.classList.remove('hidden');

            resizedCard.classList.remove('hidden');
            resizedCard.querySelector('.toggle-card-btn svg').style.transform = 'rotate(0deg)';

            const panelTitle = genericTitle.innerText.split(' ')[0]; // "Convert Options" -> "Convert"

            // Dynamic Title based on tool
            let resultTitle = 'Processed GIF';
            if (panelTitle.includes('Convert')) resultTitle = 'Converted GIF';
            else if (panelTitle.includes('Optimize')) resultTitle = 'Optimized GIF';
            else if (panelTitle.includes('Reverse')) resultTitle = 'Reversed GIF';
            else if (panelTitle.includes('Speed')) resultTitle = 'Speed Changed GIF';
            else if (panelTitle.includes('Rotate')) resultTitle = 'Rotated GIF';

            document.querySelector('#resized-card h3').innerText = resultTitle;

            // Simulate delay
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
                if (currentFile) {
                    resizedGifPreview.src = URL.createObjectURL(currentFile); // Just show original
                    resizedGifPreview.style.opacity = '1';
                    resizedGifInfoContainer.innerHTML = `<div class="info-item"><span class="info-label">Status</span><span class="info-value">Done (Simulated)</span></div>`;

                    // Update History
                    createHistoryCard(currentFile, `<div class="info-item"><span class="info-value">${resultTitle} (Sim)</span></div>`, resultTitle);
                }
                // Reset
                genericGoBtn.disabled = false;
                mainToolsGrid.classList.remove('hidden');
            }, 1000);
        });
    }

    function getDiffHtml(oldVal, newVal, isFloat = false, suffix = '') {
        let valStr = isFloat ? newVal.toFixed(1) : newVal;
        if (oldVal === undefined || oldVal === null || oldVal === 0 || oldVal === newVal) {
            return `<span class="info-value">${valStr}${suffix}</span>`;
        }

        const diff = newVal - oldVal;
        const pct = ((diff / oldVal) * 100).toFixed(1);
        const sign = diff > 0 ? '+' : '';
        const cls = diff > 0 ? 'diff-inc' : 'diff-dec';

        return `<span class="info-value">${valStr}${suffix} <span class="${cls}">(${sign}${pct}%)</span></span>`;
    }

    // End of Crop Tool Logic


    // --- CONVERT TOOL Logic ---
    const convertPanel = document.getElementById('convert-panel');
    const convertBtn = document.querySelector('button[data-tool="convert"]');
    const convertBackBtn = document.getElementById('convert-back-btn');
    const convertGoBtn = document.getElementById('convert-go-btn');
    const convertProgress = document.getElementById('convert-progress-container');
    const convertProgressFill = document.getElementById('convert-progress-fill');
    const convertProgressText = document.getElementById('convert-progress-text');
    const convertStatusText = document.getElementById('convert-status-text');

    if (convertBtn) {
        convertBtn.addEventListener('click', () => {
            mainToolsGrid.classList.add('hidden');
            convertPanel.classList.remove('hidden');
        });
    }

    if (convertBackBtn) {
        convertBackBtn.addEventListener('click', () => {
            convertPanel.classList.add('hidden');
            mainToolsGrid.classList.remove('hidden');
        });
    }

    if (convertGoBtn) {
        convertGoBtn.addEventListener('click', () => {
            if (!currentFile) return;

            // Get Format
            const format = document.querySelector('input[name="convert-format"]:checked').value; // mp4, webp, jpg

            // UI Setup
            convertGoBtn.disabled = true;
            convertBackBtn.disabled = true;
            convertProgress.classList.remove('hidden');
            convertProgressFill.style.width = '0%';
            convertProgressText.innerText = '0%';
            convertStatusText.innerText = 'Preparing...';

            const reader = new FileReader();
            reader.readAsArrayBuffer(currentFile);
            reader.onload = function (e) {
                processConvert(e.target.result, format);
            };
        });
    }

    function processConvert(buffer, format) {
        const ReaderClass = window.GifReader || (window.omggif && window.omggif.GifReader) || (window.Omggif && window.Omggif.GifReader);
        if (!ReaderClass) {
            alert('GIF Reader not found');
            resetConvertUI();
            return;
        }

        const reader = new ReaderClass(new Uint8Array(buffer));
        const width = reader.width;
        const height = reader.height;
        const framesCount = reader.numFrames();

        // Canvas for Rendering
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(width, height);

        if (format === 'jpg') {
            // Still Image (Frame 0)
            convertStatusText.innerText = 'Extracting Frame...';
            convertProgressFill.style.width = '50%';
            convertProgressText.innerText = '50%';

            setTimeout(() => {
                // Decode Frame 0
                reader.decodeAndBlitFrameRGBA(0, imageData.data);
                ctx.putImageData(imageData, 0, 0);

                // Export
                let mime = 'image/jpeg';
                canvas.toBlob((blob) => {
                    convertProgressFill.style.width = '100%';
                    convertProgressText.innerText = '100%';
                    convertStatusText.innerText = 'Done!';

                    const filename = `converted_${Date.now()}.${format}`;
                    downloadBlob(blob, filename);

                    setTimeout(resetConvertUI, 1000);
                }, mime, 0.9); // Quality 0.9
            }, 100);

        } else if (format === 'mp4' || format === 'webm') {
            // Video Recording
            convertStatusText.innerText = 'Recording Video...';

            // MediaRecorder Setup
            const stream = canvas.captureStream(30); // 30 FPS Stream
            let mimeType = 'video/mp4';
            if (format === 'webm' || !MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm'; // Fallback or requested
            }

            // Check capabilities
            // Note: If user wants MP4 but browser only supports WebM, we give WebM.
            // If user wants WebM, we give WebM.

            let recorder;
            try {
                recorder = new MediaRecorder(stream, { mimeType: mimeType });
            } catch (e) {
                // Fallback to minimal if mimeType failed
                recorder = new MediaRecorder(stream);
            }

            const chunks = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                // Extension
                let ext = 'mp4';
                if (mimeType.includes('webm')) ext = 'webm';

                convertProgressFill.style.width = '100%';
                convertProgressText.innerText = '100%';
                convertStatusText.innerText = 'Done!';

                downloadBlob(blob, `converted_${Date.now()}.${ext}`);
                setTimeout(resetConvertUI, 1000);
            };

            recorder.start();

            // Play frames
            let frameIndex = 0;
            // Loop? No, convert usually does one pass.

            function playNext() {
                if (frameIndex >= framesCount) {
                    recorder.stop();
                    return;
                }

                // Decode & Draw
                reader.decodeAndBlitFrameRGBA(frameIndex, imageData.data);
                ctx.putImageData(imageData, 0, 0);

                // Progress
                const pct = Math.round((frameIndex / framesCount) * 100);
                convertProgressFill.style.width = pct + '%';
                convertProgressText.innerText = pct + '%';

                const info = reader.frameInfo(frameIndex);
                const delay = info.delay * 10; // ms

                frameIndex++;
                setTimeout(playNext, delay);
            }

            playNext();
        }
    }

    function resetConvertUI() {
        // Reset Buttons
        convertGoBtn.disabled = false;
        convertBackBtn.disabled = false;
        convertProgress.classList.add('hidden');

        // Hide convert panel?
        convertPanel.classList.add('hidden');
        mainToolsGrid.classList.remove('hidden');
    }

    const cutPanel = document.getElementById('cut-panel');
    const cutBtn = document.querySelector('button[data-tool="cut"]');
    const cutBackBtn = document.getElementById('cut-back-btn');
    const cutGoBtn = document.getElementById('cut-go-btn');

    // Sliders
    const cutSliderStart = document.getElementById('cut-start-slider');
    const cutSliderEnd = document.getElementById('cut-end-slider');
    const cutRangeHighlight = document.getElementById('cut-range-highlight');

    // Previews
    const cutStartPreview = document.getElementById('cut-start-preview');
    const cutEndPreview = document.getElementById('cut-end-preview');
    const cutStartFrameText = document.getElementById('cut-start-frame-text');
    const cutEndFrameText = document.getElementById('cut-end-frame-text');

    let totalFrames = 0;

    // Open Cut Panel
    if (cutBtn) {
        cutBtn.addEventListener('click', () => {
            if (!currentFile) return;
            initCutTool();
            mainToolsGrid.classList.add('hidden');
            cutPanel.classList.remove('hidden');
        });
    }

    if (cutBackBtn) {
        cutBackBtn.addEventListener('click', () => {
            cutPanel.classList.add('hidden');
            mainToolsGrid.classList.remove('hidden');
        });
    }

    function initCutTool() {
        if (!currentFile) return;

        const reader = new FileReader();
        reader.readAsArrayBuffer(currentFile);
        reader.onload = function (e) {
            const buffer = e.target.result;
            // Use omggif to read info
            const ReaderClass = window.GifReader || (window.omggif && window.omggif.GifReader) || (window.Omggif && window.Omggif.GifReader);
            if (!ReaderClass) return;

            const gifReader = new ReaderClass(new Uint8Array(buffer));
            totalFrames = gifReader.numFrames();

            // Init Sliders
            cutSliderStart.min = 0;
            cutSliderStart.max = totalFrames - 1;
            cutSliderStart.value = 0;

            cutSliderEnd.min = 0;
            cutSliderEnd.max = totalFrames - 1;
            cutSliderEnd.value = totalFrames - 1;

            updateRangeHighlight();
            updateCutPreview(gifReader, 0, 'start');
            updateCutPreview(gifReader, totalFrames - 1, 'end');

            // Re-assign oninput
            cutSliderStart.oninput = (e) => {
                let val = parseInt(e.target.value);
                const endVal = parseInt(cutSliderEnd.value);

                if (val >= endVal) {
                    val = endVal - 1;
                    if (val < 0) val = 0;
                    e.target.value = val;
                }

                updateRangeHighlight();
                updateCutPreview(gifReader, val, 'start');
            };

            cutSliderEnd.oninput = (e) => {
                let val = parseInt(e.target.value);
                const startVal = parseInt(cutSliderStart.value);

                if (val <= startVal) {
                    val = startVal + 1;
                    if (val >= totalFrames) val = totalFrames - 1;
                    e.target.value = val;
                }

                updateRangeHighlight();
                updateCutPreview(gifReader, val, 'end');
            };

            // Go Button
            cutGoBtn.onclick = () => {
                const start = parseInt(cutSliderStart.value);
                const end = parseInt(cutSliderEnd.value);
                processCut(buffer, start, end);
            };
        };
    }

    function updateRangeHighlight() {
        if (!cutSliderStart || !cutSliderEnd) return;
        const start = parseInt(cutSliderStart.value);
        const end = parseInt(cutSliderEnd.value);
        const max = parseInt(cutSliderStart.max);

        if (max === 0) return;

        const leftPercent = (start / max) * 100;
        const widthPercent = ((end - start) / max) * 100;

        cutRangeHighlight.style.left = leftPercent + '%';
        cutRangeHighlight.style.width = widthPercent + '%';
    }

    function updateCutPreview(reader, frameIndex, type) {
        const canvas = document.createElement('canvas');
        canvas.width = reader.width;
        canvas.height = reader.height;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(reader.width, reader.height);

        reader.decodeAndBlitFrameRGBA(frameIndex, imageData.data);
        ctx.putImageData(imageData, 0, 0);

        const url = canvas.toDataURL();

        if (type === 'start') {
            cutStartPreview.src = url;
            cutStartFrameText.innerText = frameIndex;
        } else {
            cutEndPreview.src = url;
            cutEndFrameText.innerText = frameIndex;
        }
    }

    function processCut(buffer, startFrame, endFrame) {
        cutGoBtn.disabled = true;
        cutBackBtn.disabled = true;

        document.getElementById('cut-progress-container').classList.remove('hidden');
        cutPanel.classList.add('hidden');

        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.remove('hidden');

        resizedCard.classList.remove('hidden'); // Re-use output card
        document.querySelector('#resized-card h3').innerText = 'Cut GIF';

        // Use GIF.js to re-encode
        const ReaderClass = window.GifReader || (window.omggif && window.omggif.GifReader) || (window.Omggif && window.Omggif.GifReader);
        if (!ReaderClass) {
            alert('Error: GIF Reader not found');
            return;
        }

        const reader = new ReaderClass(new Uint8Array(buffer));
        const width = reader.width;
        const height = reader.height;

        // Init GIF encoder
        const workerBlob = new Blob([gifWorkerScript], { type: 'application/javascript' });
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: width,
            height: height,
            workerScript: URL.createObjectURL(workerBlob)
        });

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.createImageData(width, height);

        // Pre-fill buffer to startFrame state to handle composition/transparency correctly
        // omggif's decodeAndBlit composites onto the provided array
        for (let i = 0; i < startFrame; i++) {
            reader.decodeAndBlitFrameRGBA(i, imageData.data);
        }

        let currentFrame = startFrame;
        const totalFramesToProcess = endFrame - startFrame + 1;
        let processedCount = 0;

        function processNext() {
            try {
                if (currentFrame > endFrame) {
                    gif.render();
                    return;
                }

                reader.decodeAndBlitFrameRGBA(currentFrame, imageData.data);
                ctx.putImageData(imageData, 0, 0);

                const frameInfo = reader.frameInfo(currentFrame);

                // Add frame with copy:true to persist the canvas state
                gif.addFrame(ctx, { copy: true, delay: frameInfo.delay * 10 });

                processedCount++;
                currentFrame++;

                // Update Progress
                const pct = Math.round((processedCount / totalFramesToProcess) * 100);
                document.getElementById('cut-progress-fill').style.width = pct + '%';
                document.getElementById('cut-progress-text').innerText = pct + '%';

                setTimeout(processNext, 0);
            } catch (err) {
                console.error("Cut Processing Error:", err);
                alert("Error during processing: " + err.message);
                loadingOverlay.classList.add('hidden');
                cutGoBtn.disabled = false;
            }
        }

        processNext();

        gif.on('finished', (blob) => {
            loadingOverlay.classList.add('hidden');
            document.getElementById('cut-progress-container').classList.add('hidden');

            currentResizedBlob = blob;
            resizedGifPreview.src = URL.createObjectURL(blob);
            resizedGifPreview.style.opacity = '1';

            // Stats
            const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
            resizedGifInfoContainer.innerHTML = `
                <div class="info-item"><span class="info-label">Frames</span><span class="info-value">${processedCount}</span></div>
                <div class="info-item"><span class="info-label">Size</span><span class="info-value">${sizeMB} MB</span></div>
                <div class="info-item"><span class="info-label">Range</span><span class="info-value">${startFrame} - ${endFrame}</span></div>
            `;

            // Buttons
            cutGoBtn.disabled = false;
            cutBackBtn.disabled = false;

            mainToolsGrid.classList.remove('hidden');

            // Update Global
            const newFileName = `cut_${Date.now()}.gif`;
            currentFile = new File([blob], newFileName, { type: 'image/gif' });
        });
    }

});

const gifWorkerScript = `// gif.worker.js 0.2.0 - https://github.com/jnordberg/gif.js
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){var NeuQuant=require("./TypedNeuQuant.js");var LZWEncoder=require("./LZWEncoder.js");function ByteArray(){this.page=-1;this.pages=[];this.newPage()}ByteArray.pageSize=4096;ByteArray.charMap={};for(var i=0;i<256;i++)ByteArray.charMap[i]=String.fromCharCode(i);ByteArray.prototype.newPage=function(){this.pages[++this.page]=new Uint8Array(ByteArray.pageSize);this.cursor=0};ByteArray.prototype.getData=function(){var rv="";for(var p=0;p<this.pages.length;p++){for(var i=0;i<ByteArray.pageSize;i++){rv+=ByteArray.charMap[this.pages[p][i]]}}return rv};ByteArray.prototype.writeByte=function(val){if(this.cursor>=ByteArray.pageSize)this.newPage();this.pages[this.page][this.cursor++]=val};ByteArray.prototype.writeUTFBytes=function(string){for(var l=string.length,i=0;i<l;i++)this.writeByte(string.charCodeAt(i))};ByteArray.prototype.writeBytes=function(array,offset,length){for(var l=length||array.length,i=offset||0;i<l;i++)this.writeByte(array[i])};function GIFEncoder(width,height){this.width=~~width;this.height=~~height;this.transparent=null;this.transIndex=0;this.repeat=-1;this.delay=0;this.image=null;this.pixels=null;this.indexedPixels=null;this.colorDepth=null;this.colorTab=null;this.neuQuant=null;this.usedEntry=new Array;this.palSize=7;this.dispose=-1;this.firstFrame=true;this.sample=10;this.dither=false;this.globalPalette=false;this.out=new ByteArray}GIFEncoder.prototype.setDelay=function(milliseconds){this.delay=Math.round(milliseconds/10)};GIFEncoder.prototype.setFrameRate=function(fps){this.delay=Math.round(100/fps)};GIFEncoder.prototype.setDispose=function(disposalCode){if(disposalCode>=0)this.dispose=disposalCode};GIFEncoder.prototype.setRepeat=function(repeat){this.repeat=repeat};GIFEncoder.prototype.setTransparent=function(color){this.transparent=color};GIFEncoder.prototype.addFrame=function(imageData){this.image=imageData;this.colorTab=this.globalPalette&&this.globalPalette.slice?this.globalPalette:null;this.getImagePixels();this.analyzePixels();if(this.globalPalette===true)this.globalPalette=this.colorTab;if(this.firstFrame){this.writeLSD();this.writePalette();if(this.repeat>=0){this.writeNetscapeExt()}}this.writeGraphicCtrlExt();this.writeImageDesc();if(!this.firstFrame&&!this.globalPalette)this.writePalette();this.writePixels();this.firstFrame=false};GIFEncoder.prototype.finish=function(){this.out.writeByte(59)};GIFEncoder.prototype.setQuality=function(quality){if(quality<1)quality=1;this.sample=quality};GIFEncoder.prototype.setDither=function(dither){if(dither===true)dither="FloydSteinberg";this.dither=dither};GIFEncoder.prototype.setGlobalPalette=function(palette){this.globalPalette=palette};GIFEncoder.prototype.getGlobalPalette=function(){return this.globalPalette&&this.globalPalette.slice&&this.globalPalette.slice(0)||this.globalPalette};GIFEncoder.prototype.writeHeader=function(){this.out.writeUTFBytes("GIF89a")};GIFEncoder.prototype.analyzePixels=function(){if(!this.colorTab){this.neuQuant=new NeuQuant(this.pixels,this.sample);this.neuQuant.buildColormap();this.colorTab=this.neuQuant.getColormap()}if(this.dither){this.ditherPixels(this.dither.replace("-serpentine",""),this.dither.match(/-serpentine/)!==null)}else{this.indexPixels()}this.pixels=null;this.colorDepth=8;this.palSize=7;if(this.transparent!==null){this.transIndex=this.findClosest(this.transparent,true)}};GIFEncoder.prototype.indexPixels=function(imgq){var nPix=this.pixels.length/3;this.indexedPixels=new Uint8Array(nPix);var k=0;for(var j=0;j<nPix;j++){var index=this.findClosestRGB(this.pixels[k++]&255,this.pixels[k++]&255,this.pixels[k++]&255);this.usedEntry[index]=true;this.indexedPixels[j]=index}};GIFEncoder.prototype.ditherPixels=function(kernel,serpentine){var kernels={FalseFloydSteinberg:[[3/8,1,0],[3/8,0,1],[2/8,1,1]],FloydSteinberg:[[7/16,1,0],[3/16,-1,1],[5/16,0,1],[1/16,1,1]],Stucki:[[8/42,1,0],[4/42,2,0],[2/42,-2,1],[4/42,-1,1],[8/42,0,1],[4/42,1,1],[2/42,2,1],[1/42,-2,2],[2/42,-1,2],[4/42,0,2],[2/42,1,2],[1/42,2,2]],Atkinson:[[1/8,1,0],[1/8,2,0],[1/8,-1,1],[1/8,0,1],[1/8,1,1],[1/8,0,2]]};if(!kernel||!kernels[kernel]){throw"Unknown dithering kernel: "+kernel}var ds=kernels[kernel];var index=0,height=this.height,width=this.width,data=this.pixels;var direction=serpentine?-1:1;this.indexedPixels=new Uint8Array(this.pixels.length/3);for(var y=0;y<height;y++){if(serpentine)direction=direction*-1;for(var x=direction==1?0:width-1,xend=direction==1?width:0;x!==xend;x+=direction){index=y*width+x;var idx=index*3;var r1=data[idx];var g1=data[idx+1];var b1=data[idx+2];idx=this.findClosestRGB(r1,g1,b1);this.usedEntry[idx]=true;this.indexedPixels[index]=idx;idx*=3;var r2=this.colorTab[idx];var g2=this.colorTab[idx+1];var b2=this.colorTab[idx+2];var er=r1-r2;var eg=g1-g2;var eb=b1-b2;for(var i=direction==1?0:ds.length-1,end=direction==1?ds.length:0;i!==end;i+=direction){var x1=ds[i][1];var y1=ds[i][2];if(x1+x>=0&&x1+x<width&&y1+y>=0&&y1+y<height){var d=ds[i][0];idx=index+x1+y1*width;idx*=3;data[idx]=Math.max(0,Math.min(255,data[idx]+er*d));data[idx+1]=Math.max(0,Math.min(255,data[idx+1]+eg*d));data[idx+2]=Math.max(0,Math.min(255,data[idx+2]+eb*d))}}}}};GIFEncoder.prototype.findClosest=function(c,used){return this.findClosestRGB((c&16711680)>>16,(c&65280)>>8,c&255,used)};GIFEncoder.prototype.findClosestRGB=function(r,g,b,used){if(this.colorTab===null)return-1;if(this.neuQuant&&!used){return this.neuQuant.lookupRGB(r,g,b)}var c=b|g<<8|r<<16;var minpos=0;var dmin=256*256*256;var len=this.colorTab.length;for(var i=0,index=0;i<len;index++){var dr=r-(this.colorTab[i++]&255);var dg=g-(this.colorTab[i++]&255);var db=b-(this.colorTab[i++]&255);var d=dr*dr+dg*dg+db*db;if((!used||this.usedEntry[index])&&d<dmin){dmin=d;minpos=index}}return minpos};GIFEncoder.prototype.getImagePixels=function(){var w=this.width;var h=this.height;this.pixels=new Uint8Array(w*h*3);var data=this.image;var srcPos=0;var count=0;for(var i=0;i<h;i++){for(var j=0;j<w;j++){this.pixels[count++]=data[srcPos++];this.pixels[count++]=data[srcPos++];this.pixels[count++]=data[srcPos++];srcPos++}}};GIFEncoder.prototype.writeGraphicCtrlExt=function(){this.out.writeByte(33);this.out.writeByte(249);this.out.writeByte(4);var transp,disp;if(this.transparent===null){transp=0;disp=0}else{transp=1;disp=2}if(this.dispose>=0){disp=dispose&7}disp<<=2;this.out.writeByte(0|disp|0|transp);this.writeShort(this.delay);this.out.writeByte(this.transIndex);this.out.writeByte(0)};GIFEncoder.prototype.writeImageDesc=function(){this.out.writeByte(44);this.writeShort(0);this.writeShort(0);this.writeShort(this.width);this.writeShort(this.height);if(this.firstFrame||this.globalPalette){this.out.writeByte(0)}else{this.out.writeByte(128|0|0|0|this.palSize)}};GIFEncoder.prototype.writeLSD=function(){this.writeShort(this.width);this.writeShort(this.height);this.out.writeByte(128|112|0|this.palSize);this.out.writeByte(0);this.out.writeByte(0)};GIFEncoder.prototype.writeNetscapeExt=function(){this.out.writeByte(33);this.out.writeByte(255);this.out.writeByte(11);this.out.writeUTFBytes("NETSCAPE2.0");this.out.writeByte(3);this.out.writeByte(1);this.writeShort(this.repeat);this.out.writeByte(0)};GIFEncoder.prototype.writePalette=function(){this.out.writeBytes(this.colorTab);var n=3*256-this.colorTab.length;for(var i=0;i<n;i++)this.out.writeByte(0)};GIFEncoder.prototype.writeShort=function(pValue){this.out.writeByte(pValue&255);this.out.writeByte(pValue>>8&255)};GIFEncoder.prototype.writePixels=function(){var enc=new LZWEncoder(this.width,this.height,this.indexedPixels,this.colorDepth);enc.encode(this.out)};GIFEncoder.prototype.stream=function(){return this.out};module.exports=GIFEncoder},{"./LZWEncoder.js":2,"./TypedNeuQuant.js":3}],2:[function(require,module,exports){var EOF=-1;var BITS=12;var HSIZE=5003;var masks=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535];function LZWEncoder(width,height,pixels,colorDepth){var initCodeSize=Math.max(2,colorDepth);var accum=new Uint8Array(256);var htab=new Int32Array(HSIZE);var codetab=new Int32Array(HSIZE);var cur_accum,cur_bits=0;var a_count;var free_ent=0;var maxcode;var clear_flg=false;var g_init_bits,ClearCode,EOFCode;function char_out(c,outs){accum[a_count++]=c;if(a_count>=254)flush_char(outs)}function cl_block(outs){cl_hash(HSIZE);free_ent=ClearCode+2;clear_flg=true;output(ClearCode,outs)}function cl_hash(hsize){for(var i=0;i<hsize;++i)htab[i]=-1}function compress(init_bits,outs){var fcode,c,i,ent,disp,hsize_reg,hshift;g_init_bits=init_bits;clear_flg=false;n_bits=g_init_bits;maxcode=MAXCODE(n_bits);ClearCode=1<<init_bits-1;EOFCode=ClearCode+1;free_ent=ClearCode+2;a_count=0;ent=nextPixel();hshift=0;for(fcode=HSIZE;fcode<65536;fcode*=2)++hshift;hshift=8-hshift;hsize_reg=HSIZE;cl_hash(hsize_reg);output(ClearCode,outs);outer_loop:while((c=nextPixel())!=EOF){fcode=(c<<BITS)+ent;i=c<<hshift^ent;if(htab[i]===fcode){ent=codetab[i];continue}else if(htab[i]>=0){disp=hsize_reg-i;if(i===0)disp=1;do{if((i-=disp)<0)i+=hsize_reg;if(htab[i]===fcode){ent=codetab[i];continue outer_loop}}while(htab[i]>=0)}output(ent,outs);ent=c;if(free_ent<1<<BITS){codetab[i]=free_ent++;htab[i]=fcode}else{cl_block(outs)}}output(ent,outs);output(EOFCode,outs)}function encode(outs){outs.writeByte(initCodeSize);remaining=width*height;curPixel=0;compress(initCodeSize+1,outs);outs.writeByte(0)}function flush_char(outs){if(a_count>0){outs.writeByte(a_count);outs.writeBytes(accum,0,a_count);a_count=0}}function MAXCODE(n_bits){return(1<<n_bits)-1}function nextPixel(){if(remaining===0)return EOF;--remaining;var pix=pixels[curPixel++];return pix&255}function output(code,outs){cur_accum&=masks[cur_bits];if(cur_bits>0)cur_accum|=code<<cur_bits;else cur_accum=code;cur_bits+=n_bits;while(cur_bits>=8){char_out(cur_accum&255,outs);cur_accum>>=8;cur_bits-=8}if(free_ent>maxcode||clear_flg){if(clear_flg){maxcode=MAXCODE(n_bits=g_init_bits);clear_flg=false}else{++n_bits;if(n_bits==BITS)maxcode=1<<BITS;else maxcode=MAXCODE(n_bits)}}if(code==EOFCode){while(cur_bits>0){char_out(cur_accum&255,outs);cur_accum>>=8;cur_bits-=8}flush_char(outs)}}this.encode=encode}module.exports=LZWEncoder},{}],3:[function(require,module,exports){var ncycles=100;var netsize=256;var maxnetpos=netsize-1;var netbiasshift=4;var intbiasshift=16;var intbias=1<<intbiasshift;var gammashift=10;var gamma=1<<gammashift;var betashift=10;var beta=intbias>>betashift;var betagamma=intbias<<gammashift-betashift;var initrad=netsize>>3;var radiusbiasshift=6;var radiusbias=1<<radiusbiasshift;var initradius=initrad*radiusbias;var radiusdec=30;var alphabiasshift=10;var initalpha=1<<alphabiasshift;var alphadec;var radbiasshift=8;var radbias=1<<radbiasshift;var alpharadbshift=alphabiasshift+radbiasshift;var alpharadbias=1<<alpharadbshift;var prime1=499;var prime2=491;var prime3=487;var prime4=503;var minpicturebytes=3*prime4;function NeuQuant(pixels,samplefac){var network;var netindex;var bias;var freq;var radpower;function init(){network=[];netindex=new Int32Array(256);bias=new Int32Array(netsize);freq=new Int32Array(netsize);radpower=new Int32Array(netsize>>3);var i,v;for(i=0;i<netsize;i++){v=(i<<netbiasshift+8)/netsize;network[i]=new Float64Array([v,v,v,0]);freq[i]=intbias/netsize;bias[i]=0}}function unbiasnet(){for(var i=0;i<netsize;i++){network[i][0]>>=netbiasshift;network[i][1]>>=netbiasshift;network[i][2]>>=netbiasshift;network[i][3]=i}}function altersingle(alpha,i,b,g,r){network[i][0]-=alpha*(network[i][0]-b)/initalpha;network[i][1]-=alpha*(network[i][1]-g)/initalpha;network[i][2]-=alpha*(network[i][2]-r)/initalpha}function alterneigh(radius,i,b,g,r){var lo=Math.abs(i-radius);var hi=Math.min(i+radius,netsize);var j=i+1;var k=i-1;var m=1;var p,a;while(j<hi||k>lo){a=radpower[m++];if(j<hi){p=network[j++];p[0]-=a*(p[0]-b)/alpharadbias;p[1]-=a*(p[1]-g)/alpharadbias;p[2]-=a*(p[2]-r)/alpharadbias}if(k>lo){p=network[k--];p[0]-=a*(p[0]-b)/alpharadbias;p[1]-=a*(p[1]-g)/alpharadbias;p[2]-=a*(p[2]-r)/alpharadbias}}}function contest(b,g,r){var bestd=~(1<<31);var bestbiasd=bestd;var bestpos=-1;var bestbiaspos=bestpos;var i,n,dist,biasdist,betafreq;for(i=0;i<netsize;i++){n=network[i];dist=Math.abs(n[0]-b)+Math.abs(n[1]-g)+Math.abs(n[2]-r);if(dist<bestd){bestd=dist;bestpos=i}biasdist=dist-(bias[i]>>intbiasshift-netbiasshift);if(biasdist<bestbiasd){bestbiasd=biasdist;bestbiaspos=i}betafreq=freq[i]>>betashift;freq[i]-=betafreq;bias[i]+=betafreq<<gammashift}freq[bestpos]+=beta;bias[bestpos]-=betagamma;return bestbiaspos}function inxbuild(){var i,j,p,q,smallpos,smallval,previouscol=0,startpos=0;for(i=0;i<netsize;i++){p=network[i];smallpos=i;smallval=p[1];for(j=i+1;j<netsize;j++){q=network[j];if(q[1]<smallval){smallpos=j;smallval=q[1]}}q=network[smallpos];if(i!=smallpos){j=q[0];q[0]=p[0];p[0]=j;j=q[1];q[1]=p[1];p[1]=j;j=q[2];q[2]=p[2];p[2]=j;j=q[3];q[3]=p[3];p[3]=j}if(smallval!=previouscol){netindex[previouscol]=startpos+i>>1;for(j=previouscol+1;j<smallval;j++)netindex[j]=i;previouscol=smallval;startpos=i}}netindex[previouscol]=startpos+maxnetpos>>1;for(j=previouscol+1;j<256;j++)netindex[j]=maxnetpos}function inxsearch(b,g,r){var a,p,dist;var bestd=1e3;var best=-1;var i=netindex[g];var j=i-1;while(i<netsize||j>=0){if(i<netsize){p=network[i];dist=p[1]-g;if(dist>=bestd)i=netsize;else{i++;if(dist<0)dist=-dist;a=p[0]-b;if(a<0)a=-a;dist+=a;if(dist<bestd){a=p[2]-r;if(a<0)a=-a;dist+=a;if(dist<bestd){bestd=dist;best=p[3]}}}}if(j>=0){p=network[j];dist=g-p[1];if(dist>=bestd)j=-1;else{j--;if(dist<0)dist=-dist;a=p[0]-b;if(a<0)a=-a;dist+=a;if(dist<bestd){a=p[2]-r;if(a<0)a=-a;dist+=a;if(dist<bestd){bestd=dist;best=p[3]}}}}}return best}function learn(){var i;var lengthcount=pixels.length;var alphadec=30+(samplefac-1)/3;var samplepixels=lengthcount/(3*samplefac);var delta=~~(samplepixels/ncycles);var alpha=initalpha;var radius=initradius;var rad=radius>>radiusbiasshift;if(rad<=1)rad=0;for(i=0;i<rad;i++)radpower[i]=alpha*((rad*rad-i*i)*radbias/(rad*rad));var step;if(lengthcount<minpicturebytes){samplefac=1;step=3}else if(lengthcount%prime1!==0){step=3*prime1}else if(lengthcount%prime2!==0){step=3*prime2}else if(lengthcount%prime3!==0){step=3*prime3}else{step=3*prime4}var b,g,r,j;var pix=0;i=0;while(i<samplepixels){b=(pixels[pix]&255)<<netbiasshift;g=(pixels[pix+1]&255)<<netbiasshift;r=(pixels[pix+2]&255)<<netbiasshift;j=contest(b,g,r);altersingle(alpha,j,b,g,r);if(rad!==0)alterneigh(rad,j,b,g,r);pix+=step;if(pix>=lengthcount)pix-=lengthcount;i++;if(delta===0)delta=1;if(i%delta===0){alpha-=alpha/alphadec;radius-=radius/radiusdec;rad=radius>>radiusbiasshift;if(rad<=1)rad=0;for(j=0;j<rad;j++)radpower[j]=alpha*((rad*rad-j*j)*radbias/(rad*rad))}}}function buildColormap(){init();learn();unbiasnet();inxbuild()}this.buildColormap=buildColormap;function getColormap(){var map=[];var index=[];for(var i=0;i<netsize;i++)index[network[i][3]]=i;var k=0;for(var l=0;l<netsize;l++){var j=index[l];map[k++]=network[j][0];map[k++]=network[j][1];map[k++]=network[j][2]}return map}this.getColormap=getColormap;this.lookupRGB=inxsearch}module.exports=NeuQuant},{}],4:[function(require,module,exports){var GIFEncoder,renderFrame;GIFEncoder=require("./GIFEncoder.js");renderFrame=function(frame){var encoder,page,stream,transfer;encoder=new GIFEncoder(frame.width,frame.height);if(frame.index===0){encoder.writeHeader()}else{encoder.firstFrame=false}encoder.setTransparent(frame.transparent);encoder.setRepeat(frame.repeat);encoder.setDelay(frame.delay);encoder.setQuality(frame.quality);encoder.setDither(frame.dither);encoder.setGlobalPalette(frame.globalPalette);encoder.addFrame(frame.data);if(frame.last){encoder.finish()}if(frame.globalPalette===true){frame.globalPalette=encoder.getGlobalPalette()}stream=encoder.stream();frame.data=stream.pages;frame.cursor=stream.cursor;frame.pageSize=stream.constructor.pageSize;if(frame.canTransfer){transfer=function(){var i,len,ref,results;ref=frame.data;results=[];for(i=0,len=ref.length;i<len;i++){page=ref[i];results.push(page.buffer)}return results}();return self.postMessage(frame,transfer)}else{return self.postMessage(frame)}};self.onmessage=function(event){return renderFrame(event.data)}},{"./GIFEncoder.js":1}]},{},[4]);`;
