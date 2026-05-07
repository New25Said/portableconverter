const { FFmpeg } = FFmpegWASM;
const ffmpeg = new FFmpeg();

const consoleBox = document.getElementById('console');
const progressBar = document.getElementById('progressBar');
const statusText = document.getElementById('status');
const fileInput = document.getElementById('files');
const dropZone = document.getElementById('dropZone');

let selectedFiles = [];

function log(text) {
    consoleBox.textContent += text + '\n';
    consoleBox.scrollTop = consoleBox.scrollHeight;
}

async function loadFFmpeg() {

    log('Iniciando FFmpeg...');

    ffmpeg.on('log', ({ message }) => {
        log(message);
    });

    ffmpeg.on('progress', ({ progress }) => {
        const percent = Math.round(progress * 100);
        progressBar.style.width = percent + '%';
        statusText.textContent = 'Progreso: ' + percent + '%';
    });

    await ffmpeg.load({
        coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
        wasmURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm'
    });

    log('✅ FFmpeg cargado correctamente');
}

loadFFmpeg();

fileInput.addEventListener('change', () => {
    selectedFiles = [...fileInput.files];
});

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, e => {
        e.preventDefault();
        dropZone.classList.add('drag');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, e => {
        e.preventDefault();
        dropZone.classList.remove('drag');
    });
});

dropZone.addEventListener('drop', e => {
    selectedFiles = [...e.dataTransfer.files];
    log('📦 Archivos añadidos');
});

async function convertVideos() {

    if (!selectedFiles.length) {
        alert('Selecciona videos');
        return;
    }

    const zip = new JSZip();

    let current = 0;

    for (const file of selectedFiles) {

        current++;

        log('');
        log('===========================');
        log('🎬 Convirtiendo: ' + file.name);

        progressBar.style.width = '0%';

        const data = await file.arrayBuffer();

        await ffmpeg.writeFile(file.name, new Uint8Array(data));

        const outputName = file.name.replace('.mp4', '-p.avi');

        await ffmpeg.exec([
            '-i', file.name,

            '-vf',
            'scale=160:128:force_original_aspect_ratio=decrease,pad=160:128:(ow-iw)/2:(oh-ih)/2:black,transpose=2,vflip',

            '-r', '16',
            '-acodec', 'pcm_s16le',
            '-ac', '2',
            '-ar', '22050',
            '-pix_fmt', 'yuvj420p',
            '-c:v', 'mjpeg',
            '-q:v', '2',
            outputName
        ]);

        const outputData = await ffmpeg.readFile(outputName);

        zip.file(outputName, outputData);

        log('✅ Archivo convertido');

        statusText.textContent = `Completado ${current}/${selectedFiles.length}`;
    }

    log('');
    log('📦 Creando ZIP...');

    const zipBlob = await zip.generateAsync({ type: 'blob' });

    const url = URL.createObjectURL(zipBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'videos-convertidos.zip';
    a.click();

    log('🎉 Descarga lista');

    statusText.textContent = 'Conversión finalizada';
}

document
.getElementById('convertBtn')
.addEventListener('click', convertVideos);
