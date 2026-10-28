/* =========================================================
   CareerFlow — Application Logic
   Vanilla JS, LocalStorage persistence, no build step.
========================================================= */

(function () {
  "use strict";

  /* ---------- Constants ---------- */
  const STORAGE_KEY = "careerflow.applications.v1";
  const SETTINGS_KEY = "careerflow.settings.v1";
  const SEEDED_KEY = "careerflow.seeded.v1";

  const STATUSES = ["Wishlist", "Applied", "Interview", "Offer", "Rejected"];
  const STATUS_CLASS = {
    Wishlist: "wishlist",
    Applied: "applied",
    Interview: "interview",
    Offer: "offer",
    Rejected: "rejected",
  };

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  /* ---------- Utility helpers ---------- */

  function uid() {
    return "app_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
  }

  function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function parseDate(iso) {
    if (!iso) return null;
    const d = new Date(iso + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDate(iso) {
    const d = parseDate(iso);
    if (!d) return "—";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function formatDateShort(iso) {
    const d = parseDate(iso);
    if (!d) return { d: "--", m: "---" };
    return { d: d.getDate(), m: MONTH_NAMES[d.getMonth()] };
  }

  function formatDateTime(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function daysBetween(a, b) {
    const MS = 86400000;
    return Math.round((b.setHours(0,0,0,0) - a.setHours(0,0,0,0)) / MS);
  }

  function isValidURL(value) {
    if (!value) return true; // optional field
    try {
      const url = value.includes("://") ? value : "https://" + value;
      const u = new URL(url);
      return !!u.hostname && u.hostname.includes(".");
    } catch (e) {
      return false;
    }
  }

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function initials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
  }

  /* ---------- State ---------- */

  const state = {
    applications: [],
    settings: { displayName: "Job Seeker", theme: "light" },
    page: "dashboard",
    filters: { search: "", status: "all", mode: "all", dateFrom: "", dateTo: "" },
    sort: { field: "applicationDate", dir: "desc" },
    view: "table", // table | kanban
    pendingDelete: null,
  };

  /* ---------- Persistence ---------- */

  function loadApplications() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((a) => a && typeof a === "object" && a.id);
    } catch (e) {
      console.warn("CareerFlow: failed to parse stored applications, resetting.", e);
      return [];
    }
  }

  function saveApplications() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.applications));
    } catch (e) {
      toast("Could not save data — storage may be full or unavailable.", "error");
    }
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { displayName: "Job Seeker", theme: "light" };
      const parsed = JSON.parse(raw);
      return {
        displayName: typeof parsed.displayName === "string" && parsed.displayName.trim() ? parsed.displayName : "Job Seeker",
        theme: parsed.theme === "dark" ? "dark" : "light",
      };
    } catch (e) {
      return { displayName: "Job Seeker", theme: "light" };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch (e) {
      toast("Could not save settings.", "error");
    }
  }

  /* ---------- Demo data ---------- */

  function buildDemoData() {
    const now = Date.now();
    const d = (offsetDays) => {
      const dt = new Date();
      dt.setDate(dt.getDate() + offsetDays);
      return dt.toISOString().slice(0, 10);
    };
    const raw = [
      { company: "Nimbus Analytics", title: "Frontend Engineer", url: "https://nimbusanalytics.com/careers/42", location: "Austin, TX", mode: "Remote", type: "Full-time", salary: "$95k–$120k", appDate: d(-30), status: "Interview", recruiter: "Dana Price", recruiterContact: "dana.price@nimbusanalytics.com", interviewDate: d(3), interviewTime: "14:00", followupDate: d(1), notes: "Second round with the eng manager. Focus on component architecture." },
      { company: "Brightwell Health", title: "Product Designer", url: "https://brightwellhealth.com/jobs/designer", location: "Remote", mode: "Remote", type: "Full-time", salary: "$85k–$105k", appDate: d(-45), status: "Applied", recruiter: "", recruiterContact: "", interviewDate: "", interviewTime: "", followupDate: d(-1), notes: "Submitted portfolio, waiting to hear back." },
      { company: "Cascade Robotics", title: "Mechanical Design Intern", url: "https://cascaderobotics.com/internships", location: "Seattle, WA", mode: "On-site", type: "Internship", salary: "$28/hr", appDate: d(-10), status: "Wishlist", recruiter: "", recruiterContact: "", interviewDate: "", interviewTime: "", followupDate: "", notes: "Need to tailor resume before applying." },
      { company: "Ledgerly", title: "Backend Engineer (Node.js)", url: "https://ledgerly.io/careers/backend", location: "New York, NY", mode: "Hybrid", type: "Full-time", salary: "$110k–$140k", appDate: d(-60), status: "Offer", recruiter: "Marcus Webb", recruiterContact: "marcus.webb@ledgerly.io", interviewDate: d(-15), interviewTime: "10:30", followupDate: d(2), notes: "Offer received, negotiating start date and equity." },
      { company: "Polarbyte Security", title: "Security Analyst", url: "https://polarbyte.com/jobs/8831", location: "Remote", mode: "Remote", type: "Full-time", salary: "", appDate: d(-50), status: "Rejected", recruiter: "", recruiterContact: "", interviewDate: "", interviewTime: "", followupDate: "", notes: "Rejected after final round — asked for 5+ years in SOC environments." },
      { company: "Greenline Logistics", title: "Data Analyst", url: "https://greenlinelogistics.com/careers", location: "Chicago, IL", mode: "On-site", type: "Full-time", salary: "$70k–$85k", appDate: d(-5), status: "Applied", recruiter: "", recruiterContact: "", interviewDate: "", interviewTime: "", followupDate: d(4), notes: "Applied through referral from a former coworker." },
      { company: "Hearthstone Media", title: "Marketing Coordinator", url: "https://hearthstonemedia.com/jobs/marketing", location: "Remote", mode: "Remote", type: "Part-time", salary: "$25/hr", appDate: d(-20), status: "Interview", recruiter: "Priya Shah", recruiterContact: "priya.shah@hearthstonemedia.com", interviewDate: d(-2), interviewTime: "09:00", followupDate: d(-1), notes: "First interview went well, awaiting next steps." },
      { company: "Vantage Build Co", title: "QA Engineer", url: "https://vantagebuild.co/careers/qa", location: "Denver, CO", mode: "Hybrid", type: "Contract", salary: "$50/hr", appDate: d(-3), status: "Wishlist", recruiter: "", recruiterContact: "", interviewDate: "", interviewTime: "", followupDate: "", notes: "" },
      { company: "Solstice Finance", title: "Junior Software Engineer", url: "https://solsticefinance.com/careers/jse", location: "Boston, MA", mode: "On-site", type: "Full-time", salary: "$80k–$95k", appDate: d(-14), status: "Applied", recruiter: "", recruiterContact: "", interviewDate: "", interviewTime: "", followupDate: d(0), notes: "Needs a cover letter follow-up today." },
      { company: "Orbital Studio", title: "UX Researcher", url: "https://orbitalstudio.design/jobs/ux-research", location: "Remote", mode: "Remote", type: "Full-time", salary: "$90k–$110k", appDate: d(-70), status: "Rejected", recruiter: "", recruiterContact: "", interviewDate: "", interviewTime: "", followupDate: "", notes: "Position filled internally." },
      { company: "Meridian Energy", title: "Business Analyst", url: "https://meridianenergy.com/careers/ba", location: "Houston, TX", mode: "Hybrid", type: "Full-time", salary: "$75k–$92k", appDate: d(-7), status: "Interview", recruiter: "Tom Reyes", recruiterContact: "tom.reyes@meridianenergy.com", interviewDate: d(6), interviewTime: "13:00", followupDate: d(5), notes: "Phone screen scheduled next week." },
    ];
    return raw.map((r, idx) => ({
      id: uid() + "_" + idx,
      company: r.company,
      title: r.title,
      url: r.url,
      location: r.location,
      mode: r.mode,
      type: r.type,
      salary: r.salary,
      applicationDate: r.appDate,
      status: r.status,
      recruiter: r.recruiter,
      recruiterContact: r.recruiterContact,
      interviewDate: r.interviewDate,
      interviewTime: r.interviewTime,
      followupDate: r.followupDate,
      followupCompleted: false,
      interviewCompleted: r.status === "Rejected" || r.status === "Offer",
      interviewOutcome: "",
      notes: r.notes,
      createdAt: now,
      updatedAt: now,
    }));
  }

  /* ---------- Toasts ---------- */

  function toast(message, type = "success") {
    const stack = document.getElementById("toastStack");
    const el = document.createElement("div");
    el.className = "toast " + type;
    const icon = type === "error"
      ? '<svg class="toast-icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      : '<svg class="toast-icon" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    el.innerHTML = icon + "<span>" + escapeHTML(message) + "</span>";
    stack.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity .25s ease, transform .25s ease";
      el.style.opacity = "0";
      el.style.transform = "translateX(20px)";
      setTimeout(() => el.remove(), 260);
    }, 3200);
  }

  /* ---------- Data accessors ---------- */

  function getApp(id) {
    return state.applications.find((a) => a.id === id);
  }

  function upsertApp(data) {
    const now = Date.now();
    if (data.id) {
      const existing = getApp(data.id);
      if (existing) {
        Object.assign(existing, data, { updatedAt: now });
        saveApplications();
        return existing;
      }
    }
    const newApp = Object.assign(
      {
        id: uid(),
        followupCompleted: false,
        interviewCompleted: false,
        interviewOutcome: "",
        createdAt: now,
      },
      data,
      { updatedAt: now }
    );
    state.applications.unshift(newApp);
    saveApplications();
    return newApp;
  }

  function deleteApp(id) {
    state.applications = state.applications.filter((a) => a.id !== id);
    saveApplications();
  }

  function getFilteredSortedApps() {
    const f = state.filters;
    let list = state.applications.slice();

    if (f.search.trim()) {
      const q = f.search.trim().toLowerCase();
      list = list.filter(
        (a) => a.company.toLowerCase().includes(q) || a.title.toLowerCase().includes(q)
      );
    }
    if (f.status !== "all") list = list.filter((a) => a.status === f.status);
    if (f.mode !== "all") list = list.filter((a) => a.mode === f.mode);
    if (f.dateFrom) list = list.filter((a) => a.applicationDate && a.applicationDate >= f.dateFrom);
    if (f.dateTo) list = list.filter((a) => a.applicationDate && a.applicationDate <= f.dateTo);

    const { field, dir } = state.sort;
    list.sort((a, b) => {
      let va = a[field] || "";
      let vb = b[field] || "";
      if (field === "applicationDate") {
        va = va || "0000-00-00";
        vb = vb || "0000-00-00";
      } else {
        va = String(va).toLowerCase();
        vb = String(vb).toLowerCase();
      }
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }

  /* ---------- Rendering: shell ---------- */

  const PAGES = {
    dashboard: { title: "Dashboard", subtitle: "Your job search at a glance", render: renderDashboard },
    applications: { title: "All Applications", subtitle: "Manage every application in one place", render: renderApplications },
    interviews: { title: "Interview Tracker", subtitle: "Stay ready for every conversation", render: renderInterviews },
    followups: { title: "Follow-ups", subtitle: "Never miss a check-in", render: renderFollowups },
    analytics: { title: "Analytics", subtitle: "Understand your job search performance", render: renderAnalytics },
    settings: { title: "Settings", subtitle: "Manage your profile and data", render: renderSettings },
  };

  function navigate(page) {
    if (!PAGES[page]) page = "dashboard";
    state.page = page;
    document.querySelectorAll(".nav-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.page === page);
    });
    document.getElementById("pageTitle").textContent = PAGES[page].title;
    document.getElementById("pageSubtitle").textContent = PAGES[page].subtitle;
    closeMobileNav();
    renderPage();
  }

  function renderPage() {
    const content = document.getElementById("content");
    content.innerHTML = "";
    PAGES[state.page].render(content);
  }

  function closeMobileNav() {
    document.getElementById("app").classList.remove("mobile-nav-open");
  }

  /* ---------- Dashboard ---------- */

  function renderDashboard(root) {
    const apps = state.applications;

    const total = apps.length;
    const interviewsScheduled = apps.filter((a) => a.interviewDate && !a.interviewCompleted).length;
    const offers = apps.filter((a) => a.status === "Offer").length;
    const today = todayISO();
    const followupsDue = apps.filter((a) => a.followupDate && !a.followupCompleted && a.followupDate <= today).length;

    root.innerHTML = `
      <div class="summary-grid">
        ${statCard("Total Applications", total, "teal", iconBriefcase(), total === 0 ? "Start tracking your search" : `${total} record${total === 1 ? "" : "s"} tracked`)}
        ${statCard("Interviews Scheduled", interviewsScheduled, "indigo", iconCalendar(), interviewsScheduled === 0 ? "No interviews upcoming" : "Upcoming or pending")}
        ${statCard("Offers Received", offers, "amber", iconStar(), offers === 0 ? "Keep going!" : "Nice work")}
        ${statCard("Follow-ups Due", followupsDue, "rose", iconClock(), followupsDue === 0 ? "All caught up" : "Needs attention")}
      </div>

      <div class="dash-grid">
        <div class="card panel">
          <div class="panel-title">Application Activity</div>
          <div class="chart-wrap" id="activityChart"></div>
        </div>
        <div class="card panel">
          <div class="panel-title">Status Overview</div>
          <div class="status-list" id="statusOverview"></div>
        </div>
      </div>

      <div class="dash-grid-2">
        <div class="card panel">
          <div class="panel-title">Upcoming Interviews</div>
          <div id="upcomingInterviews"></div>
        </div>
        <div class="card panel">
          <div class="panel-title">Recent Applications</div>
          <div class="recent-list" id="recentApplications"></div>
        </div>
      </div>
    `;

    renderActivityChart(document.getElementById("activityChart"), apps);
    renderStatusOverview(document.getElementById("statusOverview"), apps);
    renderUpcomingInterviews(document.getElementById("upcomingInterviews"), apps);
    renderRecentApplications(document.getElementById("recentApplications"), apps);
  }

  function statCard(label, value, color, icon, foot) {
    return `
      <div class="card stat-card">
        <div class="stat-top">
          <span class="stat-label">${escapeHTML(label)}</span>
          <span class="stat-icon ${color}">${icon}</span>
        </div>
        <div class="stat-value">${value}</div>
        <div class="stat-foot">${escapeHTML(foot)}</div>
      </div>
    `;
  }

  function iconBriefcase() {
    return '<svg viewBox="0 0 24 24" fill="none"><path d="M9 3h6l1 2h3a1 1 0 011 1v13a2 2 0 01-2 2H6a2 2 0 01-2-2V6a1 1 0 011-1h3l1-2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  }
  function iconCalendar() {
    return '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  }
  function iconStar() {
    return '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9L5.7 21l1.7-7-5.4-4.7 7.1-.6L12 2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  }
  function iconClock() {
    return '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function renderActivityChart(container, apps) {
    if (!apps.length) {
      container.innerHTML = `<div class="chart-empty">No applications yet — add one to see activity here.</div>`;
      return;
    }
    // Build last 6 months buckets
    const buckets = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: dt.getFullYear() + "-" + dt.getMonth(), label: MONTH_NAMES[dt.getMonth()], count: 0 });
    }
    apps.forEach((a) => {
      const d = parseDate(a.applicationDate);
      if (!d) return;
      const key = d.getFullYear() + "-" + d.getMonth();
      const b = buckets.find((x) => x.key === key);
      if (b) b.count++;
    });
    const max = Math.max(1, ...buckets.map((b) => b.count));
    const w = 560, h = 180, pad = 30, barW = (w - pad * 2) / buckets.length - 16;

    let bars = "";
    buckets.forEach((b, i) => {
      const x = pad + i * ((w - pad * 2) / buckets.length) + 8;
      const barH = (b.count / max) * (h - 50);
      const y = h - 30 - barH;
      bars += `
        <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="6" fill="url(#barGrad)"></rect>
        <text x="${x + barW / 2}" y="${h - 10}" text-anchor="middle" font-size="11" fill="var(--text-faint)">${b.label}</text>
        <text x="${x + barW / 2}" y="${y - 6}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text)">${b.count || ""}</text>
      `;
    });

    container.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Applications submitted over the last six months">
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#14b8a6"/>
            <stop offset="100%" stop-color="#6366f1"/>
          </linearGradient>
        </defs>
        ${bars}
      </svg>
    `;
  }

  function renderStatusOverview(container, apps) {
    const total = apps.length;
    if (!total) {
      container.innerHTML = `<div class="empty-mini">No data yet.</div>`;
      return;
    }
    container.innerHTML = STATUSES.map((s) => {
      const count = apps.filter((a) => a.status === s).length;
      const pct = total ? Math.round((count / total) * 100) : 0;
      const cls = STATUS_CLASS[s];
      return `
        <div class="status-row">
          <span class="status-dot dot-${cls}"></span>
          <span class="status-name">${s}</span>
          <span class="status-bar-track"><span class="status-bar-fill dot-${cls}" style="width:${pct}%"></span></span>
          <span class="status-count">${count}</span>
        </div>
      `;
    }).join("");
  }

  function renderUpcomingInterviews(container, apps) {
    const today = todayISO();
    const upcoming = apps
      .filter((a) => a.interviewDate && a.interviewDate >= today && !a.interviewCompleted)
      .sort((a, b) => (a.interviewDate + (a.interviewTime || "")).localeCompare(b.interviewDate + (b.interviewTime || "")))
      .slice(0, 5);

    if (!upcoming.length) {
      container.innerHTML = `<div class="empty-mini">No upcoming interviews scheduled.</div>`;
      return;
    }
    container.innerHTML = upcoming
      .map((a) => {
        const { d, m } = formatDateShort(a.interviewDate);
        return `
        <div class="interview-item">
          <div class="interview-date-badge"><span class="d">${d}</span><span class="m">${m}</span></div>
          <div class="interview-info">
            <div class="interview-company">${escapeHTML(a.company)}</div>
            <div class="interview-role">${escapeHTML(a.title)}</div>
          </div>
          <div class="interview-meta">${a.interviewTime ? formatTime(a.interviewTime) : ""}</div>
        </div>
      `;
      })
      .join("");
  }

  function formatTime(t) {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  }

  function renderRecentApplications(container, apps) {
    const recent = apps.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);
    if (!recent.length) {
      container.innerHTML = `<div class="empty-mini">No applications yet.</div>`;
      return;
    }
    container.innerHTML = recent
      .map(
        (a) => `
        <div class="recent-row" data-id="${a.id}" data-action="view">
          <div class="recent-logo">${escapeHTML(initials(a.company))}</div>
          <div class="recent-main">
            <div class="recent-company">${escapeHTML(a.company)}</div>
            <div class="recent-role">${escapeHTML(a.title)}</div>
          </div>
          <div class="recent-side">
            ${statusBadge(a.status)}
            <div class="recent-date">${formatDate(a.applicationDate)}</div>
          </div>
        </div>
      `
      )
      .join("");
  }

  function statusBadge(status) {
    const cls = STATUS_CLASS[status] || "wishlist";
    return `<span class="badge badge-${cls}">${escapeHTML(status)}</span>`;
  }

  /* ---------- Applications page ---------- */

  function renderApplications(root) {
    root.innerHTML = `
      <div class="toolbar">
        <div class="field-inline search-box">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          <input type="search" id="filterSearch" placeholder="Search company or title…" value="${escapeHTML(state.filters.search)}">
        </div>
        <div class="field-inline">
          <select id="filterStatus">
            <option value="all">All statuses</option>
            ${STATUSES.map((s) => `<option value="${s}" ${state.filters.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </div>
        <div class="field-inline">
          <select id="filterMode">
            <option value="all">All modes</option>
            <option value="Remote" ${state.filters.mode === "Remote" ? "selected" : ""}>Remote</option>
            <option value="Hybrid" ${state.filters.mode === "Hybrid" ? "selected" : ""}>Hybrid</option>
            <option value="On-site" ${state.filters.mode === "On-site" ? "selected" : ""}>On-site</option>
          </select>
        </div>
        <div class="field-inline">
          <label style="font-size:12px;color:var(--text-faint);">From</label>
          <input type="date" id="filterDateFrom" value="${state.filters.dateFrom}">
        </div>
        <div class="field-inline">
          <label style="font-size:12px;color:var(--text-faint);">To</label>
          <input type="date" id="filterDateTo" value="${state.filters.dateTo}">
        </div>
        <div class="spacer"></div>
        <div class="view-toggle">
          <button data-view="table" class="${state.view === "table" ? "active" : ""}">${iconList()} Table</button>
          <button data-view="kanban" class="${state.view === "kanban" ? "active" : ""}">${iconKanban()} Kanban</button>
        </div>
      </div>
      <div id="applicationsBody"></div>
    `;

    document.getElementById("filterSearch").addEventListener(
      "input",
      debounce((e) => {
        state.filters.search = e.target.value;
        renderApplicationsBody();
      }, 200)
    );
    document.getElementById("filterStatus").addEventListener("change", (e) => {
      state.filters.status = e.target.value;
      renderApplicationsBody();
    });
    document.getElementById("filterMode").addEventListener("change", (e) => {
      state.filters.mode = e.target.value;
      renderApplicationsBody();
    });
    document.getElementById("filterDateFrom").addEventListener("change", (e) => {
      state.filters.dateFrom = e.target.value;
      renderApplicationsBody();
    });
    document.getElementById("filterDateTo").addEventListener("change", (e) => {
      state.filters.dateTo = e.target.value;
      renderApplicationsBody();
    });
    root.querySelectorAll(".view-toggle button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.view = btn.dataset.view;
        renderApplications(root);
      });
    });

    renderApplicationsBody();
  }

  function iconList() {
    return '<svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  }
  function iconKanban() {
    return '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="5" height="16" rx="1.5" stroke="currentColor" stroke-width="1.8"/><rect x="9.5" y="4" width="5" height="10" rx="1.5" stroke="currentColor" stroke-width="1.8"/><rect x="16" y="4" width="5" height="13" rx="1.5" stroke="currentColor" stroke-width="1.8"/></svg>';
  }

  function renderApplicationsBody() {
    const body = document.getElementById("applicationsBody");
    if (!body) return;
    const list = getFilteredSortedApps();

    if (!state.applications.length) {
      body.innerHTML = emptyState(
        "No applications yet",
        "Start tracking your job search by adding your first application, or load demo data from Settings.",
        [{ label: "Add Application", action: "add" }]
      );
      wireEmptyState(body);
      return;
    }
    if (!list.length) {
      body.innerHTML = emptyState("No matching applications", "Try adjusting your search or filters.", []);
      return;
    }

    if (state.view === "kanban") {
      renderKanban(body, list);
    } else {
      renderTable(body, list);
    }
  }

  function emptyState(title, desc, actions) {
    return `
      <div class="empty-state">
        <div class="empty-icon">${iconBriefcase()}</div>
        <h3>${escapeHTML(title)}</h3>
        <p>${escapeHTML(desc)}</p>
        ${actions.map((a) => `<button class="btn btn-primary" data-empty-action="${a.action}">${escapeHTML(a.label)}</button>`).join("")}
      </div>
    `;
  }

  function wireEmptyState(container) {
    container.querySelectorAll("[data-empty-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.emptyAction === "add") openAppModal();
      });
    });
  }

  function renderTable(body, list) {
    const sortArrow = (field) => {
      if (state.sort.field !== field) return "";
      return state.sort.dir === "asc" ? "▲" : "▼";
    };
    body.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th data-sort="company">Company <span class="sort-arrow">${sortArrow("company")}</span></th>
              <th data-sort="title">Job Title <span class="sort-arrow">${sortArrow("title")}</span></th>
              <th data-sort="applicationDate">Applied <span class="sort-arrow">${sortArrow("applicationDate")}</span></th>
              <th>Mode</th>
              <th data-sort="status">Status <span class="sort-arrow">${sortArrow("status")}</span></th>
              <th>Follow-up</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map(
                (a) => `
              <tr data-id="${a.id}">
                <td>
                  <div class="cell-company">${escapeHTML(a.company)}</div>
                  <div class="cell-sub">${escapeHTML(a.location || "")}</div>
                </td>
                <td>${escapeHTML(a.title)}</td>
                <td>${formatDate(a.applicationDate)}</td>
                <td>${escapeHTML(a.mode)}</td>
                <td>${statusBadge(a.status)}</td>
                <td>${a.followupDate ? formatDate(a.followupDate) + (a.followupCompleted ? " ✓" : "") : "—"}</td>
                <td>
                  <div class="row-actions">
                    <button data-action="view" title="View details">${iconEye()}</button>
                    <button data-action="edit" title="Edit">${iconEdit()}</button>
                    <button data-action="delete" class="danger" title="Delete">${iconTrash()}</button>
                  </div>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    body.querySelectorAll("thead th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const field = th.dataset.sort;
        if (state.sort.field === field) {
          state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
        } else {
          state.sort.field = field;
          state.sort.dir = "asc";
        }
        renderApplicationsBody();
      });
    });

    body.querySelectorAll("tbody tr").forEach((tr) => {
      tr.addEventListener("click", (e) => {
        const actionBtn = e.target.closest("[data-action]");
        const id = tr.dataset.id;
        if (actionBtn) {
          e.stopPropagation();
          const action = actionBtn.dataset.action;
          if (action === "view") openDetails(id);
          else if (action === "edit") openAppModal(id);
          else if (action === "delete") confirmDeleteApp(id);
        } else {
          openDetails(id);
        }
      });
    });
  }

  function iconEye() {
    return '<svg viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>';
  }
  function iconEdit() {
    return '<svg viewBox="0 0 24 24" fill="none"><path d="M12 20h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  }
  function iconTrash() {
    return '<svg viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  }

  function renderKanban(body, list) {
    body.innerHTML = `
      <div class="kanban-board">
        ${STATUSES.map((s) => {
          const items = list.filter((a) => a.status === s);
          return `
            <div class="kanban-col" data-status="${s}">
              <div class="kanban-col-head">
                <span class="kanban-col-title"><span class="status-dot dot-${STATUS_CLASS[s]}"></span>${s}</span>
                <span class="kanban-count">${items.length}</span>
              </div>
              <div class="kanban-cards" data-status-drop="${s}">
                ${items.length ? items.map(kanbanCardHTML).join("") : `<div class="kanban-empty">No applications</div>`}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    wireKanbanDnD(body);
    body.querySelectorAll(".kanban-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.tagName === "SELECT") return;
        openDetails(card.dataset.id);
      });
      const sel = card.querySelector(".kc-status-select");
      if (sel) {
        sel.addEventListener("click", (e) => e.stopPropagation());
        sel.addEventListener("change", (e) => {
          const app = getApp(card.dataset.id);
          if (app) {
            app.status = e.target.value;
            app.updatedAt = Date.now();
            saveApplications();
            toast(`Moved ${app.company} to ${app.status}`);
            renderApplicationsBody();
          }
        });
      }
    });
  }

  function kanbanCardHTML(a) {
    return `
      <div class="kanban-card" draggable="true" data-id="${a.id}">
        <div class="kc-company">${escapeHTML(a.company)}</div>
        <div class="kc-role">${escapeHTML(a.title)}</div>
        <div class="kc-meta">${iconCalendarSm()} ${formatDate(a.applicationDate)}</div>
        ${a.interviewDate ? `<div class="kc-meta">${iconClockSm()} Interview ${formatDate(a.interviewDate)}</div>` : ""}
        <select class="kc-status-select" aria-label="Change status for ${escapeHTML(a.company)}">
          ${STATUSES.map((s) => `<option value="${s}" ${s === a.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
    `;
  }
  function iconCalendarSm() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="display:inline;vertical-align:-2px"><rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" stroke-width="2"/></svg>';
  }
  function iconClockSm() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="display:inline;vertical-align:-2px"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/></svg>';
  }

  function wireKanbanDnD(body) {
    let draggedId = null;
    body.querySelectorAll(".kanban-card").forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        draggedId = card.dataset.id;
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
    });
    body.querySelectorAll(".kanban-col").forEach((col) => {
      col.addEventListener("dragover", (e) => {
        e.preventDefault();
        col.classList.add("drag-over");
      });
      col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
      col.addEventListener("drop", (e) => {
        e.preventDefault();
        col.classList.remove("drag-over");
        if (!draggedId) return;
        const app = getApp(draggedId);
        if (app && app.status !== col.dataset.status) {
          app.status = col.dataset.status;
          app.updatedAt = Date.now();
          saveApplications();
          toast(`Moved ${app.company} to ${app.status}`);
          renderApplicationsBody();
        }
        draggedId = null;
      });
    });
  }

  /* ---------- Add/Edit Modal ---------- */

  let formDirty = false;

  function openAppModal(id) {
    const backdrop = document.getElementById("modalBackdrop");
    const form = document.getElementById("appForm");
    form.reset();
    clearFormErrors();
    formDirty = false;

    const app = id ? getApp(id) : null;
    document.getElementById("modalTitle").textContent = app ? "Edit Application" : "Add Application";
    document.getElementById("fId").value = app ? app.id : "";
    document.getElementById("fCompany").value = app ? app.company : "";
    document.getElementById("fTitle").value = app ? app.title : "";
    document.getElementById("fUrl").value = app ? app.url || "" : "";
    document.getElementById("fLocation").value = app ? app.location || "" : "";
    document.getElementById("fMode").value = app ? app.mode : "Remote";
    document.getElementById("fType").value = app ? app.type : "Full-time";
    document.getElementById("fSalary").value = app ? app.salary || "" : "";
    document.getElementById("fDate").value = app ? app.applicationDate : todayISO();
    document.getElementById("fStatus").value = app ? app.status : "Wishlist";
    document.getElementById("fRecruiter").value = app ? app.recruiter || "" : "";
    document.getElementById("fRecruiterContact").value = app ? app.recruiterContact || "" : "";
    document.getElementById("fInterviewDate").value = app ? app.interviewDate || "" : "";
    document.getElementById("fInterviewTime").value = app ? app.interviewTime || "" : "";
    document.getElementById("fFollowupDate").value = app ? app.followupDate || "" : "";
    document.getElementById("fNotes").value = app ? app.notes || "" : "";

    backdrop.hidden = false;
    document.getElementById("fCompany").focus();

    form.addEventListener("input", markFormDirty, { once: true });
  }

  function markFormDirty() {
    formDirty = true;
  }

  function closeAppModal(force) {
    if (!force && formDirty) {
      if (!confirm("You have unsaved changes. Close without saving?")) return;
    }
    document.getElementById("modalBackdrop").hidden = true;
    formDirty = false;
  }

  function clearFormErrors() {
    document.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
    document.querySelectorAll(".field.invalid").forEach((el) => el.classList.remove("invalid"));
  }

  function setFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const err = document.getElementById("err-" + inputId);
    if (err) err.textContent = message;
    if (input) input.closest(".field")?.classList.add("invalid");
  }

  function validateForm() {
    clearFormErrors();
    let valid = true;
    const company = document.getElementById("fCompany").value.trim();
    const title = document.getElementById("fTitle").value.trim();
    const url = document.getElementById("fUrl").value.trim();
    const date = document.getElementById("fDate").value;

    if (!company) {
      setFieldError("fCompany", "Company name is required.");
      valid = false;
    }
    if (!title) {
      setFieldError("fTitle", "Job title is required.");
      valid = false;
    }
    if (!date) {
      setFieldError("fDate", "Application date is required.");
      valid = false;
    }
    if (url && !isValidURL(url)) {
      setFieldError("fUrl", "Enter a valid URL (e.g. https://example.com).");
      valid = false;
    }
    return valid;
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateForm()) {
      toast("Please fix the highlighted fields.", "error");
      return;
    }
    const id = document.getElementById("fId").value || null;
    const data = {
      id: id || undefined,
      company: document.getElementById("fCompany").value.trim(),
      title: document.getElementById("fTitle").value.trim(),
      url: document.getElementById("fUrl").value.trim(),
      location: document.getElementById("fLocation").value.trim(),
      mode: document.getElementById("fMode").value,
      type: document.getElementById("fType").value,
      salary: document.getElementById("fSalary").value.trim(),
      applicationDate: document.getElementById("fDate").value,
      status: document.getElementById("fStatus").value,
      recruiter: document.getElementById("fRecruiter").value.trim(),
      recruiterContact: document.getElementById("fRecruiterContact").value.trim(),
      interviewDate: document.getElementById("fInterviewDate").value,
      interviewTime: document.getElementById("fInterviewTime").value,
      followupDate: document.getElementById("fFollowupDate").value,
      notes: document.getElementById("fNotes").value.trim(),
    };
    const wasEdit = !!id;
    upsertApp(data);
    formDirty = false;
    closeAppModal(true);
    toast(wasEdit ? "Application updated." : "Application added.");
    renderPage();
  }

  /* ---------- Details view ---------- */

  function openDetails(id) {
    const app = getApp(id);
    if (!app) return;
    document.getElementById("detailsTitle").textContent = app.company + " — " + app.title;

    const body = document.getElementById("detailsBody");
    body.innerHTML = `
      <div style="margin-bottom:14px;">${statusBadge(app.status)}</div>
      <div class="details-grid">
        ${detailItem("Company", app.company)}
        ${detailItem("Job Title", app.title)}
        ${detailItem("Location", app.location || "—")}
        ${detailItem("Work Mode", app.mode)}
        ${detailItem("Employment Type", app.type)}
        ${detailItem("Salary Range", app.salary || "—")}
        ${detailItem("Application Date", formatDate(app.applicationDate))}
        ${detailItem("Job URL", app.url ? `<a href="${escapeHTML(normalizeURL(app.url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(app.url)}</a>` : "—", true)}
        ${detailItem("Recruiter", app.recruiter || "—")}
        ${detailItem("Recruiter Contact", app.recruiterContact || "—")}
        ${detailItem("Interview Date", app.interviewDate ? formatDate(app.interviewDate) + (app.interviewTime ? " at " + formatTime(app.interviewTime) : "") : "—")}
        ${detailItem("Follow-up Date", app.followupDate ? formatDate(app.followupDate) + (app.followupCompleted ? " (done)" : "") : "—")}
      </div>
      <div class="details-item">
        <span class="details-label">Notes</span>
        <div class="details-notes">${app.notes ? escapeHTML(app.notes) : "No notes added."}</div>
      </div>
      <div style="margin-top:12px;font-size:11.5px;color:var(--text-faint);">
        Created ${formatDateTime(app.createdAt)} · Updated ${formatDateTime(app.updatedAt)}
      </div>
    `;

    document.getElementById("detailsFooter").innerHTML = `
      <button class="btn btn-ghost" id="detailsDeleteBtn">Delete</button>
      <button class="btn btn-primary" id="detailsEditBtn">Edit</button>
    `;
    document.getElementById("detailsDeleteBtn").onclick = () => {
      closeDetails();
      confirmDeleteApp(app.id);
    };
    document.getElementById("detailsEditBtn").onclick = () => {
      closeDetails();
      openAppModal(app.id);
    };

    document.getElementById("detailsBackdrop").hidden = false;
  }

  function detailItem(label, valueHTML, raw) {
    return `
      <div class="details-item">
        <span class="details-label">${escapeHTML(label)}</span>
        <span class="details-value">${raw ? valueHTML : escapeHTML(valueHTML)}</span>
      </div>
    `;
  }

  function normalizeURL(u) {
    if (!u) return "#";
    return u.includes("://") ? u : "https://" + u;
  }

  function closeDetails() {
    document.getElementById("detailsBackdrop").hidden = true;
  }

  /* ---------- Confirm dialog ---------- */

  function confirmDeleteApp(id) {
    const app = getApp(id);
    if (!app) return;
    openConfirm(
      "Delete application?",
      `This will permanently delete "${app.company} — ${app.title}". This cannot be undone.`,
      () => {
        deleteApp(id);
        toast("Application deleted.");
        renderPage();
      }
    );
  }

  let confirmCallback = null;
  function openConfirm(title, message, onConfirm) {
    document.getElementById("confirmTitle").textContent = title;
    document.getElementById("confirmMessage").textContent = message;
    confirmCallback = onConfirm;
    document.getElementById("confirmBackdrop").hidden = false;
  }
  function closeConfirm() {
    document.getElementById("confirmBackdrop").hidden = true;
    confirmCallback = null;
  }

  /* ---------- Interviews page ---------- */

  function renderInterviews(root) {
    const apps = state.applications.filter((a) => a.interviewDate);
    const today = todayISO();
    const upcoming = apps.filter((a) => a.interviewDate >= today && !a.interviewCompleted)
      .sort((a, b) => a.interviewDate.localeCompare(b.interviewDate));
    const past = apps.filter((a) => a.interviewDate < today || a.interviewCompleted)
      .sort((a, b) => b.interviewDate.localeCompare(a.interviewDate));

    root.innerHTML = `
      <div class="page-section">
        <div class="section-head"><h2>Upcoming Interviews</h2></div>
        ${upcoming.length ? upcoming.map((a) => interviewCardHTML(a, false)).join("") : emptyMini("No upcoming interviews. Add an interview date to an application to see it here.")}
      </div>
      <div class="page-section">
        <div class="section-head"><h2>Past Interviews</h2></div>
        ${past.length ? past.map((a) => interviewCardHTML(a, true)).join("") : emptyMini("No past interviews yet.")}
      </div>
    `;

    root.querySelectorAll("[data-interview-complete]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const app = getApp(btn.dataset.interviewComplete);
        if (app) {
          app.interviewCompleted = true;
          const outcome = prompt("Interview outcome (e.g. Passed, Waiting, No response):", app.interviewOutcome || "");
          if (outcome !== null) app.interviewOutcome = outcome.trim();
          app.updatedAt = Date.now();
          saveApplications();
          toast("Interview marked as completed.");
          renderPage();
        }
      });
    });
    root.querySelectorAll("[data-interview-edit]").forEach((btn) => {
      btn.addEventListener("click", () => openAppModal(btn.dataset.interviewEdit));
    });
    root.querySelectorAll("[data-interview-view]").forEach((btn) => {
      btn.addEventListener("click", () => openDetails(btn.dataset.interviewView));
    });
  }

  function emptyMini(text) {
    return `<div class="card" style="padding:26px;text-align:center;color:var(--text-faint);font-size:13px;">${escapeHTML(text)}</div>`;
  }

  function interviewCardHTML(a, isPast) {
    return `
      <div class="interview-card ${a.interviewCompleted ? "completed" : ""}">
        <div class="interview-card-main">
          <div class="interview-card-top">
            <span class="ic-company">${escapeHTML(a.company)}</span>
            ${statusBadge(a.status)}
            ${a.interviewCompleted ? `<span class="tag-pill">${escapeHTML(a.interviewOutcome || "Completed")}</span>` : ""}
          </div>
          <div class="ic-role">${escapeHTML(a.title)}</div>
          <div class="ic-details">
            <span>${iconCalendarSm()} ${formatDate(a.interviewDate)}${a.interviewTime ? " · " + formatTime(a.interviewTime) : ""}</span>
            ${a.recruiter ? `<span>${iconUserSm()} ${escapeHTML(a.recruiter)}</span>` : ""}
          </div>
        </div>
        <div class="interview-card-actions">
          <button class="btn btn-outline btn-sm" data-interview-view="${a.id}">View</button>
          <button class="btn btn-outline btn-sm" data-interview-edit="${a.id}">Edit</button>
          ${!a.interviewCompleted ? `<button class="btn btn-primary btn-sm" data-interview-complete="${a.id}">Mark Completed</button>` : ""}
        </div>
      </div>
    `;
  }
  function iconUserSm() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="display:inline;vertical-align:-2px"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" stroke-width="2"/></svg>';
  }

  /* ---------- Follow-ups page ---------- */

  function renderFollowups(root) {
    const today = todayISO();
    const withFollowup = state.applications.filter((a) => a.followupDate && !a.followupCompleted);
    const overdue = withFollowup.filter((a) => a.followupDate < today).sort((a, b) => a.followupDate.localeCompare(b.followupDate));
    const dueToday = withFollowup.filter((a) => a.followupDate === today);
    const upcoming = withFollowup.filter((a) => a.followupDate > today).sort((a, b) => a.followupDate.localeCompare(b.followupDate));

    if (!withFollowup.length) {
      root.innerHTML = emptyState("No follow-ups pending", "Set a follow-up date on an application to track check-ins here.", []);
      return;
    }

    root.innerHTML = `
      ${followupGroup("Overdue", overdue, "overdue")}
      ${followupGroup("Due Today", dueToday, "today")}
      ${followupGroup("Upcoming", upcoming, "upcoming")}
    `;

    root.querySelectorAll("[data-followup-complete]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const app = getApp(btn.dataset.followupComplete);
        if (app) {
          app.followupCompleted = true;
          app.updatedAt = Date.now();
          saveApplications();
          toast("Follow-up marked complete.");
          renderPage();
        }
      });
    });
    root.querySelectorAll("[data-followup-reschedule]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const app = getApp(btn.dataset.followupReschedule);
        if (!app) return;
        const next = prompt("New follow-up date (YYYY-MM-DD):", app.followupDate);
        if (next && /^\d{4}-\d{2}-\d{2}$/.test(next) && parseDate(next)) {
          app.followupDate = next;
          app.updatedAt = Date.now();
          saveApplications();
          toast("Follow-up rescheduled.");
          renderPage();
        } else if (next !== null) {
          toast("Please enter a valid date in YYYY-MM-DD format.", "error");
        }
      });
    });
    root.querySelectorAll("[data-followup-view]").forEach((btn) => {
      btn.addEventListener("click", () => openDetails(btn.dataset.followupView));
    });
  }

  function followupGroup(title, items, cls) {
    return `
      <div class="followup-group">
        <h3>${escapeHTML(title)} <span class="count-chip">${items.length}</span></h3>
        ${items.length ? items.map((a) => followupCardHTML(a, cls)).join("") : `<div class="empty-mini">None</div>`}
      </div>
    `;
  }

  function followupCardHTML(a, cls) {
    return `
      <div class="followup-card ${cls}">
        <div class="followup-main">
          <div class="followup-company">${escapeHTML(a.company)} — ${escapeHTML(a.title)}</div>
          <div class="followup-role">${a.notes ? escapeHTML(a.notes.slice(0, 80)) : "No notes"}</div>
        </div>
        <div class="followup-date">${formatDate(a.followupDate)}</div>
        <div class="followup-actions">
          <button class="btn btn-outline btn-sm" data-followup-view="${a.id}">Open</button>
          <button class="btn btn-outline btn-sm" data-followup-reschedule="${a.id}">Reschedule</button>
          <button class="btn btn-primary btn-sm" data-followup-complete="${a.id}">Complete</button>
        </div>
      </div>
    `;
  }

  /* ---------- Analytics ---------- */

  function renderAnalytics(root) {
    const apps = state.applications;
    const total = apps.length;

    if (!total) {
      root.innerHTML = emptyState("No analytics yet", "Add applications to see conversion rates and trends here.", []);
      return;
    }

    const interviewedCount = apps.filter((a) => STATUSES.indexOf(a.status) >= STATUSES.indexOf("Interview") || a.interviewDate).length;
    const offerCount = apps.filter((a) => a.status === "Offer").length;
    const appToInterviewRate = total ? Math.round((interviewedCount / total) * 100) : 0;
    const interviewToOfferRate = interviewedCount ? Math.round((offerCount / interviewedCount) * 100) : 0;

    const byMode = { Remote: 0, Hybrid: 0, "On-site": 0 };
    apps.forEach((a) => { if (byMode[a.mode] !== undefined) byMode[a.mode]++; });

    const byMonth = {};
    apps.forEach((a) => {
      const d = parseDate(a.applicationDate);
      if (!d) return;
      const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      byMonth[key] = (byMonth[key] || 0) + 1;
    });
    const monthKeys = Object.keys(byMonth).sort().slice(-6);

    const recent = apps.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

    root.innerHTML = `
      <div class="analytics-grid">
        <div class="card conv-card"><div class="conv-value">${total}</div><div class="conv-label">Total Applications</div></div>
        <div class="card conv-card"><div class="conv-value">${appToInterviewRate}%</div><div class="conv-label">Application → Interview Rate</div></div>
        <div class="card conv-card"><div class="conv-value">${interviewToOfferRate}%</div><div class="conv-label">Interview → Offer Rate</div></div>
      </div>

      <div class="dash-grid-2">
        <div class="card panel">
          <div class="panel-title">Status Distribution</div>
          <div class="status-list" id="analyticsStatusDist"></div>
        </div>
        <div class="card panel">
          <div class="panel-title">Applications by Work Mode</div>
          <div id="analyticsModeDist">
            ${Object.keys(byMode).map((m) => barRow(m, byMode[m], total)).join("")}
          </div>
        </div>
      </div>

      <div class="dash-grid-2" style="margin-top:18px;">
        <div class="card panel">
          <div class="panel-title">Applications by Month</div>
          <div>
            ${monthKeys.length ? monthKeys.map((k) => {
              const [y, m] = k.split("-");
              const label = MONTH_NAMES[parseInt(m, 10) - 1] + " " + y;
              return barRow(label, byMonth[k], Math.max(...monthKeys.map((kk) => byMonth[kk])));
            }).join("") : emptyMini("No dated applications yet.")}
          </div>
        </div>
        <div class="card panel">
          <div class="panel-title">Recent Activity</div>
          <div class="recent-list">
            ${recent.map((a) => `
              <div class="recent-row">
                <div class="recent-logo">${escapeHTML(initials(a.company))}</div>
                <div class="recent-main">
                  <div class="recent-company">${escapeHTML(a.company)}</div>
                  <div class="recent-role">Updated ${formatDateTime(a.updatedAt)}</div>
                </div>
                <div class="recent-side">${statusBadge(a.status)}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;

    renderStatusOverview(document.getElementById("analyticsStatusDist"), apps);
  }

  function barRow(label, value, max) {
    const pct = max ? Math.round((value / max) * 100) : 0;
    return `
      <div class="bar-chart-row">
        <div class="bar-chart-label">${escapeHTML(label)}</div>
        <div class="bar-chart-track"><div class="bar-chart-fill" style="width:${pct}%"></div></div>
        <div class="bar-chart-val">${value}</div>
      </div>
    `;
  }

  /* ---------- Settings ---------- */

  function renderSettings(root) {
    root.innerHTML = `
      <div class="card settings-section">
        <h3>Profile</h3>
        <p class="settings-desc">Your display name appears in the sidebar and header.</p>
        <div class="name-input-row">
          <input type="text" id="settingsName" value="${escapeHTML(state.settings.displayName)}" maxlength="60">
          <button class="btn btn-primary" id="saveNameBtn">Save Name</button>
        </div>
      </div>

      <div class="card settings-section">
        <h3>Appearance</h3>
        <p class="settings-desc">Switch between light and dark themes.</p>
        <div class="theme-toggle">
          <button data-theme="light" class="${state.settings.theme === "light" ? "active" : ""}">Light</button>
          <button data-theme="dark" class="${state.settings.theme === "dark" ? "active" : ""}">Dark</button>
        </div>
      </div>

      <div class="card settings-section">
        <h3>Data Management</h3>
        <p class="settings-desc">Export your data for backup, or import a previously exported file.</p>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Export as JSON</div>
            <div class="settings-row-sub">Full backup including all fields.</div>
          </div>
          <button class="btn btn-outline" id="exportJsonBtn">Export JSON</button>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Export as CSV</div>
            <div class="settings-row-sub">Spreadsheet-friendly format.</div>
          </div>
          <button class="btn btn-outline" id="exportCsvBtn">Export CSV</button>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-row-label">Import JSON</div>
            <div class="settings-row-sub">Replaces or merges with existing data after validation.</div>
          </div>
          <div>
            <input type="file" id="importFileInput" accept="application/json" style="display:none;">
            <button class="btn btn-outline" id="importJsonBtn">Import JSON</button>
          </div>
        </div>
      </div>

      <div class="card settings-section">
        <h3>Demo Data</h3>
        <p class="settings-desc">Load or reset realistic sample applications to explore CareerFlow's features.</p>
        <div class="settings-actions">
          <button class="btn btn-outline" id="loadDemoBtn">Load Demo Data</button>
          <button class="btn btn-outline" id="resetDemoBtn">Reset Demo Data</button>
        </div>
      </div>

      <div class="card settings-section">
        <h3>Danger Zone</h3>
        <p class="settings-desc">Permanently clear all stored application data from this browser.</p>
        <button class="btn btn-danger" id="clearAllBtn">Clear All Application Data</button>
      </div>
    `;

    document.getElementById("saveNameBtn").addEventListener("click", () => {
      const val = document.getElementById("settingsName").value.trim();
      state.settings.displayName = val || "Job Seeker";
      saveSettings();
      applyUserDisplay();
      toast("Display name updated.");
    });

    root.querySelectorAll("[data-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.settings.theme = btn.dataset.theme;
        saveSettings();
        applyTheme();
        renderSettings(root);
        toast("Theme updated.");
      });
    });

    document.getElementById("exportJsonBtn").addEventListener("click", exportJSON);
    document.getElementById("exportCsvBtn").addEventListener("click", exportCSV);
    document.getElementById("importJsonBtn").addEventListener("click", () => {
      document.getElementById("importFileInput").click();
    });
    document.getElementById("importFileInput").addEventListener("change", handleImportFile);

    document.getElementById("loadDemoBtn").addEventListener("click", () => {
      openConfirm(
        "Load demo data?",
        "This adds sample applications alongside any existing records. It will not remove your current data.",
        () => {
          state.applications = buildDemoData().concat(state.applications);
          saveApplications();
          toast("Demo data loaded.");
          renderPage();
        }
      );
    });
    document.getElementById("resetDemoBtn").addEventListener("click", () => {
      openConfirm(
        "Reset demo data?",
        "This replaces ALL current application data with a fresh set of demo records. This cannot be undone.",
        () => {
          state.applications = buildDemoData();
          saveApplications();
          toast("Demo data reset.");
          renderPage();
        }
      );
    });
    document.getElementById("clearAllBtn").addEventListener("click", () => {
      openConfirm(
        "Clear all data?",
        "This permanently deletes every application record from this browser. This cannot be undone.",
        () => {
          state.applications = [];
          saveApplications();
          toast("All application data cleared.");
          renderPage();
        }
      );
    });
  }

  function exportJSON() {
    const data = JSON.stringify(state.applications, null, 2);
    downloadFile(data, "careerflow-export.json", "application/json");
    toast("Exported as JSON.");
  }

  function exportCSV() {
    const cols = ["company","title","url","location","mode","type","salary","applicationDate","status","recruiter","recruiterContact","interviewDate","interviewTime","followupDate","followupCompleted","notes"];
    const rows = [cols.join(",")];
    state.applications.forEach((a) => {
      const row = cols.map((c) => csvEscape(a[c]));
      rows.push(row.join(","));
    });
    downloadFile(rows.join("\n"), "careerflow-export.csv", "text/csv");
    toast("Exported as CSV.");
  }

  function csvEscape(val) {
    if (val === undefined || val === null) return "";
    const s = String(val);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) throw new Error("File must contain a JSON array of applications.");
        const valid = parsed.filter((a) => a && typeof a === "object" && a.company && a.title);
        if (!valid.length) throw new Error("No valid application records found in file.");
        const normalized = valid.map((a) => ({
          id: typeof a.id === "string" ? a.id : uid(),
          company: String(a.company).slice(0, 200),
          title: String(a.title).slice(0, 200),
          url: typeof a.url === "string" ? a.url.slice(0, 500) : "",
          location: typeof a.location === "string" ? a.location.slice(0, 200) : "",
          mode: ["Remote", "Hybrid", "On-site"].includes(a.mode) ? a.mode : "Remote",
          type: ["Full-time", "Part-time", "Contract", "Internship"].includes(a.type) ? a.type : "Full-time",
          salary: typeof a.salary === "string" ? a.salary.slice(0, 100) : "",
          applicationDate: /^\d{4}-\d{2}-\d{2}$/.test(a.applicationDate) ? a.applicationDate : todayISO(),
          status: STATUSES.includes(a.status) ? a.status : "Wishlist",
          recruiter: typeof a.recruiter === "string" ? a.recruiter.slice(0, 200) : "",
          recruiterContact: typeof a.recruiterContact === "string" ? a.recruiterContact.slice(0, 200) : "",
          interviewDate: /^\d{4}-\d{2}-\d{2}$/.test(a.interviewDate) ? a.interviewDate : "",
          interviewTime: typeof a.interviewTime === "string" ? a.interviewTime.slice(0, 10) : "",
          followupDate: /^\d{4}-\d{2}-\d{2}$/.test(a.followupDate) ? a.followupDate : "",
          followupCompleted: !!a.followupCompleted,
          interviewCompleted: !!a.interviewCompleted,
          interviewOutcome: typeof a.interviewOutcome === "string" ? a.interviewOutcome.slice(0, 200) : "",
          notes: typeof a.notes === "string" ? a.notes.slice(0, 2000) : "",
          createdAt: typeof a.createdAt === "number" ? a.createdAt : Date.now(),
          updatedAt: Date.now(),
        }));
        openConfirm(
          "Import applications?",
          `${normalized.length} valid record(s) found. They will be added to your current data.`,
          () => {
            state.applications = normalized.concat(state.applications);
            saveApplications();
            toast(`Imported ${normalized.length} application(s).`);
            renderPage();
          }
        );
      } catch (err) {
        toast("Import failed: " + err.message, "error");
      }
      e.target.value = "";
    };
    reader.onerror = () => toast("Could not read the selected file.", "error");
    reader.readAsText(file);
  }

  /* ---------- Theme / user display ---------- */

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.settings.theme);
  }

  function applyUserDisplay() {
    const name = state.settings.displayName;
    document.getElementById("sidebarUserName").textContent = name;
    document.getElementById("sidebarAvatar").textContent = initials(name);
    document.getElementById("topAvatar").textContent = initials(name);
  }

  /* ---------- Notifications popover ---------- */

  function buildNotifications() {
    const today = todayISO();
    const items = [];
    state.applications.forEach((a) => {
      if (a.followupDate && !a.followupCompleted && a.followupDate <= today) {
        items.push({ title: `Follow up with ${a.company}`, sub: formatDate(a.followupDate), ts: a.followupDate });
      }
      if (a.interviewDate && !a.interviewCompleted) {
        const d = parseDate(a.interviewDate);
        if (d) {
          const diff = daysBetween(new Date(), new Date(d));
          if (diff >= 0 && diff <= 3) {
            items.push({ title: `Interview with ${a.company}`, sub: formatDate(a.interviewDate) + (a.interviewTime ? " · " + formatTime(a.interviewTime) : ""), ts: a.interviewDate });
          }
        }
      }
    });
    items.sort((a, b) => a.ts.localeCompare(b.ts));
    return items;
  }

  function renderNotifications() {
    const items = buildNotifications();
    const list = document.getElementById("notifList");
    const dot = document.getElementById("notifDot");
    dot.hidden = items.length === 0;
    if (!items.length) {
      list.innerHTML = `<div class="notif-empty">You're all caught up.</div>`;
      return;
    }
    list.innerHTML = items
      .map((n) => `<div class="notif-item"><span class="notif-title">${escapeHTML(n.title)}</span><span class="notif-sub">${escapeHTML(n.sub)}</span></div>`)
      .join("");
  }

  /* ---------- Global search ---------- */

  function wireGlobalSearch() {
    const input = document.getElementById("globalSearch");
    input.addEventListener(
      "input",
      debounce((e) => {
        const q = e.target.value.trim();
        if (!q) return;
        state.filters.search = q;
        if (state.page !== "applications") navigate("applications");
        else renderApplicationsBody();
        const searchField = document.getElementById("filterSearch");
        if (searchField) searchField.value = q;
      }, 250)
    );
  }

  /* ---------- Event wiring ---------- */

  function wireNav() {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        navigate(item.dataset.page);
      });
    });
  }

  function wireSidebarCollapse() {
    document.getElementById("collapseBtn").addEventListener("click", () => {
      document.getElementById("app").classList.toggle("sidebar-collapsed");
    });
    document.getElementById("mobileMenuBtn").addEventListener("click", () => {
      document.getElementById("app").classList.add("mobile-nav-open");
    });
    document.getElementById("navOverlay").addEventListener("click", closeMobileNav);
  }

  function wireNotifPopover() {
    const btn = document.getElementById("notifBtn");
    const pop = document.getElementById("notifPopover");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = pop.hidden;
      pop.hidden = !isHidden;
      btn.setAttribute("aria-expanded", String(isHidden));
      if (isHidden) renderNotifications();
    });
    document.addEventListener("click", (e) => {
      if (!pop.hidden && !pop.contains(e.target) && e.target !== btn) {
        pop.hidden = true;
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  function wireModal() {
    document.getElementById("addAppBtn").addEventListener("click", () => openAppModal());
    document.getElementById("modalCloseBtn").addEventListener("click", () => closeAppModal());
    document.getElementById("cancelBtn").addEventListener("click", () => closeAppModal());
    document.getElementById("modalBackdrop").addEventListener("click", (e) => {
      if (e.target.id === "modalBackdrop") closeAppModal();
    });
    document.getElementById("appForm").addEventListener("submit", handleFormSubmit);

    document.getElementById("detailsCloseBtn").addEventListener("click", closeDetails);
    document.getElementById("detailsBackdrop").addEventListener("click", (e) => {
      if (e.target.id === "detailsBackdrop") closeDetails();
    });

    document.getElementById("confirmCancelBtn").addEventListener("click", closeConfirm);
    document.getElementById("confirmOkBtn").addEventListener("click", () => {
      const cb = confirmCallback;
      closeConfirm();
      if (cb) cb();
    });
    document.getElementById("confirmBackdrop").addEventListener("click", (e) => {
      if (e.target.id === "confirmBackdrop") closeConfirm();
    });

    document.getElementById("topAvatar").addEventListener("click", () => navigate("settings"));

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!document.getElementById("modalBackdrop").hidden) closeAppModal();
      else if (!document.getElementById("detailsBackdrop").hidden) closeDetails();
      else if (!document.getElementById("confirmBackdrop").hidden) closeConfirm();
    });
  }

  function wireRecentRowDelegation() {
    document.getElementById("content").addEventListener("click", (e) => {
      const row = e.target.closest(".recent-row[data-action='view']");
      if (row) openDetails(row.dataset.id);
    });
  }

  /* ---------- Init ---------- */

  function init() {
    state.settings = loadSettings();
    applyTheme();

    const stored = loadApplications();
    const alreadySeeded = localStorage.getItem(SEEDED_KEY);
    if (stored === null && !alreadySeeded) {
      state.applications = buildDemoData();
      saveApplications();
      localStorage.setItem(SEEDED_KEY, "1");
    } else {
      state.applications = stored || [];
    }

    wireNav();
    wireSidebarCollapse();
    wireNotifPopover();
    wireModal();
    wireGlobalSearch();
    wireRecentRowDelegation();
    applyUserDisplay();
    renderNotifications();

    navigate("dashboard");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
