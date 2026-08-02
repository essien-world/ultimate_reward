// menu-fixes.js — small module to wire up menu buttons and modals
// This file adds behavior for menu items that were not wired in the main script.

import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { FAQS } from './faq.js'; 


function $(id) { return document.getElementById(id); }

function safeCall(fn) { try { fn(); } catch (e) { console.error(e); } }

function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('hidden');
  modalEl.setAttribute('aria-hidden', 'false');
}

function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add('hidden');
  modalEl.setAttribute('aria-hidden', 'true');
}

async function populateLeaderboard() {
  const listEl = $('onlineLeaderboardList');
  const loading = $('onlineLeaderboardLoading');
  if (!listEl) return;
  if (loading) loading.textContent = 'Loading leaderboard';
  listEl.innerHTML = '';

  // Prefer firebase helper if available
  if (typeof window.getLeaderboard === 'function') {
    try {
      const res = await window.getLeaderboard();
      if (res && res.success && Array.isArray(res.leaderboard)) {
        if (res.leaderboard.length === 0) {
          listEl.innerHTML = '<div style="color:var(--text-muted); padding:12px; text-align:center;">No leaderboard data available</div>';
          return;
        }
        res.leaderboard.forEach((r, idx) => {
          const row = document.createElement('div');
          row.style.padding = '8px 10px';
          row.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
          row.innerHTML = `<strong style="color:var(--gold-primary);">${idx+1}.</strong> ${escapeHtml(r.name || 'Anonymous')} — <span style="color:var(--text-muted)">${escapeHtml(r.referral || '')}</span> — <strong style="color:var(--gold-light)">${Number(r.points||0)}</strong>`;
          listEl.appendChild(row);
        });
        return;
      }
    } catch (err) {
      console.error('getLeaderboard error', err);
    }
  }

  // fallback: show message
  listEl.innerHTML = '<div style="color:var(--text-muted); padding:12px; text-align:center;">Unable to load leaderboard. Please try again later.</div>';
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
  const faqList = $('faqList');
  if (!faqList) return;
  
  // FIXED: Check both the module import and the global window attachment
  const faqData = (typeof FAQS !== 'undefined' && FAQS.length > 0) ? FAQS : window.FAQS;
  
  if (!faqData || faqData.length === 0) {
    faqList.innerHTML = '<div style="color:var(--text-muted); padding:12px;">FAQ data not available</div>';
    return;
  }
  
  faqList.innerHTML = '';
  faqData.forEach((f) => {
    const item = document.createElement('div');
    item.style.marginBottom = '10px';
    item.innerHTML = `<details style="background:rgba(0,0,0,0.35); padding:10px; border-radius:6px; margin-bottom:6px;"><summary style="color:var(--gold-primary); font-weight:700; cursor:pointer;">${escapeHtml(f.question)}</summary><div style="margin-top:8px; color:var(--text-muted);">${escapeHtml(f.answer)}</div></details>`;
    faqList.appendChild(item);
  });
}

function setupMenuHandlers() {
  // prevent default for anchors with href="#"
  document.querySelectorAll('a[href="#"]').forEach(a => a.addEventListener('click', (e) => e.preventDefault()));

  const menuHome = $('menuHome');
  const menuGame = $('menuGame');
  const menuLeaderboard = $('menuLeaderboard');
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

  if (menuLeaderboard) {
    menuLeaderboard.addEventListener('click', async (e) => {
      e && e.preventDefault();
      const modal = $('onlineLeaderboardModal');
      openModal(modal);
      await populateLeaderboard();
    });
  }

  if (menuFAQ) {
    menuFAQ.addEventListener('click', (e) => {
      e && e.preventDefault();
      populateFaq();
      openModal($('faqModal'));
    });
  }

  // Ensure Support link exists and is visible to everyone
  let supportLink = document.getElementById("menuSupport") || document.getElementById("menuSupportBtn");
  if (!supportLink) {
    supportLink = document.createElement("a");
    supportLink.href = "#";
    supportLink.id = "menuSupport";
    supportLink.textContent = "Support";
    const menuLinks = document.querySelector(".menu-links");
    if (menuLinks) menuLinks.appendChild(supportLink);
  } else {
    supportLink.style.display = "inline-block";
  }

  if (supportLink) {
    supportLink.addEventListener('click', (e) => {
      e && e.preventDefault();
      const modal = $('supportModal');
      if (typeof window.openSupportModal === 'function') {
        window.openSupportModal();
      } else {
        if (modal) {
          modal.classList.remove('hidden');
        } else if (typeof window.openSupportModal === 'undefined') {
          try { supportLink.click(); } catch (err) { /* no-op */ }
        }
      }
    });
  }

  // Close buttons
  const closeLeaderboardBtn = $('closeLeaderboardBtn');
  if (closeLeaderboardBtn) closeLeaderboardBtn.addEventListener('click', () => closeModal($('onlineLeaderboardModal')));

  const closeFaqBtn = $('closeFaqBtn');
  if (closeFaqBtn) closeFaqBtn.addEventListener('click', () => closeModal($('faqModal')));

  const closeSupportBtn = $('closeSupportBtn');
  if (closeSupportBtn) closeSupportBtn.addEventListener('click', () => closeModal($('supportModal')));

  // nav login/logout
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

  // FIXED: Mobile Hamburger Menu Toggle now inside the initializer safely
  const mobileToggle = $('mobileMenuToggle');
  const menuLinksContainer = $('menuLinksContainer');
  
  if (mobileToggle && menuLinksContainer) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      menuLinksContainer.classList.toggle('mobile-active');
    });

    // Close dropdown menu automatically when a link inside it is tapped
    menuLinksContainer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuLinksContainer.classList.remove('mobile-active');
      });
    });
  }
}

// Wire up when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMenuHandlers);
} else {
  setupMenuHandlers();
}

// expose for debugging
if (typeof window !== 'undefined') window._menuFixes = { populateLeaderboard, populateFaq };
