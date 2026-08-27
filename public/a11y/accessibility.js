
// accessibility.js
document.addEventListener('DOMContentLoaded', () => {
  // 1. Criar o Widget Flutuante de Acessibilidade (♿)
  const widget = document.createElement('button');
  widget.id = 'ias-a11y-widget';
  widget.innerHTML = '♿';
  widget.setAttribute('aria-label', 'Menu de Acessibilidade');
  widget.setAttribute('aria-expanded', 'false');
  document.body.appendChild(widget);

  // 2. Criar o Botão Flutuante de Informação / Fundamentação Teórica (ℹ️)
  const infoWidget = document.createElement('button');
  infoWidget.id = 'ias-info-widget';
  infoWidget.innerHTML = 'ℹ️';
  infoWidget.setAttribute('aria-label', 'Fundamentação Teórica do Projeto');
  infoWidget.setAttribute('title', 'Fundamentação Teórica');
  document.body.appendChild(infoWidget);

  // Menu de Acessibilidade
  const menu = document.createElement('div');
  menu.id = 'ias-a11y-menu';
  menu.innerHTML = `
    <button class="ias-a11y-btn" id="ias-btn-contrast">👁️ Modo Adaptado (Alto Contraste)</button>
    <button class="ias-a11y-btn" id="ias-btn-info-menu">ℹ️ Fundamentação Teórica</button>
  `;
  document.body.appendChild(menu);

  // Modal de Fundamentação Teórica
  const backdrop = document.createElement('div');
  backdrop.id = 'ias-info-modal-backdrop';
  backdrop.innerHTML = `
    <div id="ias-info-modal" role="dialog" aria-modal="true" aria-labelledby="ias-modal-title">
      <div class="ias-modal-header">
        <h2 id="ias-modal-title">📘 Fundamentação Teórica — Instituto Ayrton Senna</h2>
        <button class="ias-modal-close" id="ias-modal-close-btn" aria-label="Fechar">&times;</button>
      </div>
      <div class="ias-modal-body">
        ${modalHtml}
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  // Funções de abrir e fechar Modal
  const openModal = () => {
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  };
  const closeModal = () => {
    backdrop.classList.remove('active');
    document.body.style.overflow = '';
  };

  infoWidget.addEventListener('click', openModal);
  document.getElementById('ias-modal-close-btn').addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdrop.classList.contains('active')) closeModal();
  });

  // Toggle do menu
  widget.addEventListener('click', () => {
    const isActive = menu.classList.toggle('active');
    widget.setAttribute('aria-expanded', isActive);
  });

  // Toggle do Alto Contraste
  const btnContrast = document.getElementById('ias-btn-contrast');
  btnContrast.addEventListener('click', () => {
    document.body.classList.toggle('ias-a11y-mode');
    if (document.body.classList.contains('ias-a11y-mode')) {
      btnContrast.innerHTML = '👁️ Desativar Modo Adaptado';
    } else {
      btnContrast.innerHTML = '👁️ Modo Adaptado (Alto Contraste)';
    }
  });

  const btnInfoMenu = document.getElementById('ias-btn-info-menu');
  if (btnInfoMenu) {
    btnInfoMenu.addEventListener('click', () => {
      menu.classList.remove('active');
      openModal();
    });
  }

  // 3. Lógica de TTS (Áudio)
  const observer = new MutationObserver((mutations) => {
    const textElements = document.querySelectorAll('h1, h2, h3, p');
    textElements.forEach(el => {
      if (el.hasAttribute('data-has-tts') || el.closest('#ias-a11y-menu') || el.closest('#ias-info-modal') || el.innerText.trim() === '') return;
      el.setAttribute('data-has-tts', 'true');

      const btn = document.createElement('button');
      btn.className = 'ias-tts-btn';
      btn.innerHTML = '🔊';
      btn.setAttribute('aria-label', 'Ouvir texto');

      if (el.tagName === 'P') {
          el.appendChild(btn);
      } else {
          el.insertAdjacentElement('beforeend', btn);
      }

      let currentAudio = null;

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (currentAudio && !currentAudio.paused) {
           currentAudio.pause();
           btn.innerHTML = '🔊';
           return;
        }

        const textToRead = el.innerText.replace('🔊', '').replace('⏸️', '').replace('⏳', '').trim();
        const isDynamic = window.location.pathname.includes('/hackathon');
        
        btn.innerHTML = '⏳';
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToRead, isDynamic: isDynamic })
          });
          const data = await res.json();
          
          if (data.audioUrl) {
            currentAudio = new Audio(data.audioUrl);
            currentAudio.play();
            btn.innerHTML = '⏸️';
            currentAudio.onended = () => { btn.innerHTML = '🔊'; };
          } else {
            btn.innerHTML = '❌';
            setTimeout(() => btn.innerHTML = '🔊', 2000);
          }
        } catch (e) {
          btn.innerHTML = '❌';
          setTimeout(() => btn.innerHTML = '🔊', 2000);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
});
