// Captura de foto amb la webcam directament des del navegador (per a PC/portàtils
// on l'atribut `capture` d'un <input type="file"> no obre cap càmera nativa).
// Un cop confirmada la foto, s'afegeix com a fitxer real a l'<input type="file">
// indicat, perquè es pugi exactament igual que un fitxer triat manualment.
(function () {
    let cameraStream = null;
    let cameraTargetInputId = null;

    function ensureCameraModal() {
        if (document.getElementById('cameraCaptureModal')) return;

        const modalHtml = `
        <div class="modal fade" id="cameraCaptureModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title"><i class="bi bi-camera"></i> Fer una foto</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tancar"></button>
              </div>
              <div class="modal-body text-center">
                <div id="cameraCaptureError" class="alert alert-danger d-none"></div>
                <video id="cameraCaptureVideo" autoplay playsinline muted style="width:100%; max-height:60vh; background:#000;"></video>
                <canvas id="cameraCaptureCanvas" style="width:100%; max-height:60vh; display:none;"></canvas>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel·lar</button>
                <button type="button" class="btn btn-outline-primary d-none" id="cameraCaptureRetake" onclick="cameraCaptureRetake()">
                    <i class="bi bi-arrow-counterclockwise"></i> Tornar a fer-la
                </button>
                <button type="button" class="btn btn-primary" id="cameraCaptureShoot" onclick="cameraCaptureShoot()">
                    <i class="bi bi-camera-fill"></i> Capturar
                </button>
                <button type="button" class="btn btn-success d-none" id="cameraCaptureUse" onclick="cameraCaptureUse()">
                    <i class="bi bi-check-circle"></i> Utilitzar aquesta foto
                </button>
              </div>
            </div>
          </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.getElementById('cameraCaptureModal').addEventListener('hidden.bs.modal', stopCameraStream);
    }

    function stopCameraStream() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
    }

    function showCameraError(message) {
        const err = document.getElementById('cameraCaptureError');
        err.textContent = message;
        err.classList.remove('d-none');
    }

    function resetCameraView() {
        const video = document.getElementById('cameraCaptureVideo');
        const canvas = document.getElementById('cameraCaptureCanvas');
        video.style.display = '';
        canvas.style.display = 'none';
        document.getElementById('cameraCaptureShoot').classList.remove('d-none');
        document.getElementById('cameraCaptureRetake').classList.add('d-none');
        document.getElementById('cameraCaptureUse').classList.add('d-none');
    }

    window.openCameraCapture = function (inputId) {
        ensureCameraModal();
        cameraTargetInputId = inputId;

        document.getElementById('cameraCaptureError').classList.add('d-none');
        resetCameraView();

        const modal = new bootstrap.Modal(document.getElementById('cameraCaptureModal'));
        modal.show();

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showCameraError('Aquest navegador no permet obrir la càmera des de la pàgina. Si ets en un mòbil, utilitza el camp "Fer una foto (mòbil)" en lloc d\'aquest botó.');
            return;
        }

        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
            .then(stream => {
                cameraStream = stream;
                document.getElementById('cameraCaptureVideo').srcObject = stream;
            })
            .catch(error => {
                let msg = 'No s\'ha pogut obrir la càmera.';
                const contextSegur = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
                if (!contextSegur) {
                    msg += ' Aquest navegador només permet obrir la càmera en connexions segures (HTTPS) o en aquest mateix ordinador (localhost). Si hi accedeixes des d\'un mòbil per xarxa local, utilitza el camp "Fer una foto (mòbil)" en lloc d\'aquest botó.';
                } else if (error.name === 'NotAllowedError') {
                    msg += ' Cal donar permís d\'accés a la càmera al navegador.';
                } else if (error.name === 'NotFoundError') {
                    msg += ' No s\'ha trobat cap càmera en aquest dispositiu.';
                }
                showCameraError(msg);
            });
    };

    window.cameraCaptureShoot = function () {
        const video = document.getElementById('cameraCaptureVideo');
        const canvas = document.getElementById('cameraCaptureCanvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

        video.style.display = 'none';
        canvas.style.display = '';
        document.getElementById('cameraCaptureShoot').classList.add('d-none');
        document.getElementById('cameraCaptureRetake').classList.remove('d-none');
        document.getElementById('cameraCaptureUse').classList.remove('d-none');
    };

    window.cameraCaptureRetake = function () {
        resetCameraView();
    };

    window.cameraCaptureUse = function () {
        const canvas = document.getElementById('cameraCaptureCanvas');
        canvas.toBlob(function (blob) {
            const file = new File([blob], 'foto-' + Date.now() + '.jpg', { type: 'image/jpeg' });
            const input = document.getElementById(cameraTargetInputId);
            if (input) {
                const dataTransfer = new DataTransfer();
                Array.from(input.files || []).forEach(f => dataTransfer.items.add(f));
                dataTransfer.items.add(file);
                input.files = dataTransfer.files;
            }
            bootstrap.Modal.getInstance(document.getElementById('cameraCaptureModal')).hide();
        }, 'image/jpeg', 0.9);
    };
})();
