// script.js (fixed, ready-to-use)
import {
  registerUser,
  lookupPhone,
  getUserData,
  submitBank,
  submitGame,
  redeem,
  getLeaderboard,
  submitComment,
  setPhoneVerified,
  checkReferrerPoints
} from "./firebase.js";

const SPONSOR_URL = "https://google.com";

// Keep OTP endpoints as before or migrate to Firebase Auth phone later
const OTP_SEND_URL = "https://example.com/send-otp";
const OTP_VERIFY_URL = "https://example.com/verify-otp";

let currentUser = null; // module-scoped user
function setCurrentUser(user) {
  currentUser = user;
  try { window.currentUser = user; } catch (e) { /* ignore */ }
}

let shareCount = 0;
let isRedeemed = false;

let currentCategory = null;
let categoryQuestions = { gulder: [], general: [], sports: [] };
let userAnswers = { gulder: {}, general: {}, sports: {} };
let currentQIndex = 0;
let timerInterval = null;
let activeQuestionsList = [];
let round1Correct = 0;
let round2Correct = 0;
let currentGameRound = 1;

let submittedRounds = { 1: false, 2: false };
const completedUnits = { 1: { gulder: false, general: false, sports: false }, 2: { gulder: false, general: false, sports: false } };
let isPlayingCategory = false;
const AD_REQUIRED_SECONDS = 7;

// NEW: bank unlock threshold
const BANK_UNLOCK_POINTS = 10000;
const REF_WORD = "GULDER";

// Make apiCall visible early (we attach window.apiCall at the bottom after the function definition)
// DOM ready
document.addEventListener("DOMContentLoaded", () => {
  setupOnlineOfflineHandlers();
  removeClutterMenuItems(); // hide My Reward & old comment link if present
  setupMenuFAQHandler();
  setupSupportMenu(); // creates support menu link (visible to logged in users)
  setupTabs();
  setupAuth();
  setupLogout();
  setupWhatsAppShare();
  setupRedeem();
  setupGameHandlers();
  setupBankUI();
  setupOnlineLeaderboard();
  setupPhoneVerificationUI();
  setupCommentsModuleIfPresent();
  setupMandatoryVerificationButton(); // NEW: setup the dashboard mandatory verification button
});

/* --------------------
   ONLINE / OFFLINE
   -------------------- */
function setupOnlineOfflineHandlers() {
  function applyOffline(offline) {
    const interactiveIds = [
      "registerBtn", "navLoginBtn", "whatsappShare", "redeemBtn",
      "submitBankBtn", "btnGulderGame", "btnGeneralGame", "btnSportsGame",
      "commentSubmitBtn", "sendOtpBtn", "verifyOtpBtn", "closeLeaderboardBtn"
    ];
    interactiveIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = offline;
    });
    // Additionally disable API calls globally when offline (handled in apiCall)
    if (offline) {
      console.warn("App offline: interactive features disabled.");
    } else {
      console.info("App online: interactive features enabled where applicable.");
    }
  }

  window.addEventListener("online", () => applyOffline(false));
  window.addEventListener("offline", () => applyOffline(true));

  // initial
  applyOffline(!navigator.onLine);
}

function ensureOnline() {
  if (navigator.onLine) return true;
  alert("You appear to be offline. Please connect to the internet to use this feature.");
  return false;
}

/* --------------------
   UI Helpers & Small Integrations
   -------------------- */
function injectImportantNotice() {
  const heroCta = document.getElementById("heroCta");
  if (!heroCta) return;
  if (document.getElementById("importantNoticeBox")) return;

  const notice = document.createElement("div");
  notice.id = "importantNoticeBox";
  notice.style.marginTop = "14px";
  notice.style.padding = "12px";
  notice.style.borderRadius = "8px";
  notice.style.background = "rgba(20,20,20,0.6)";
  notice.style.color = "#ffefc6";
  notice.style.fontSize = "0.9rem";
  notice.style.lineHeight = "1.3";
  notice.textContent = "Important Notice: Reaching 10,000 points does not guarantee immediate reward payment. Every qualifying account undergoes a verification process. All referred phone numbers will be verified via SMS to confirm they belong to genuine individuals. Rewards are released only after successful verification and compliance with the platform's rules. This policy helps maintain fairness and prevent fraudulent referrals.";
  heroCta.parentNode.insertBefore(notice, heroCta.nextSibling);
}

function removeClutterMenuItems() {
  ["menuReward"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  const oldComment = document.getElementById("menuComment");
  if (oldComment) oldComment.style.display = "none";
}

/* --------------------
   FAQ Modal (collapsible)
   -------------------- */
function setupMenuFAQHandler() {
  const faqLink = document.getElementById("menuFAQ");
  if (!faqLink) return;
  faqLink.addEventListener("click", (e) => {
    e.preventDefault();
    const modal = document.getElementById("faqModal");
    if (modal && !modal.classList.contains("hidden")) {
      modal.classList.add("hidden");
      return;
    }
    openFaqModal();
  });
}

function openFaqModal() {
  if (typeof FAQS === "undefined") {
    alert("FAQ content is not available.");
    return;
  }

  let modal = document.getElementById("faqModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "faqModal";
    modal.className = "modal hidden";
    const inner = document.createElement("div");
    inner.className = "modal-content";
    inner.style.maxHeight = "70vh";
    inner.style.overflow = "auto";

    inner.innerHTML = `<h3 style="color:#d4af37; margin-bottom:8px;">Frequently Asked Questions</h3>
      <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:12px;">Tap any question to expand its answer.</p>
      <div id="faqList" style="display:flex; flex-direction:column; gap:8px;"></div>
      <div style="margin-top:12px; display:flex; gap:8px;">
        <button id="closeFaqBtn" class="btn btn-dark" style="flex:1;">Close</button>
      </div>`;

    modal.appendChild(inner);
    document.body.appendChild(modal);
  }

  const list = document.getElementById("faqList") || document.getElementById("faqContainer");
  if (!list) {
    console.warn("No FAQ container (faqList or faqContainer) found.");
    return;
  }
  list.innerHTML = "";
  FAQS.forEach((item, idx) => {
    const row = document.createElement("div");
    row.style.background = "rgba(0,0,0,0.35)";
    row.style.padding = "10px";
    row.style.borderRadius = "8px";
    row.style.border = "1px solid rgba(255,255,255,0.03)";

    const q = document.createElement("div");
    q.style.display = "flex";
    q.style.justifyContent = "space-between";
    q.style.alignItems = "center";
    q.style.cursor = "pointer";
    q.innerHTML = `<strong style="color:var(--gold-primary)">${escapeHtml(item.question)}</strong><span style="color:var(--text-muted)">+</span>`;

    const a = document.createElement("div");
    a.style.marginTop = "8px";
    a.style.display = "none";
    a.style.color = "var(--text-muted)";
    a.innerHTML = `<div>${escapeHtml(item.answer)}</div>`;

    q.addEventListener("click", () => {
      const visible = a.style.display === "block";
      a.style.display = visible ? "none" : "block";
      q.querySelector("span").textContent = visible ? "+" : "–";
    });

    row.appendChild(q);
    row.appendChild(a);
    list.appendChild(row);
  });

  const closeBtn = (modal || document).querySelector("#closeFaqBtn");
  if (closeBtn && !closeBtn._faqListenerAdded) {
    closeBtn.addEventListener("click", () => {
      const mm = document.getElementById("faqModal");
      if (mm) mm.classList.add("hidden");
    });
    closeBtn._faqListenerAdded = true;
  }

  modal.classList.remove("hidden");
}

/* --------------------
   Support Menu
   -------------------- */
function setupSupportMenu() {
  const menuLinks = document.querySelector(".menu-links");
  if (!menuLinks) return;

  let supportLink = document.getElementById("menuSupport") || document.getElementById("menuSupportBtn");
  if (!supportLink) {
    supportLink = document.createElement("a");
    supportLink.href = "#";
    supportLink.id = "menuSupport";
    supportLink.textContent = "Support";
    supportLink.style.display = "none";
    menuLinks.appendChild(supportLink);
  }

  supportLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please login to access support.");
      return;
    }
    openSupportModal();
  });

  const submitBtn = document.getElementById("submitSupportBtn");
  if (submitBtn && !submitBtn._supportListenerAdded) {
    submitBtn.addEventListener("click", submitSupportMessage);
    submitBtn._supportListenerAdded = true;
  }
  const closeBtn = document.getElementById("closeSupportBtn");
  if (closeBtn && !closeBtn._supportCloseAdded) {
    closeBtn.addEventListener("click", () => {
      const mm = document.getElementById("supportModal");
      if (mm) mm.classList.add("hidden");
    });
    closeBtn._supportCloseAdded = true;
  }
}

function openSupportModal() {
  let modal = document.getElementById("supportModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "supportModal";
    modal.className = "modal";
    const inner = document.createElement("div");
    inner.className = "modal-content";
    inner.style.maxHeight = "70vh";
    inner.style.overflow = "auto";

    inner.innerHTML = `
      <h3 style="color:#d4af37; margin-bottom:8px;">Contact Support</h3>
      <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:12px;">Describe the issue and our team will get back to you.</p>
      <label style="display:block; margin-bottom:8px;"><strong>Message</strong>
        <textarea id="supportMessageInput" rows="6" style="width:100%; padding:10px; border-radius:6px; background:rgba(0,0,0,0.45); color:#fff; border:1px solid rgba(255,255,255,0.06);"></textarea>
      </label>
      <div style="display:flex; gap:8px;">
        <button id="submitSupportBtn" class="btn btn-register" style="flex:1;">Submit</button>
        <button id="closeSupportBtn" class="btn btn-dark">Close</button>
      </div>
      <div id="supportStatus" style="margin-top:10px; color:var(--gold-primary); font-weight:700;"></div>
    `;

    modal.appendChild(inner);
    document.body.appendChild(modal);

    document.getElementById("closeSupportBtn").addEventListener("click", () => modal.classList.add("hidden"));
    document.getElementById("submitSupportBtn").addEventListener("click", submitSupportMessage);
  }

  const submit = document.getElementById("submitSupportBtn");
  if (submit && !submit._supportListenerAdded) {
    submit.addEventListener("click", submitSupportMessage);
    submit._supportListenerAdded = true;
  }
  const close = document.getElementById("closeSupportBtn");
  if (close && !close._supportCloseAdded) {
    close.addEventListener("click", () => {
      const mm = document.getElementById("supportModal");
      if (mm) mm.classList.add("hidden");
    });
    close._supportCloseAdded = true;
  }

  modal.classList.remove("hidden");
}

async function submitSupportMessage() {
  if (!ensureOnline()) return;
  if (!currentUser) {
    alert("Please login first.");
    return;
  }
  const input = document.getElementById("supportMessageInput");
  const msgDiv = document.getElementById("supportStatus");
  if (!input) {
    alert("Support input not found.");
    return;
  }
  const message = (input.value || "").trim();
  if (!message) {
    alert("Please write your message before submitting.");
    return;
  }

  const btn = document.getElementById("submitSupportBtn");
  btn.disabled = true;
  btn.textContent = "Submitting...";

  try {
    const res = await apiCall({
      action: "submitComment",
      phone: currentUser.phone,
      name: currentUser.name || "Support User",
      comment: `[SUPPORT] ${message}`
    });

    if (res && res.success) {
      msgDiv.textContent = "Support message submitted. We'll get back to you.";
      input.value = "";
      setTimeout(() => {
        const modal = document.getElementById("supportModal");
        if (modal) modal.classList.add("hidden");
      }, 600);
    } else {
      msgDiv.textContent = "Failed to submit. Please try again later.";
      console.error("Support submit failed", res);
      alert(res && res.message ? res.message : "Failed to send support message.");
    }
  } catch (err) {
    console.error("Support submit error:", err);
    alert("Network error while sending support message. Please try again.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Submit";
  }
}

/* --------------------
   Phone Verification UI + Flow
   -------------------- */
function setupPhoneVerificationUI() {
  const sendBtn = document.getElementById("sendOtpBtn");
  const verifyBtn = document.getElementById("verifyOtpBtn");
  const otpInput = document.getElementById("otpInput");
  const form = document.getElementById("phoneVerifyForm");
  const lockIcon = document.getElementById("phoneVerifyLockIcon");
  const statusText = document.getElementById("phoneVerifyStatusText");
  const statusMsg = document.getElementById("phoneVerifyMsg");

  if (sendBtn) {
    sendBtn.addEventListener("click", async () => {
      if (!ensureOnline()) return;
      if (!currentUser) {
        alert("Please login first!");
        return;
      }
      sendBtn.disabled = true;
      sendBtn.textContent = "Sending...";
      try {
        const res = await fetch(OTP_SEND_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: currentUser.phone })
        });
        const json = await res.json().catch(() => ({ success: false, message: "Invalid response from OTP service" }));
        if (!json.success) {
          alert(json.message || "Failed to send OTP. Please try again later.");
          sendBtn.disabled = false;
          sendBtn.textContent = "Send OTP";
          return;
        }
        alert("OTP sent to your phone. Enter it below and click Verify.");
      } catch (err) {
        console.error("OTP send error:", err);
        alert("Network error while sending OTP. Please try again.");
      } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = "Send OTP";
      }
    });
  }

  if (verifyBtn) {
    verifyBtn.addEventListener("click", async () => {
      if (!ensureOnline()) return;
      if (!currentUser) {
        alert("Please login first!");
        return;
      }
      const otp = (otpInput.value || "").trim();
      if (!otp) {
        alert("Please enter the OTP you received.");
        return;
      }

      verifyBtn.disabled = true;
      verifyBtn.textContent = "Verifying...";

      try {
        const res = await fetch(OTP_VERIFY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: currentUser.phone, otp })
        });
        const json = await res.json().catch(() => ({ success: false, message: "Invalid response" }));

        if (json && json.success && json.matched) {
          const backend = await apiCall({ action: "setPhoneVerified", phone: currentUser.phone, verified: true });
          if (backend && backend.success) {
            const statusMsgEl = document.getElementById("phoneVerifyMsg");
            if (statusMsgEl) {
              statusMsgEl.textContent = "Phone verified ✓";
              statusMsgEl.style.color = "#25D366";
            }
            if (document.getElementById("phoneVerifyLockIcon")) document.getElementById("phoneVerifyLockIcon").textContent = "✅";
            if (currentUser) {
              currentUser.phoneVerified = true;
              setCurrentUser(currentUser);
            }
            alert("Phone number verified successfully.");
            otpInput.value = "";
            await refreshUserData();
          } else {
            alert("Verification succeeded but failed to update server: " + (backend && backend.message ? backend.message : "Unknown"));
          }
        } else {
          alert(json.message || "OTP did not match. Please try again.");
          statusMsg.textContent = "OTP mismatch";
          statusMsg.style.color = "#ff6666";
        }
      } catch (err) {
        console.error("OTP verify error:", err);
        alert("Network error while verifying OTP. Please try again.");
      } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = "Verify";
      }
    });
  }

  togglePhoneVerification(false, false);
}

function togglePhoneVerification(unlocked, phoneIsVerified) {
  const form = document.getElementById("phoneVerifyForm");
  const lockIcon = document.getElementById("phoneVerifyLockIcon");
  const statusText = document.getElementById("phoneVerifyStatusText");
  const msg = document.getElementById("phoneVerifyMsg");

  if (unlocked) {
    if (form) form.style.display = "block";
    if (lockIcon) lockIcon.textContent = phoneIsVerified ? "✅" : "🔓";
    if (statusText) statusText.textContent = phoneIsVerified ? "Verified" : "Unlocked - you may verify your phone";
    if (msg) {
      msg.textContent = phoneIsVerified ? "Phone verified" : "";
      msg.style.color = phoneIsVerified ? "#25D366" : "";
    }
  } else {
    if (form) form.style.display = "none";
    if (lockIcon) lockIcon.textContent = "🔒";
    if (statusText) statusText.textContent = `Locked (Requires ${BANK_UNLOCK_POINTS.toLocaleString()} points)`;
    if (msg) msg.textContent = "";
  }
}

/* --------------------
   Leaderboard, Bank and other existing functions
   -------------------- */
function setupOnlineLeaderboard() {
  const leaderboardLink = document.getElementById("menuLeaderboard");
  const modal = document.getElementById("onlineLeaderboardModal");
  const closeBtn = document.getElementById("closeLeaderboardBtn");

  if (leaderboardLink) {
    leaderboardLink.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!ensureOnline()) return;
      openOnlineLeaderboard();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal?.classList.add("hidden");
    });
  }
}

async function openOnlineLeaderboard() {
  const modal = document.getElementById("onlineLeaderboardModal");
  const listContainer = document.getElementById("onlineLeaderboardList");
  if (!modal || !listContainer) return;

  listContainer.innerHTML = '<div id="onlineLeaderboardLoading" style="color:var(--text-muted); padding:12px; text-align:center;">Loading leaderboard...</div>';
  modal.classList.remove("hidden");

  try {
    const res = await apiCall({ action: "getLeaderboard" });
    if (!res || !res.success) {
      listContainer.innerHTML = `<div style="padding:12px; color:#ff7777;">Failed to load leaderboard: ${res && res.message ? res.message : 'Unknown error'}</div>`;
      return;
    }

    const rows = res.leaderboard || [];
    if (rows.length === 0) {
      listContainer.innerHTML = '<div style="padding:12px; color:var(--text-muted); text-align:center;">No leaderboard data available yet.</div>';
      return;
    }

    let html = `<div style="display:flex; gap:8px; padding:8px; border-bottom:1px solid rgba(255,255,255,0.03); font-weight:800; color:var(--gold-primary);">
      <div style="width:36px">#</div>
      <div style="flex:1">Name</div>
      <div style="width:180px">Referral</div>
      <div style="width:90px; text-align:right">Points</div>
    </div>`;

    rows.forEach((r, idx) => {
      const name = escapeHtml(r.name || r.phone || "Unknown");
      const ref = escapeHtml(r.referral || "");
      const pts = Number(r.points) || 0;
      const rowColor = idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent";
      html += `<div style="display:flex; gap:8px; padding:10px; background:${rowColor}; align-items:center; border-radius:6px; margin-top:6px;">
        <div style="width:36px; color:var(--gold-primary); font-weight:700;">${idx + 1}</div>
        <div style="flex:1; font-weight:700;">${name}</div>
        <div style="width:180px; color:var(--text-muted);">${ref}</div>
        <div style="width:90px; text-align:right; color:var(--gold-light); font-weight:800;">${pts.toLocaleString()}</div>
      </div>`;
    });

    listContainer.innerHTML = html;
  } catch (err) {
    console.error("Leaderboard fetch error:", err);
    listContainer.innerHTML = `<div style="padding:12px; color:#ff7777;">Network error loading leaderboard.</div>`;
  }
}

/* --------------------
   Game / Auth / Bank etc.
   -------------------- */
function disableAllCategoryButtons(disabled) {
  ["btnGulderGame", "btnGeneralGame", "btnSportsGame"].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.disabled = disabled;
  });
}

function refreshCategoryButtons() {
  ["gulder", "general", "sports"].forEach(cat => {
    const btnId = cat === "gulder" ? "btnGulderGame" : (cat === "general" ? "btnGeneralGame" : "btnSportsGame");
    const statusId = cat === "gulder" ? "statusGulder" : (cat === "general" ? "statusGeneral" : "statusSports");
    const btn = document.getElementById(btnId);
    const status = document.getElementById(statusId);
    const completed = completedUnits[currentGameRound] && completedUnits[currentGameRound][cat];
    if (btn) btn.disabled = !!completed;
    if (status) status.textContent = completed ? "✅" : "⚪";
  });
}

function clearGamePlayArea() {
  const title = document.getElementById("gameCategoryTitle");
  const qtext = document.getElementById("gameQuestionText");
  const options = document.getElementById("gameOptionsContainer");
  if (title) title.textContent = "";
  if (qtext) qtext.textContent = "";
  if (options) options.innerHTML = "";
  document.getElementById("gamePlayArea")?.classList.add("hidden");
}

function setupTabs() {
  const tabReg = document.getElementById("tabRegister");
  const tabLog = document.getElementById("tabLogin");
  const formReg = document.getElementById("registerForm");
  const formLog = document.getElementById("loginForm");
  const navLoginBtn = document.getElementById("navLoginBtn");

  if (tabReg && tabLog) {
    tabReg.addEventListener("click", () => {
      tabReg.classList.add("active");
      tabLog.classList.remove("active");
      formReg.classList.remove("hidden");
      formLog.classList.add("hidden");
    });

    tabLog.addEventListener("click", () => {
      tabLog.classList.add("active");
      tabReg.classList.remove("active");
      formReg.classList.add("hidden");
      formLog.classList.remove("hidden");
    });
  }

  if (navLoginBtn && tabLog) {
    navLoginBtn.addEventListener("click", () => {
      tabLog.click();
      document.getElementById("authSection")?.scrollIntoView({ behavior: "smooth" });
    });
  }
}

function setupAuth() {
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!ensureOnline()) return;

      const name = document.getElementById("name").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const password = document.getElementById("regPassword").value;
      const confirmPassword = document.getElementById("regConfirmPassword").value;
      const state = document.getElementById("stateSelect") ? document.getElementById("stateSelect").value : "";
      const lga = document.getElementById("lgaSelect") ? document.getElementById("lgaSelect").value : "";

      if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
      }

      const registerBtn = document.getElementById("registerBtn");
      registerBtn.disabled = true;
      registerBtn.textContent = "Registering...";

      const urlParams = new URLSearchParams(window.location.search);
      const refBy = urlParams.get("ref") || "";

      try {
        const res = await apiCall({ action: "register", name, phone, password, state, lga, referral: refBy });

        registerBtn.disabled = false;
        registerBtn.textContent = "Register Now";

        if (res && res.success) {
          alert("Registration successful! Logging you in...");
          setCurrentUser(res.record || { name, phone, referral: res.referral || "" });
          updateLoginUI();
          await refreshUserData();
        } else {
          alert((res && res.message) || "Registration failed. Please try again.");
        }
      } catch (err) {
        console.error("Registration error:", err);
        registerBtn.disabled = false;
        registerBtn.textContent = "Register Now";
        alert("Network error while registering. Please try again.");
      }
    });
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!ensureOnline()) return;
      const phone = document.getElementById("loginPhone").value.trim();
      const password = document.getElementById("loginPasswordInput").value;

      try {
        const res = await apiCall({ action: "lookupPhone", phone, password });
        if (res && res.success) {
          setCurrentUser(res.record);
          updateLoginUI();
          await refreshUserData();
        } else {
          alert((res && res.message) || "Login failed");
        }
      } catch (err) {
        console.error("Login error:", err);
        alert("Network error while logging in. Please try again.");
      }
    });
  }
}

function updateLoginUI() {
  document.getElementById("authSection")?.classList.add("hidden");
  document.getElementById("dashboardSection")?.classList.remove("hidden");
  
  if (document.getElementById("dashUserName") && currentUser) document.getElementById("dashUserName").textContent = currentUser.name;
  if (document.getElementById("dashUserPhone") && currentUser) document.getElementById("dashUserPhone").textContent = currentUser.phone;
  if (document.getElementById("dashRefCode") && currentUser) document.getElementById("dashRefCode").textContent = currentUser.referral || "---";

  if (document.getElementById("navUserName") && currentUser) document.getElementById("navUserName").textContent = currentUser.name;
  if (document.getElementById("navUserPhone") && currentUser) document.getElementById("navUserPhone").textContent = currentUser.phone;
  
  document.getElementById("navUserDetails")?.classList.remove("hidden");
  document.getElementById("navLoginBtn")?.classList.add("hidden");
  document.getElementById("navLogoutBtn")?.classList.remove("hidden");

  const supportLink = document.getElementById("menuSupport") || document.getElementById("menuSupportBtn");
  if (supportLink) {
    supportLink.classList.remove("hidden");
    supportLink.style.display = "inline-block";
  }
}

function setupLogout() {
  const navLogoutBtn = document.getElementById("navLogoutBtn");
  if (navLogoutBtn) {
    navLogoutBtn.addEventListener("click", () => {
      setCurrentUser(null);
      isRedeemed = false;
      shareCount = 0;
      submittedRounds = {1:false, 2:false};
      round1Correct = 0;
      round2Correct = 0;
      currentGameRound = 1;
      completedUnits[1] = { gulder: false, general: false, sports: false };
      completedUnits[2] = { gulder: false, general: false, sports: false };

      document.getElementById("navUserDetails")?.classList.add("hidden");
      document.getElementById("navLogoutBtn")?.classList.add("hidden");
      document.getElementById("navLoginBtn")?.classList.remove("hidden");

      document.getElementById("dashboardSection")?.classList.add("hidden");
      document.getElementById("authSection")?.classList.remove("hidden");
      document.getElementById("tabLogin")?.click();
      document.getElementById("loginForm")?.reset();

      const supportLink = document.getElementById("menuSupport") || document.getElementById("menuSupportBtn");
      if (supportLink) {
        supportLink.classList.add("hidden");
        supportLink.style.display = "";
      }

      alert("You have been logged out successfully.");
    });
  }
}

function setupWhatsAppShare() {
  const shareBtn = document.getElementById("whatsappShare") || document.getElementById("whatsappShareBtn");
  if (!shareBtn) return;

  updateShareUI(shareCount);

  shareBtn.addEventListener("click", () => {
    if (!currentUser) {
      alert("Please login first!");
      return;
    }

    shareCount = Math.min(6, shareCount + 1);

    updateShareUI(shareCount);

    const shareUrl = `${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(currentUser.referral || currentUser.phone)}`;

    const message = `🍺 The Ultimate Search is Back! 🔥
(The Online Quest)
The wait is over! Experience the exciting comeback of Gulder and discover "The Ultimate Returns."
🎁 Visit the link below to:
✅ Get your unique participation code.
✅ Stand a chance to win ₦50,000  
        Phone, Laptop, ₦5m & A Brand New Car.
✅ Watch the exclusive comeback story.
✅ ONE CODE = ONE PERSON.

Please register through my link/code below, it will be credited to my referral, and you'll receive your own code to share with others too.
👇 Tap here to get started:
${shareUrl}`;

    const text = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  });
}

function updateShareUI(count) {
  const percentDisplay = document.getElementById("percentDisplay");
  const sharePercent = document.getElementById("sharePercent");
  const energyFill = document.getElementById("energyFill");
  const redeemBtn = document.getElementById("redeemBtn");
  const claimBtnText = document.getElementById("claimBtnText");

  const pct = Math.min(100, Math.round((count / 6) * 100));
  if (sharePercent) sharePercent.textContent = `${pct}%`;

  if (percentDisplay) percentDisplay.textContent = "GULDER";

  if (energyFill) energyFill.style.width = `${pct}%`;

  const partial = REF_WORD.slice(0, Math.min(count, REF_WORD.length));
  if (claimBtnText) {
    if (partial.length > 0 && partial.length < REF_WORD.length) {
      claimBtnText.textContent = partial;
    } else if (partial.length === 0) {
      claimBtnText.textContent = "Redeem Reward";
    } else {
      claimBtnText.textContent = REF_WORD;
    }
  }

  if (redeemBtn) {
    if (count >= 6) {
      redeemBtn.disabled = false;
      redeemBtn.classList.remove("locked");
      if (claimBtnText) claimBtnText.textContent = REF_WORD;
    } else {
      redeemBtn.disabled = true;
      redeemBtn.classList.add("locked");
    }
  }
}

async function refreshUserData() {
  if (!currentUser) return;
  try {
    const res = await apiCall({ action: "getUserData", phone: currentUser.phone });
    if (res && res.success) {
      if (document.getElementById("dashVisitors")) document.getElementById("dashVisitors").textContent = res.validReferrals;
      if (document.getElementById("dashPoints")) document.getElementById("dashPoints").textContent = res.points;
      if (document.getElementById("dashGameScore")) {
        document.getElementById("dashGameScore").textContent = res.gameCorrectToday || 0;
      }

      if (res.redeemCode) {
        isRedeemed = true;
        currentUser.redeemCode = res.redeemCode;
        setCurrentUser(currentUser);
        if (document.getElementById("dashRedeemCodeDisplay")) {
          document.getElementById("dashRedeemCodeDisplay").textContent = `Code: ${res.redeemCode}`;
        }
        const redeemBtn = document.getElementById("redeemBtn");
        if (redeemBtn) {
          redeemBtn.disabled = false;
          redeemBtn.classList.remove("locked");
        }
        if (document.getElementById("claimBtnText")) document.getElementById("claimBtnText").textContent = "Reveal Code";
        if (document.getElementById("lockIcon")) document.getElementById("lockIcon").textContent = "✅";
      }

      if (typeof res.bankDetails !== "undefined" && res.bankDetails && res.bankDetails.accountNumber) {
        showBankDetailsOnDashboard(res.bankDetails);
        toggleBankForm(true, true);
      } else {
        showBankDetailsOnDashboard(null);
        toggleBankForm(Number(res.points) >= BANK_UNLOCK_POINTS, false);
      }

      const phoneVerified = !!res.phoneVerified;
      togglePhoneVerification(Number(res.points) >= BANK_UNLOCK_POINTS, phoneVerified);
      if (!currentUser.phoneVerified && phoneVerified) {
        if (currentUser) {
          currentUser.phoneVerified = true;
          setCurrentUser(currentUser);
        }
      }

      const supportLink = document.getElementById("menuSupport") || document.getElementById("menuSupportBtn");
      if (supportLink && currentUser) supportLink.style.display = "inline-block";
    }
  } catch (err) {
    console.error("refreshUserData error:", err);
  }

  checkGameLockState();

  await refreshMandatoryVerificationButton();
}

/* Bank UI: setup, toggle, submit */
function setupBankUI() {
  const submitBtn = document.getElementById("submitBankBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      if (!ensureOnline()) return;
      if (!currentUser) {
        alert("Please login first!");
        return;
      }
      const bankName = (document.getElementById("bankNameInput")?.value || "").trim();
      const accountName = (document.getElementById("accountNameInput")?.value || "").trim();
      const accountNumber = (document.getElementById("accountNumberInput")?.value || "").trim();

      if (!bankName || !accountName || !accountNumber) {
        alert("Please fill all bank details.");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Saving...";

      try {
        const res = await apiCall({
          action: "submitBank",
          phone: currentUser.phone,
          bankName,
          accountName,
          accountNumber
        });

        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Bank Details";

        if (res && res.success) {
          const bankDetails = res.bankDetails || { bankName, accountName, accountNumber };
          currentUser.bankDetails = bankDetails;
          setCurrentUser(currentUser);
          showBankDetailsOnDashboard(bankDetails);
          toggleBankForm(true, true);
          alert("Bank details saved successfully.");
        } else {
          alert(res && res.message ? res.message : "Failed to save bank details.");
        }
      } catch (err) {
        console.error("submitBank error:", err);
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Bank Details";
        alert("Network error while saving bank details. Please try again.");
      }
    });
  }
}

function toggleBankForm(unlocked, keepOpenAfterSaved) {
  const form = document.getElementById("bankFormContainer");
  const lockIcon = document.getElementById("bankLockIcon");
  const statusText = document.getElementById("bankStatusText");

  if (unlocked) {
    if (form) form.style.display = "block";
    if (lockIcon) lockIcon.textContent = "🔓";
    if (statusText) statusText.textContent = "Unlocked - you may submit your bank details";
  } else {
    if (form) form.style.display = "none";
    if (lockIcon) lockIcon.textContent = "🔒";
    if (statusText) statusText.textContent = `Locked (Requires ${BANK_UNLOCK_POINTS.toLocaleString()} points)`;
  }
}

function showBankDetailsOnDashboard(bankDetails) {
  const disp = document.getElementById("bankDisplayInfo");
  if (!bankDetails) {
    if (disp) disp.classList.add("hidden");
    return;
  }
  document.getElementById("bankDisplayName").textContent = bankDetails.bankName || "";
  document.getElementById("bankDisplayAccount").textContent = bankDetails.accountName || "";
  document.getElementById("bankDisplayNumber").textContent = bankDetails.accountNumber || "";
  if (disp) disp.classList.remove("hidden");
}

/* --------------------
   Game handlers
   -------------------- */
function setupRedeem() {
  const redeemBtn = document.getElementById("redeemBtn");
  const modal = document.getElementById("redeemModal");
  const closeModal = document.getElementById("closeModalBtn");

  if (!redeemBtn) return;

  redeemBtn.addEventListener("click", () => {
    if (!currentUser) {
      alert("Please login first!");
      return;
    }

    if (currentUser.redeemCode) {
      document.getElementById("redeemCodeInput").value = currentUser.redeemCode;
      modal?.classList.remove("hidden");
      return;
    }

    if (!isRedeemed && shareCount < 6) {
      alert("You must complete 6 WhatsApp shares first!");
      return;
    }

    const win = window.open(SPONSOR_URL, "_blank");
    if (!win) {
      alert("Pop-up blocked! Please allow pop-ups for this site to verify and claim your code.");
      return;
    }

    redeemBtn.disabled = true;
    document.getElementById("claimBtnText").textContent = `Verifying Page (${AD_REQUIRED_SECONDS}s)...`;

    const start = Date.now();
    const checkInterval = 500;
    
    const timerId = setInterval(async () => {
      const elapsed = (Date.now() - start) / 1000;
      const displayTime = Math.ceil(Math.max(0, AD_REQUIRED_SECONDS - elapsed));
      document.getElementById("claimBtnText").textContent = `Verifying Page (${displayTime}s)...`;

      if (elapsed >= AD_REQUIRED_SECONDS) {
        clearInterval(timerId);
        document.getElementById("claimBtnText").textContent = "Processing...";

        try {
          const res = await apiCall({ action: "redeem", phone: currentUser.phone, referral: currentUser.referral });

          if (res && res.success) {
            isRedeemed = true;
            currentUser.redeemCode = res.code;
            setCurrentUser(currentUser);
            document.getElementById("redeemCodeInput").value = res.code;
            modal?.classList.remove("hidden");

            document.getElementById("dashRedeemCodeDisplay").textContent = `Code: ${res.code}`;
            document.getElementById("dashPoints").textContent = res.points;
            if (typeof res.validReferrals !== "undefined") {
              document.getElementById("dashVisitors").textContent = res.validReferrals;
            }

            redeemBtn.disabled = false;
            document.getElementById("claimBtnText").textContent = "Reveal Code";
            document.getElementById("lockIcon").textContent = "✅";

            await refreshUserData();
          } else {
            alert(res && res.message ? res.message : "Redemption failed.");
            redeemBtn.disabled = false;
            document.getElementById("claimBtnText").textContent = "Redeem Reward";
          }
        } catch (err) {
          console.error("Redeem error:", err);
          alert("Network error during redeem. Please try again.");
          redeemBtn.disabled = false;
          document.getElementById("claimBtnText").textContent = "Redeem Reward";
        }
      }
    }, checkInterval);
  });

  closeModal?.addEventListener("click", () => {
    modal?.classList.add("hidden");
  });
}

function setupGameHandlers() {
  const btnGulder = document.getElementById("btnGulderGame");
  const btnGeneral = document.getElementById("btnGeneralGame");
  const btnSports = document.getElementById("btnSportsGame");

  if (btnGulder) btnGulder.addEventListener("click", () => {
    const bank = (typeof GULDER_QUESTIONS !== "undefined") ? GULDER_QUESTIONS : (window.GULDER_QUESTIONS || []);
    startCategoryUnit("gulder", bank);
  });
  if (btnGeneral) btnGeneral.addEventListener("click", () => {
    const bank = (typeof GENERAL_QUESTIONS !== "undefined") ? GENERAL_QUESTIONS : (window.GENERAL_QUESTIONS || []);
    startCategoryUnit("general", bank);
  });
  if (btnSports) btnSports.addEventListener("click", () => {
    const bank = (typeof SPORTS_QUESTIONS !== "undefined") ? SPORTS_QUESTIONS : (window.SPORTS_QUESTIONS || []);
    startCategoryUnit("sports", bank);
  });

  document.getElementById("btnInitialSubmitGame")?.addEventListener("click", revealGameAnswers);
  document.getElementById("btnWatchAdGame")?.addEventListener("click", handleWatchAdReplay);
  document.getElementById("btnPersistentAdGame")?.addEventListener("click", handleWatchAdReplay);
  document.getElementById("btnFinalSubmitGame")?.addEventListener("click", () => submitRoundPoints(currentGameRound));
}

function startCategoryUnit(category, questionBank) {
  if (!currentUser) {
    alert("Please login first!");
    return;
  }
  if (!isRedeemed) {
    alert("You must redeem code first before playing!");
    return;
  }

  const gData = getUserGameData();
  if (gData.roundsPlayed >= 2) {
    alert("You have reached your daily limit! Please come back tomorrow.");
    return;
  }
  if (gData.roundsPlayed === 1 && currentGameRound === 1) {
    alert("You have completed your first attempt. Please watch an ad to unlock Round 2!");
    return;
  }

  if (completedUnits[currentGameRound] && completedUnits[currentGameRound][category]) {
    alert("You have already completed this unit for the current round. You cannot play it again in this round.");
    return;
  }

  if (isPlayingCategory) {
    alert("You are already playing a unit. Finish it before starting another.");
    return;
  }

  currentCategory = category;
  const bank = Array.isArray(questionBank) ? questionBank : [];
  categoryQuestions[category] = shuffleArray([...bank]).slice(0, 5);
  userAnswers[category] = {};
  currentQIndex = 0;
  isPlayingCategory = true;

  disableAllCategoryButtons(true);
  document.getElementById("gamePlayArea")?.classList.remove("hidden");
  showQuestion();
}

function showQuestion() {
  clearInterval(timerInterval);
  activeQuestionsList = categoryQuestions[currentCategory] || [];

  if (currentQIndex >= activeQuestionsList.length) {
    isPlayingCategory = false;
    updateCategoryStatus(currentCategory);
    clearGamePlayArea();
    refreshCategoryButtons();
    checkAllCategoriesComplete();
    return;
  }

  const q = activeQuestionsList[currentQIndex];
  if (!q) {
    currentQIndex++;
    showQuestion();
    return;
  }

  document.getElementById("gameCategoryTitle").textContent = `${currentCategory.toUpperCase()} UNIT (${currentQIndex + 1}/5)`;
  document.getElementById("gameQuestionText").textContent = q.q || "";

  const optionsContainer = document.getElementById("gameOptionsContainer");
  optionsContainer.innerHTML = "";

  let currentSelected = (userAnswers[currentCategory] && typeof userAnswers[currentCategory][currentQIndex] !== "undefined")
    ? userAnswers[currentCategory][currentQIndex]
    : null;

  (q.options || []).forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "btn btn-dark game-option-btn";
    btn.style.textAlign = "left";
    btn.style.padding = "10px";
    btn.textContent = opt;

    const updateOptionStyles = () => {
      const allOpts = optionsContainer.querySelectorAll(".game-option-btn");
      allOpts.forEach((el, i) => {
        if (i === currentSelected) {
          el.style.border = "2px solid var(--gold-primary)";
          el.style.background = "linear-gradient(90deg, rgba(212,175,55,0.08), rgba(212,175,55,0.02))";
        } else {
          el.style.border = "1px solid #444";
          el.style.background = "";
        }
      });
    };

    btn.addEventListener("click", () => {
      currentSelected = idx;
      updateOptionStyles();
    });

    optionsContainer.appendChild(btn);
  });

  let nextBtn = document.getElementById("gameNextBtn");
  if (nextBtn) nextBtn.remove();

  nextBtn = document.createElement("button");
  nextBtn.id = "gameNextBtn";
  nextBtn.className = "btn btn-register";
  nextBtn.style.marginTop = "12px";
  nextBtn.textContent = "Next";
  nextBtn.disabled = false;

  nextBtn.addEventListener("click", () => {
    const answerIndex = (currentSelected === null ? -1 : currentSelected);
    if (!userAnswers[currentCategory]) userAnswers[currentCategory] = {};
    userAnswers[currentCategory][currentQIndex] = answerIndex;
    currentQIndex++;
    clearInterval(timerInterval);
    showQuestion();
  });

  optionsContainer.appendChild(nextBtn);

  startTimer();
}

function startTimer() {
  let timeLeft = 20;
  const timerEl = document.getElementById("gameTimer");
  if (timerEl) timerEl.textContent = timeLeft;
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    timeLeft--;
    if (timerEl) timerEl.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      if (!userAnswers[currentCategory]) userAnswers[currentCategory] = {};
      userAnswers[currentCategory][currentQIndex] = -1;
      currentQIndex++;
      showQuestion();
    }
  }, 1000);
}

function updateCategoryStatus(category) {
  if (!completedUnits[currentGameRound]) completedUnits[currentGameRound] = { gulder: false, general: false, sports: false };
  completedUnits[currentGameRound][category] = true;

  if (category === "gulder") {
    document.getElementById("statusGulder").textContent = "✅";
    const btn = document.getElementById("btnGulderGame");
    if (btn) btn.disabled = true;
  }
  if (category === "general") {
    document.getElementById("statusGeneral").textContent = "✅";
    const btn = document.getElementById("btnGeneralGame");
    if (btn) btn.disabled = true;
  }
  if (category === "sports") {
    document.getElementById("statusSports").textContent = "✅";
    const btn = document.getElementById("btnSportsGame");
    if (btn) btn.disabled = true;
  }
}

function checkAllCategoriesComplete() {
  const completed = completedUnits[currentGameRound] || {};
  if (completed.gulder && completed.general && completed.sports) {
    document.getElementById("gamePostArea")?.classList.remove("hidden");
  }
}

function revealGameAnswers() {
  let correctCount = 0;
  let breakdownHtml = "";

  ["gulder", "general", "sports"].forEach((cat) => {
    const catQuestions = categoryQuestions[cat] || [];
    if (!Array.isArray(catQuestions) || catQuestions.length === 0) return;

    catQuestions.forEach((q, idx) => {
      const uAns = (userAnswers[cat] && typeof userAnswers[cat][idx] !== "undefined") ? userAnswers[cat][idx] : -1;
      const isCorrect = uAns === q.answer;
      if (isCorrect) correctCount++;

      breakdownHtml += `<p style="margin:4px 0;"><strong>[${cat.toUpperCase()}] ${escapeHtml(q.q)}</strong><br>`;
      breakdownHtml += `Your Answer: <span style="color:${isCorrect ? '#25D366' : '#ff3333'}">${uAns >= 0 ? escapeHtml(q.options[uAns]) : 'None'}</span> | Correct: <span style="color:#25D366">${escapeHtml(q.options[q.answer])}</span></p>`;
    });
  });

  if (currentGameRound === 1) {
    round1Correct = correctCount;
    setUserGameData({ date: getTodayKey(), roundsPlayed: 1 });
    disableQuestionButtons(true, "🔒 Round 1 Complete! Watch advert to unlock Round 2");
  } else {
    round2Correct = correctCount;
    setUserGameData({ date: getTodayKey(), roundsPlayed: 2 });
    disableQuestionButtons(true, "🔒 Come back tomorrow");
    setAdButtonsState(true, "🔒 Come back tomorrow");
  }

  const currentRoundScore = correctCount * 100;
  const totalCombinedScore = (round1Correct + round2Correct) * 100;

  document.getElementById("gameResultsReveal")?.classList.remove("hidden");
  document.getElementById("gameScoreText").textContent = currentGameRound === 1 
    ? `Round ${currentGameRound} Score: ${correctCount}/15 Correct = ${currentRoundScore} Points`
    : `Round ${currentGameRound} Score: ${correctCount}/15 | Combined Total: ${round1Correct + round2Correct}/30 = ${totalCombinedScore} Points`;
  
  document.getElementById("answersBreakdown").innerHTML = breakdownHtml;

  document.getElementById("btnInitialSubmitGame")?.classList.add("hidden");
  document.getElementById("postRevealButtons")?.classList.remove("hidden");

  const btnSubmit = document.getElementById("btnFinalSubmitGame");
  if (btnSubmit) {
    btnSubmit.textContent = submittedRounds[currentGameRound] ? `Round ${currentGameRound} Submitted` : `Submit Round ${currentGameRound} Points`;
    btnSubmit.disabled = submittedRounds[currentGameRound];
  }

  const gData = getUserGameData();
  if (gData.roundsPlayed >= 2) {
    setAdButtonsState(true, "🔒 Come back tomorrow");
  }
}

async function submitRoundPoints(roundNumber) {
  if (!currentUser) {
    alert("Please login first!");
    return;
  }
  if (roundNumber !== 1 && roundNumber !== 2) {
    alert("Invalid round.");
    return;
  }
  if (submittedRounds[roundNumber]) {
    alert(`Round ${roundNumber} already submitted.`);
    return;
  }

  const correctCount = roundNumber === 1 ? round1Correct : round2Correct;
  if (typeof correctCount === "undefined" || correctCount === null) {
    alert("No results to submit for this round.");
    return;
  }

  submittedRounds[roundNumber] = true;
  const btnSubmit = document.getElementById("btnFinalSubmitGame");
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = `Submitting Round ${roundNumber}...`;
  }

  try {
    const res = await apiCall({
      action: "submitGame",
      phone: currentUser.phone,
      correctCount: correctCount,
      roundNumber: roundNumber
    });

    if (res && res.success) {
      alert(`Round ${roundNumber} Points Submitted Successfully! Added: ${res.added} Points.`);
      if (document.getElementById("dashPoints")) document.getElementById("dashPoints").textContent = res.points;
      if (document.getElementById("dashGameScore")) {
        document.getElementById("dashGameScore").textContent = res.gameCorrectToday;
      }
      if (btnSubmit) {
        btnSubmit.textContent = `Round ${roundNumber} Submitted`;
        btnSubmit.disabled = true;
      }

      const gData = getUserGameData();
      if (gData.roundsPlayed < 2) {
        document.getElementById("persistentAdContainer")?.classList.remove("hidden");
      } else {
        document.getElementById("persistentAdContainer")?.classList.add("hidden");
      }

      await refreshUserData();
    } else {
      submittedRounds[roundNumber] = false;
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = `Submit Round ${roundNumber} Points`;
      }
      alert(res && res.message ? res.message : "Failed to submit points.");
    }
  } catch (err) {
    submittedRounds[roundNumber] = false;
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = `Submit Round ${roundNumber} Points`;
    }
    console.error("Submit round error:", err);
    alert("Network error while submitting round. Please try again.");
  }
}

function handleWatchAdReplay() {
  if (!currentUser) return;

  const gData = getUserGameData();
  if (gData.roundsPlayed >= 2) {
    alert("You have reached your daily play limit! Please come back tomorrow.");
    return;
  }

  const win = window.open(SPONSOR_URL, "_blank");
  if (!win) {
    alert("Pop-up blocked! Please allow pop-ups for this site to unlock Round 2.");
    return;
  }

  const watchAdBtn = document.getElementById("btnWatchAdGame");
  const persistentAdBtn = document.getElementById("btnPersistentAdGame");
  
  if (watchAdBtn) {
    watchAdBtn.disabled = true;
    watchAdBtn.textContent = `Verifying Page (${AD_REQUIRED_SECONDS}s)...`;
  }
  if (persistentAdBtn) {
    persistentAdBtn.disabled = true;
    persistentAdBtn.textContent = `Verifying Page (${AD_REQUIRED_SECONDS}s)...`;
  }

  const start = Date.now();
  const checkInterval = 500;
  
  const timerId = setInterval(() => {
    const elapsed = (Date.now() - start) / 1000;
    const displayTime = Math.ceil(Math.max(0, AD_REQUIRED_SECONDS - elapsed));
    
    if (watchAdBtn) watchAdBtn.textContent = `Verifying Page (${displayTime}s)...`;
    if (persistentAdBtn) persistentAdBtn.textContent = `Verifying Page (${displayTime}s)...`;

    if (elapsed >= AD_REQUIRED_SECONDS) {
      clearInterval(timerId);
      
      currentGameRound = 2;
      completedUnits[2] = { gulder: false, general: false, sports: false };
      submittedRounds[2] = false;
      round2Correct = 0;

      categoryQuestions = { gulder: [], general: [], sports: [] };
      userAnswers = { gulder: {}, general: {}, sports: {} };
      isPlayingCategory = false;

      document.getElementById("statusGulder").textContent = "⚪";
      document.getElementById("statusGeneral").textContent = "⚪";
      document.getElementById("statusSports").textContent = "⚪";

      document.getElementById("gameResultsReveal")?.classList.add("hidden");
      document.getElementById("postRevealButtons")?.classList.add("hidden");
      document.getElementById("gamePostArea")?.classList.add("hidden");
      document.getElementById("btnInitialSubmitGame")?.classList.remove("hidden");
      document.getElementById("persistentAdContainer")?.classList.add("hidden");

      disableAllCategoryButtons(false);
      clearGamePlayArea();

      alert("Advert approved! Round 2 is unlocked — play all 3 units again.");
    }
  }, checkInterval);
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getUserGameData() {
  const key = `game_data_${currentUser ? currentUser.phone : 'guest'}`;
  const data = localStorage.getItem(key);
  if (!data) return { date: getTodayKey(), roundsPlayed: 0 };
  try {
    const parsed = JSON.parse(data);
    if (parsed.date !== getTodayKey()) {
      return { date: getTodayKey(), roundsPlayed: 0 };
    }
    return parsed;
  } catch (e) {
    return { date: getTodayKey(), roundsPlayed: 0 };
  }
}

function setUserGameData(data) {
  const key = `game_data_${currentUser ? currentUser.phone : 'guest'}`;
  localStorage.setItem(key, JSON.stringify(data));
}

function checkGameLockState() {
  const gData = getUserGameData();
  if (gData.roundsPlayed >= 2) {
    disableQuestionButtons(true, "🔒 Daily Limit Reached");
    setAdButtonsState(true, "🔒 Come back tomorrow");
  } else if (gData.roundsPlayed === 1) {
    disableQuestionButtons(true, "🔒 Round 1 Complete! Watch advert to unlock Round 2");
  }
}

function disableQuestionButtons(disabled, message = "") {
  ["btnGulderGame", "btnGeneralGame", "btnSportsGame"].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = disabled;
      if (message && disabled) btn.title = message;
    }
  });
}

function setAdButtonsState(disabled, text = "") {
  ["btnWatchAdGame", "btnPersistentAdGame"].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = disabled;
      if (text) btn.textContent = text;
    }
  });
}

/* --------------------
   API router -> calls firestore helper functions above
   -------------------- */
async function apiCall(payload) {
  if (!navigator.onLine) throw new Error("Offline");

  const action = payload.action;
  switch (action) {
    case "register":
      return await registerUser(payload);
    case "lookupPhone":
      return await lookupPhone(payload);
    case "getUserData":
      return await getUserData(payload);
    case "submitBank":
      return await submitBank(payload);
    case "submitGame":
      return await submitGame(payload);
    case "redeem":
      return await redeem(payload);
    case "getLeaderboard":
      return await getLeaderboard(payload);
    case "submitComment":
      return await submitComment(payload);
    case "setPhoneVerified":
      return await setPhoneVerified(payload);
    case "checkReferrerPoints":
      return await checkReferrerPoints(payload);
    default:
      throw new Error("Unknown action: " + action);
  }
}

// make apiCall available to other script files loaded in DOM (comments.js relies on it)
window.apiCall = apiCall;
window.submitCommentViaBackend = async (payload) => {
  return apiCall(payload);
};

/* --------------------
   Comments module hookup (if comments.js present)
   Avoid duplicate listeners (guarded)
   -------------------- */
function setupCommentsModuleIfPresent() {
  const commentBtn = document.getElementById("commentSubmitBtn");
  if (commentBtn) {
    // If comments.js already attached its listener, do NOT attach another one.
    if (commentBtn._commentsListenerAdded) return;
    if (commentBtn._scriptListenerAdded) return;

    commentBtn.addEventListener("click", async () => {
      if (!ensureOnline()) return;
      if (!currentUser) {
        alert("Please login first to post a comment.");
        return;
      }
      const commentArea = document.getElementById("commentTextarea");
      const text = (commentArea.value || "").trim();
      if (!text) {
        alert("Please write a comment before submitting.");
        return;
      }
      commentBtn.disabled = true;
      commentBtn.textContent = "Submitting...";
      try {
        const res = await apiCall({
          action: "submitComment",
          phone: currentUser.phone,
          name: currentUser.name || "",
          comment: text
        });
        if (res && res.success) {
          commentArea.value = "";
          const status = document.getElementById("commentStatusMsg");
          if (status) status.textContent = "Comment recorded.";
        } else {
          alert(res && res.message ? res.message : "Failed to submit comment.");
        }
      } catch (err) {
        console.error("Comment submit error:", err);
        alert("Network error while sending comment. Please try again.");
      } finally {
        commentBtn.disabled = false;
        commentBtn.textContent = "Comment";
      }
    });
    commentBtn._scriptListenerAdded = true;
  }
}

/* --------------------
   Mandatory Verification Button
   -------------------- */
function setupMandatoryVerificationButton() {
  const btn = document.getElementById("mandatoryVerifyBtn");
  if (!btn) return;

  btn.disabled = true;
  btn.classList.add("locked");
  const icon = document.getElementById("mandLockIcon");
  if (icon) icon.textContent = "🔒";

  btn.addEventListener("click", (e) => {
    if (btn.disabled) {
      e.preventDefault();
      alert("This verification is locked. It will be available once the referrer has met the verification threshold.");
      return;
    }
    window.open("https://www.livescores.com", "_blank");
  });
}

async function refreshMandatoryVerificationButton() {
  const btn = document.getElementById("mandatoryVerifyBtn");
  const icon = document.getElementById("mandLockIcon");
  if (!btn) return;

  btn.disabled = true;
  btn.classList.add("locked");
  if (icon) icon.textContent = "🔒";

  // Use the correct property name: `referral`
  if (!currentUser || !currentUser.referral) return;

  try {
    const res = await apiCall({ action: "checkReferrerPoints", referredByCode: currentUser.referral });
    if (res && res.success && res.meets) {
      btn.disabled = false;
      btn.classList.remove("locked");
      if (icon) icon.textContent = "🔓";
      btn.title = "Referrer has 10,000+ points — click to perform verification";
    } else {
      btn.disabled = true;
      btn.classList.add("locked");
      btn.title = res && typeof res.points === "number" ? `Referrer points: ${res.points}` : "Verification locked";
    }
  } catch (err) {
    console.error("Failed to check referrer points:", err);
  }
}

/* --------------------
   Utilities
   -------------------- */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
// Compatibility: expose helpers to legacy/global scripts
if (typeof window !== "undefined") 
  window.firebaseApp = app;
  window.firebaseDB = db;
  window.firebaseAuth = auth;

  if (typeof window !== "undefined") {
  window.registerUser = window.registerUser || registerUser;
  window.lookupPhone = window.lookupPhone || lookupPhone;
  window.getUserData = window.getUserData || getUserData;
  window.submitBank = window.submitBank || submitBank;
  window.submitGame = window.submitGame || submitGame;
  window.redeem = window.redeem || redeem;
  window.getLeaderboard = window.getLeaderboard || getLeaderboard;
  window.submitComment = window.submitComment || submitComment;
  window.setPhoneVerified = window.setPhoneVerified || setPhoneVerified;
  window.checkReferrerPoints = window.checkReferrerPoints || checkReferrerPoints;
}

