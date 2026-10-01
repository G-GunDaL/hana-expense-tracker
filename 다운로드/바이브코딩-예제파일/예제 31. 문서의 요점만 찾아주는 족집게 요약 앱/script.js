document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const loadingSection = document.getElementById('loading');
    const resultSection = document.getElementById('result-section');
    const summaryContent = document.getElementById('summary-content');
    const fileNameDisplay = document.getElementById('file-name-display');
    const resetBtn = document.getElementById('reset-btn');
    const lengthSlider = document.getElementById('summary-length');
    const lengthValue = document.getElementById('length-value');

    let currentSentencesWithMetadata = [];

    // Drag & Drop Events
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
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });

    resetBtn.addEventListener('click', () => {
        resultSection.classList.add('hidden');
        dropZone.classList.remove('hidden');
        fileInput.value = '';
        currentSentencesWithMetadata = [];
        lengthSlider.value = 1;
        lengthValue.textContent = '1';
    });

    lengthSlider.addEventListener('input', (e) => {
        lengthValue.textContent = e.target.value;
        if (currentSentencesWithMetadata.length > 0) {
            const summary = generateSummaryFromMetadata(currentSentencesWithMetadata, parseInt(e.target.value));
            displaySummary(summary);
        }
    });

    async function handleFile(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        const supported = ['pdf', 'docx', 'pptx', 'ppt'];

        if (!supported.includes(ext)) {
            alert('Unsupported file type. Please upload PDF, DOCX, or PPTX.');
            return;
        }

        showLoading();
        fileNameDisplay.textContent = file.name;

        try {
            let data = [];
            if (ext === 'pdf') {
                data = await parsePDF(file);
            } else if (ext === 'docx') {
                data = await parseDOCX(file);
            } else if (ext === 'pptx' || ext === 'ppt') {
                data = await parsePPTX(file);
            }

            if (!data || data.length === 0) {
                throw new Error('No text found in document.');
            }

            // Process data -> Split into sentences with metadata
            currentSentencesWithMetadata = processToSentences(data);

            if (currentSentencesWithMetadata.length === 0) {
                throw new Error('Could not extract valid sentences.');
            }

            // Initial summary (count = slider value, default 1)
            const count = parseInt(lengthSlider.value) || 1;
            const summary = generateSummaryFromMetadata(currentSentencesWithMetadata, count);
            displaySummary(summary);

        } catch (err) {
            console.error(err);
            alert('Error processing file: ' + err.message);
            showMain();
        }
    }

    function showLoading() {
        dropZone.classList.add('hidden');
        resultSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');
    }

    function showMain() {
        loadingSection.classList.add('hidden');
        dropZone.classList.remove('hidden');
    }

    function displaySummary(summaryItems) {
        loadingSection.classList.add('hidden');
        resultSection.classList.remove('hidden');

        summaryContent.innerHTML = '<ul>' +
            summaryItems.map(item => `
                <li>
                    <span class="page-badge">${escapeHtml(item.pageLabel)}</span>
                    ${escapeHtml(item.text)}
                </li>
            `).join('') +
            '</ul>';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Parsing Logic (Returns [{text: "...", pageLabel: "Page 1"}, ...]) ---

    async function parsePDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let chunks = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str);
            const pageText = strings.join('\n') + '\n';
            if (pageText.trim().length > 0) {
                chunks.push({ text: pageText, pageLabel: `Page ${i}` });
            }
        }
        return chunks;
    }

    async function parseDOCX(file) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        // DOCX is a single stream usually
        return [{ text: result.value, pageLabel: 'Doc' }];
    }

    async function parsePPTX(file) {
        const zip = await new JSZip().loadAsync(file);
        let chunks = [];

        const slideFiles = Object.keys(zip.files).filter(name =>
            name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
        );

        slideFiles.sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)\.xml/)[1]);
            const numB = parseInt(b.match(/slide(\d+)\.xml/)[1]);
            return numA - numB;
        });

        let index = 1;
        for (const filename of slideFiles) {
            const content = await zip.file(filename).async('text');
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(content, "text/xml");
            const textNodes = xmlDoc.getElementsByTagName("a:t");

            let slideText = '';
            for (let i = 0; i < textNodes.length; i++) {
                slideText += textNodes[i].textContent + '\n';
            }

            if (slideText.trim().length > 0) {
                chunks.push({ text: slideText, pageLabel: `Slide ${index}` });
            }
            index++;
        }
        return chunks;
    }

    function processToSentences(chunks) {
        let allSentences = [];
        chunks.forEach(chunk => {
            // Split by punctuation first, then cleanup
            const rawSentences = chunk.text.split(/[\n.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
            rawSentences.forEach(s => {
                allSentences.push({
                    text: s,
                    pageLabel: chunk.pageLabel,
                    id: allSentences.length // Keep generic ID
                });
            });
        });
        return allSentences;
    }

    // --- TextRank Logic with Metadata Support ---

    function generateSummaryFromMetadata(sentencesObj, count) {
        // sentencesObj: [{text, pageLabel, id}, ...]
        if (sentencesObj.length === 0) return [];
        if (sentencesObj.length <= count) return sentencesObj;

        // Tokenize
        const tokenized = sentencesObj.map(s => {
            return new Set(s.text.toLowerCase().replace(/[^\w\s]|[\d_]/g, '').split(/\s+/).filter(w => w.length > 3));
        });

        // Matrix
        const size = Math.min(sentencesObj.length, 300);
        const matrix = Array(size).fill(0).map(() => Array(size).fill(0));

        for (let i = 0; i < size; i++) {
            for (let j = i + 1; j < size; j++) {
                const intersection = new Set([...tokenized[i]].filter(x => tokenized[j].has(x)));
                const union = new Set([...tokenized[i], ...tokenized[j]]);
                const similarity = union.size === 0 ? 0 : intersection.size / union.size;

                matrix[i][j] = similarity;
                matrix[j][i] = similarity;
            }
        }

        // PageRank
        let scores = Array(size).fill(1.0);
        const d = 0.85;
        const iterations = 20;

        for (let iter = 0; iter < iterations; iter++) {
            const newScores = Array(size).fill(1 - d);
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    if (i !== j && matrix[i][j] > 0) {
                        const sumW_j = matrix[j].reduce((a, b) => a + b, 0);
                        if (sumW_j > 0) {
                            newScores[i] += d * (matrix[j][i] / sumW_j) * scores[j];
                        }
                    }
                }
            }
            scores = newScores;
        }

        // Rank
        const ranked = [];
        for (let i = 0; i < size; i++) {
            ranked.push({ ...sentencesObj[i], score: scores[i], originalIndex: i });
        }

        ranked.sort((a, b) => b.score - a.score);

        // Fallback if all scores same
        const allSame = scores.every(s => Math.abs(s - scores[0]) < 0.0001);
        if (allSame) {
            ranked.sort((a, b) => b.text.length - a.text.length);
        }

        // Select top N
        const topN = ranked.slice(0, count);

        // Restore original order
        topN.sort((a, b) => a.originalIndex - b.originalIndex);

        return topN;
    }
});
