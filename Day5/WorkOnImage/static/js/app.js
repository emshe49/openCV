/**
 * VisionLab Studio - OpenCV Day 5 Image Processing Frontend
 * Interactive Gaussian Blur, Median Blur, and Sharpening with Split Compare & Download
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        originalImageSrc: null,
        processedImageSrc: null,
        originalFile: null,
        imageDimensions: { width: 0, height: 0 },
        activeFilter: 'gaussian',
        viewMode: 'split',
        sliderPos: 50,
        isDraggingSlider: false,
        backendOnline: false,
        debounceTimer: null,
        params: {
            gaussian: { ksize: 9, sigma: 2.0 },
            median: { ksize: 11 },
            sharpen: { type: 'standard', strength: 1.0 }
        }
    };

    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnUseSample = document.getElementById('btn-use-sample');
    const btnSampleHeader = document.getElementById('btn-sample-header');
    const btnEmptySample = document.getElementById('btn-empty-sample');
    const btnEmptyUpload = document.getElementById('btn-empty-upload');
    const btnApply = document.getElementById('btn-apply');
    const btnReset = document.getElementById('btn-reset');
    const btnDownload = document.getElementById('btn-download');
    const btnCopyCode = document.getElementById('btn-copy-code');
    const backendStatus = document.getElementById('backend-status');
    const imageMetaPill = document.getElementById('image-meta-pill');

    const viewerContainer = document.getElementById('viewer-container');
    const emptyState = document.getElementById('empty-state');
    const splitView = document.getElementById('split-view');
    const sideBySideView = document.getElementById('side-by-side-view');
    const singleView = document.getElementById('single-view');

    const imgOriginal = document.getElementById('img-original');
    const imgProcessed = document.getElementById('img-processed');
    const processedWrapper = document.getElementById('processed-wrapper');
    const sliderDivider = document.getElementById('slider-divider');

    const sideImgOriginal = document.getElementById('side-img-original');
    const sideImgProcessed = document.getElementById('side-img-processed');
    const sideFilterLabel = document.getElementById('side-filter-label');
    const singleImgProcessed = document.getElementById('single-img-processed');

    const statDims = document.getElementById('stat-dims');
    const statLatency = document.getElementById('stat-latency');
    const codeSnippet = document.getElementById('code-snippet');
    const matrixDisplay = document.getElementById('matrix-display');

    // Controls Elements
    const gaussianKsize = document.getElementById('gaussian-ksize');
    const gaussianKsizeVal = document.getElementById('gaussian-ksize-val');
    const gaussianSigma = document.getElementById('gaussian-sigma');
    const gaussianSigmaVal = document.getElementById('gaussian-sigma-val');

    const medianKsize = document.getElementById('median-ksize');
    const medianKsizeVal = document.getElementById('median-ksize-val');

    const sharpenStrength = document.getElementById('sharpen-strength');
    const sharpenStrengthVal = document.getElementById('sharpen-strength-val');

    // =========================================================================
    // Initialization & Backend Check
    // =========================================================================
    async function checkBackend() {
        try {
            const res = await fetch('/api/sample', { method: 'HEAD' });
            if (res.ok) {
                state.backendOnline = true;
                backendStatus.className = 'status-pill status-online';
                backendStatus.querySelector('.status-text').textContent = 'OpenCV Backend Active';
            } else {
                throw new Error('Non-ok response');
            }
        } catch (e) {
            state.backendOnline = false;
            backendStatus.className = 'status-pill status-offline';
            backendStatus.querySelector('.status-text').textContent = 'In-Browser Engine (Client)';
        }
    }

    // =========================================================================
    // Tab Navigation & Filter Selection
    // =========================================================================
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = {
        gaussian: document.getElementById('controls-gaussian'),
        median: document.getElementById('controls-median'),
        sharpen: document.getElementById('controls-sharpen')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const filter = tab.dataset.filter;
            if (state.activeFilter === filter) return;

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            Object.keys(panels).forEach(key => {
                panels[key].classList.toggle('active', key === filter);
            });

            state.activeFilter = filter;
            updateCodeAndMatrixDisplay();
            if (state.originalImageSrc) {
                scheduleProcess();
            }
        });
    });

    // =========================================================================
    // Parameter Sliders & Segmented Buttons
    // =========================================================================
    gaussianKsize.addEventListener('input', (e) => {
        let val = parseInt(e.target.value, 10);
        if (val % 2 === 0) val += 1;
        gaussianKsizeVal.textContent = `${val} × ${val}`;
        state.params.gaussian.ksize = val;
        updateCodeAndMatrixDisplay();
        scheduleProcess();
    });

    gaussianSigma.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        gaussianSigmaVal.textContent = val.toFixed(1);
        state.params.gaussian.sigma = val;
        updateCodeAndMatrixDisplay();
        scheduleProcess();
    });

    medianKsize.addEventListener('input', (e) => {
        let val = parseInt(e.target.value, 10);
        if (val % 2 === 0) val += 1;
        medianKsizeVal.textContent = val;
        state.params.median.ksize = val;
        updateCodeAndMatrixDisplay();
        scheduleProcess();
    });

    const sharpenSegments = document.querySelectorAll('.segment-btn');
    sharpenSegments.forEach(btn => {
        btn.addEventListener('click', () => {
            sharpenSegments.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.params.sharpen.type = btn.dataset.kernel;
            updateCodeAndMatrixDisplay();
            scheduleProcess();
        });
    });

    sharpenStrength.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        sharpenStrengthVal.textContent = `${val.toFixed(1)}×`;
        state.params.sharpen.strength = val;
        updateCodeAndMatrixDisplay();
        scheduleProcess();
    });

    // =========================================================================
    // View Mode Switching
    // =========================================================================
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.viewMode = mode;
            renderViewMode();
        });
    });

    function renderViewMode() {
        if (!state.originalImageSrc) {
            emptyState.classList.remove('hidden');
            splitView.classList.add('hidden');
            sideBySideView.classList.add('hidden');
            singleView.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        splitView.classList.toggle('hidden', state.viewMode !== 'split');
        sideBySideView.classList.toggle('hidden', state.viewMode !== 'side-by-side');
        singleView.classList.toggle('hidden', state.viewMode !== 'processed');

        if (state.viewMode === 'split') {
            updateSplitPosition(state.sliderPos);
        }
    }

    // =========================================================================
    // Split View Slider Dragging Logic
    // =========================================================================
    function updateSplitPosition(percent) {
        percent = Math.max(0, Math.min(100, percent));
        state.sliderPos = percent;
        sliderDivider.style.left = `${percent}%`;
        processedWrapper.style.clipPath = `polygon(${percent}% 0, 100% 0, 100% 100%, ${percent}% 100%)`;
    }

    function onPointerMove(e) {
        if (!state.isDraggingSlider) return;
        const rect = splitView.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        if (clientX === undefined) return;
        const posPercent = ((clientX - rect.left) / rect.width) * 100;
        updateSplitPosition(posPercent);
    }

    function stopDragging() {
        state.isDraggingSlider = false;
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('mouseup', stopDragging);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('touchend', stopDragging);
    }

    sliderDivider.addEventListener('mousedown', (e) => {
        state.isDraggingSlider = true;
        e.preventDefault();
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', stopDragging);
    });

    sliderDivider.addEventListener('touchstart', (e) => {
        state.isDraggingSlider = true;
        window.addEventListener('touchmove', onPointerMove, { passive: true });
        window.addEventListener('touchend', stopDragging);
    });

    // =========================================================================
    // Image Loading & Handling
    // =========================================================================
    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert('Please select a valid image file (PNG, JPG, WebP).');
            return;
        }
        state.originalFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            loadImageSource(e.target.result, file.name);
        };
        reader.readAsDataURL(file);
    }

    function loadImageSource(src, fileName = 'image.jpg') {
        const testImg = new Image();
        testImg.onload = () => {
            state.originalImageSrc = src;
            state.imageDimensions = { width: testImg.naturalWidth, height: testImg.naturalHeight };

            imgOriginal.src = src;
            sideImgOriginal.src = src;

            imageMetaPill.textContent = `${testImg.naturalWidth}×${testImg.naturalHeight}px`;
            imageMetaPill.classList.remove('hidden');

            statDims.textContent = `${testImg.naturalWidth} × ${testImg.naturalHeight}`;

            btnApply.disabled = false;
            btnDownload.disabled = false;

            renderViewMode();
            processImage();
        };
        testImg.src = src;
    }

    function loadSampleImage() {
        loadImageSource('/static/draw.jpg', 'draw.jpg');
    }

    // Dropzone Events
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt.files.length) handleFile(dt.files[0]);
    });

    // Sample buttons
    btnUseSample.addEventListener('click', loadSampleImage);
    btnSampleHeader.addEventListener('click', loadSampleImage);
    btnEmptySample.addEventListener('click', loadSampleImage);
    btnEmptyUpload.addEventListener('click', () => fileInput.click());

    // Reset button
    btnReset.addEventListener('click', () => {
        if (!state.originalImageSrc) return;
        state.params = {
            gaussian: { ksize: 9, sigma: 2.0 },
            median: { ksize: 11 },
            sharpen: { type: 'standard', strength: 1.0 }
        };
        gaussianKsize.value = 9;
        gaussianKsizeVal.textContent = '9 × 9';
        gaussianSigma.value = 2.0;
        gaussianSigmaVal.textContent = '2.0';
        medianKsize.value = 11;
        medianKsizeVal.textContent = '11';
        sharpenStrength.value = 1.0;
        sharpenStrengthVal.textContent = '1.0×';
        sharpenSegments.forEach(b => b.classList.toggle('active', b.dataset.kernel === 'standard'));

        updateCodeAndMatrixDisplay();
        processImage();
    });

    // =========================================================================
    // Core Image Processing (OpenCV Backend + Client Fallback)
    // =========================================================================
    function scheduleProcess() {
        clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(() => {
            processImage();
        }, 120);
    }

    btnApply.addEventListener('click', () => processImage());

    async function processImage() {
        if (!state.originalImageSrc) return;

        setLoading(true);
        const startTime = performance.now();

        try {
            // Attempt to call OpenCV Flask backend
            const formData = new FormData();
            formData.append('filter_type', state.activeFilter);

            if (state.originalFile) {
                formData.append('file', state.originalFile);
            } else {
                formData.append('image_b64', state.originalImageSrc);
            }

            if (state.activeFilter === 'gaussian') {
                formData.append('gaussian_ksize', state.params.gaussian.ksize);
                formData.append('gaussian_sigma', state.params.gaussian.sigma);
            } else if (state.activeFilter === 'median') {
                formData.append('median_ksize', state.params.median.ksize);
            } else if (state.activeFilter === 'sharpen') {
                formData.append('sharpen_type', state.params.sharpen.type);
                formData.append('sharpen_strength', state.params.sharpen.strength);
            }

            const response = await fetch('/api/process', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server returned HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success && data.image) {
                displayProcessedResult(data.image, data.processing_time_ms);
            } else {
                throw new Error(data.error || 'Processing failed');
            }
        } catch (err) {
            console.warn('Backend call failed, falling back to Client-side Canvas:', err.message);
            // Fallback to in-browser Canvas
            processWithCanvas(startTime);
        } finally {
            setLoading(false);
        }
    }

    function displayProcessedResult(dataUrl, latencyMs) {
        state.processedImageSrc = dataUrl;
        imgProcessed.src = dataUrl;
        sideImgProcessed.src = dataUrl;
        singleImgProcessed.src = dataUrl;

        sideFilterLabel.textContent = formatFilterName(state.activeFilter);
        statLatency.textContent = `${latencyMs} ms`;
        btnDownload.disabled = false;
        renderViewMode();
    }

    function setLoading(isLoading) {
        const spinner = btnApply.querySelector('.btn-spinner');
        const text = btnApply.querySelector('.btn-text');
        if (isLoading) {
            spinner.classList.remove('hidden');
            text.textContent = 'Processing...';
            btnApply.disabled = true;
        } else {
            spinner.classList.add('hidden');
            text.textContent = 'Apply Filter';
            btnApply.disabled = false;
        }
    }

    // =========================================================================
    // Client-side HTML5 Canvas Fallback (Gaussian, Median, Sharpening)
    // =========================================================================
    function processWithCanvas(startTime) {
        const canvas = document.getElementById('offscreen-canvas');
        const ctx = canvas.getContext('2d');
        const img = imgOriginal;

        canvas.width = img.naturalWidth || 640;
        canvas.height = img.naturalHeight || 480;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const w = canvas.width;
        const h = canvas.height;

        if (state.activeFilter === 'gaussian') {
            // Approximated Gaussian / Box Blur stack
            const k = state.params.gaussian.ksize;
            boxBlur(imgData.data, w, h, Math.floor(k / 2));
        } else if (state.activeFilter === 'median') {
            // Median Filter
            const k = Math.min(state.params.median.ksize, 9); // limit k for pure JS speed
            medianFilterCanvas(imgData.data, w, h, k);
        } else if (state.activeFilter === 'sharpen') {
            // 2D Convolution with Laplacian kernel
            const strength = state.params.sharpen.strength;
            let kernel;
            if (state.params.sharpen.type === 'excessive') {
                kernel = [
                    -strength, -strength, -strength,
                    -strength, 1 + 8 * strength, -strength,
                    -strength, -strength, -strength
                ];
            } else {
                // Day 5 standard: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]]
                kernel = [
                    0, -strength, 0,
                    -strength, 1 + 4 * strength, -strength,
                    0, -strength, 0
                ];
            }
            convolve3x3(imgData.data, w, h, kernel);
        }

        ctx.putImageData(imgData, 0, 0);
        const latency = (performance.now() - startTime).toFixed(1);
        displayProcessedResult(canvas.toDataURL('image/jpeg', 0.92), latency);
    }

    function convolve3x3(data, w, h, kernel) {
        const copy = new Uint8ClampedArray(data);
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const idx = (y * w + x) * 4;
                for (let c = 0; c < 3; c++) {
                    let acc = 0;
                    acc += copy[((y - 1) * w + (x - 1)) * 4 + c] * kernel[0];
                    acc += copy[((y - 1) * w + (x)) * 4 + c] * kernel[1];
                    acc += copy[((y - 1) * w + (x + 1)) * 4 + c] * kernel[2];
                    acc += copy[((y) * w + (x - 1)) * 4 + c] * kernel[3];
                    acc += copy[((y) * w + (x)) * 4 + c] * kernel[4];
                    acc += copy[((y) * w + (x + 1)) * 4 + c] * kernel[5];
                    acc += copy[((y + 1) * w + (x - 1)) * 4 + c] * kernel[6];
                    acc += copy[((y + 1) * w + (x)) * 4 + c] * kernel[7];
                    acc += copy[((y + 1) * w + (x + 1)) * 4 + c] * kernel[8];
                    data[idx + c] = Math.max(0, Math.min(255, acc));
                }
            }
        }
    }

    function boxBlur(data, w, h, r) {
        if (r < 1) return;
        const copy = new Uint8ClampedArray(data);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let rSum = 0, gSum = 0, bSum = 0, count = 0;
                for (let ky = -r; ky <= r; ky += 2) {
                    const ny = Math.min(h - 1, Math.max(0, y + ky));
                    for (let kx = -r; kx <= r; kx += 2) {
                        const nx = Math.min(w - 1, Math.max(0, x + kx));
                        const i = (ny * w + nx) * 4;
                        rSum += copy[i];
                        gSum += copy[i + 1];
                        bSum += copy[i + 2];
                        count++;
                    }
                }
                const idx = (y * w + x) * 4;
                data[idx] = rSum / count;
                data[idx + 1] = gSum / count;
                data[idx + 2] = bSum / count;
            }
        }
    }

    function medianFilterCanvas(data, w, h, k) {
        const rad = Math.floor(k / 2);
        const copy = new Uint8ClampedArray(data);
        const windowR = [];
        const windowG = [];
        const windowB = [];

        for (let y = rad; y < h - rad; y += 2) {
            for (let x = rad; x < w - rad; x += 2) {
                windowR.length = 0;
                windowG.length = 0;
                windowB.length = 0;
                for (let dy = -rad; dy <= rad; dy++) {
                    for (let dx = -rad; dx <= rad; dx++) {
                        const i = ((y + dy) * w + (x + dx)) * 4;
                        windowR.push(copy[i]);
                        windowG.push(copy[i + 1]);
                        windowB.push(copy[i + 2]);
                    }
                }
                windowR.sort((a, b) => a - b);
                windowG.sort((a, b) => a - b);
                windowB.sort((a, b) => a - b);
                const mid = Math.floor(windowR.length / 2);

                const idx = (y * w + x) * 4;
                data[idx] = windowR[mid];
                data[idx + 1] = windowG[mid];
                data[idx + 2] = windowB[mid];
            }
        }
    }

    // =========================================================================
    // Matrix Display & Code Generator
    // =========================================================================
    function updateCodeAndMatrixDisplay() {
        matrixDisplay.innerHTML = '';

        if (state.activeFilter === 'gaussian') {
            const k = state.params.gaussian.ksize;
            const s = state.params.gaussian.sigma;
            codeSnippet.textContent = `cv2.GaussianBlur(image, (${k}, ${k}), ${s})`;

            // Render 3x3 sample Gaussian approximation
            matrixDisplay.style.gridTemplateColumns = 'repeat(3, 1fr)';
            const sampleKernel = [
                ['1/16', '2/16', '1/16'],
                ['2/16', '4/16', '2/16'],
                ['1/16', '2/16', '1/16']
            ];
            sampleKernel.forEach((row, ri) => {
                row.forEach((cell, ci) => {
                    const el = document.createElement('div');
                    el.className = 'matrix-cell' + (ri === 1 && ci === 1 ? ' center-cell' : '');
                    el.textContent = cell;
                    matrixDisplay.appendChild(el);
                });
            });

        } else if (state.activeFilter === 'median') {
            const k = state.params.median.ksize;
            codeSnippet.textContent = `cv2.medianBlur(image, ${k})`;

            matrixDisplay.style.gridTemplateColumns = '1fr';
            const el = document.createElement('div');
            el.className = 'matrix-cell';
            el.textContent = `Sorts ${k}×${k} neighboring pixels & picks median`;
            matrixDisplay.appendChild(el);

        } else if (state.activeFilter === 'sharpen') {
            const st = state.params.sharpen.type;
            const strength = state.params.sharpen.strength;

            matrixDisplay.style.gridTemplateColumns = 'repeat(3, 1fr)';
            let kMatrix = [];

            if (st === 'excessive') {
                codeSnippet.textContent = `kernel = np.array([\n  [-1, -1, -1],\n  [-1,  9, -1],\n  [-1, -1, -1]\n])\ncv2.filter2D(image, -1, kernel * ${strength})`;
                kMatrix = [
                    [-strength, -strength, -strength],
                    [-strength, 1 + 8 * strength, -strength],
                    [-strength, -strength, -strength]
                ];
            } else if (st === 'unsharp') {
                codeSnippet.textContent = `gaussian = cv2.GaussianBlur(image, (9, 9), 2.0)\nsharpened = cv2.addWeighted(image, ${1 + strength}, gaussian, -${strength}, 0)`;
                matrixDisplay.style.gridTemplateColumns = '1fr';
                const el = document.createElement('div');
                el.className = 'matrix-cell';
                el.textContent = `Unsharp Mask: Image + ${strength} × (Image - Gaussian)`;
                matrixDisplay.appendChild(el);
                return;
            } else {
                // Day 5 standard
                codeSnippet.textContent = `kernel = np.array([\n  [0, -1, 0],\n  [-1, 5, -1],\n  [0, -1, 0]\n])\ncv2.filter2D(image, -1, kernel)`;
                kMatrix = [
                    [0, -strength, 0],
                    [-strength, 1 + 4 * strength, -strength],
                    [0, -strength, 0]
                ];
            }

            kMatrix.forEach((row, ri) => {
                row.forEach((cell, ci) => {
                    const el = document.createElement('div');
                    el.className = 'matrix-cell' + (ri === 1 && ci === 1 ? ' center-cell' : '');
                    el.textContent = Number(cell).toFixed(1);
                    matrixDisplay.appendChild(el);
                });
            });
        }
    }

    // Copy Code snippet
    btnCopyCode.addEventListener('click', () => {
        navigator.clipboard.writeText(codeSnippet.textContent).then(() => {
            btnCopyCode.textContent = 'Copied!';
            setTimeout(() => {
                btnCopyCode.textContent = 'Copy';
            }, 1800);
        });
    });

    // =========================================================================
    // Image Download
    // =========================================================================
    btnDownload.addEventListener('click', () => {
        if (!state.processedImageSrc) return;

        const a = document.createElement('a');
        a.href = state.processedImageSrc;

        let filename = 'processed_image';
        if (state.activeFilter === 'gaussian') {
            filename = `gaussian_blur_k${state.params.gaussian.ksize}_s${state.params.gaussian.sigma}.jpg`;
        } else if (state.activeFilter === 'median') {
            filename = `median_blur_k${state.params.median.ksize}.jpg`;
        } else if (state.activeFilter === 'sharpen') {
            filename = `sharpen_${state.params.sharpen.type}_x${state.params.sharpen.strength}.jpg`;
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    function formatFilterName(filter) {
        if (filter === 'gaussian') return 'Gaussian Blur';
        if (filter === 'median') return 'Median Blur';
        if (filter === 'sharpen') return 'Sharpened';
        return filter;
    }

    // Startup
    checkBackend();
    updateCodeAndMatrixDisplay();
    // Pre-load draw.jpg automatically so user immediately has working interactive experience!
    loadSampleImage();
});
