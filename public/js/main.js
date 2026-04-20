// Auto-dismiss flash alerts after 4.5s
document.querySelectorAll('.flash-alert').forEach(function(alert) {
  setTimeout(function() {
    var bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
    if (bsAlert) bsAlert.close();
  }, 4500);
});

// Conditional registration fields
var roleSelect = document.getElementById('roleSelect');
if (roleSelect) {
  var employerFields = document.getElementById('employerFields');
  var recruiterFields = document.getElementById('recruiterFields');
  function toggleFields() {
    var val = roleSelect.value;
    if (employerFields) employerFields.classList.toggle('active', val === 'employer');
    if (recruiterFields) recruiterFields.classList.toggle('active', val === 'recruiter');
  }
  roleSelect.addEventListener('change', toggleFields);
  toggleFields();
}

// File upload preview
function initFileUpload(inputId, previewId, labelId) {
  var input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('change', function() {
    var file = this.files[0];
    if (!file) return;
    var label = document.getElementById(labelId);
    if (label) label.textContent = file.name;
    var preview = document.getElementById(previewId);
    if (preview && file.type.startsWith('image/')) {
      var reader = new FileReader();
      reader.onload = function(e) { preview.src = e.target.result; preview.style.display = 'block'; };
      reader.readAsDataURL(file);
    }
  });
}
initFileUpload('imageInput', 'imagePreview', 'imageLabel');
initFileUpload('logoInput', 'logoPreview', 'logoLabel');
initFileUpload('resumeInput', null, 'resumeLabel');

// Bootstrap form validation
(function() {
  var forms = document.querySelectorAll('.needs-validation');
  Array.from(forms).forEach(function(form) {
    form.addEventListener('submit', function(e) {
      if (!form.checkValidity()) { e.preventDefault(); e.stopPropagation(); }
      form.classList.add('was-validated');
    }, false);
  });
})();

// Job card click navigation
document.querySelectorAll('.job-card[data-href]').forEach(function(card) {
  card.addEventListener('click', function(e) {
    if (!e.target.closest('a, button, form')) window.location.href = card.dataset.href;
  });
});

// Confirm delete/withdraw dialogs
document.querySelectorAll('[data-confirm]').forEach(function(el) {
  el.addEventListener('click', function(e) {
    if (!confirm(el.dataset.confirm)) { e.preventDefault(); e.stopPropagation(); }
  });
});

// Toggle password visibility
function togglePass(id, btn) {
  var input = document.getElementById(id);
  var isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  btn.innerHTML = isPass ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
}
