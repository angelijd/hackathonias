// accessibility.js
document.addEventListener('DOMContentLoaded', function() {

  var isOpeningScreen = window.location.pathname.includes("/login");

  // Widget Flutuante ♿
  var widget = document.createElement('button');
  widget.id = 'ias-a11y-widget';
  widget.innerHTML = '♿';
  widget.setAttribute('aria-label', 'Menu de Acessibilidade');
  if (isOpeningScreen) { document.body.appendChild(widget); }

  // Menu de Acessibilidade
  var menu = document.createElement('div');
  menu.id = 'ias-a11y-menu';
  menu.innerHTML = '<button class="ias-a11y-btn" id="ias-btn-contrast">👁️ Modo adaptado</button>' +
                   '';
  if (isOpeningScreen) { document.body.appendChild(menu); }

  widget.addEventListener('click', function() { menu.classList.toggle('active'); });

  var btnContrast = document.getElementById('ias-btn-contrast');
  if (btnContrast) {
    btnContrast.addEventListener('click', function() {
      document.body.classList.toggle('ias-a11y-mode');
      btnContrast.innerHTML = document.body.classList.contains('ias-a11y-mode') ?
        '👁️ Desativar Modo Adaptado' : '👁️ Modo adaptado';
    });
  }

});
