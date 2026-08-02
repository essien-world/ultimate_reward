// menu-fixes.js — FAQ improvements & modal display fix
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { FAQS } from "./faq.js";

function $(id) { return document.getElementById(id); }
function safeCall(fn) { try { fn(); } catch (e) { console.error(e); } }

function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('hidden');
  modalEl.setAttribute('aria-hidden', 'false');
  modalEl.style.setProperty('display', 'flex', 'important');
  modalEl.style.visibility = 'visible';
  modalEl.style.opacity = '1';
  modalEl.style.zIndex = '999999';
}

function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add('hidden');
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.style.setProperty('display', 'none', 'important');
}

async function populateLeaderboard() {
  const listEl = $('onlineLeaderboardList');
  if (!listEl) return;
  listEl.innerHTML = '<div style="color:var(--text-muted); padding:12px; text-align:center;">Unable to load leaderboard.</div>';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function populateFaq() {
  try {
    const modal = $('faqModal');
    let faqList = $('faqList');

    if (!modal) {
      const m = document.createElement('div');
      m.id = 'faqModal';
      m.className = 'modal hidden';
      m.innerHTML = `<div class="modal-content" style="max-width:740px;">
        <h3 style="color:var(--gold-primary); margin-bottom:8px;">Frequently Asked Questions</h3>
        <div id="faqList" style="text-align:left; margin-top:8px;"></div>
        <div style="margin-top:12px;"><button id="closeFaqBtn" class="btn btn-dark" style="width:100%">Close</button></div>
      </div>`;
      document.body.appendChild(m);
    }

    faqList = $('faqList');
    if (!faqList) return;

    const faqData = (typeof FAQS !== 'undefined' && Array.isArray(FAQS) && FAQS.length > 0) ? FAQS : (window.FAQS || []);

    if (!faqData || faqData.length === 0) {
      faqList.innerHTML = '<div style="color:var(--text-muted); padding:12px;">FAQ data not available. Please refresh.</div>';
      return;
    }

    faqList.innerHTML = '';
    faqData.forEach((f, idx) => {
      const details = document.createElement('details');
      details.style.background = 'rgba(0,0,0,0.35)';
      details.style.padding = '10px';
      details.style.borderRadius = '6px';
      details.style.marginBottom = '8px';
      details.style.border = '1px solid rgba(255,255,255,0.03)';

      const summary = document.createElement('summary');
      summary.style.cursor = 'pointer';
      summary.style.fontWeight = '700';
      summary.style.color = 'var(--gold-primary)';
      summary.textContent = f.question || `Question ${idx + 1}`;

      const content = document.createElement('div');
      content.style.marginTop = '8px';
      content.style.color = 'var(--text-muted)';
      content.style.lineHeight = '1.5';
      content.innerHTML = `<div>${escapeHtml(String(f.answer || ''))}</div>`;

      const closeInAnswer = document.createElement('button');
      closeInAnswer.className = 'btn btn-dark';
      closeInAnswer.style.marginTop = '10px';
      closeInAnswer.textContent = 'Close';
      closeInAnswer.addEventListener('click', (ev) => {
        ev.stopPropagation();
        details.open = false;
      });

      content.appendChild(closeInAnswer);
      details.appendChild(summary);
      details.appendChild(content);
      faqList.appendChild(details);
    });

    let modalClose = $('closeFaqBtn');
    if (!modalClose) {
      const modalContent = modal.querySelector('.modal-content') || modal;
      modalClose = document.createElement('button');
      modalClose.id = 'closeFaqBtn';
      modalClose.className = 'btn btn-dark';
      modalClose.textContent = 'Close';
      modalClose.style.width = '100%';
      const wrapper = document.createElement('div');
      wrapper.style.marginTop = '12px';
      wrapper.appendChild(modalClose);
      modalContent.appendChild(wrapper);
    }
    modalClose.removeEventListener('click', modalClose._handler || (() => {}));
    modalClose._handler = () => closeModal($('faqModal'));
    modalClose.addEventListener('click', modalClose._handler);

  } catch (err) {
    console.error('populateFaq error', err);
    const faqList = $('faqList');
    if (faqList) faqList.innerHTML = '<div style="color:var(--text-muted); padding:12px;">Error loading FAQ.</div>';
  }
}

function setupMenuHandlers() {
  document.querySelectorAll('a[href="#"]').forEach(a => {
    if (a.id !== 'menuFAQ') {
      a.addEventListener('click', (e) => e.preventDefault());
    }
  });

  const mobileToggle = document.getElementById("mobileMenuToggle");
  const menuLinksContainer = document.getElementById("menuLinksContainer");

  const menuHome = $('menuHome');
  const menuGame = $('menuGame');
  const menuFAQ = $('menuFAQ');

  if (menuHome) {
    menuHome.addEventListener('click', (e) => {
      e.preventDefault();
      safeCall(() => document.getElementById('heroSection').scrollIntoView({ behavior: 'smooth' }));
    });
  }

  if (menuGame) {
    menuGame.addEventListener('click', (e) => {
      e.preventDefault();
      safeCall(() => document.getElementById('gameSection').scrollIntoView({ behavior: 'smooth' }));
    });
  }

  if (menuFAQ) {
    menuFAQ.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      populateFaq();
      openModal($('faqModal'));

      try {
        if (menuLinksContainer && menuLinksContainer.classList.contains('mobile-active')) {
          menuLinksContainer.classList.remove('mobile-active');
        }
        if (mobileToggle) {
          mobileToggle.setAttribute('aria-expanded', 'false');
        }
      } catch (err) {
        console.warn('Error closing mobile menu after opening FAQ', err);
      }
    });
  }

  const closeFaqBtn = $('closeFaqBtn');
  if (closeFaqBtn) {
    closeFaqBtn.addEventListener('click', () => closeModal($('faqModal')));
  }

  const closeSupportBtn = $('closeSupportBtn');
  if (closeSupportBtn) closeSupportBtn.addEventListener('click', () => closeModal($('supportModal')));

  const navLoginBtn = $('navLoginBtn');
  const navLogoutBtn = $('navLogoutBtn');
  if (navLoginBtn) {
    navLoginBtn.addEventListener('click', (e) => {
      e && e.preventDefault();
      safeCall(() => document.getElementById('authSection').scrollIntoView({ behavior: 'smooth' }));
      const phoneInput = $('phone') || $('loginPhone');
      if (phoneInput) phoneInput.focus();
    });
  }
  if (navLogoutBtn) {
    navLogoutBtn.addEventListener('click', async (e) => {
      e && e.preventDefault();
      try {
        await signOut(getAuth());
        if (typeof window.updateLoginUI === 'function') window.updateLoginUI(null);
        const navUserDetails = $('navUserDetails');
        if (navUserDetails) navUserDetails.classList.add('hidden');
        if (navLoginBtn) navLoginBtn.classList.remove('hidden');
        if (navLogoutBtn) navLogoutBtn.classList.add('hidden');
        alert('You have been logged out.');
      } catch (err) {
        console.error('Sign out failed', err);
        alert('Failed to sign out.');
      }
    });
  }

  if (mobileToggle && menuLinksContainer) {
    mobileToggle.setAttribute('aria-controls', 'menuLinksContainer');
    mobileToggle.setAttribute('aria-expanded', 'false');
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const opened = menuLinksContainer.classList.toggle('mobile-active');
      mobileToggle.setAttribute('aria-expanded', String(!!opened));
    });

    document.addEventListener('click', (e) => {
      if (!menuLinksContainer.classList.contains('mobile-active')) return;
      if (!menuLinksContainer.contains(e.target) && !mobileToggle.contains(e.target)) {
        menuLinksContainer.classList.remove('mobile-active');
        mobileToggle.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuLinksContainer.classList.contains('mobile-active')) {
        menuLinksContainer.classList.remove('mobile-active');
        mobileToggle.setAttribute('aria-expanded', 'false');
      }
    });

    menuLinksContainer.querySelectorAll('a').forEach(link => {
      if (link.id !== 'menuFAQ') {
        link.addEventListener('click', () => {
          menuLinksContainer.classList.remove('mobile-active');
          mobileToggle.setAttribute('aria-expanded', 'false');
        });
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMenuHandlers);
} else {
  setupMenuHandlers();
}

if (typeof window !== "undefined") {
  window._menuFixes = { populateFaq, populateLeaderboard };
}