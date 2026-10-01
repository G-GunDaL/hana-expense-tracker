document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const loadingSection = document.getElementById('loading');
    const resultSection = document.getElementById('result-section');
    const resetButton = document.getElementById('reset-btn');

    // Drag & Drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    resetButton.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        dropZone.classList.remove('hidden');
        fileInput.value = '';
    });

    async function handleFile(file) {
        const fileType = file.name.split('.').pop().toLowerCase();

        if (!['pdf', 'docx'].includes(fileType)) {
            alert('Please upload a PDF or DOCX file.');
            return;
        }

        // Show loading, hide drop zone
        dropZone.classList.add('hidden');
        loadingSection.classList.remove('hidden');

        try {
            let result = {
                charCount: 0,
                charNoSpaceCount: 0,
                wordCount: 0,
                spaceCount: 0,
                imageCount: 0
            };

            if (fileType === 'pdf') {
                result = await analyzePDF(file);
            } else if (fileType === 'docx') {
                result = await analyzeDOCX(file);
            }

            displayResults(file, result);

        } catch (error) {
            console.error('Error analyzing file:', error);
            alert('An error occurred while analyzing the file.');
            loadingSection.classList.add('hidden');
            dropZone.classList.remove('hidden');
        }
    }

    async function analyzePDF(file) {
        // Implementation for PDF analysis
        console.log('Analyzing PDF...');
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

        let textContent = '';
        let imageCount = 0;

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);

            // Extract Text
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str);
            textContent += strings.join(' ') + ' ';

            // Count Images (inspecting operator list for paintImageXObject)
            const ops = await page.getOperatorList();
            for (let j = 0; j < ops.fnArray.length; j++) {
                if (ops.fnArray[j] === pdfjsLib.OPS.paintImageXObject ||
                    ops.fnArray[j] === pdfjsLib.OPS.paintInlineImageXObject) {
                    imageCount++;
                }
            }
        }

        return calculateStats(textContent, imageCount);
    }

    async function analyzeDOCX(file) {
        // Implementation for DOCX analysis
        console.log('Analyzing DOCX...');
        const arrayBuffer = await file.arrayBuffer();

        // 1. Text Extraction using Mammoth
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        const textContent = result.value;

        // 2. Image Counting using JSZip
        let imageCount = 0;
        const zip = await JSZip.loadAsync(arrayBuffer);

        // Images are usually stored in word/media/
        zip.folder("word/media").forEach((relativePath, file) => {
            imageCount++;
        });

        return calculateStats(textContent, imageCount);
    }

    function calculateStats(text, imageCount) {
        // Normalize text: remove excessive whitespace if needed, but we count "spaces" so be careful
        // Actually, pdf.js might output strange spacing.
        // For general usage:

        const chars = text.length;
        // regex for spaces (including tabs, newlines etc)
        const spaces = (text.match(/\s/g) || []).length;
        const charNoSpace = chars - spaces;

        // Word count: split by whitespace and filter empty
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;

        // Note: PDF extraction often results in disjointed text. 
        // We might need to handle it better but this is a V1.

        return {
            charCount: chars,
            charNoSpaceCount: charNoSpace,
            wordCount: words,
            spaceCount: spaces,
            imageCount: imageCount
        };
    }

    function displayResults(file, stats) {
        loadingSection.classList.add('hidden');
        resultSection.classList.remove('hidden');

        // File Info
        document.getElementById('filename').textContent = file.name;
        document.getElementById('filesize').textContent = formatFileSize(file.size);

        // Stats
        document.getElementById('char-count').textContent = stats.charCount.toLocaleString();
        document.getElementById('char-no-space-count').textContent = stats.charNoSpaceCount.toLocaleString();
        document.getElementById('word-count').textContent = stats.wordCount.toLocaleString();
        document.getElementById('space-count').textContent = stats.spaceCount.toLocaleString();
        document.getElementById('image-count').textContent = stats.imageCount.toLocaleString();
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});
