// menu-fixes.js — FAQ improvements: close-control at end of each expanded answer.
// Also safe handling when leaderboard/menu links are missing.
// Note: importing FAQS from FAQ.js (case-sensitive).
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { FAQS } from "./FAQ.js";

function $(id) { return document.getElementById(id); }
function safeCall(fn) { try { fn(); } catch (e) { console.error(e); } }

function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('hidden');
  modalEl.setAttribute('aria-hidden', 'false');
  modalEl.style.display = 'flex';
  modalEl.style.visibility = 'visible';
  modalEl.style.opacity = '1';
  modalEl.style.zIndex = '999999';
}

function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add('hidden');
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.style.display = 'none';
}

async function populateLeaderboard() {
  const listEl = $('onlineLeaderboardList');
  if (!listEl) return;
  listEl.innerHTML = '<div style="color:var(--text-muted); padding:12px; text-align:center;">Unable to load leaderboard (menu link removed).</div>';
  // The leaderboard is intentionally not exposed from the menu; keep function for manual use.
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

/*
  Improved FAQ population:
  - Uses the modal already present in the DOM (#faqModal).
  - Renders <details> elements for each FAQ.
  - Adds a "Close" button at the end of each expanded answer to collapse that item.
  - Ensures a modal-level Close button exists (at the end) to dismiss the modal.
*/
function populateFaq() {
  try {
    const modal = $('faqModal');
    let faqList = $('faqList');

    // If the modal or faqList is missing, create a simple modal fallback.
    if (!modal) {
      const m = document.createElement('div');
      m.id = 'faqModal';
      m.className = 'modal';
      m.innerHTML = `<div class="modal-content" style="max-width:740px;">
        <h3 style="color:var(--gold-primary); margin-bottom:8px;">Frequently Asked Questions</h3>
        <div id="faqList" style="text-align:left; margin-top:8px;"></div>
        <div style="margin-top:12px;"><button id="closeFaqBtn" class="btn btn-dark" style="width:100%">Close</button></div>
      </div>`;
      document.body.appendChild(m);
    }

    faqList = $('faqList');
    if (!faqList) return;

    // Acquire FAQ data from imported FAQS or from global fallback
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
      // Allow basic formatting in answers; escape to avoid injection
      content.innerHTML = `<div>${escapeHtml(String(f.answer || ''))}</div>`;

      // Close button at the end of each expanded answer
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

    // Ensure the modal-level close button exists and closes the modal
    let modalClose = $('closeFaqBtn');
    if (!modalClose) {
      const modalContent = modal.querySelector('.modal-content') || modal;
      modalClose = document.createElement('button');
      modalClose.id = 'closeFaqBtn';
      modalClose.className = 'btn btn-dark';
      modalClose.textContent = 'Close';
      modalClose.style.width = '100%';
      // Append at the end of modal-content
      modalContent.appendChild(document.createElement('div')).style.marginTop = '12px';
      modalContent.appendChild(modalClose);
    }
    modalClose.removeEventListener('click', modalClose._handler || (() => {}));
    modalClose._handler = () => closeModal(modal);
    modalClose.addEventListener('click', modalClose._handler);

  } catch (err) {
    console.error('populateFaq error', err);
    const faqList = $('faqList');
    if (faqList) faqList.innerHTML = '<div style="color:var(--text-muted); padding:12px;">Error loading FAQ.</div>';
  }
}

function setupMenuHandlers() {
  // Prevent default anchors for href="#"
  document.querySelectorAll('a[href="#"]').forEach(a => a.addEventListener('click', (e) => e.preventDefault()));

  const mobileToggle = document.getElementById("mobileMenuToggle");
  const menuLinksContainer = document.getElementById("menuLinksContainer");

  const menuHome = $('menuHome');
  const menuGame = $('menuGame');
  const menuFAQ = $('menuFAQ');
  const menuSupportBtn = $('menuSupportBtn');

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
      if (e) { e.preventDefault(); e.stopPropagation(); }
      populateFaq();
      openModal($('faqModal'));
    });
  }

  if (menuSupportBtn) {
    menuSupportBtn.addEventListener('click', (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      const modal = $('supportModal');
      if (typeof window.openSupportModal === 'function') {
        window.openSupportModal();
      } else if (modal) {
        openModal(modal);
      }
    });
  }

  // Close handlers (defensive)
  const closeFaqBtn = $('closeFaqBtn');
  if (closeFaqBtn) {
    closeFaqBtn.addEventListener('click', () => closeModal($('faqModal')));
  }

  const closeSupportBtn = $('closeSupportBtn');
  if (closeSupportBtn) closeSupportBtn.addEventListener('click', () => closeModal($('supportModal')));

  // Auth handlers
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

  // Mobile Toggle behaviour (safe no-op if missing)
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
      link.addEventListener('click', () => {
        menuLinksContainer.classList.remove('mobile-active');
        mobileToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

// Wire up
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMenuHandlers);
} else {
  setupMenuHandlers();
}

if (typeof window !== 'undefined') {
  window._menuFixes = { populateFaq, populateLeaderboard };
}