// Scripts JavaScript del client

// Confirmació abans d'eliminar
document.querySelectorAll('form[onsubmit]').forEach(form => {
    form.addEventListener('submit', function(e) {
        if (!confirm(this.getAttribute('onsubmit').replace('return confirm(', '').replace(')', ''))) {
            e.preventDefault();
        }
    });
});

// Tooltips de Bootstrap
document.addEventListener('DOMContentLoaded', function() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

// Funció per copiar al portapapers
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Copiat al portapapers');
    });
}

// Funció per confirmar accions
function confirmarMissatge(missatge) {
    return confirm(missatge);
}
