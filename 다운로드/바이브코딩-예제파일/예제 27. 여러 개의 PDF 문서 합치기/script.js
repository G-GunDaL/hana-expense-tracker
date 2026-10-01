document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const fileListContainer = document.getElementById('file-list-container');
    const fileListFn = document.getElementById('file-list');
    const fileCountSpan = document.getElementById('file-count');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const mergeBtn = document.getElementById('merge-btn');
    const clearBtn = document.getElementById('clear-btn');

    // State
    let selectedFiles = [];

    // --- Event Listeners ---

    // Drag & Drop
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

    // Click to Browse
    browseBtn.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('click', (e) => {
        if (e.target !== browseBtn) fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        fileInput.value = '';
    });

    // Merge Action
    mergeBtn.addEventListener('click', async () => {
        if (selectedFiles.length < 2) return;

        setIsLoading(true);
        try {
            await mergePDFs(selectedFiles);
        } catch (error) {
            console.error(error);
            showError("An error occurred while merging PDFs. Ensure they are not password protected.");
        } finally {
            setIsLoading(false);
        }
    });

    // Clear Action
    clearBtn.addEventListener('click', () => {
        selectedFiles = [];
        updateUI();
        clearError();
    });

    // --- Logic ---

    function handleFiles(fileList) {
        const newFiles = Array.from(fileList);
        if (newFiles.length === 0) return;

        // Filter valid PDFs
        const nonPdfs = newFiles.filter(f => getExtension(f.name) !== 'pdf');

        if (nonPdfs.length > 0) {
            showError("Only PDF files are supported.");
            // We can decide whether to accept the valid ones or reject the batch.
            // Let's reject the batch to be clear, or just filter?
            // User requested strict behavior before. Let's just warn and not add bad files?
            // Actually, simplest is:
        }

        const validPdfs = newFiles.filter(f => getExtension(f.name) === 'pdf');
        selectedFiles = [...selectedFiles, ...validPdfs];

        if (selectedFiles.length === 0 && nonPdfs.length > 0) {
            // If user only added bad files
            showError("Only PDF files are supported.");
        } else if (nonPdfs.length > 0) {
            showError(`Skipped ${nonPdfs.length} non-PDF file(s).`);
        } else {
            clearError();
        }

        updateUI();
    }

    function getExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    function removeFile(index) {
        selectedFiles.splice(index, 1);
        updateUI();
    }

    // --- UI Updates ---

    function updateUI() {
        // File List
        fileListFn.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = 'file-item';

            // PDF Icon
            const icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;

            li.innerHTML = `
                <div class="file-name">
                    ${icon}
                    <span>${file.name}</span>
                </div>
                <div class="remove-file" onclick="window.removeFileWrapper(${index})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
            `;
            fileListFn.appendChild(li);
        });

        // Toggle Visibility
        if (selectedFiles.length > 0) {
            fileListContainer.classList.remove('hidden');
            clearBtn.classList.remove('hidden');
            fileCountSpan.textContent = `(${selectedFiles.length})`;
        } else {
            fileListContainer.classList.add('hidden');
            clearBtn.classList.add('hidden');
        }

        // Enable/Disable Merge Button
        // Must be at least 2 files
        const hasEnoughFiles = selectedFiles.length >= 2;
        mergeBtn.disabled = !hasEnoughFiles;

        // Update Button Text
        const btnText = mergeBtn.querySelector('span');
        if (btnText) btnText.textContent = hasEnoughFiles ? "Merge PDFs" : "Merge Files";
    }

    function showError(msg) {
        errorContainer.classList.remove('hidden');
        errorMessage.textContent = msg;
    }

    function clearError() {
        errorContainer.classList.add('hidden');
    }

    function setIsLoading(isLoading) {
        const span = mergeBtn.querySelector('span');
        const loader = mergeBtn.querySelector('.loader');

        if (isLoading) {
            span.classList.add('hidden');
            loader.classList.remove('hidden');
            mergeBtn.disabled = true;
        } else {
            span.classList.remove('hidden');
            loader.classList.add('hidden');
            mergeBtn.disabled = selectedFiles.length < 2;
        }
    }

    window.removeFileWrapper = (index) => {
        removeFile(index);
    };

    // --- Merging Logic ---

    async function mergePDFs(files) {
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        for (const file of files) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            } catch (e) {
                console.error(`Failed to load PDF: ${file.name}`, e);
                // We could throw or skip.
                // If one fails, the whole merge is likely questionable.
                throw new Error(`Failed to load ${file.name}`);
            }
        }

        const pdfBytes = await mergedPdf.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        saveAs(blob, "merged_document.pdf");
    }
});
