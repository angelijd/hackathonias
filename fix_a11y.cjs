const fs = require('fs');
const path = require('path');

const a11yPath = path.join(__dirname, 'public', 'a11y', 'accessibility.js');
let content = fs.readFileSync(a11yPath, 'utf8');

const injectionOld = `  document.body.appendChild(widget);

  // 2. Widget Flutuante de Informação ℹ️
  var infoWidget = document.createElement('button');
  infoWidget.id = 'ias-info-widget';
  infoWidget.innerHTML = 'ℹ️';
  infoWidget.setAttribute('aria-label', 'Fundamentação Teórica do Projeto');
  infoWidget.setAttribute('title', 'Fundamentação Teórica');
  document.body.appendChild(infoWidget);

  // Menu de Acessibilidade
  var menu = document.createElement('div');
  menu.id = 'ias-a11y-menu';
  menu.innerHTML = '<button class="ias-a11y-btn" id="ias-btn-contrast">👁️‍🗨️ Modo Adaptado (Alto Contraste)</button>' +
                   '<button class="ias-a11y-btn" id="ias-btn-info-menu">📚 Fundamentação Teórica</button>';
  document.body.appendChild(menu);

  // Modal de Fundamentação Teórica
  var backdrop = document.createElement('div');
  backdrop.id = 'ias-info-modal-backdrop';
  backdrop.innerHTML = '<div id="ias-info-modal" role="dialog" aria-modal="true">' +
    '<div class="ias-modal-header">' +
      '<h2 id="ias-modal-title">📚 Fundamentação Teórica - Instituto Ayrton Senna</h2>' +
      '<button class="ias-modal-close" id="ias-modal-close-btn" aria-label="Fechar">&times;</button>' +
    '</div>' +
    '<div class="ias-modal-body">' + modalHtmlContent + '</div>' +
  '</div>';
  document.body.appendChild(backdrop);`;

const injectionNew = `  // Append widgets ONLY on the opening screen (root or login)
  var isOpeningScreen = window.location.pathname === '/' || window.location.pathname === '/login' || window.location.pathname === '/index.html';
  
  if (isOpeningScreen) {
    document.body.appendChild(widget);
  }

  // 2. Widget Flutuante de Informação ℹ️
  var infoWidget = document.createElement('button');
  infoWidget.id = 'ias-info-widget';
  infoWidget.innerHTML = 'ℹ️';
  infoWidget.setAttribute('aria-label', 'Fundamentação Teórica do Projeto');
  infoWidget.setAttribute('title', 'Fundamentação Teórica');
  if (isOpeningScreen) {
    document.body.appendChild(infoWidget);
  }

  // Menu de Acessibilidade
  var menu = document.createElement('div');
  menu.id = 'ias-a11y-menu';
  menu.innerHTML = '<button class="ias-a11y-btn" id="ias-btn-contrast">👁️‍🗨️ Modo Adaptado (Alto Contraste)</button>' +
                   '<button class="ias-a11y-btn" id="ias-btn-info-menu">📚 Fundamentação Teórica</button>';
  if (isOpeningScreen) {
    document.body.appendChild(menu);
  }

  // Modal de Fundamentação Teórica
  var backdrop = document.createElement('div');
  backdrop.id = 'ias-info-modal-backdrop';
  backdrop.innerHTML = '<div id="ias-info-modal" role="dialog" aria-modal="true">' +
    '<div class="ias-modal-header">' +
      '<h2 id="ias-modal-title">📚 Fundamentação Teórica - Instituto Ayrton Senna</h2>' +
      '<button class="ias-modal-close" id="ias-modal-close-btn" aria-label="Fechar">&times;</button>' +
    '</div>' +
    '<div class="ias-modal-body">' + modalHtmlContent + '</div>' +
  '</div>';
  if (isOpeningScreen) {
    document.body.appendChild(backdrop);
  }`;

if (content.includes("document.body.appendChild(widget);")) {
  content = content.replace(injectionOld, injectionNew);
  fs.writeFileSync(a11yPath, content, 'utf8');
  console.log('Fixed A11y widget visibility.');
} else {
  console.log('Could not find injection block.');
}
