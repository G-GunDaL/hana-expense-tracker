// --- State Variables ---
let wavesurfer;
let regionsPlugin;
let currentFile = null;
let currentBuffer = null; // The AudioBuffer
let audioContext = new (window.AudioContext || window.webkitAudioContext)();

// --- DOM Elements ---
const landingPage = document.getElementById('landing-page');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const editorInterface = document.getElementById('editor-interface');
const playPauseBtn = document.getElementById('btn-play-pause');
const volumeSlider = document.getElementById('volume-gain');
const volumeValue = document.getElementById('volume-value');
const saveBtn = document.getElementById('btn-save');
const formatSelect = document.getElementById('format-select');
const resetBtn = document.getElementById('btn-reset');
const closeBtn = document.getElementById('btn-close');

// --- Initialization ---
async function initWavesurfer() {
    // WaveSurfer and RegionsPlugin are now global variables from the script tags
    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: '#d1d5db', // Light Gray wave
        progressColor: '#3b82f6', // Bright Blue progress
        cursorColor: '#f59e0b', // Amber cursor
        barWidth: 2,
        barGap: 3,
        barRadius: 3,
        height: 300,
        normalize: true,
        backend: 'WebAudio', // Important for processing
        minPxPerSec: 50,
    });

    // Initialize Regions Plugin
    let regionscls = window.RegionsPlugin;
    if (!regionscls && window.WaveSurfer && window.WaveSurfer.Regions) {
        regionscls = window.WaveSurfer.Regions;
    }

    if (regionscls) {
        regionsPlugin = wavesurfer.registerPlugin(regionscls.create());
    } else {
        console.error("Regions plugin not found");
    }


    // Event Listeners for Wavesurfer
    wavesurfer.on('ready', () => {
        const duration = wavesurfer.getDuration();
        document.getElementById('total-duration').textContent = formatTime(duration);
        currentBuffer = wavesurfer.getDecodedData();

        // Add a default region covering the whole track
        if (regionsPlugin) {
            regionsPlugin.clearRegions(); // clear any existing
            const r = regionsPlugin.addRegion({
                start: 0,
                end: duration,
                color: 'rgba(59, 130, 246, 0.1)', // Light blue tint
                drag: true,
                resize: true
            });
            updateSelectionDisplay(r);
        }

        // Listen to region updates
        regionsPlugin.on('region-updated', (region) => {
            updateSelectionDisplay(region);
        });

        regionsPlugin.on('region-created', (region) => {
            // Ensure only one region exists or just show the latest
            updateSelectionDisplay(region);
        });
    });

    wavesurfer.on('audioprocess', () => {
        document.getElementById('current-time').textContent = formatTime(wavesurfer.getCurrentTime());
    });

    wavesurfer.on('seek', () => {
        document.getElementById('current-time').textContent = formatTime(wavesurfer.getCurrentTime());
    });

    wavesurfer.on('finish', () => {
        playPauseBtn.querySelector('span').textContent = 'play_arrow';
    });
}

function updateSelectionDisplay(region) {
    document.getElementById('selection-start').textContent = formatTime(region.start);
    document.getElementById('selection-end').textContent = formatTime(region.end);
}

// --- File Handling ---
function handleFiles(files) {
    if (files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('audio/')) {
        alert('Please upload an audio file.');
        return;
    }

    currentFile = file;
    document.getElementById('filename-display').textContent = file.name;

    // Switch UI
    landingPage.classList.add('hidden');
    editorInterface.classList.remove('hidden');

    // Due to some browser restrictions (AudioContext state), we initiate on user interaction
    if (!wavesurfer) {
        initWavesurfer();
    }

    // Create object URL
    const url = URL.createObjectURL(file);
    wavesurfer.load(url);

    playPauseBtn.querySelector('span').textContent = 'play_arrow';
}

// --- Interaction Handlers ---
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragging');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragging');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragging');
    handleFiles(e.dataTransfer.files);
});

dropZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

playPauseBtn.addEventListener('click', () => {
    wavesurfer.playPause();
    const icon = wavesurfer.isPlaying() ? 'pause' : 'play_arrow';
    playPauseBtn.querySelector('span').textContent = icon;
});

volumeSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    wavesurfer.setVolume(val); // UI listening volume
    volumeValue.textContent = Math.round(val * 100) + '%';
});

closeBtn.addEventListener('click', () => {
    // Just hide editor and show landing
    wavesurfer.stop();
    editorInterface.classList.add('hidden');
    landingPage.classList.remove('hidden');
    // Maybe clear file input
    fileInput.value = '';
});

resetBtn.addEventListener('click', () => {
    if (wavesurfer) {
        wavesurfer.seekTo(0);
        wavesurfer.setVolume(1);
        volumeSlider.value = 1;
        volumeValue.textContent = "100%";
        if (regionsPlugin) {
            regionsPlugin.clearRegions();
            const duration = wavesurfer.getDuration();
            regionsPlugin.addRegion({
                start: 0,
                end: duration,
                color: 'rgba(59, 130, 246, 0.1)'
            });
        }
    }
});

// --- Export Logic ---
saveBtn.addEventListener('click', async () => {
    // Note: currentBuffer might be null if wavesurfer hasn't decoded it fully or if backend is not WebAudio

    if (!wavesurfer.getDecodedData()) {
        alert("Audio not ready yet");
        return;
    }
    currentBuffer = wavesurfer.getDecodedData();

    saveBtn.textContent = 'Processing...';
    saveBtn.disabled = true;

    try {
        const regions = regionsPlugin ? regionsPlugin.getRegions() : [];
        let start = 0;
        let end = currentBuffer.duration;

        if (regions.length > 0) {
            const r = regions[regions.length - 1]; // Use last/latest region? or first?
            // Usually we only maintain one, but let's be safe
            start = r.start;
            end = r.end;
        }

        const gain = parseFloat(volumeSlider.value);
        const sampleRate = currentBuffer.sampleRate;
        const numberOfChannels = currentBuffer.numberOfChannels;
        const duration = end - start;
        const length = Math.floor(duration * sampleRate);

        if (length <= 0) {
            throw new Error("Invalid Selection Length");
        }

        const context = new OfflineAudioContext(numberOfChannels, length, sampleRate);

        const source = context.createBufferSource();
        source.buffer = currentBuffer;

        const gainNode = context.createGain();
        gainNode.gain.value = gain;

        source.connect(gainNode);
        gainNode.connect(context.destination);

        source.start(0, start, duration);

        const renderedBuffer = await context.startRendering();

        // Convert and Download
        const format = formatSelect.value;
        if (format === 'mp3') {
            await downloadMp3(renderedBuffer);
        } else {
            downloadWav(renderedBuffer);
        }

    } catch (err) {
        console.error(err);
        alert('Error saving file: ' + err.message);
    } finally {
        saveBtn.textContent = 'Save Output';
        saveBtn.disabled = false;
    }
});


// --- Helper Functions ---

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

// WAV Encoder
function downloadWav(buffer) {
    const wavBlob = audioBufferToWav(buffer);
    downloadBlob(wavBlob, `converted_${Date.now()}.wav`);
}

// MP3 Encoder
async function downloadMp3(buffer) {
    if (typeof lamejs === 'undefined') {
        alert('MP3 Encoder library (lamejs) not loaded.');
        return;
    }

    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const mp3enc = new lamejs.Mp3Encoder(channels, sampleRate, 128); // 128kbps
    const mp3Data = [];

    const left = buffer.getChannelData(0);
    const right = channels > 1 ? buffer.getChannelData(1) : left;

    const sampleBlockSize = 1152;

    // Float to Int16
    const floatTo16Bit = (input) => {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
    }

    const left16 = floatTo16Bit(left);
    const right16 = floatTo16Bit(right);

    let remaining = left16.length;
    for (let i = 0; i < remaining; i += sampleBlockSize) {
        const leftChunk = left16.subarray(i, i + sampleBlockSize);
        const rightChunk = right16.subarray(i, i + sampleBlockSize);

        let mp3buf;
        if (channels === 2) {
            mp3buf = mp3enc.encodeBuffer(leftChunk, rightChunk);
        } else {
            mp3buf = mp3enc.encodeBuffer(leftChunk);
        }

        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }

    const mp3buf = mp3enc.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }

    const blob = new Blob(mp3Data, { type: 'audio/mp3' });
    downloadBlob(blob, `converted_${Date.now()}.mp3`);
}


function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

function audioBufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels = [];
    let i, sample, offset = 0, pos = 0;

    // RIFF chunk
    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);

    // fmt chunk
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);

    // data chunk
    setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (i = 0; i < buffer.numberOfChannels; i++)
        channels.push(buffer.getChannelData(i));

    while (pos < buffer.length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][pos]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(44 + offset, sample, true);
            offset += 2;
        }
        pos++;
    }

    return new Blob([bufferArr], { type: "audio/wav" });

    function setUint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}
