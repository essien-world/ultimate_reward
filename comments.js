// comments.js (fixed)
// Comments module (separate file) - handles display, rotation and posting of comments
const COMMENTS_SPONSOR_URL = "https://google.com"; // sponsor / ad url
const ROTATE_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours
const BATCH_SIZE = 5;
const AD_WAIT_MS = 7000;

// Pre-generated 10 comments (will display 5 at a time and rotate)
const PRESET_COMMENTS = [
  { name: "Amaka O.", text: "Love the trivia — cleaned the GULDER unit in one go! This game keeps me coming back.", time: "2h" },
  { name: "Tunde A.", text: "I won a weekend voucher. The redemption flow is slick — great UX!", time: "1d" },
  { name: "Chinelo M.", text: "Fast loading and fun questions. The leaderboard is motivating!", time: "3d" },
  { name: "Ibrahim S.", text: "Shared the link and got my 600 points. The energy meter is a fun touch.", time: "5d" },
  { name: "Grace N.", text: "Finally hit the top 10 — the game is addictive but fair.", time: "6d" },
  { name: "Kemi R.", text: "The sponsor ads were quick and I redeemed my code — great prizes.", time: "1w" },
  { name: "Bayo O.", text: "I almost won the daily draw! Questions were challenging but rewarding.", time: "8h" },
  { name: "Sandra L.", text: "Great prizes and the community is buzzing. I recommended it to friends.", time: "4d" },
  { name: "Peter V.", text: "Fast support and payouts — bank upload UI is clear when unlocked.", time: "2w" },
  { name: "Nkechi T.", text: "Best trivia I've played this year. The combined rounds are a nice twist.", time: "10h" }
];

let commentBatchIndex = 0; // 0 shows comments 0-4, 1 shows comments 5-9

document.addEventListener("DOMContentLoaded", () => {
  initCommentsModule();
});

function getAppCurrentUser() {
  // Prefer direct currentUser variable if defined, otherwise fallback to window.currentUser
  try {
    if (typeof currentUser !== "undefined" && currentUser) return currentUser;
  } catch (e) { /* ignore */ }
  if (typeof window !== "undefined" && window.currentUser) return window.currentUser;
  return null;
}

function initCommentsModule() {
  renderComments(); // initial render
  // Start rotation timer
  setInterval(() => {
    commentBatchIndex = (commentBatchIndex + 1) % Math.ceil(PRESET_COMMENTS.length / BATCH_SIZE);
    renderComments();
  }, ROTATE_INTERVAL_MS);

  // Setup submit button handler
  const commentBtn = document.getElementById("commentSubmitBtn");
  const commentArea = document.getElementById("commentTextarea");
  const commentMessage = document.getElementById("commentStatusMsg");

  if (commentBtn && commentArea) {
    commentBtn.addEventListener("click", async () => {
      // Ensure user is logged in (use robust getter)
      const appUser = getAppCurrentUser();
      if (!appUser || !appUser.phone) {
        alert("Please login first to post a comment.");
        return;
      }

      const text = (commentArea.value || "").trim();
      if (!text) {
        alert("Please write a comment before submitting.");
        return;
      }

      // disable UI while submitting
      commentBtn.disabled = true;
      commentBtn.textContent = "Submitting...";

      // Send to backend via Firebase wrapper
try {
  const payload = {
    action: "submitComment",
    phone: appUser.phone,
    name: appUser.name || "",
    comment: text
  };

  // prefer window.submitCommentViaBackend (set by script.js)
  const resJson = (typeof window.submitCommentViaBackend === "function")
    ? await window.submitCommentViaBackend(payload)
    : await window.apiCall(payload); // fallback

  if (!resJson || !resJson.success) {
    console.warn("Comment submit returned failure:", resJson);
    alert(resJson && resJson.message ? resJson.message : "Failed to submit comment to server. We'll still open sponsor window.");
  }
} catch (err) {
  console.error("Comment submit error:", err);
  alert("Network error while sending comment. We'll still open sponsor window.");
}

      // Open sponsor/ad window and allow it to stand for AD_WAIT_MS
      const adWin = window.open(COMMENTS_SPONSOR_URL, "_blank");
      if (!adWin) {
        alert("Pop-up blocked! Please allow pop-ups for this site to view sponsor content and complete submission.");
      }

      // After AD_WAIT_MS, clear textarea and show message
      setTimeout(() => {
        commentArea.value = "";
        if (commentMessage) commentMessage.textContent = "your comment will auto Load";
        commentBtn.textContent = "Comment";
        commentBtn.disabled = false;
      }, AD_WAIT_MS);
    });
  }
}

function renderComments() {
  const listContainer = document.getElementById("commentsDisplayList");
  if (!listContainer) return;

  // determine slice
  const start = commentBatchIndex * BATCH_SIZE;
  const end = Math.min(start + BATCH_SIZE, PRESET_COMMENTS.length);
  const slice = PRESET_COMMENTS.slice(start, end);

  // clear and populate
  listContainer.innerHTML = "";
  slice.forEach((c) => {
    const item = document.createElement("div");
    item.className = "comment-card-item"; // reuse existing class style
    item.innerHTML = `
      <div class="comment-meta"><span>${escapeHtml(c.name)}</span><span style="color:var(--text-muted); font-size:0.75rem;">${escapeHtml(c.time)}</span></div>
      <div class="comment-text">${escapeHtml(c.text)}</div>
    `;
    listContainer.appendChild(item);
  });
}

// helper to guard against HTML injection
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}