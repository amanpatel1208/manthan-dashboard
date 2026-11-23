// ═══════════════════════════════════════════════════════════
// WARNING: generated file. Edit app.js / pages/*.js then run: npm run build
// ═══════════════════════════════════════════════════════════

// ═══ Mathan Institute - Core App ═══
// Backend configuration: supports same-origin, Netlify proxy, or explicit Render backend URL
const BACKEND_URL = (typeof window !== 'undefined' && (window.MANTHAN_BACKEND_URL || window.BACKEND_URL || localStorage.getItem('manthan_backend_url') || '')) || '';
const API = BACKEND_URL ? BACKEND_URL.replace(/\/+$/, '') : '';
let currentUser = null;
let currentPage = 'dashboard';
let chartInstances = {};

// ─── BUTTON RIPPLE (subtle press feedback) ───
(function(){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.addEventListener('click',function(e){
    var btn=e.target.closest('.btn,.btn-primary,.login-btn');
    if(!btn) return;
    var r=document.createElement('span');r.className='btn-ripple';
    var rect=btn.getBoundingClientRect();
    var sz=Math.max(rect.width,rect.height)*2;
    r.style.width=sz+'px';r.style.height=sz+'px';
    r.style.left=(e.clientX-rect.left-sz/2)+'px';
    r.style.top=(e.clientY-rect.top-sz/2)+'px';
    btn.appendChild(r);
    setTimeout(function(){r.remove();},700);
  });
})();

// ─── UTILITY ───
const $ = id => document.getElementById(id);
const api = async (url, opts) => {
    try {
        const fullUrl = url.startsWith('http') ? url : ((API || '') + url);
        const r = await fetch(fullUrl, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            ...opts
        });
        return r.json();
    } catch (e) {
        return { error: e.message };
    }
};
const post = (url, data) => api(url, { method: 'POST', body: JSON.stringify(data) });
const put = (url, data) => api(url, { method: 'PUT', body: JSON.stringify(data) });
const del = url => api(url, { method: 'DELETE' });

function toast(msg, type) {
    type = type || 'success';
    var t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    var icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    t.innerHTML = '<i class="fas fa-' + icon + '" aria-hidden="true"></i> ' + msg;
    $('toastContainer').appendChild(t);
    setTimeout(function() { t.remove(); }, 3500);
}
function showToast(msg, type) { toast(msg, type); }

// ─── MODAL (focus management + Escape + focus trap) ───
var modalLastFocus = null;
function modalFocusable() {
    return Array.prototype.slice.call(document.querySelectorAll('#modalContent a[href], #modalContent button:not([disabled]), #modalContent textarea, #modalContent input, #modalContent select, #modalContent [tabindex]:not([tabindex="-1"])'));
}
function closeModal() {
    var modal = $('modal');
    if (!modal || modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    if (modalLastFocus && document.contains(modalLastFocus)) {
        try { modalLastFocus.focus(); } catch (e) {}
    }
}
function openModal(html) {
    modalLastFocus = document.activeElement;
    var content = $('modalContent');
    content.innerHTML = html;
    content.setAttribute('role', 'dialog');
    content.setAttribute('aria-modal', 'true');
    var heading = content.querySelector('.modal-header h2');
    content.setAttribute('aria-label', heading ? heading.textContent.trim() : 'Dialog');
    $('modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(function() {
        var first = content.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])') || modalFocusable()[0];
        if (first) first.focus();
        else { content.setAttribute('tabindex', '-1'); content.focus(); }
    }, 50);
}
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        var modal = $('modal');
        if (modal && !modal.classList.contains('hidden')) { e.preventDefault(); closeModal(); return; }
        var panel = $('notifPanel');
        if (panel && !panel.classList.contains('hidden')) { e.preventDefault(); panel.classList.add('hidden'); return; }
        var sidebar = $('sidebar');
        if (sidebar && sidebar.classList.contains('mobile-open')) { e.preventDefault(); closeMobileSidebar(); return; }
        var searchResults = $('globalSearchResults');
        if (searchResults && !searchResults.classList.contains('hidden')) {
            searchResults.classList.add('hidden');
            var searchInput = $('globalSearch');
            if (searchInput) searchInput.setAttribute('aria-expanded', 'false');
            e.preventDefault();
            return;
        }
        var studentPanel = document.getElementById('studentNotifsPanel');
        if (studentPanel && studentPanel.style.display === 'block') { studentPanel.style.display = 'none'; e.preventDefault(); return; }
        return;
    }
    var modal = $('modal');
    if (!modal || modal.classList.contains('hidden')) return;
    if (e.key !== 'Tab') return;
    var items = modalFocusable();
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

function localDateStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function formatDate(d) { if (!d) return '-'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function formatCurrency(n) { return '\u20B9' + Number(n || 0).toLocaleString('en-IN'); }

// ─── THEME (light / dark) ───
function applyTheme(theme, redraw) {
    theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0A0A0B' : '#F3EFE6');
    try { localStorage.setItem('manthan_theme', theme); } catch (e) {}
    document.querySelectorAll('.theme-toggle i').forEach(function(icon) {
        icon.className = 'fas ' + (theme === 'dark' ? 'fa-sun' : 'fa-moon');
    });
    document.querySelectorAll('.theme-toggle').forEach(function(btn) {
        btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        btn.setAttribute('aria-label', btn.title);
    });
    if (redraw && currentUser && currentPage === 'dashboard') navigate('dashboard');
}

function initTheme() {
    var saved = 'light';
    try { saved = localStorage.getItem('manthan_theme') || 'light'; } catch (e) {}
    applyTheme(saved, false);
    document.querySelectorAll('.theme-toggle').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(next, true);
        });
    });
}

// ─── GLOBAL SEARCH (students) ───
function escSearch(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function initGlobalSearch() {
    var input = $('globalSearch');
    var results = $('globalSearchResults');
    if (!input || !results) return;
    var timer = null;

    function hide() {
        results.classList.add('hidden');
        input.setAttribute('aria-expanded', 'false');
    }
    function render(list, q) {
        if (!list.length) {
            results.innerHTML = '<div class="search-empty">No students match “' + escSearch(q) + '”</div>';
        } else {
            results.innerHTML = list.slice(0, 8).map(function(s) {
                var rawName = s.FullName || 'Student';
                var name = escSearch(rawName);
                var meta = 'Class ' + escSearch(s.Class || '-') + ' · ' + escSearch(s.AllBatches || s.BatchName || 'No batch');
                return '<button type="button" class="search-result" onclick="openSearchResult(' + s.StudentId + ')">' +
                    '<span class="sr-avatar">' + escSearch(rawName.charAt(0).toUpperCase()) + '</span>' +
                    '<span class="sr-main"><strong>' + name + '</strong><small>' + meta + '</small></span>' +
                    '<i class="fas fa-chevron-right" style="color:var(--text-muted);font-size:.7rem" aria-hidden="true"></i></button>';
            }).join('');
        }
        results.classList.remove('hidden');
        input.setAttribute('aria-expanded', 'true');
    }

    input.setAttribute('aria-expanded', 'false');
    input.addEventListener('input', function() {
        var q = input.value.trim();
        clearTimeout(timer);
        if (q.length < 2) { hide(); return; }
        timer = setTimeout(async function() {
            var all = await api('/api/students');
            var arr = Array.isArray(all) ? all : [];
            var ql = q.toLowerCase();
            var list = arr.filter(function(s) {
                return String(s.FullName || '').toLowerCase().indexOf(ql) >= 0 ||
                    String(s.Username || '').toLowerCase().indexOf(ql) >= 0 ||
                    String(s.Class || '').toLowerCase() === ql;
            });
            render(list, q);
        }, 220);
    });
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') { input.value = ''; hide(); input.blur(); }
    });
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-box')) hide();
    });
}
function openSearchResult(id) {
    var results = $('globalSearchResults');
    if (results) results.classList.add('hidden');
    var input = $('globalSearch');
    if (input) input.value = '';
    viewStudent(id);
}

// ─── ACCESSIBILITY HELPERS ───
function decorateA11y(root) {
    root = root || document;
    root.querySelectorAll('button[title]:not([aria-label]), a[title]:not([aria-label])').forEach(function(el) {
        el.setAttribute('aria-label', el.getAttribute('title'));
    });
    root.querySelectorAll('button i, a i').forEach(function(icon) {
        if (!icon.hasAttribute('aria-hidden')) icon.setAttribute('aria-hidden', 'true');
    });
    // Make clickable cards/containers keyboard-operable
    root.querySelectorAll('[onclick]').forEach(function(el) {
        if (['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL'].indexOf(el.tagName) >= 0) return;
        if (!el.getAttribute('role')) el.setAttribute('role', 'button');
        if (!el.getAttribute('tabindex')) el.setAttribute('tabindex', '0');
        if (!el._kbClick) {
            el._kbClick = true;
            el.addEventListener('keydown', function(ev) {
                if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); el.click(); }
            });
        }
    });
    scheduleTableHints();
}

// Add a swipe hint to horizontally scrollable tables on phones
var _tableHintTimer = null;
function updateTableHints() {
    var isCompact = window.matchMedia('(max-width: 1024px)').matches;
    document.querySelectorAll('.data-table-container').forEach(function(container) {
        var table = container.querySelector('table');
        var hint = container.querySelector('.table-scroll-hint');
        if (!isCompact || !table) { if (hint) hint.remove(); return; }
        var scrollable = table.getBoundingClientRect().width > container.clientWidth + 4;
        if (scrollable && !hint) {
            hint = document.createElement('div');
            hint.className = 'table-scroll-hint';
            hint.innerHTML = '<i class="fas fa-arrows-left-right" aria-hidden="true"></i> Swipe sideways to see all columns';
            var anchor = (table.parentElement && table.parentElement !== container) ? table.parentElement : table;
            container.insertBefore(hint, anchor);
        } else if (!scrollable && hint) {
            hint.remove();
        }
    });
}
function scheduleTableHints() {
    clearTimeout(_tableHintTimer);
    _tableHintTimer = setTimeout(updateTableHints, 120);
}
function initA11yObserver() {
    decorateA11y();
    window.addEventListener('resize', function() {
        if (window.innerWidth > 900 && $('sidebar') && $('sidebar').classList.contains('mobile-open')) closeMobileSidebar();
        scheduleTableHints();
    });
    if (!window.MutationObserver) return;
    var opts = { childList: true, subtree: true };
    var area = $('contentArea');
    if (area) new MutationObserver(function() { decorateA11y(area); }).observe(area, opts);
    var modal = $('modalContent');
    if (modal) new MutationObserver(function() { decorateA11y(modal); }).observe(modal, opts);
}

// ─── TIME FORMAT HELPERS ───
function formatTime12(t) {
    if (!t) return '';
    var m = String(t).trim().match(/^(\d{1,2}):(\d{2})/);
    if (!m) return String(t).trim();
    var h = parseInt(m[1], 10);
    var ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m[2] + ' ' + ap;
}
function formatTiming(t) {
    if (!t) return '-';
    var parts = String(t).split(/\s*[-–—]\s*/);
    if (parts.length === 2) return formatTime12(parts[0]) + ' - ' + formatTime12(parts[1]);
    return String(t);
}

// ─── INIT ───
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initGlobalSearch();
    initA11yObserver();
    $('currentDate').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Restore session from localStorage
    var saved = localStorage.getItem('manthan_user');
    if (saved) {
        try {
            var savedUser = JSON.parse(saved);
            if (savedUser.role !== 'admin' && savedUser.role !== 'student') throw new Error('unsupported role');
            currentUser = savedUser;
            $('loginScreen').classList.add('hidden');
            $('mainApp').classList.remove('hidden');
            initApp();
        } catch(e) { localStorage.removeItem('manthan_user'); }
    }

    $('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        var r = await post('/api/login', { username: $('loginUsername').value, password: $('loginPassword').value, role: $('loginRole').value });
        if (r.success) { currentUser = r.user; localStorage.setItem('manthan_user', JSON.stringify(r.user)); $('loginScreen').classList.add('hidden'); $('mainApp').classList.remove('hidden'); initApp(); }
        else $('loginError').textContent = r.message || 'Login failed';
    });

    document.querySelectorAll('.role-btn').forEach(function(b) {
        b.addEventListener('click', function() {
            document.querySelectorAll('.role-btn').forEach(function(x) { x.classList.remove('active'); });
            b.classList.add('active');
            $('loginRole').value = b.dataset.role;
        });
    });

    var sidebarLogo = $('sidebarLogo');
    if (sidebarLogo) sidebarLogo.addEventListener('click', function() {
        var sidebar = $('sidebar');
        if (window.matchMedia('(max-width:900px)').matches) {
            closeMobileSidebar();
            return;
        }
        var collapsed = sidebar.classList.toggle('collapsed');
        var label = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
        sidebarLogo.setAttribute('aria-label', label);
        sidebarLogo.title = label;
    });
    $('mobileMenuBtn').addEventListener('click', function() { toggleMobileSidebar(); });
    $('logoutBtn').addEventListener('click', function() { currentUser = null; localStorage.removeItem('manthan_user'); if (socket) socket.disconnect(); $('mainApp').classList.add('hidden'); $('loginScreen').classList.remove('hidden'); });
    $('notificationBell').addEventListener('click', function(e) {
        e.stopPropagation();
        var panel = $('notifPanel');
        var opening = panel.classList.contains('hidden');
        panel.classList.toggle('hidden');
        if (opening) loadNotifications();
    });

    // Clicking outside a floating panel closes it
    document.addEventListener('click', function(e) {
        var panel = $('notifPanel');
        if (panel && !panel.classList.contains('hidden') && !panel.contains(e.target) && !e.target.closest('#notificationBell')) {
            panel.classList.add('hidden');
        }
        var studentPanel = document.getElementById('studentNotifsPanel');
        if (studentPanel && studentPanel.style.display === 'block' && !studentPanel.contains(e.target) && !e.target.closest('[onclick*="toggleStudentNotifs"]')) {
            studentPanel.style.display = 'none';
        }
    });
});

function initApp() {
    var searchBox = document.querySelector('.top-bar .search-box');
    if (searchBox) searchBox.style.display = currentUser.role === 'admin' ? '' : 'none';
    $('userName').textContent = currentUser.username;
    $('userRole').textContent = currentUser.role === 'admin' ? 'Tutor' : 'Student';
    buildSidebar();
    navigate('dashboard');
    loadNotifications();
    initSocket();
    if (!window._notifPoll) {
        window._notifPoll = setInterval(function() { if (currentUser) loadNotifications(); }, 45000);
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden && currentUser) loadNotifications();
        });
    }
}

// ─── REAL-TIME (Socket.IO) ───
var socket = null;
function initSocket() {
    if (typeof io === 'undefined') return;
    if (socket) socket.disconnect();
    const socketTarget = BACKEND_URL || (window.location.hostname.includes('netlify.app') ? 'https://manthan-dashboard.onrender.com' : window.location.origin);
    socket = io(socketTarget, { withCredentials: true });
    socket.emit('register', { role: currentUser.role, id: currentUser.id });

    socket.on('attendance_updated', function() { if (currentPage === 'attendance' || currentPage === 'dashboard') navigate(currentPage); });
    socket.on('homework_updated', function() { if (currentPage === 'homework' || currentPage === 'dashboard') navigate(currentPage); });
    socket.on('test_updated', function() { if (currentPage === 'tests' || currentPage === 'dashboard') navigate(currentPage); });
    socket.on('results_updated', function() { if (currentPage === 'results' || currentPage === 'dashboard') navigate(currentPage); });
    socket.on('notice_updated', function() { if (currentPage === 'notices' || currentPage === 'dashboard') navigate(currentPage); });
    socket.on('fee_updated', function() { if (currentPage === 'fees' || currentPage === 'dashboard') navigate(currentPage); });

    socket.on('notification', function(data) {
        loadNotifications();
        if (currentUser.role === 'student') {
            toast((data && data.title) ? data.title : 'New update! Check your notifications.', 'info');
            if (currentPage === 'dashboard') loadStudentDashboard();
        }
    });
    socket.on('admin_notification', function(data) {
        if (currentUser.role === 'admin') {
            loadNotifications();
            toast((data && data.title) ? data.title : 'New notification', 'info');
        }
    });
}

// ─── MOBILE SIDEBAR ───
function openMobileSidebar() {
    var sidebar = $('sidebar');
    var overlay = $('mobileOverlay');
    if (!sidebar) return;
    sidebar.classList.remove('collapsed');
    sidebar.classList.add('mobile-open');
    if (overlay) overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}
function closeMobileSidebar() {
    var sidebar = $('sidebar');
    var overlay = $('mobileOverlay');
    if (!sidebar || !sidebar.classList.contains('mobile-open')) {
        if (overlay) overlay.classList.add('hidden');
        return;
    }
    sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.add('hidden');
    document.body.style.overflow = '';
}
function toggleMobileSidebar() {
    var sidebar = $('sidebar');
    if (sidebar && sidebar.classList.contains('mobile-open')) closeMobileSidebar();
    else openMobileSidebar();
}

// ─── SIDEBAR ───
function buildSidebar() {
    var adminNav = [
        { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
        { id: 'students', icon: 'fa-user-graduate', label: 'Students' },
        { id: 'batches', icon: 'fa-layer-group', label: 'Batches' },
        { id: 'attendance', icon: 'fa-calendar-check', label: 'Attendance' },
        { id: 'fees', icon: 'fa-rupee-sign', label: 'Fees' },
        { id: 'homework', icon: 'fa-book-open', label: 'Homework' },
        { id: 'tests', icon: 'fa-clipboard-list', label: 'Tests' },
        { id: 'results', icon: 'fa-chart-bar', label: 'Results' },
        { id: 'settings', icon: 'fa-cog', label: 'Settings' }
    ];
    var studentNav = [
        { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
        { id: 'attendance', icon: 'fa-calendar-check', label: 'My Attendance' },
        { id: 'homework', icon: 'fa-book-open', label: 'Homework' },
        { id: 'tests', icon: 'fa-clipboard-list', label: 'Tests' },
        { id: 'results', icon: 'fa-chart-bar', label: 'My Results' },
        { id: 'fees', icon: 'fa-qrcode', label: 'Pay Fees' }
    ];

    var nav = currentUser.role === 'admin' ? adminNav : studentNav;
    var groups = currentUser.role === 'admin' ? [
        ['Overview', ['dashboard']],
        ['Manage', ['students', 'batches', 'attendance', 'fees']],
        ['Academics', ['homework', 'tests', 'results']],
        ['System', ['settings']]
    ] : [
        ['Overview', ['dashboard']],
        ['My space', ['attendance', 'homework', 'tests', 'results', 'fees']]
    ];
    var byId = {};
    nav.forEach(function(n) { byId[n.id] = n; });
    var html = '';
    groups.forEach(function(g) {
        var items = g[1].filter(function(id) { return byId[id]; });
        if (!items.length) return;
        html += '<div class="nav-label">' + g[0] + '</div>';
        items.forEach(function(id) {
            var n = byId[id];
            html += '<button type="button" class="nav-item ' + (n.id === 'dashboard' ? 'active' : '') + '" onclick="navigate(\'' + n.id + '\')" data-page="' + n.id + '" aria-label="' + n.label + '" title="' + n.label + '">' +
                '<i class="fas ' + n.icon + '" aria-hidden="true"></i><span>' + n.label + '</span></button>';
        });
    });
    $('sidebarNav').innerHTML = html;
}

function navigate(page) {
    currentPage = page;
    var titles = {
        dashboard: 'Dashboard', students: 'Students', batches: 'Batches',
        attendance: currentUser.role === 'student' ? 'My Attendance' : 'Attendance',
        fees: currentUser.role === 'student' ? 'Pay Fees' : 'Fees',
        homework: 'Homework', tests: 'Tests',
        results: currentUser.role === 'student' ? 'My Results' : 'Results',
        notices: 'Notices', timetable: 'Timetable', reports: 'Reports', settings: 'Settings'
    };
    $('pageTitle').textContent = titles[page] || (page.charAt(0).toUpperCase() + page.slice(1));
    document.querySelectorAll('.nav-item').forEach(function(n) {
        var active = n.dataset.page === page;
        n.classList.toggle('active', active);
        if (active) n.setAttribute('aria-current', 'page');
        else n.removeAttribute('aria-current');
    });
    closeMobileSidebar();

    var loaders = { dashboard: loadDashboard, students: loadStudents, batches: loadBatches, attendance: loadAttendance, fees: loadFees, homework: loadHomework, tests: loadTests, results: loadResults, notices: loadNotices, timetable: loadTimetable, reports: loadReports, settings: loadSettings };
    if (loaders[page]) loaders[page]();
}

// ─── NOTIFICATIONS (role-aware, realtime) ───
var notifIconMap = { attendance:'calendar-check', homework:'book-open', test:'clipboard-list', notice:'bullhorn', result:'chart-bar', fee:'rupee-sign', student:'user-plus' };
var notifColorMap = { attendance:'#0F7A4D', homework:'#0891B2', test:'#9E2A3A', notice:'#6D28D9', result:'#B8404F', fee:'#BE185D', student:'#9E2A3A' };

async function loadNotifications() {
    if (!currentUser) return;
    var data = currentUser.role === 'admin'
        ? await api('/api/notifications/admin')
        : await api('/api/notifications/' + currentUser.id);
    if (!Array.isArray(data)) return;

    var unread = data.filter(function(n) { return !n.IsRead; }).length;
    var badge = $('notifBadge');
    if (badge) {
        badge.textContent = unread > 99 ? '99+' : String(unread);
        badge.classList.toggle('hidden', unread === 0);
    }

    $('notifList').innerHTML = data.length ? data.map(function(n) {
        var type = String(n.Type || 'general').toLowerCase();
        var icon = notifIconMap[type] || 'bell';
        var color = notifColorMap[type] || 'var(--accent)';
        var title = escSearch(n.Title || 'Notification');
        var msg = escSearch(n.Message || '');
        return '<button type="button" class="notif-item ' + type + (n.IsRead ? ' read' : ' unread') + '" onclick="markNotificationRead(' + n.NotifId + ')">' +
            '<span class="notif-icon" style="background:' + color + '1A;color:' + color + '"><i class="fas fa-' + icon + '" aria-hidden="true"></i></span>' +
            '<span class="notif-body"><strong>' + title + '</strong>' +
            (msg ? '<span class="notif-msg">' + msg + '</span>' : '') +
            '<span class="notif-time">' + timeAgo(n.CreatedAt) + '</span></span>' +
            (n.IsRead ? '' : '<span class="notif-dot" aria-label="Unread"></span>') +
        '</button>';
    }).join('') : '<div class="empty-state" style="padding:32px 16px"><i class="fas fa-bell-slash"></i><p>No notifications yet</p></div>';
}

async function markNotificationRead(id) {
    await put('/api/notifications/' + id + '/read', {});
    await loadNotifications();
    if (currentUser.role === 'student' && currentPage === 'dashboard') loadStudentDashboard();
}

async function markAllNotificationsRead() {
    if (!currentUser) return;
    if (currentUser.role === 'admin') await put('/api/notifications/admin/readall', {});
    else await put('/api/notifications/' + currentUser.id + '/readall', {});
    await loadNotifications();
    if (currentUser.role === 'student' && currentPage === 'dashboard') loadStudentDashboard();
    toast('All notifications marked as read');
}


// ═══ Dashboard Page ═══
async function loadDashboard() {
    $('contentArea').innerHTML = '<div class="loading"><div class="spinner"></div>Loading dashboard...</div>';

    // Student portal - personal dashboard
    if (currentUser.role === 'student') {
        return loadStudentDashboard();
    }

    // Admin/Teacher dashboard
    const [stats, charts, activity, tests, reminders] = await Promise.all([
        api('/api/dashboard/stats'), api('/api/dashboard/charts'), api('/api/activity/recent'), api('/api/tests'), api('/api/reminders')
    ]);

    var upcomingTests = Array.isArray(tests) ? tests.filter(function(t) { return t.Status === 'Upcoming'; }).slice(0, 5) : [];
    var recentActivity = Array.isArray(activity) ? activity : [];

    var testsHtml = upcomingTests.length ? upcomingTests.map(function(t) {
        var d = new Date(t.TestDate);
        return '<div class="upcoming-item"><div class="upcoming-date"><span class="day">' + d.getDate() + '</span><span class="month">' + d.toLocaleString("en",{month:"short"}) + '</span></div><div class="upcoming-info"><h4>' + t.TestName + '</h4><p>' + (t.Subject||"") + ' &bull; ' + (t.BatchName||"") + ' &bull; Max: ' + t.MaximumMarks + '</p></div></div>';
    }).join("") : '<div class="empty-state"><i class="fas fa-clipboard-check"></i><p>No upcoming tests</p></div>';

    var activityHtml = recentActivity.length ? recentActivity.map(function(a) {
        var icon = a.type === 'admission' ? 'user-plus' : a.type === 'fee' ? 'rupee-sign' : 'book';
        return '<div class="activity-item"><div class="activity-icon ' + a.type + '"><i class="fas fa-' + icon + '"></i></div><div class="activity-info"><h4>' + a.title + '</h4><p>' + a.description + '</p></div></div>';
    }).join('') : '<div class="empty-state"><p>No recent activity</p></div>';

    var hour = new Date().getHours();
    var greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    var hero = '<div class="page-hero">' +
        '<div><h1>' + greeting + ', ' + (currentUser.username ? currentUser.username.charAt(0).toUpperCase() + currentUser.username.slice(1) : 'Administrator') + '</h1>' +
        '<p>Here is what is happening at your institute today.</p></div>' +
        '<div class="hero-actions">' +
            '<button class="btn btn-primary" onclick="showStudentForm()"><i class="fas fa-user-plus" aria-hidden="true"></i> Add Student</button>' +
            '<button class="btn btn-outline" onclick="navigate(\'attendance\')"><i class="fas fa-calendar-check" aria-hidden="true"></i> Mark Attendance</button>' +
            '<button class="btn btn-outline" onclick="showTestForm()"><i class="fas fa-clipboard-list" aria-hidden="true"></i> Create Test</button>' +
        '</div></div>';

    var feeChartHtml = (charts.feeData && charts.feeData.length)
        ? '<div class="chart-wrapper"><canvas id="feeChart"></canvas></div>'
        : '<div class="chart-empty"><i class="fas fa-chart-bar"></i><strong>No fee records yet</strong><span>Add a fee record to see collection trends.</span></div>';
    var classChartHtml = (charts.classDistribution && charts.classDistribution.length)
        ? '<div class="chart-wrapper"><canvas id="classChart"></canvas></div>'
        : '<div class="chart-empty"><i class="fas fa-chart-pie"></i><strong>No students yet</strong><span>Add students to see the class distribution.</span></div>';

    $('contentArea').innerHTML = hero + '<div class="stats-grid stats-6">' +
        '<div class="stat-card" onclick="navigate(\'students\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-user-graduate"></i></div><span class="stat-card-label">Total Students</span></div><div class="stat-card-value">' + (stats.totalStudents||0) + '</div><div class="stat-card-change"><i class="fas fa-arrow-up"></i> Active enrollments</div></div>' +
        '<div class="stat-card" onclick="navigate(\'batches\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-layer-group"></i></div><span class="stat-card-label">Total Batches</span></div><div class="stat-card-value">' + (stats.totalBatches||0) + '</div><div class="stat-card-change"><i class="fas fa-check"></i> All active</div></div>' +
        '<div class="stat-card" onclick="navigate(\'fees\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-rupee-sign"></i></div><span class="stat-card-label">Pending Fees</span></div><div class="stat-card-value">' + formatCurrency(stats.pendingFees) + '</div><div class="stat-card-change' + (+stats.pendingFees > 0 ? ' negative' : '') + '"><i class="fas fa-' + (+stats.pendingFees > 0 ? 'exclamation-triangle' : 'check') + '"></i> ' + (+stats.pendingFees > 0 ? 'Needs attention' : 'All clear') + '</div></div>' +
        '<div class="stat-card" onclick="navigate(\'fees\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-wallet"></i></div><span class="stat-card-label">Monthly Collection</span></div><div class="stat-card-value">' + formatCurrency(stats.monthlyCollection) + '</div><div class="stat-card-change"><i class="fas fa-chart-line"></i> This month</div></div>' +
        '<div class="stat-card" onclick="navigate(\'tests\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-clipboard-list"></i></div><span class="stat-card-label">Upcoming Tests</span></div><div class="stat-card-value">' + (stats.upcomingTests||0) + '</div><div class="stat-card-change"><i class="fas fa-calendar"></i> Scheduled</div></div>' +
        '<div class="stat-card" onclick="navigate(\'attendance\')"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-calendar-check"></i></div><span class="stat-card-label">Today\'s Attendance</span></div><div class="stat-card-value">' + (stats.attendanceMarked ? (stats.attendancePercentage||0) + '%' : '—') + '</div><div class="stat-card-change ' + (stats.attendanceMarked && stats.attendancePercentage<75?'negative':'') + '"><i class="fas fa-' + (!stats.attendanceMarked ? 'minus' : stats.attendancePercentage>=75?'check':'exclamation-triangle') + '"></i> ' + (!stats.attendanceMarked ? 'Not marked yet' : stats.attendancePercentage>=75?'Good':'Low') + '</div></div>' +
    '</div>' +
    '<div class="charts-grid">' +
        '<div class="chart-card"><h3><i class="fas fa-chart-bar"></i> Fee Collection Overview</h3>' + feeChartHtml + '</div>' +
        '<div class="chart-card"><h3><i class="fas fa-chart-pie"></i> Class Distribution</h3>' + classChartHtml + '</div>' +
    '</div>' +
    '<div class="charts-grid">' +
        '<div class="chart-card"><h3><i class="fas fa-clipboard-list"></i> Upcoming Tests</h3><div class="upcoming-list">' + testsHtml + '</div></div>' +
        '<div class="chart-card"><h3><i class="fas fa-history"></i> Recent Activity</h3><div class="activity-list">' + activityHtml + '</div></div>' +
    '</div>';

    Object.values(chartInstances).forEach(function(c) { c.destroy(); });
    chartInstances = {};

    // ─── Theme-aware chart colours ───
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var cssVar = function(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };
    var chartText = cssVar('--text-muted') || '#9898ad';
    var chartTextStrong = cssVar('--text') || '#1a1a2e';
    var chartBorder = cssVar('--bg-card') || '#ffffff';
    var chartGrid = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    var isSmall = window.innerWidth <= 640;
    var chartAccent = cssVar('--accent') || '#9E2A3A';
    var chartInk = cssVar('--text') || '#0B0B0C';
    function toRgba(hex, alpha) {
        hex = String(hex).replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(function(c) { return c + c; }).join('');
        var n = parseInt(hex, 16);
        return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
    }

    // ─── Custom tooltip style ───
    var tooltipStyle = {
        backgroundColor: '#0B0B0C',
        titleColor: '#F4F1EA',
        bodyColor: '#D6D1C7',
        borderColor: toRgba(chartAccent, 0.5),
        borderWidth: 1,
        cornerRadius: 10,
        padding: 14,
        titleFont: { family: 'Inter', weight: '700', size: 13 },
        bodyFont: { family: 'Inter', weight: '500', size: 12 },
        displayColors: true,
        boxPadding: 6
    };

    // ─── Fee Collection — Gradient Bar Chart ───
    if (charts.feeData && charts.feeData.length) {
        var feeCtx = $('feeChart').getContext('2d');
        var accentGrad = feeCtx.createLinearGradient(0, 0, 0, 300);
        accentGrad.addColorStop(0, toRgba(chartAccent, 0.95));
        accentGrad.addColorStop(1, toRgba(chartAccent, 0.35));
        var inkGrad = feeCtx.createLinearGradient(0, 0, 0, 300);
        inkGrad.addColorStop(0, toRgba(chartInk, 0.82));
        inkGrad.addColorStop(1, toRgba(chartInk, 0.22));
        chartInstances.fee = new Chart(feeCtx, {
            type: 'bar',
            data: {
                labels: charts.feeData.map(function(d){return d.Month}),
                datasets: [
                    { label: 'Collected', data: charts.feeData.map(function(d){return Number(d.collected) || 0}), backgroundColor: accentGrad, borderColor: chartAccent, borderWidth: 1, borderRadius: 3, borderSkipped: false, barPercentage: 0.55, categoryPercentage: 0.7 },
                    { label: 'Pending', data: charts.feeData.map(function(d){return Number(d.pending) || 0}), backgroundColor: inkGrad, borderColor: chartInk, borderWidth: 1, borderRadius: 3, borderSkipped: false, barPercentage: 0.55, categoryPercentage: 0.7 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 1200, easing: 'easeOutQuart' },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', align: 'end', labels: { color: chartText, font: { family: 'Inter', weight: '700', size: 11 }, padding: 20, usePointStyle: true, pointStyle: 'rectRounded' } },
                    tooltip: tooltipStyle
                },
                scales: {
                    x: { ticks: { color: chartText, font: { family: 'Inter', weight: '600', size: 11 } }, grid: { display: false }, border: { display: false } },
                    y: { ticks: { color: chartText, font: { family: 'Inter', size: 11 }, callback: function(v){return '\u20B9'+v.toLocaleString('en-IN')} }, grid: { color: chartGrid, drawBorder: false }, border: { display: false } }
                }
            }
        });
    }

    // ─── Class Distribution — Doughnut with Center Text ───
    if (charts.classDistribution && charts.classDistribution.length) {
        var doughColors = isDark ? ['#B8404F','#F4F1EA','#60A5FA','#34D399','#C4B5FD','#F472B6','#22D3EE','#67E8F9','#A3E635','#E08A96','#94A3B8','#D8B4FE'] : ['#9E2A3A','#0B0B0C','#1D4ED8','#0F7A4D','#6D28D9','#BE185D','#0891B2','#0E7490','#4D7C0F','#C25A6A','#334155','#7E22CE'];
        var totalStudents = charts.classDistribution.reduce(function(s,d){return s + (Number(d.count) || 0)},0);
        var centerTextPlugin = {
            id: 'centerText',
            afterDraw: function(chart) {
                var ctx = chart.ctx;
                var cX = (chart.chartArea.left + chart.chartArea.right) / 2;
                var cY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = '900 28px Inter';
                ctx.fillStyle = chartTextStrong;
                ctx.fillText(totalStudents, cX, cY - 8);
                ctx.font = '600 11px Inter';
                ctx.fillStyle = chartText;
                ctx.fillText('STUDENTS', cX, cY + 16);
                ctx.restore();
            }
        };
        chartInstances.cls = new Chart($('classChart'), {
            type: 'doughnut',
            data: {
                labels: charts.classDistribution.map(function(d){return 'Class ' + d.Class + ' (' + (Number(d.count) || 0) + ')';}),
                datasets: [{
                    data: charts.classDistribution.map(function(d){return Number(d.count) || 0}),
                    backgroundColor: doughColors,
                    borderWidth: 3,
                    borderColor: chartBorder,
                    hoverBorderColor: chartBorder,
                    hoverOffset: 8,
                    spacing: 2
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '68%',
                animation: { animateRotate: true, duration: 1400, easing: 'easeOutQuart' },
                plugins: {
                    legend: { position: isSmall ? 'bottom' : 'right', labels: { color: chartText, font: { family: 'Inter', weight: '700', size: isSmall ? 10 : 11 }, padding: isSmall ? 10 : 16, usePointStyle: true, pointStyle: 'circle' } },
                    tooltip: tooltipStyle
                }
            },
            plugins: [centerTextPlugin]
        });
    }
}

// ═══ Student Personal Dashboard with Notifications ═══
async function loadStudentDashboard() {
    var data = await api('/api/student/dashboard/' + currentUser.id);
    var notifs = await api('/api/notifications/' + currentUser.id);
    if (!data || data.error) { $('contentArea').innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Error loading dashboard</h3></div>'; return; }

    var s = data.student;
    var att = data.attendance;
    var attColor = att.percentage >= 75 ? 'var(--success)' : att.percentage >= 50 ? 'var(--warning)' : 'var(--danger)';
    var unread = Array.isArray(notifs) ? notifs.filter(function(n){return !n.IsRead}).length : 0;

    var feeRows = data.fees.map(function(f) {
        var statusCls = f.Status === 'Paid' ? 'active' : f.Status === 'Partial' ? 'partial' : 'absent';
        return '<tr><td>' + f.Month + ' ' + f.Year + '</td><td>' + formatCurrency(f.TotalFee) + '</td><td>' + formatCurrency(f.PaidAmount) + '</td><td>' + formatCurrency(f.TotalFee - f.PaidAmount) + '</td><td><span class="status-badge status-' + statusCls + '">' + f.Status + '</span></td></tr>';
    }).join('');

    var resultRows = data.results.map(function(r) {
        var pct = Math.round(r.MarksObtained / r.MaximumMarks * 100);
        var color = pct >= 75 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
        return '<tr><td><strong>' + r.TestName + '</strong></td><td>' + (r.Subject||'-') + '</td><td>' + r.MarksObtained + '/' + r.MaximumMarks + '</td><td><span style="color:' + color + ';font-weight:700">' + pct + '%</span></td><td><span style="font-weight:700">' + (r.Grade||'-') + '</span></td></tr>';
    }).join('');

    var testCards = data.tests.length ? data.tests.map(function(t) {
        var d = new Date(t.TestDate);
        return '<div class="upcoming-item"><div class="upcoming-date"><span class="day">' + d.getDate() + '</span><span class="month">' + d.toLocaleString("en",{month:"short"}) + '</span></div><div class="upcoming-info"><h4>' + t.TestName + '</h4><p>' + (t.Subject||'') + ' &bull; Max: ' + t.MaximumMarks + ' &bull; ' + (t.Duration||'') + '</p></div></div>';
    }).join('') : '<div class="empty-state" style="padding:24px 12px"><i class="fas fa-clipboard-list" aria-hidden="true"></i><p>No upcoming tests</p></div>';

    var hwCards = data.homework.length ? data.homework.map(function(h) {
        return '<div class="upcoming-item"><div class="upcoming-date" style="background:rgba(0,180,216,0.1);border-color:var(--info)"><span class="day" style="color:var(--info)"><i class="fas fa-book"></i></span></div><div class="upcoming-info"><h4>' + h.Title + '</h4><p>' + (h.Subject||'') + ' &bull; Due: ' + formatDate(h.DueDate) + '</p></div></div>';
    }).join('') : '<div class="empty-state" style="padding:24px 12px"><i class="fas fa-book-open" aria-hidden="true"></i><p>No pending homework</p></div>';

    var iconMap = {attendance:'calendar-check',homework:'book',test:'clipboard-list',notice:'bullhorn',result:'chart-bar',fee:'rupee-sign'};
    var colorMap = {attendance:'#0F7A4D',homework:'#0891B2',test:'#9E2A3A',notice:'#6D28D9',result:'#B8404F',fee:'#BE185D'};
    var notifItems = '';
    if (Array.isArray(notifs) && notifs.length) {
        notifItems = notifs.slice(0,20).map(function(n) {
            var icon = iconMap[n.Type] || 'bell';
            var clr = colorMap[n.Type] || '#6c63ff';
            var ago = timeAgo(n.CreatedAt);
            var opacity = n.IsRead ? 'opacity:0.5;' : '';
            var dot = n.IsRead ? '' : '<span style="width:8px;height:8px;border-radius:50%;background:var(--accent);display:inline-block;margin-left:6px"></span>';
            return '<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);' + opacity + '">' +
                '<div style="width:36px;height:36px;border-radius:50%;background:' + clr + '22;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas fa-' + icon + '" style="color:' + clr + ';font-size:14px"></i></div>' +
                '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:0.85rem">' + (n.Title||'Notification') + dot + '</div><div style="color:var(--text-muted);font-size:0.78rem;margin-top:2px">' + (n.Message||'') + '</div><div style="color:var(--text-muted);font-size:0.7rem;margin-top:4px"><i class="fas fa-clock"></i> ' + ago + '</div></div></div>';
        }).join('');
    } else {
        notifItems = '<div style="text-align:center;padding:24px;color:var(--text-muted)"><i class="fas fa-bell-slash" style="font-size:2rem;margin-bottom:8px;display:block"></i>No notifications yet</div>';
    }

    $('contentArea').innerHTML =
    '<div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding:20px;background:var(--accent-bg);border:1.5px solid var(--line);border-radius:var(--radius);box-shadow:var(--hard-sm)">' +
        '<div style="width:60px;height:60px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700;color:white">' + (s.FullName||'S').charAt(0) + '</div>' +
        '<div style="flex:1"><h2 style="margin:0;font-size:1.3rem">Welcome, ' + (s.FullName||'Student') + '!</h2>' +
        '<p style="margin:4px 0 0;color:var(--text-muted)">Class ' + (s.Class||'-') + ' &bull; ' + (s.BatchName||'-') + ' &bull; Roll #' + (s.StudentId||'') + '</p></div>' +
        '<div onclick="toggleStudentNotifs()" style="cursor:pointer;position:relative;padding:10px 14px;border-radius:var(--radius);background:var(--card-bg);border:1px solid var(--border)">' +
            '<i class="fas fa-bell" style="font-size:1.2rem;color:var(--accent)"></i>' +
            (unread > 0 ? '<span style="position:absolute;top:2px;right:4px;background:var(--danger);color:white;font-size:0.65rem;padding:1px 5px;border-radius:10px;font-weight:700">' + unread + '</span>' : '') +
        '</div>' +
    '</div>' +
    '<div id="studentNotifsPanel" style="display:none;margin-bottom:24px;border-radius:var(--radius);border:1.5px solid var(--line);background:var(--card-bg);overflow:hidden;box-shadow:var(--hard-sm)">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border);background:var(--accent-bg)">' +
            '<h3 style="margin:0;font-size:1rem"><i class="fas fa-bell" style="color:var(--accent)"></i> Notifications (' + unread + ' unread)</h3>' +
            (unread > 0 ? '<button onclick="markAllNotifsRead()" style="background:var(--accent);color:white;border:none;padding:5px 14px;border-radius:var(--radius);cursor:pointer;font-size:0.75rem;font-weight:600">Mark all read</button>' : '') +
        '</div>' +
        '<div style="max-height:350px;overflow-y:auto">' + notifItems + '</div>' +
    '</div>' +
    '<div class="stats-grid" style="margin-bottom:24px">' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-calendar-check"></i></div><span class="stat-card-label">Attendance</span></div><div class="stat-card-value" style="color:' + attColor + '">' + att.percentage + '%</div><div class="stat-card-change">' + att.present + ' present / ' + att.total + ' days</div></div>' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-rupee-sign"></i></div><span class="stat-card-label">Total Fees</span></div><div class="stat-card-value">' + formatCurrency(data.totalFee) + '</div><div class="stat-card-change">Annual total</div></div>' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-check-circle"></i></div><span class="stat-card-label">Paid</span></div><div class="stat-card-value" style="color:var(--success)">' + formatCurrency(data.totalPaid) + '</div><div class="stat-card-change">Amount paid</div></div>' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-exclamation-circle"></i></div><span class="stat-card-label">Pending</span></div><div class="stat-card-value" style="color:' + (data.pendingFees > 0 ? 'var(--danger)' : 'var(--success)') + '">' + formatCurrency(data.pendingFees) + '</div><div class="stat-card-change">' + (data.pendingFees > 0 ? 'Please clear dues' : 'All clear!') + '</div></div>' +
    '</div>' +
    '<div class="charts-grid" style="margin-bottom:24px">' +
        '<div class="chart-card"><h3><i class="fas fa-clipboard-list"></i> Your Upcoming Tests</h3><div class="upcoming-list">' + testCards + '</div></div>' +
        '<div class="chart-card"><h3><i class="fas fa-book-open"></i> Pending Homework</h3><div class="upcoming-list">' + hwCards + '</div></div>' +
    '</div>' +
    '<div style="margin-bottom:24px"><h3 style="margin-bottom:12px"><i class="fas fa-chart-bar" style="color:var(--accent)"></i> Your Results</h3>' +
    (data.results.length ? '<div class="data-table-container"><table><thead><tr><th>Test</th><th>Subject</th><th>Marks</th><th>Percentage</th><th>Grade</th></tr></thead><tbody>' + resultRows + '</tbody></table></div>' : '<div class="empty-state"><i class="fas fa-chart-bar"></i><p>No results yet</p></div>') +
    '</div>' +
    '<div><h3 style="margin-bottom:12px"><i class="fas fa-receipt" style="color:var(--accent)"></i> Fee History</h3>' +
    (data.fees.length ? '<div class="data-table-container"><table><thead><tr><th>Month</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead><tbody>' + feeRows + '</tbody></table></div>' : '<div class="empty-state"><i class="fas fa-receipt"></i><p>No fee records</p></div>') +
    '</div>';
}

function toggleStudentNotifs() {
    var panel = document.getElementById('studentNotifsPanel');
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

async function markAllNotifsRead() {
    await put('/api/notifications/' + currentUser.id + '/readall', {});
    showToast('All notifications marked as read', 'success');
    loadStudentDashboard();
    loadNotifications();
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    var now = new Date();
    var d = new Date(dateStr);
    var diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff/86400) + 'd ago';
    return d.toLocaleDateString('en-IN', {day:'numeric',month:'short'});
}


// ═══ Students Page ═══
async function loadStudents() {
    var students = await api('/api/students');
    var list = Array.isArray(students) ? students : [];

    var rows = list.map(function(s, i) {
        var actionBtns = '<button class="action-btn" title="View" onclick="viewStudent(' + s.StudentId + ')"><i class="fas fa-eye"></i></button>';
        if (currentUser.role === 'admin') {
            actionBtns += '<button class="action-btn" title="Change Password" style="color:var(--accent)" onclick="promptChangeStudentPassword(' + s.StudentId + ',\'' + (s.FullName||'').replace(/'/g, "\\'") + '\')"><i class="fas fa-key"></i></button>';
            actionBtns += '<button class="action-btn" title="Edit" onclick="editStudentById(' + s.StudentId + ')"><i class="fas fa-edit"></i></button>';
            actionBtns += '<button class="action-btn delete" title="Delete" onclick="deleteStudent(' + s.StudentId + ')"><i class="fas fa-trash"></i></button>';
        }
        return '<tr data-class="' + (s.Class||'') + '" data-status="' + (s.Status||'') + '"><td>' + (i+1) + '</td><td><strong>' + s.FullName + '</strong><br><small style="color:var(--text-muted)">' + (s.FatherName||'') + '</small></td><td>' + (s.Class||'-') + '</td><td>' + (s.AllBatches||s.BatchName||'-') + '</td><td>' + (s.StudentPhone||'-') + '</td><td>' + (s.ParentPhone||'-') + '</td><td><span class="status-badge status-' + (s.Status||'').toLowerCase() + '">' + (s.Status||'-') + '</span></td><td><div class="action-btns">' + actionBtns + '</div></td></tr>';
    }).join('');

    var classOpts = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'].map(function(c) { return '<option>' + c + '</option>'; }).join('');
    var addBtn = currentUser.role === 'admin' ? '<button class="btn btn-primary" onclick="showStudentForm()"><i class="fas fa-plus"></i> Add Student</button>' : '';

    $('contentArea').innerHTML = '<div class="section-header"><div class="section-title"><i class="fas fa-user-graduate"></i> Students Management</div><div class="section-actions">' + addBtn + '<button class="btn btn-outline" onclick="exportStudentsCsv()"><i class="fas fa-download"></i> Export CSV</button></div></div>' +
        '<div class="data-table-container"><div class="table-toolbar"><div class="table-search"><i class="fas fa-search"></i><input type="text" placeholder="Search students..." oninput="filterTable(this.value,\'studentsTable\')"></div><div class="table-filters"><select class="filter-select" onchange="filterByClass(this.value)"><option value="">All Classes</option>' + classOpts + '</select><select class="filter-select" onchange="filterByStatus(this.value)"><option value="">All Status</option><option>Active</option><option>Inactive</option></select></div></div>' +
        '<div style="overflow-x:auto"><table id="studentsTable"><thead><tr><th>#</th><th>Name</th><th>Class</th><th>Batch</th><th>Phone</th><th>Parent Phone</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        (list.length === 0 ? '<div class="empty-state"><i class="fas fa-user-graduate"></i><h3>No students found</h3></div>' : '') + '</div>';
}

async function showStudentForm(s) {
    s = s || null;
    var batches = await api('/api/batches');
    window._studentBatches = Array.isArray(batches) ? batches : [];
    window._editBatchId = s ? (s.BatchId || null) : null;
    var classOpts = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'].map(function(c) { return '<option ' + (s && s.Class===c ? 'selected' : '') + '>' + c + '</option>'; }).join('');
    var currentClass = s ? s.Class : '1st';

    openModal('<div class="modal-header"><h2>' + (s ? 'Edit' : 'Add') + ' Student</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<form class="modal-form" onsubmit="saveStudent(event,' + (s ? s.StudentId : 'null') + ')">' +
        '<div class="form-row"><div class="form-group"><label>Full Name *</label><input id="sf_name" value="' + (s ? s.FullName||'' : '') + '" required></div><div class="form-group"><label>Class *</label><select id="sf_class" onchange="updateSubjectOptions()" required>' + classOpts + '</select></div></div>' +
        '<div class="form-group"><label>Subjects *</label><div id="sf_subjects_container"></div></div>' +
        '<div class="form-group"><label>Batch *</label><select id="sf_batch" onchange="updateBatchHint()"></select><small id="sf_batch_hint" style="color:var(--text-muted);font-size:.75rem;display:block;margin-top:4px"></small></div>' +
        '<div class="form-row"><div class="form-group"><label>Father\'s Name</label><input id="sf_father" value="' + (s ? s.FatherName||'' : '') + '"></div><div class="form-group"><label>Mother\'s Name</label><input id="sf_mother" value="' + (s ? s.MotherName||'' : '') + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Student Phone</label><input id="sf_phone" value="' + (s ? s.StudentPhone||'' : '') + '"></div><div class="form-group"><label>Parent Phone</label><input id="sf_pphone" value="' + (s ? s.ParentPhone||'' : '') + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Date of Birth</label><input type="date" id="sf_dob" value="' + (s && s.DateOfBirth ? s.DateOfBirth.split('T')[0] : '') + '"></div><div class="form-group"><label>Gender</label><select id="sf_gender"><option ' + (s && s.Gender==='Male'?'selected':'') + '>Male</option><option ' + (s && s.Gender==='Female'?'selected':'') + '>Female</option><option ' + (s && s.Gender==='Other'?'selected':'') + '>Other</option></select></div></div>' +
        '<div class="form-row"><div class="form-group"><label>Username *</label><input id="sf_user" value="' + (s ? s.Username||'' : '') + '" required></div><div class="form-group"><label>Address</label><input id="sf_addr" value="' + (s ? s.Address||'' : '') + '"></div></div>' +
        '<div class="form-group"><label>' + (s ? 'Change Password (leave blank to keep current)' : 'Password') + '</label><input id="sf_pass" ' + (s ? 'placeholder="Leave blank to keep unchanged"' : 'value="student123"') + '></div>' +
        '<div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">' + (s ? 'Update' : 'Add') + ' Student</button></div></form>');

    // Store existing batch IDs / subjects if editing
    window._editSubjects = (s && s._subjects) ? s._subjects : null;
    window._editBatchIds = (s && s._batchIds) ? s._batchIds : null;
    updateSubjectOptions();
}

function updateSubjectOptions() {
    var cls = document.getElementById('sf_class').value;
    var container = document.getElementById('sf_subjects_container');
    if (!container) return;
    var classNum = parseInt(cls);
    var existing = window._editSubjects || null;

    if (classNum >= 1 && classNum <= 5) {
        container.innerHTML = '<div style="padding:10px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius)">' +
            '<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" class="subj-check" value="All Subjects" checked disabled><span style="font-weight:600">All Subjects</span><span style="color:var(--text-muted);font-size:.8rem">(all subjects included)</span></label></div>';
    } else {
        var subjects = [
            { label: 'Maths', value: 'Mathematics' },
            { label: 'Science', value: 'Science' }
        ];
        var html = '<div style="display:flex;gap:16px;flex-wrap:wrap">';
        subjects.forEach(function(subj) {
            var checked = !existing || existing.indexOf(subj.value) >= 0 ? 'checked' : '';
            html += '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px 16px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius)">' +
                '<input type="checkbox" class="subj-check" value="' + subj.value + '" ' + checked + ' onchange="updateStudentBatchOptions()">' +
                '<span style="font-weight:600">' + subj.label + '</span></label>';
        });
        html += '</div><small style="color:var(--text-muted);font-size:.75rem;display:block;margin-top:6px">Optional — choose Maths, Science, or both.</small>';
        container.innerHTML = html;
    }
    updateStudentBatchOptions();
}

function studentSubjectMatches(selected, batchSubject) {
    var a = String(selected || '').trim().toLowerCase();
    var b = String(batchSubject || '').trim().toLowerCase();
    if (a === b) return true;
    if ((b === 'maths + science' || b === 'mathematics + science') && (a === 'mathematics' || a === 'science')) return true;
    if ((a === 'maths + science' || a === 'mathematics + science') && (b === 'mathematics' || b === 'science')) return true;
    return false;
}

// Show the batches available for the selected class and pick the best match
function updateStudentBatchOptions() {
    var clsEl = document.getElementById('sf_class');
    var sel = document.getElementById('sf_batch');
    if (!clsEl || !sel) return;
    var list = (window._studentBatches || []).filter(function(b) { return b.Class === clsEl.value; });

    if (!list.length) {
        sel.innerHTML = '<option value="">No batch for Class ' + clsEl.value + ' yet</option>';
        updateBatchHint();
        return;
    }

    var checked = Array.prototype.map.call(document.querySelectorAll('.subj-check:checked'), function(c) { return c.value; });
    var preferred = window._editBatchId;
    if (!preferred || !list.some(function(b) { return String(b.BatchId) === String(preferred); })) {
        var match = list.filter(function(b) { return checked.some(function(v) { return studentSubjectMatches(v, b.Subject); }); })[0];
        preferred = match ? match.BatchId : list[0].BatchId;
    }
    sel.innerHTML = list.map(function(b) {
        var label = b.BatchName + (b.Timing ? ' — ' + formatTiming(b.Timing) : '') + ' (' + b.Subject + ')';
        return '<option value="' + b.BatchId + '" ' + (String(b.BatchId) === String(preferred) ? 'selected' : '') + '>' + label + '</option>';
    }).join('');
    window._editBatchId = null;
    updateBatchHint();
}

function updateBatchHint() {
    var el = document.getElementById('sf_batch_hint');
    if (!el) return;
    if (!(window._studentBatches || []).filter(function(b) { return b.Class === $('sf_class').value; }).length) {
        el.innerHTML = '<i class="fas fa-info-circle"></i> Create a batch for this class first — students added now will be allotted automatically once you do.';
    } else {
        el.innerHTML = '<i class="fas fa-check-circle"></i> Allotted automatically by class. For classes 6–12, the student is also enrolled in every subject batch selected above.';
    }
}

async function saveStudent(e, id) {
    e.preventDefault();
    var cls = document.getElementById('sf_class').value;

    // Get selected subjects
    var checks = document.querySelectorAll('.subj-check:checked');
    var selectedSubjects = [];
    checks.forEach(function(c) { selectedSubjects.push(c.value); });
    if (!selectedSubjects.length) { toast('Select at least one subject', 'error'); return; }

    var data = { FullName: $('sf_name').value, Class: cls, FatherName: $('sf_father').value, MotherName: $('sf_mother').value, StudentPhone: $('sf_phone').value, ParentPhone: $('sf_pphone').value, DateOfBirth: $('sf_dob').value, Gender: $('sf_gender').value, Username: $('sf_user').value, Address: $('sf_addr').value, Subjects: selectedSubjects, BatchId: $('sf_batch') ? ($('sf_batch').value || null) : null };
    if ($('sf_pass') && $('sf_pass').value.trim()) {
        data.Password = $('sf_pass').value.trim();
    } else if (!id) {
        data.Password = 'student123';
    }

    var r = id ? await put('/api/students/' + id, data) : await post('/api/students', data);
    if (r.success) { toast(id ? 'Student updated' : 'Student added'); closeModal(); loadStudents(); }
    else toast(r.error || 'Error', 'error');
}

async function editStudentById(id) {
    var results = await Promise.all([api('/api/students/' + id), api('/api/batches'), api('/api/students/' + id + '/batches')]);
    var s = results[0];
    var bl = Array.isArray(results[1]) ? results[1] : [];
    var mine = Array.isArray(results[2]) ? results[2] : [];
    var byId = {};
    bl.forEach(function(b) { byId[String(b.BatchId)] = b; });
    s._batchIds = mine.map(function(x) { return x.BatchId; });
    s._subjects = [];
    mine.forEach(function(x) {
        var b = byId[String(x.BatchId)];
        if (b && b.Subject && s._subjects.indexOf(b.Subject) < 0) s._subjects.push(b.Subject);
    });
    showStudentForm(s);
}

function editStudent(s) { editStudentById(s.StudentId); }
async function deleteStudent(id) { if (confirm('Delete this student?')) { await del('/api/students/' + id); toast('Student deleted'); loadStudents(); } }

async function viewStudent(id) {
    var s = await api('/api/students/' + id);
    openModal('<div class="modal-header"><h2>Student Details</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
    '<div class="perf-grid"><div class="perf-card"><div class="perf-value" style="font-size:1.2rem">' + s.FullName + '</div><div class="perf-label">Student Name</div></div>' +
    '<div class="perf-card"><div class="perf-value" style="font-size:1.2rem">' + (s.Class||'-') + '</div><div class="perf-label">Class</div></div></div>' +
    '<div style="margin-top:16px"><p><strong>Father:</strong> ' + (s.FatherName||'-') + ' | <strong>Mother:</strong> ' + (s.MotherName||'-') + '</p>' +
    '<p><strong>Phone:</strong> ' + (s.StudentPhone||'-') + ' | <strong>Parent:</strong> ' + (s.ParentPhone||'-') + '</p>' +
    '<p><strong>Batch:</strong> ' + (s.AllBatches || s.BatchName || '-') + ' | <strong>Fee:</strong> ' + formatCurrency(s.MonthlyFee) + '/month</p>' +
    '<p><strong>DOB:</strong> ' + formatDate(s.DateOfBirth) + ' | <strong>Admission:</strong> ' + formatDate(s.AdmissionDate) + '</p>' +
    '<p><strong>Address:</strong> ' + (s.Address||'-') + '</p></div>');
}

function filterTable(query, tableId) {
    var rows = document.querySelectorAll('#' + tableId + ' tbody tr');
    rows.forEach(function(r) { r.style.display = r.textContent.toLowerCase().indexOf(query.toLowerCase()) >= 0 ? '' : 'none'; });
}
function filterByClass(cls) { document.querySelectorAll('#studentsTable tbody tr').forEach(function(r) { r.style.display = !cls || r.dataset.class === cls ? '' : 'none'; }); }
function filterByStatus(st) { document.querySelectorAll('#studentsTable tbody tr').forEach(function(r) { r.style.display = !st || r.dataset.status === st ? '' : 'none'; }); }


// Export the student list as a CSV file
async function exportStudentsCsv() {
    var list = await api('/api/students');
    if (!Array.isArray(list) || !list.length) { toast('No students to export', 'error'); return; }
    var cols = ['FullName','Class','Batches','FatherName','MotherName','StudentPhone','ParentPhone','Address','AdmissionDate','Status'];
    function cell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
    var rows = list.map(function(s) {
        return [s.FullName, s.Class, s.AllBatches || s.BatchName || '', s.FatherName, s.MotherName, s.StudentPhone, s.ParentPhone, s.Address, (s.AdmissionDate || '').split('T')[0], s.Status].map(cell).join(',');
    });
    var csv = [cols.map(cell).join(',')].concat(rows).join('\r\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'students.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
    toast('Students exported');
}

function promptChangeStudentPassword(id, name) {
    openModal('<div class="modal-header"><h2><i class="fas fa-key" style="color:var(--accent)"></i> Change Password for ' + name + '</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<form class="modal-form" onsubmit="saveStudentPassword(event,' + id + ')">' +
        '<div class="form-group"><label>New Password *</label><input type="text" id="csp_pass" value="student123" required>' +
        '<small style="color:var(--text-muted);font-size:.75rem;display:block;margin-top:6px">Immediately updates student login credentials in database without student consent or notification.</small></div>' +
        '<div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Password</button></div></form>');
}

async function saveStudentPassword(e, id) {
    e.preventDefault();
    var pass = $('csp_pass').value;
    if (!pass || !pass.trim()) { toast('Password cannot be empty', 'error'); return; }
    var r = await put('/api/students/' + id + '/password', { password: pass.trim() });
    if (r.success) {
        toast('Student password updated successfully');
        closeModal();
    } else {
        toast(r.error || 'Failed to update password', 'error');
    }
}


// ═══ Batches Page ═══
// Default timings per class (24h: start, end). Blank = admin sets it manually.
var CLASS_TIMINGS = {
    '1st': ['16:00', '18:30'],
    '2nd': ['16:00', '18:30'],
    '3rd': ['16:00', '18:30'],
    '4th': ['16:00', '18:30'],
    '5th': ['16:00', '18:30'],
    '6th': ['', ''],
    '7th': ['', ''],
    '8th': ['18:30', '19:30'],
    '9th': ['19:30', '20:30'],
    '10th': ['17:45', '19:30'],
    '11th': ['', ''],
    '12th': ['', '']
};

async function loadBatches() {
    const batches = await api('/api/batches');
    const list = Array.isArray(batches) ? batches : [];
    $('contentArea').innerHTML = `
        <div class="section-header">
            <div class="section-title"><i class="fas fa-layer-group"></i> Batch Management</div>
            <div class="section-actions">${currentUser.role==='admin'?'<button class="btn btn-primary" onclick="showBatchForm()"><i class="fas fa-plus"></i> Add Batch</button>':''}</div>
        </div>
        <div class="stats-grid" style="margin-bottom:20px">${list.slice(0,6).map(b=>`<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-layer-group"></i></div><span class="stat-card-label">${b.Class}</span></div><div class="stat-card-value" style="font-size:1.1rem">${b.BatchName}</div><div class="stat-card-change">${b.StudentCount||0} students • ${formatCurrency(b.MonthlyFee)}/mo</div></div>`).join('')}</div>
        <div class="data-table-container">
            <table><thead><tr><th>#</th><th>Batch</th><th>Class</th><th>Subject</th><th>Timing</th><th>Fee</th><th>Students</th><th>Actions</th></tr></thead>
            <tbody>${list.map((b,i)=>`<tr><td>${i+1}</td><td><strong>${b.BatchName}</strong></td><td>${b.Class}</td><td>${b.Subject||'-'}</td><td>${formatTiming(b.Timing)}</td><td>${formatCurrency(b.MonthlyFee)}</td><td>${b.StudentCount||0}</td>
            <td><div class="action-btns">${currentUser.role==='admin'?`<button class="action-btn" onclick='showBatchForm(${JSON.stringify(b).replace(/\'/g,"&#39;")})'><i class="fas fa-edit"></i></button><button class="action-btn delete" onclick="deleteBatch(${b.BatchId})"><i class="fas fa-trash"></i></button>`:''}</div></td></tr>`).join('')}</tbody></table>
            ${!list.length?'<div class="empty-state"><i class="fas fa-layer-group"></i><h3>No batches yet</h3><p>Create your first batch to start adding students.</p></div>':''}
        </div>`;
}

function showBatchForm(b=null) {
    window._batchSubject = b ? (b.Subject || '') : '';
    openModal(`<div class="modal-header"><h2>${b?'Edit':'Add'} Batch</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <form class="modal-form" onsubmit="saveBatch(event,${b?b.BatchId:'null'})">
        <div class="form-row"><div class="form-group"><label>Batch Name *</label><input id="bf_name" value="${b?.BatchName||''}" required placeholder="e.g. Class 10 - Maths"></div><div class="form-group"><label>Class *</label><select id="bf_class" onchange="onBatchClassChange()">${['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'].map(c=>`<option ${b?.Class===c?'selected':''}>${c}</option>`).join('')}</select></div></div>
        <div class="form-row"><div class="form-group"><label>Subject *</label><select id="bf_subj" onchange="autoBatchName()"></select></div><div class="form-group"><label>Monthly Fee (₹)</label><input type="number" id="bf_fee" value="${b?.MonthlyFee||0}"></div></div>
        <div class="form-row">
            <div class="form-group"><label>Start Time *</label><input type="time" id="bf_start" required onchange="updateTimingHint()"></div>
            <div class="form-group"><label>End Time *</label><input type="time" id="bf_end" required onchange="updateTimingHint()"></div>
        </div>
        <div id="bf_time_hint" style="margin:-6px 0 12px;font-size:.76rem;color:var(--text-muted)"></div>
        <div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">${b?'Update':'Add'}</button></div>
    </form>`);

    window._autoBatchName = b ? null : '';
    updateBatchSubjectOptions();

    // Editing: keep the saved timing; new batch: apply the class default
    var parsed = b ? parseTimingRange(b.Timing) : null;
    if (parsed) {
        $('bf_start').value = parsed[0];
        $('bf_end').value = parsed[1];
    } else {
        applyClassTiming();
    }
    autoBatchName();
    updateTimingHint();
}

// Class 1-5 → All Subjects; Class 6-12 → Maths or Science
function updateBatchSubjectOptions() {
    var clsEl = document.getElementById('bf_class');
    var sel = document.getElementById('bf_subj');
    if (!clsEl || !sel) return;
    var classNum = parseInt(clsEl.value);
    var opts = (classNum >= 1 && classNum <= 5) ? ['All Subjects'] : ['Mathematics', 'Science'];
    var existing = window._batchSubject || '';
    if (existing && opts.indexOf(existing) < 0) opts.push(existing);
    sel.innerHTML = opts.map(function(s) { return '<option value="' + s + '" ' + (existing === s ? 'selected' : '') + '>' + s + '</option>'; }).join('');
    window._batchSubject = '';
}

function onBatchClassChange() {
    updateBatchSubjectOptions();
    applyClassTiming();
    autoBatchName();
    updateTimingHint();
}

// Fill the start/end fields with the default for the selected class
function applyClassTiming() {
    var cls = $('bf_class') ? $('bf_class').value : '';
    var range = CLASS_TIMINGS[cls] || ['', ''];
    if ($('bf_start')) $('bf_start').value = range[0];
    if ($('bf_end')) $('bf_end').value = range[1];
    updateTimingHint();
}

function updateTimingHint() {
    var el = document.getElementById('bf_time_hint');
    if (!el) return;
    var cls = $('bf_class').value;
    var range = CLASS_TIMINGS[cls] || ['', ''];
    if (range[0] && range[1]) {
        el.innerHTML = '<i class="fas fa-clock"></i> Class ' + cls + ' default: <strong>' + formatTime12(range[0]) + ' - ' + formatTime12(range[1]) + '</strong> — you can change it.';
    } else {
        el.innerHTML = '<i class="fas fa-pen"></i> No default timing for Class ' + cls + ' — set the timing manually.';
    }
}

// Suggest a name like "Class 10 - Mathematics" without overwriting a custom name
function autoBatchName() {
    var nameEl = document.getElementById('bf_name');
    var clsEl = document.getElementById('bf_class');
    var subjEl = document.getElementById('bf_subj');
    if (!nameEl || !clsEl || !subjEl) return;
    var suggested = 'Class ' + clsEl.value + ' - ' + subjEl.value;
    if (!nameEl.value || nameEl.value === window._autoBatchName) {
        nameEl.value = suggested;
        window._autoBatchName = suggested;
    }
}

// "4:00 PM - 6:30 PM" / "16:00 - 18:30" / "8:00-9:00 AM" → ["16:00","18:30"]
function parseTimingRange(str) {
    if (!str) return null;
    var m = String(str).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[-–—]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return null;
    var ap1 = m[3] ? m[3].toUpperCase() : '';
    var ap2 = m[6] ? m[6].toUpperCase() : '';
    if (ap1 && !ap2) ap2 = ap1;
    if (!ap1 && ap2) ap1 = ap2;
    function to24(h, mi, ap) {
        h = parseInt(h, 10);
        if (ap) h = (h % 12) + (ap === 'PM' ? 12 : 0);
        return String(h).padStart(2, '0') + ':' + mi;
    }
    return [to24(m[1], m[2], ap1), to24(m[4], m[5], ap2)];
}

async function saveBatch(e,id) {
    e.preventDefault();
    var start = $('bf_start').value;
    var end = $('bf_end').value;
    if (!start || !end) { toast('Please set the batch start and end time', 'error'); return; }
    if (end <= start) { toast('End time must be after start time', 'error'); return; }
    const data={BatchName:$('bf_name').value,Class:$('bf_class').value,Subject:$('bf_subj').value,Timing:start + ' - ' + end,MonthlyFee:$('bf_fee').value};
    if(id)data.Status='Active';
    const r=id?await put(`/api/batches/${id}`,data):await post('/api/batches',data);
    if(r.success){toast(id?'Updated':'Added');closeModal();loadBatches();}else toast(r.error||'Error','error');
}

async function deleteBatch(id){if(confirm('Delete this batch?')){const r=await del(`/api/batches/${id}`);if(r.success){toast('Deleted');loadBatches();}else toast(r.error||'Delete failed','error');}}


// ═══ Attendance Page ═══
async function loadAttendance() {
    if (currentUser.role === 'student') return loadMyAttendance();

    const batches = await api('/api/batches');
    const bl = Array.isArray(batches) ? batches : [];
    let defaultBatchIdx = 0;
    bl.forEach((b, i) => { if (+b.StudentCount > +(bl[defaultBatchIdx].StudentCount || 0)) defaultBatchIdx = i; });
    const today = localDateStr();
    $('contentArea').innerHTML = `
        <div class="section-header">
            <div class="section-title"><i class="fas fa-calendar-check"></i> Mark Attendance</div>
            <div class="section-actions">
                <button class="btn btn-outline" onclick="loadAttendanceReport()"><i class="fas fa-chart-bar"></i> Today's Report</button>
                <button class="btn btn-success" onclick="markAllPresent()"><i class="fas fa-check-double"></i> Mark All Present</button>
            </div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
            <div class="form-group" style="flex:1;min-width:220px"><label>Batch</label><select id="att_batch" onchange="loadBatchStudents()">${bl.length ? bl.map((b, i) => `<option value="${b.BatchId}" ${defaultBatchIdx === i ? 'selected' : ''}>${b.BatchName} (${b.Class})${b.Timing ? ' · ' + formatTiming(b.Timing) : ''}${+b.StudentCount ? ' · ' + b.StudentCount + ' students' : ''}</option>`).join('') : '<option value="">No batches yet</option>'}</select></div>
            <div class="form-group" style="flex:1;min-width:200px"><label>Date</label><input type="date" id="att_date" value="${today}" onchange="loadBatchStudents()"></div>
        </div>
        <div id="attSummary" class="att-summary"></div>
        <div id="attendanceList"></div>
        <div style="margin-top:16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="saveAttendance()"><i class="fas fa-save"></i> Save Attendance</button>
            <span id="attSavedNote" style="color:var(--text-muted);font-size:.85rem"></span>
        </div>`;
    loadBatchStudents();
}

async function loadBatchStudents() {
    const batchId = $('att_batch')?.value;
    const date = $('att_date')?.value;
    if (!batchId) {
        $('attendanceList').innerHTML = '<div class="empty-state"><i class="fas fa-layer-group"></i><h3>Create a batch first</h3><p>Add students to a batch, then mark attendance here.</p></div>';
        return;
    }
    const [students, existing] = await Promise.all([
        api('/api/students/batch/' + batchId),
        api('/api/attendance?batchId=' + batchId + '&date=' + date)
    ]);
    const sl = Array.isArray(students) ? students : [];
    const ex = Array.isArray(existing) ? existing : [];
    const exMap = {};
    ex.forEach(a => exMap[a.StudentId] = a.Status);
    $('attendanceList').innerHTML = sl.length ? `<div class="attendance-grid">${sl.map(s => {
        const st = exMap[s.StudentId] || '';
        return `<div class="attendance-row" data-sid="${s.StudentId}">
            <span class="student-name">${s.FullName}</span>
            <span style="color:var(--text-muted);font-size:.8rem">${s.Class || ''}</span>
            <div class="attendance-btns">
                <button class="att-btn present ${st === 'Present' ? 'selected' : ''}" onclick="selectAtt(this,'Present')">Present</button>
                <button class="att-btn absent ${st === 'Absent' ? 'selected' : ''}" onclick="selectAtt(this,'Absent')">Absent</button>
                <button class="att-btn late ${st === 'Late' ? 'selected' : ''}" onclick="selectAtt(this,'Late')">Late</button>
            </div>
        </div>`;
    }).join('')}</div>` : '<div class="empty-state"><i class="fas fa-users"></i><h3>No students in this batch</h3><p>Assign students to this batch from the Students page.</p></div>';
    updateAttSummary();
}

function selectAtt(btn, status) {
    btn.parentElement.querySelectorAll('.att-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    updateAttSummary();
}

function markAllPresent() {
    document.querySelectorAll('.attendance-row').forEach(row => {
        row.querySelectorAll('.att-btn').forEach(b => b.classList.remove('selected'));
        const p = row.querySelector('.att-btn.present');
        if (p) p.classList.add('selected');
    });
    updateAttSummary();
}

function updateAttSummary() {
    const el = $('attSummary');
    if (!el) return;
    const rows = document.querySelectorAll('.attendance-row').length;
    const p = document.querySelectorAll('.attendance-row .att-btn.present.selected').length;
    const a = document.querySelectorAll('.attendance-row .att-btn.absent.selected').length;
    const l = document.querySelectorAll('.attendance-row .att-btn.late.selected').length;
    if (!rows) { el.innerHTML = ''; return; }
    el.innerHTML = `<span class="att-chip present"><i class="fas fa-check"></i> ${p} present</span>
        <span class="att-chip absent"><i class="fas fa-times"></i> ${a} absent</span>
        <span class="att-chip late"><i class="fas fa-clock"></i> ${l} late</span>
        <span class="att-chip"><i class="fas fa-users"></i> ${rows} total</span>`;
}

async function saveAttendance() {
    const batchId = $('att_batch').value;
    const date = $('att_date').value;
    const records = [];
    document.querySelectorAll('.attendance-row').forEach(row => {
        const sid = row.dataset.sid;
        const sel = row.querySelector('.att-btn.selected');
        if (sel) records.push({ StudentId: sid, BatchId: batchId, Date: date, Status: sel.textContent.trim(), MarkedBy: currentUser.id });
    });
    if (!records.length) { toast('Please mark attendance first', 'error'); return; }
    const r = await post('/api/attendance/mark', { records });
    if (r.success) {
        toast(`Attendance saved for ${records.length} students`);
        if ($('attSavedNote')) $('attSavedNote').textContent = 'Saved ' + records.length + ' records for ' + date;
    } else toast(r.error || 'Error saving', 'error');
}

async function loadAttendanceReport() {
    const data = await api('/api/attendance?date=' + localDateStr());
    const list = Array.isArray(data) ? data : [];
    openModal(`<div class="modal-header"><h2>Today's Attendance Report</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <div class="perf-grid">
        <div class="perf-card"><div class="perf-value" style="color:var(--success)">${list.filter(a => a.Status === 'Present').length}</div><div class="perf-label">Present</div></div>
        <div class="perf-card"><div class="perf-value" style="color:var(--danger)">${list.filter(a => a.Status === 'Absent').length}</div><div class="perf-label">Absent</div></div>
        <div class="perf-card"><div class="perf-value" style="color:var(--warning)">${list.filter(a => a.Status === 'Late').length}</div><div class="perf-label">Late</div></div>
    </div>
    <table style="margin-top:12px"><thead><tr><th>Student</th><th>Class</th><th>Status</th></tr></thead>
    <tbody>${list.map(a => `<tr><td>${a.FullName}</td><td>${a.Class || '-'}</td><td><span class="status-badge status-${(a.Status || '').toLowerCase()}">${a.Status}</span></td></tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:20px">No attendance marked today</td></tr>'}</tbody></table>`);
}

// Student: personal attendance history
async function loadMyAttendance() {
    $('contentArea').innerHTML = '<div class="loading"><div class="spinner"></div>Loading attendance...</div>';
    const data = await api('/api/attendance?studentId=' + currentUser.id);
    const list = Array.isArray(data) ? data : [];
    const present = list.filter(a => a.Status === 'Present').length;
    const absent = list.filter(a => a.Status === 'Absent').length;
    const late = list.filter(a => a.Status === 'Late').length;
    const pct = list.length ? Math.round((present / list.length) * 100) : 0;
    const pctColor = pct >= 75 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';

    $('contentArea').innerHTML = `
        <div class="section-header"><div class="section-title"><i class="fas fa-calendar-check"></i> My Attendance</div></div>
        <div class="stats-grid" style="margin-bottom:20px">
            <div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-percentage"></i></div><span class="stat-card-label">Attendance</span></div><div class="stat-card-value" style="color:${pctColor}">${pct}%</div><div class="stat-card-change">${present} of ${list.length} classes</div></div>
            <div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-check"></i></div><span class="stat-card-label">Present</span></div><div class="stat-card-value" style="color:var(--success)">${present}</div></div>
            <div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-times"></i></div><span class="stat-card-label">Absent</span></div><div class="stat-card-value" style="color:var(--danger)">${absent}</div></div>
            <div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-clock"></i></div><span class="stat-card-label">Late</span></div><div class="stat-card-value" style="color:var(--warning)">${late}</div></div>
        </div>
        <div class="data-table-container"><table><thead><tr><th>Date</th><th>Batch</th><th>Status</th><th>Remarks</th></tr></thead>
        <tbody>${list.map(a => `<tr><td>${formatDate(a.Date)}</td><td>${a.BatchName || '-'}</td><td><span class="status-badge status-${(a.Status || '').toLowerCase()}">${a.Status}</span></td><td style="color:var(--text-muted)">${a.Remarks || '-'}</td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">No attendance records yet</td></tr>'}</tbody></table></div>`;
}

// ═══ Fees Page ═══
async function loadFees() {
    if (currentUser.role === 'student') return loadStudentFeePortal();

    const [fees, pending] = await Promise.all([api('/api/fees'), api('/api/fees/pending')]);
    const list = Array.isArray(fees) ? fees : [];
    const pend = Array.isArray(pending) ? pending : [];
    const totalCollected = list.reduce((s, f) => s + parseFloat(f.PaidAmount || 0), 0);
    const totalPending = pend.reduce((s, f) => s + parseFloat(f.TotalFee || 0) - parseFloat(f.PaidAmount || 0), 0);

    var addBtn = currentUser.role === 'admin' ? '<button class="btn btn-primary" onclick="showFeeForm()"><i class="fas fa-plus"></i> Add Fee</button>' : '';
    var verifyBtn = currentUser.role === 'admin' ? '<button class="btn btn-outline" onclick="showPendingPayments()" id="verifyPaymentsBtn"><i class="fas fa-check-double"></i> Verify Payments</button>' : '';
    var qrBtn = currentUser.role === 'admin' ? '<button class="btn btn-outline" onclick="showPaymentSettings()"><i class="fas fa-qrcode"></i> Payment QR</button>' : '';

    var rows = list.map(function(f) {
        var remaining = f.TotalFee - f.PaidAmount;
        var statusCls = (f.Status || '').toLowerCase() === 'paid' ? 'active' : (f.Status || '').toLowerCase() === 'partial' ? 'partial' : 'absent';
        var actions = '';
        if (f.Status !== 'Paid' && currentUser.role === 'admin') {
            actions += '<button class="action-btn" title="Collect partial/full payment" onclick="collectFee(' + f.FeeId + ',' + f.TotalFee + ',' + f.PaidAmount + ')"><i class="fas fa-hand-holding-usd"></i></button>';
            actions += '<button class="action-btn" title="Mark fully paid (manual approval)" onclick="markFeePaid(' + f.FeeId + ',' + f.TotalFee + ')"><i class="fas fa-check"></i></button>';
        }
        if (f.Status === 'Paid') {
            actions += '<button class="action-btn" title="Receipt" onclick=\'showReceipt(' + JSON.stringify(f).replace(/'/g, "&#39;") + ')\'><i class="fas fa-receipt"></i></button>';
        }
        return '<tr><td><strong>' + f.FullName + '</strong></td><td>' + (f.Class || '-') + '</td><td>' + f.Month + ' ' + f.Year + '</td><td>' + formatCurrency(f.TotalFee) + '</td><td>' + formatCurrency(f.PaidAmount) + '</td><td>' + formatCurrency(remaining) + '</td><td><span class="status-badge status-' + statusCls + '">' + f.Status + '</span></td><td><div class="action-btns">' + actions + '</div></td></tr>';
    }).join('');

    $('contentArea').innerHTML = '<div class="section-header"><div class="section-title"><i class="fas fa-rupee-sign"></i> Fee Management</div><div class="section-actions">' + addBtn + verifyBtn + qrBtn + '<button class="btn btn-warning" onclick="showPendingFees()"><i class="fas fa-exclamation-triangle"></i> Pending (' + pend.length + ')</button></div></div>' +
        '<div class="stats-grid" style="margin-bottom:20px">' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-check-circle"></i></div><span class="stat-card-label">Collected</span></div><div class="stat-card-value">' + formatCurrency(totalCollected) + '</div></div>' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-clock"></i></div><span class="stat-card-label">Pending</span></div><div class="stat-card-value">' + formatCurrency(totalPending) + '</div></div>' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-receipt"></i></div><span class="stat-card-label">Total Records</span></div><div class="stat-card-value">' + list.length + '</div></div></div>' +
        (list.length
            ? '<div class="data-table-container"><div class="table-toolbar"><div class="table-search"><i class="fas fa-search"></i><input placeholder="Search fees..." oninput="filterTable(this.value,\'feesTable\')"></div></div>' +
              '<div style="overflow-x:auto"><table id="feesTable"><thead><tr><th>Student</th><th>Class</th><th>Month</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Status</th><th>Actions</th></tr></thead>' +
              '<tbody>' + rows + '</tbody></table></div></div>'
            : '<div class="empty-state"><i class="fas fa-receipt"></i><h3>No fee records</h3><p>Click Add Fee to create the first record.</p></div>');
}

// Student fee portal: simple "scan & pay" page
async function loadStudentFeePortal() {
    $('contentArea').innerHTML = '<div class="loading"><div class="spinner"></div>Loading fee details...</div>';
    const [fees, config] = await Promise.all([
        api('/api/fees?studentId=' + currentUser.id),
        api('/api/upi/config')
    ]);
    const list = Array.isArray(fees) ? fees : [];
    const totalFee = list.reduce((s, f) => s + parseFloat(f.TotalFee || 0), 0);
    const totalPaid = list.reduce((s, f) => s + parseFloat(f.PaidAmount || 0), 0);
    const pending = Math.max(0, totalFee - totalPaid);
    const upiId = config.upiId || '';
    const upiName = config.upiName || 'Mathan Institute';
    const qrImage = config.qrImage || '';

    const qrBlock = qrImage
        ? '<img src="' + qrImage + '" alt="UPI QR Code" class="qr-image">'
        : '<div class="qr-placeholder"><i class="fas fa-qrcode"></i><p>QR code not uploaded yet</p><small>Please contact your tutor</small></div>';

    const links = buildUpiLinks(upiId, upiName, pending);
    const payButtons = pending <= 0
        ? ''
        : (upiId
        ? '<div class="pay-methods">' +
            '<a class="pay-btn gpay" href="' + links.gpay + '"><i class="fas fa-mobile-alt"></i> GPay</a>' +
            '<a class="pay-btn phonepe" href="' + links.phonepe + '"><i class="fas fa-mobile-alt"></i> PhonePe</a>' +
            '<a class="pay-btn anyupi" href="' + links.upi + '"><i class="fas fa-external-link-alt"></i> Other UPI App</a>' +
          '</div>'
        : '<div class="pay-note"><i class="fas fa-info-circle"></i> Your tutor has not added a UPI ID yet. You can still scan the QR above with any UPI app.</div>');

    const rows = list.map(function(f) {
        const due = Math.max(0, parseFloat(f.TotalFee || 0) - parseFloat(f.PaidAmount || 0));
        const statusCls = f.Status === 'Paid' ? 'active' : f.Status === 'Partial' ? 'partial' : 'absent';
        var action = due > 0
            ? '<button class="btn btn-primary" style="padding:5px 12px;font-size:.78rem" onclick="showPayNow(' + f.FeeId + ',' + due + ')"><i class="fas fa-qrcode"></i> Pay</button>'
            : '<button class="action-btn" title="Receipt" onclick=\'showReceipt(' + JSON.stringify(Object.assign({}, f, { FullName: currentUser.username })).replace(/'/g, "&#39;") + ')\'><i class="fas fa-receipt"></i></button>';
        return '<tr><td>' + f.Month + ' ' + f.Year + '</td><td>' + formatCurrency(f.TotalFee) + '</td><td>' + formatCurrency(f.PaidAmount) + '</td><td style="font-weight:700;color:' + (due > 0 ? 'var(--danger)' : 'var(--success)') + '">' + formatCurrency(due) + '</td><td><span class="status-badge status-' + statusCls + '">' + f.Status + '</span></td><td>' + action + '</td></tr>';
    }).join('');

    $('contentArea').innerHTML =
    '<div class="section-header"><div class="section-title"><i class="fas fa-qrcode"></i> Pay Fees</div></div>' +
    '<div class="stats-grid" style="margin-bottom:20px">' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-wallet"></i></div><span class="stat-card-label">Total Fees</span></div><div class="stat-card-value">' + formatCurrency(totalFee) + '</div></div>' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-check-circle"></i></div><span class="stat-card-label">Paid</span></div><div class="stat-card-value" style="color:var(--success)">' + formatCurrency(totalPaid) + '</div></div>' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-exclamation-circle"></i></div><span class="stat-card-label">Pending</span></div><div class="stat-card-value" style="color:' + (pending > 0 ? 'var(--danger)' : 'var(--success)') + '">' + formatCurrency(pending) + '</div></div>' +
    '</div>' +
    '<div class="payment-portal">' +
        '<div class="qr-card">' +
            '<div class="qr-card-title"><i class="fas fa-qrcode"></i> Scan &amp; Pay</div>' +
            qrBlock +
            (pending > 0 ? '<div class="pay-amount">' + formatCurrency(pending) + '<span>pending</span></div>' : '<div class="pay-amount paid"><i class="fas fa-check-circle" aria-hidden="true"></i> All fees paid</div>') +
            (upiId ? '<div class="upi-row"><span>' + upiId + '</span><button onclick="copyUpi(\'' + upiId + '\')" title="Copy UPI ID"><i class="fas fa-copy"></i></button></div>' : '') +
            payButtons +
        '</div>' +
        '<div class="pay-steps">' +
            '<h3><i class="fas fa-info-circle"></i> How to pay</h3>' +
            '<ol>' +
                '<li>Open GPay, PhonePe or any UPI app.</li>' +
                '<li>Scan the QR code or tap a button above.</li>' +
                '<li>Enter the amount shown and complete the payment.</li>' +
                '<li>Payment is confirmed by your tutor; your fee record updates here.</li>' +
            '</ol>' +
            '<div class="pay-note"><i class="fas fa-shield-alt"></i> Your fees are collected directly by your tutor. This app never stores card or bank details.</div>' +
        '</div>' +
    '</div>' +
    '<h3 style="margin:24px 0 12px"><i class="fas fa-receipt" style="color:var(--accent)"></i> Fee History</h3>' +
    (list.length
        ? '<div class="data-table-container"><table><thead><tr><th>Month</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th>Action</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="empty-state"><i class="fas fa-receipt"></i><h3>No fee records yet</h3><p>Your tutor has not added any fee records.</p></div>');
}

function buildUpiLinks(upiId, upiName, amount) {
    const params = 'pa=' + encodeURIComponent(upiId || '') + '&pn=' + encodeURIComponent(upiName || 'Mathan Institute') + '&am=' + encodeURIComponent(amount || '') + '&cu=INR&tn=' + encodeURIComponent('Fee payment');
    return {
        upi: 'upi://pay?' + params,
        gpay: 'tez://upi/pay?' + params,
        phonepe: 'phonepe://pay?' + params
    };
}

function copyUpi(id) {
    if (navigator.clipboard) navigator.clipboard.writeText(id);
    toast('UPI ID copied!');
}

function showFeeForm() {
    api('/api/students').then(students => {
        const sl = Array.isArray(students) ? students : [];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        openModal(`<div class="modal-header"><h2>Add Fee Record</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
        <form class="modal-form" onsubmit="saveFee(event)">
            <div class="form-group"><label>Student *</label><select id="ff_student" required>${sl.map(s => `<option value="${s.StudentId}">${s.FullName} (${s.Class})</option>`).join('')}</select></div>
            <div class="form-row"><div class="form-group"><label>Month *</label><select id="ff_month">${months.map(m => `<option>${m}</option>`).join('')}</select></div><div class="form-group"><label>Year *</label><input type="number" id="ff_year" value="${new Date().getFullYear()}"></div></div>
            <div class="form-row"><div class="form-group"><label>Total Fee *</label><input type="number" id="ff_total" required></div><div class="form-group"><label>Paid Amount</label><input type="number" id="ff_paid" value="0"></div></div>
            <div class="form-group"><label>Payment Method</label><select id="ff_method"><option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Online</option></select></div>
            <div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div>
        </form>`);
    });
}

async function saveFee(e) {
    e.preventDefault();
    const r = await post('/api/fees', { StudentId: $('ff_student').value, Month: $('ff_month').value, Year: $('ff_year').value, TotalFee: $('ff_total').value, PaidAmount: $('ff_paid').value, PaymentMethod: $('ff_method').value });
    if (r.success) { toast('Fee recorded'); closeModal(); loadFees(); } else toast(r.error || 'Error', 'error');
}

async function collectFee(feeId, total, paid) {
    const amt = prompt(`Total: ₹${total}, Paid: ₹${paid}\nEnter amount to collect:`);
    if (amt) {
        const r = await put(`/api/fees/${feeId}`, { PaidAmount: parseFloat(paid) + parseFloat(amt), PaymentMethod: 'Cash' });
        if (r.success) { toast('Payment collected'); loadFees(); } else toast(r.error || 'Error', 'error');
    }
}

// Manual fee approval: tutor marks the record fully paid without a student submission
async function markFeePaid(feeId, total) {
    const method = prompt('Mark this fee as fully paid.\nPayment method: Cash / UPI / Bank Transfer / Online', 'Cash');
    if (method === null) return;
    const r = await put('/api/fees/' + feeId, { PaidAmount: total, PaymentMethod: method || 'Cash' });
    if (r.success) { toast('Fee marked as paid'); loadFees(); } else toast(r.error || 'Error', 'error');
}

function showPendingFees() {
    api('/api/fees/pending').then(data => {
        const list = Array.isArray(data) ? data : [];
        openModal(`<div class="modal-header"><h2>Pending Fees</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
        <table><thead><tr><th>Student</th><th>Month</th><th>Pending</th><th>Phone</th></tr></thead>
        <tbody>${list.map(f => `<tr><td>${f.FullName}</td><td>${f.Month} ${f.Year}</td><td style="color:var(--danger);font-weight:700">${formatCurrency(f.TotalFee - f.PaidAmount)}</td><td>${f.ParentPhone || '-'}</td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px">No pending fees</td></tr>'}</tbody></table>`);
    });
}

function showReceipt(f) {
    openModal(`<div class="receipt">
        <div class="receipt-header"><h2><i class="fas fa-graduation-cap" aria-hidden="true"></i> Mathan Institute of Career Development</h2><p>Fee Receipt</p><p style="font-size:.75rem">Receipt #: ${f.ReceiptNumber || 'N/A'}</p></div>
        <div class="receipt-row"><span>Student Name</span><strong>${f.FullName}</strong></div>
        <div class="receipt-row"><span>Class</span><strong>${f.Class || '-'}</strong></div>
        <div class="receipt-row"><span>Month/Year</span><strong>${f.Month} ${f.Year}</strong></div>
        <div class="receipt-row"><span>Payment Date</span><strong>${formatDate(f.PaymentDate)}</strong></div>
        <div class="receipt-row"><span>Payment Method</span><strong>${f.PaymentMethod || '-'}</strong></div>
        <div class="receipt-row receipt-total"><span>Amount Paid</span><strong>${formatCurrency(f.PaidAmount)}</strong></div>
        <p style="text-align:center;margin-top:20px;color:#999;font-size:.75rem">This is a computer generated receipt</p>
    </div>
    <div style="text-align:center;margin-top:16px"><button class="btn btn-primary" onclick="window.print()"><i class="fas fa-print"></i> Print</button></div>`);
}

// Student: pay a single fee record via QR
async function showPayNow(feeId, amount) {
    var config = await api('/api/upi/config');
    var upiId = config.upiId || '';
    var upiName = config.upiName || 'Mathan Institute';
    var qrImage = config.qrImage || '';
    var links = buildUpiLinks(upiId, upiName, amount);

    var qrHtml = qrImage
        ? '<div class="qr-card" style="box-shadow:none;margin:0 auto 16px"><img src="' + qrImage + '" alt="UPI QR Code" class="qr-image"></div>'
        : '<div class="qr-placeholder" style="margin:0 auto 16px"><i class="fas fa-qrcode"></i><p>QR code not uploaded yet</p></div>';

    openModal('<div class="modal-header"><h2><i class="fas fa-qrcode"></i> Pay via UPI</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<div style="text-align:center;padding:16px">' +
        qrHtml +
        '<div class="pay-amount" style="margin:0 auto 16px">₹' + amount + '<span>amount to pay</span></div>' +
        (upiId ? '<div class="upi-row" style="margin-bottom:12px"><span>' + upiId + '</span><button onclick="copyUpi(\'' + upiId + '\')"><i class="fas fa-copy"></i></button></div>' : '') +
        (upiId ? '<div class="pay-methods"><a class="pay-btn gpay" href="' + links.gpay + '"><i class="fas fa-mobile-alt"></i> GPay</a><a class="pay-btn phonepe" href="' + links.phonepe + '"><i class="fas fa-mobile-alt"></i> PhonePe</a><a class="pay-btn anyupi" href="' + links.upi + '"><i class="fas fa-external-link-alt"></i> UPI App</a></div>' : '') +
        '<div style="border-top:1px solid var(--border);padding-top:16px;margin-top:16px">' +
        '<p style="color:var(--text-muted);font-size:.8rem;margin-bottom:12px">Already paid? Enter your UPI transaction ID so your tutor can confirm it.</p>' +
        '<input id="upi_txn_id" placeholder="e.g. 412345678901" style="width:100%;padding:10px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:1rem;text-align:center;margin-bottom:12px">' +
        '<button onclick="submitUPIPayment(' + feeId + ',' + amount + ')" class="btn btn-primary" style="width:100%"><i class="fas fa-paper-plane"></i> Submit Payment</button>' +
        '</div></div>');
}

async function submitUPIPayment(feeId, amount) {
    var txnId = document.getElementById('upi_txn_id').value.trim();
    if (!txnId) { toast('Please enter Transaction ID', 'error'); return; }
    var r = await post('/api/payments/submit', { StudentId: currentUser.id, FeeId: feeId, Amount: amount, TransactionId: txnId });
    if (r.success) { toast(r.message || 'Payment submitted!'); closeModal(); loadFees(); }
    else toast(r.error || 'Error submitting payment', 'error');
}

// Admin: payment QR + UPI settings (also used from Settings page)
async function showPaymentSettings() {
    const s = await api('/api/settings');
    openModal('<div class="modal-header"><h2><i class="fas fa-qrcode"></i> Payment QR &amp; UPI</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<form class="modal-form" onsubmit="savePaymentSettings(event)">' +
        '<div class="form-row"><div class="form-group"><label>UPI ID (GPay / PhonePe)</label><input id="ps_upiid" value="' + (s.upiId || '') + '" placeholder="yourname@okhdfcbank"></div>' +
        '<div class="form-group"><label>Display Name</label><input id="ps_upiname" value="' + (s.upiName || '') + '"></div></div>' +
        '<div class="form-group"><label>QR Code Image</label>' +
        '<div id="ps_qr_preview" style="text-align:center;margin-bottom:10px">' + (s.qrImage ? '<img src="' + s.qrImage + '" class="qr-image" style="max-width:180px">' : '<div class="qr-placeholder" style="max-width:220px;margin:0 auto"><i class="fas fa-qrcode"></i><p>No QR uploaded</p></div>') + '</div>' +
        '<input type="file" id="ps_qr" accept=".png,.jpg,.jpeg,.webp" onchange="previewQrImage(this)" style="display:none">' +
        '<button type="button" class="btn btn-outline" onclick="document.getElementById(\'ps_qr\').click()" style="width:100%"><i class="fas fa-upload"></i> Upload GPay / PhonePe QR Screenshot</button>' +
        '<p style="color:var(--text-muted);font-size:.75rem;margin-top:6px">Open GPay/PhonePe → Profile → UPI ID / QR → screenshot and upload here. PNG/JPG up to 5MB.</p></div>' +
        '<div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save</button></div>' +
        '</form>');
}

function previewQrImage(input) {
    if (input.files && input.files[0]) {
        var url = URL.createObjectURL(input.files[0]);
        document.getElementById('ps_qr_preview').innerHTML = '<img src="' + url + '" class="qr-image" style="max-width:180px">';
    }
}

async function savePaymentSettings(e) {
    e.preventDefault();
    const r = await post('/api/settings', { upiId: $('ps_upiid').value.trim(), upiName: $('ps_upiname').value.trim() });
    if (!r.success) { toast(r.error || 'Could not save settings', 'error'); return; }
    const fileInput = $('ps_qr');
    if (fileInput && fileInput.files[0]) {
        const fd = new FormData();
        fd.append('qr', fileInput.files[0]);
        try {
            const resp = await fetch((API || '') + '/api/settings/qr', { method: 'POST', body: fd, credentials: 'include' });
            const j = await resp.json();
            if (!j.success) { toast(j.error || 'QR upload failed', 'error'); return; }
        } catch (err) { toast('QR upload failed: ' + err.message, 'error'); return; }
    }
    toast('Payment settings saved');
    closeModal();
    navigate(currentPage);
}

// ═══ Admin: Verify UPI Payments ═══
async function showPendingPayments() {
    var payments = await api('/api/payments/pending');
    var list = Array.isArray(payments) ? payments : [];

    var rows = list.map(function(p) {
        return '<tr>' +
            '<td><strong>' + p.FullName + '</strong><br><small style="color:var(--text-muted)">' + (p.Class || '') + '</small></td>' +
            '<td>' + (p.Month || '-') + ' ' + (p.Year || '') + '</td>' +
            '<td style="font-weight:700;color:var(--accent)">' + formatCurrency(p.Amount) + '</td>' +
            '<td><code style="background:var(--bg-secondary);padding:2px 8px;border-radius:4px">' + (p.TransactionId || '-') + '</code></td>' +
            '<td>' + formatDate(p.SubmittedAt) + '</td>' +
            '<td><div style="display:flex;gap:6px">' +
            '<button class="btn btn-primary" style="padding:4px 12px;font-size:.75rem" onclick="approvePayment(' + p.PaymentId + ')"><i class="fas fa-check"></i> Approve</button>' +
            '<button class="btn btn-outline" style="padding:4px 12px;font-size:.75rem;color:var(--danger);border-color:var(--danger)" onclick="rejectPayment(' + p.PaymentId + ')"><i class="fas fa-times"></i> Reject</button>' +
            '</div></td></tr>';
    }).join('');

    openModal('<div class="modal-header"><h2><i class="fas fa-check-double"></i> Verify UPI Payments</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<div style="max-height:60vh;overflow-y:auto"><table><thead><tr><th>Student</th><th>Fee Month</th><th>Amount</th><th>Transaction ID</th><th>Submitted</th><th>Action</th></tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)"><i class="fas fa-check-circle" style="font-size:2rem;display:block;margin-bottom:8px;color:var(--success)"></i>No pending payments to verify</td></tr>') + '</tbody></table></div>');
}

async function approvePayment(paymentId) {
    var r = await put('/api/payments/' + paymentId + '/approve');
    if (r.success) { toast('Payment approved & fee updated!'); closeModal(); loadFees(); }
    else toast('Error approving', 'error');
}

async function rejectPayment(paymentId) {
    if (!confirm('Reject this payment?')) return;
    var r = await put('/api/payments/' + paymentId + '/reject');
    if (r.success) { toast('Payment rejected'); closeModal(); loadFees(); }
    else toast('Error rejecting', 'error');
}


// ═══ Homework Page ═══
async function loadHomework() {
    var hw = await api("/api/homework");
    var list = Array.isArray(hw) ? hw : [];
    var active = list.filter(function(h) { return new Date(h.DueDate) >= new Date(); });
    var rows = list.map(function(h) {
        var due = new Date(h.DueDate);
        var overdue = due < new Date();
        var desc = (h.Description || "").substring(0, 50);
        var actions = currentUser.role !== "student" ? "<td><button class=\"action-btn delete\" onclick=\"deleteHomework(" + h.HomeworkId + ")\"><i class=\"fas fa-trash\"></i></button></td>" : "";
        return "<tr><td><strong>" + h.Title + "</strong><br><small style=\"color:var(--text-muted)\">" + desc + "</small></td><td>" + (h.BatchName || "-") + "</td><td>" + (h.Subject || "-") + "</td><td>" + formatDate(h.DueDate) + "</td><td><span class=\"status-badge " + (overdue ? "status-absent" : "status-active") + "\">" + (overdue ? "Expired" : "Active") + "</span></td>" + actions + "</tr>";
    }).join("");
    var actionsHeader = currentUser.role !== "student" ? "<th>Actions</th>" : "";
    var addBtn = currentUser.role !== "student" ? "<button class=\"btn btn-primary\" onclick=\"showHomeworkForm()\"><i class=\"fas fa-plus\"></i> Add Homework</button>" : "";
    var tableHtml = rows
        ? "<div class=\"data-table-container\"><table><thead><tr><th>Title</th><th>Batch</th><th>Subject</th><th>Due Date</th><th>Status</th>" + actionsHeader + "</tr></thead><tbody>" + rows + "</tbody></table></div>"
        : "<div class=\"empty-state\"><i class=\"fas fa-book-open\"></i><h3>No homework yet</h3><p>" + (currentUser.role === 'student' ? 'New homework will appear here.' : 'Click Add Homework to assign one.') + "</p></div>";
    $("contentArea").innerHTML = "<div class=\"section-header\"><div class=\"section-title\"><i class=\"fas fa-book-open\"></i> Homework</div><div class=\"section-actions\">" + addBtn + "</div></div><div class=\"stats-grid\" style=\"margin-bottom:20px\"><div class=\"stat-card\"><div class=\"stat-card-header\"><div class=\"stat-card-icon\"><i class=\"fas fa-book\"></i></div><span class=\"stat-card-label\">Total</span></div><div class=\"stat-card-value\">" + list.length + "</div></div><div class=\"stat-card\"><div class=\"stat-card-header\"><div class=\"stat-card-icon\"><i class=\"fas fa-clock\"></i></div><span class=\"stat-card-label\">Active</span></div><div class=\"stat-card-value\">" + active.length + "</div></div></div>" + tableHtml;
}

function showHomeworkForm() {
    api("/api/batches").then(function(batches) {
        var bl = Array.isArray(batches) ? batches : [];
        var batchOpts = bl.map(function(b) { return "<option value=\"" + b.BatchId + "\">" + b.BatchName + "</option>"; }).join("");
        openModal("<div class=\"modal-header\"><h2>Add Homework</h2><button class=\"modal-close\" onclick=\"closeModal()\"><i class=\"fas fa-times\"></i></button></div><form class=\"modal-form\" onsubmit=\"saveHomework(event)\"><div class=\"form-group\"><label>Title *</label><input id=\"hw_title\" required></div><div class=\"form-row\"><div class=\"form-group\"><label>Batch *</label><select id=\"hw_batch\">" + batchOpts + "</select></div><div class=\"form-group\"><label>Subject</label><input id=\"hw_subj\"></div></div><div class=\"form-row\"><div class=\"form-group\"><label>Due Date *</label><input type=\"date\" id=\"hw_due\" required></div><div class=\"form-group\"></div></div><div class=\"form-group\"><label>Description</label><textarea id=\"hw_desc\" rows=\"3\"></textarea></div><div class=\"modal-actions\"><button type=\"button\" class=\"btn btn-outline\" onclick=\"closeModal()\">Cancel</button><button type=\"submit\" class=\"btn btn-primary\">Add</button></div></form>");
    });
}

async function saveHomework(e) {
    e.preventDefault();
    var r = await post("/api/homework", { BatchId: $("hw_batch").value, Title: $("hw_title").value, Description: $("hw_desc").value, Subject: $("hw_subj").value, DueDate: $("hw_due").value });
    if (r.success) { toast("Homework added"); closeModal(); loadHomework(); } else toast("Error", "error");
}
async function deleteHomework(id) { if (confirm("Delete this homework?")) { var r = await del("/api/homework/" + id); if (r.success) { toast("Deleted"); loadHomework(); } else { toast(r.error || "Delete failed", "error"); } } }

// ═══ Tests Page ═══
function mqEsc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function gradeFromPct(pct) {
    return pct>=90?'A+':pct>=80?'A':pct>=70?'B+':pct>=60?'B':pct>=50?'C':pct>=40?'D':'F';
}
function testTypeBadge(t) {
    return t.TestType === 'MCQ'
        ? '<span class="type-badge mcq"><i class="fas fa-list-ol"></i> MCQ</span>'
        : '<span class="type-badge paper"><i class="fas fa-file-alt"></i> Paper</span>';
}

async function loadTests() {
    var tests = await api('/api/tests');
    var list = Array.isArray(tests) ? tests : [];
    if (currentUser.role === 'student') return loadStudentTests(list);
    return loadTutorTests(list);
}

async function loadTutorTests(list) {
    var upcoming = list.filter(function(t) { return t.Status === 'Upcoming'; });
    var completed = list.filter(function(t) { return t.Status === 'Completed'; });
    var mcqCount = list.filter(function(t) { return t.TestType === 'MCQ'; }).length;
    var addBtn = '<button class="btn btn-primary" onclick="showTestForm()"><i class="fas fa-plus"></i> Create Test</button>';

    var upcomingCards = '';
    if (upcoming.length) {
        var items = upcoming.map(function(t) {
            var d = new Date(t.TestDate);
            var day = d.getDate();
            var mon = d.toLocaleString('en', { month: 'short' });
            return '<div class="upcoming-item"><div class="upcoming-date"><span class="day">' + day + '</span><span class="month">' + mon + '</span></div>' +
                '<div class="upcoming-info"><h4>' + mqEsc(t.TestName) + ' ' + testTypeBadge(t) + '</h4>' +
                '<p>' + mqEsc(t.Subject || '') + ' &bull; ' + mqEsc(t.BatchName || '') + ' &bull; Max: ' + t.MaximumMarks +
                (t.TestType === 'MCQ' ? ' &bull; ' + (t.QuestionCount || 0) + ' questions &bull; ' + (t.AttemptCount || 0) + ' submitted' : '') + '</p></div>' +
                resourceButtons(t) + '</div>';
        }).join('');
        upcomingCards = '<h3 style="margin-bottom:12px"><i class="fas fa-clock" style="color:var(--accent)"></i> Upcoming Tests</h3><div class="upcoming-list" style="margin-bottom:24px">' + items + '</div>';
    }

    var tableRows = list.map(function(t) {
        var statusClass = t.Status === 'Upcoming' ? 'partial' : t.Status === 'Completed' ? 'active' : 'absent';
        var actions = '';
        if (t.TestType === 'MCQ') {
            actions += '<button class="action-btn" title="Questions / attempts" onclick="manageQuestions(' + t.TestId + ')"><i class="fas fa-list-ol"></i></button>';
        }
        actions += '<button class="action-btn" title="' + (t.Status === 'Upcoming' ? 'Mark completed' : 'Reopen') + '" onclick="toggleTestStatus(' + t.TestId + ',\'' + t.Status + '\')"><i class="fas ' + (t.Status === 'Upcoming' ? 'fa-check' : 'fa-redo') + '"></i></button>';
        actions += '<button class="action-btn delete" title="Delete test" onclick="deleteTest(' + t.TestId + ')"><i class="fas fa-trash"></i></button>';
        return '<tr><td><strong>' + mqEsc(t.TestName) + '</strong>' + (t.TestType === 'MCQ' ? '<br><small style="color:var(--text-muted)">' + (t.QuestionCount || 0) + ' questions &bull; ' + (t.AttemptCount || 0) + ' submitted</small>' : '') + '</td>' +
            '<td>' + mqEsc(t.BatchName || '-') + '</td><td>' + mqEsc(t.Subject || '-') + '</td><td>' + testTypeBadge(t) + '</td>' +
            '<td>' + formatDate(t.TestDate) + '</td><td>' + t.MaximumMarks + '</td>' +
            '<td><div class="resource-btns">' + resourceButtons(t) + '</div></td>' +
            '<td><span class="status-badge status-' + statusClass + '">' + mqEsc(t.Status) + '</span></td>' +
            '<td><div class="action-btns">' + actions + '</div></td></tr>';
    }).join('');

    $('contentArea').innerHTML = '<div class="section-header"><div class="section-title"><i class="fas fa-clipboard-list"></i> Tests</div><div class="section-actions">' + addBtn + '</div></div>' +
        '<div class="stats-grid" style="margin-bottom:20px">' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-calendar"></i></div><span class="stat-card-label">Upcoming</span></div><div class="stat-card-value">' + upcoming.length + '</div></div>' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-list-ol"></i></div><span class="stat-card-label">Online MCQ</span></div><div class="stat-card-value">' + mcqCount + '</div></div>' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-check"></i></div><span class="stat-card-label">Completed</span></div><div class="stat-card-value">' + completed.length + '</div></div></div>' +
        upcomingCards +
        (tableRows
            ? '<div class="data-table-container"><table><thead><tr><th>Test</th><th>Batch</th><th>Subject</th><th>Type</th><th>Date</th><th>Max Marks</th><th>Resources</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + tableRows + '</tbody></table></div>'
            : '<div class="empty-state"><i class="fas fa-clipboard-list"></i><h3>No tests yet</h3><p>Click “Create Test” to schedule one.</p></div>');
}

function resourceButtons(t) {
    var out = '';
    if (t.DriveLink) out += '<a class="res-btn drive" href="' + mqEsc(t.DriveLink) + '" target="_blank" rel="noopener" title="Open Drive link"><i class="fas fa-link"></i> Drive</a>';
    if (t.FilePath) out += '<button class="res-btn file" onclick="viewTestFile(\'' + t.FilePath + '\',\'' + mqEsc(t.TestName).replace(/'/g, '') + '\')" title="Open uploaded file"><i class="fas fa-paperclip"></i> File</button>';
    if (t.TestType === 'MCQ' && currentUser.role !== 'student') out += '<button class="res-btn mcq" onclick="manageQuestions(' + t.TestId + ')" title="View questions"><i class="fas fa-list-ol"></i> ' + (t.QuestionCount || 0) + ' Q</button>';
    return out || '<span style="color:var(--text-muted);font-size:.8rem">—</span>';
}

// Student test list (only their batch)
async function loadStudentTests(list) {
    var me = await api('/api/students/' + currentUser.id);
    var myBatches = await api('/api/students/' + currentUser.id + '/batches');
    var results = await api('/api/results?studentId=' + currentUser.id);
    var myResults = Array.isArray(results) ? results : [];
    var resultByTest = {};
    myResults.forEach(function(r) { resultByTest[String(r.TestId)] = r; });

    var batchSet = {};
    if (Array.isArray(myBatches)) myBatches.forEach(function(b) { batchSet[String(b.BatchId)] = true; });
    if (me && me.BatchId) batchSet[String(me.BatchId)] = true;

    var mine = list.filter(function(t) {
        if (batchSet[String(t.BatchId)]) return true;
        return !t.BatchId && t.Status === 'Upcoming';
    });
    var upcoming = mine.filter(function(t) { return t.Status === 'Upcoming'; });
    var rows = mine.map(function(t) {
        var r = resultByTest[String(t.TestId)];
        var action = '';
        if (t.TestType === 'MCQ') {
            action = r
                ? '<span class="status-badge status-active"><i class="fas fa-check"></i> ' + r.MarksObtained + '/' + t.MaximumMarks + '</span>'
                : '<button class="btn btn-primary" style="padding:5px 14px;font-size:.8rem" onclick="startQuiz(' + t.TestId + ')"><i class="fas fa-play"></i> Start Test</button>';
        }
        return '<tr><td><strong>' + mqEsc(t.TestName) + '</strong>' + testTypeBadge(t) + (t.Duration ? '<br><small style="color:var(--text-muted)">' + mqEsc(t.Duration) + '</small>' : '') + '</td>' +
            '<td>' + mqEsc(t.Subject || '-') + '</td><td>' + formatDate(t.TestDate) + '</td>' +
            '<td>' + t.MaximumMarks + '</td><td><div class="resource-btns">' + resourceButtons(t) + '</div></td>' +
            '<td><span class="status-badge status-' + (t.Status === 'Upcoming' ? 'partial' : 'active') + '">' + mqEsc(t.Status) + '</span></td>' +
            '<td>' + action + '</td></tr>';
    }).join('');

    $('contentArea').innerHTML = '<div class="section-header"><div class="section-title"><i class="fas fa-clipboard-list"></i> My Tests</div></div>' +
        '<div class="stats-grid" style="margin-bottom:20px">' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-calendar"></i></div><span class="stat-card-label">Upcoming</span></div><div class="stat-card-value">' + upcoming.length + '</div></div>' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-list-ol"></i></div><span class="stat-card-label">Online Tests</span></div><div class="stat-card-value">' + mine.filter(function(t) { return t.TestType === 'MCQ'; }).length + '</div></div>' +
        '<div class="stat-card"><div class="stat-card-header"><div class="stat-card-icon"><i class="fas fa-check-circle"></i></div><span class="stat-card-label">Completed</span></div><div class="stat-card-value">' + mine.filter(function(t) { return t.Status === 'Completed'; }).length + '</div></div></div>' +
        (rows
            ? '<div class="data-table-container"><table><thead><tr><th>Test</th><th>Subject</th><th>Date</th><th>Max Marks</th><th>Resources</th><th>Status</th><th>Action</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
            : '<div class="empty-state"><i class="fas fa-clipboard-list"></i><h3>No tests assigned</h3><p>Tests for your batch will appear here.</p></div>');
}

// Create test (tutor)
function showTestForm() {
    api('/api/batches').then(function(batches) {
        var bl = Array.isArray(batches) ? batches : [];
        var opts = bl.map(function(b) { return '<option value="' + b.BatchId + '">' + mqEsc(b.BatchName) + '</option>'; }).join('');
        openModal('<div class="modal-header"><h2><i class="fas fa-plus"></i> Create Test</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
            '<form class="modal-form" id="testForm" onsubmit="saveTest(event)" style="max-height:72vh;overflow-y:auto">' +
            '<div class="form-group"><label>Test Name *</label><input id="tt_name" required placeholder="e.g. Chapter 5 Physics Quiz"></div>' +
            '<div class="form-row"><div class="form-group"><label>Batch *</label><select id="tt_batch">' + opts + '</select></div><div class="form-group"><label>Subject</label><input id="tt_subj"></div></div>' +
            '<div class="form-group"><label>Test Type *</label><select id="tt_type" onchange="toggleTestType()"><option value="Paper">Question Paper (file / Drive link)</option><option value="MCQ">Online MCQ (auto-graded)</option></select></div>' +
            '<div class="form-row"><div class="form-group"><label>Date *</label><input type="date" id="tt_date" required></div><div class="form-group"><label>Time</label><input type="time" id="tt_time"></div></div>' +
            '<div class="form-row"><div class="form-group" id="tt_marks_group"><label>Max Marks</label><input type="number" id="tt_marks" value="100"></div><div class="form-group"><label>Duration</label><input id="tt_dur" placeholder="e.g. 1 hour"></div></div>' +
            '<div class="form-group"><label><i class="fas fa-link" style="color:var(--accent)"></i> Google Drive Link (optional)</label><input id="tt_drive" placeholder="https://drive.google.com/file/d/..."><small style="color:var(--text-muted);font-size:.72rem">A Drive link to the question paper, notes or answer key.</small></div>' +
            '<div class="form-group" id="tt_file_group"><label><i class="fas fa-paperclip" style="color:var(--accent)"></i> Attach Question Paper (optional)</label>' +
            '<input type="file" id="tt_file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onchange="previewTestFile(this)" style="display:none">' +
            '<div id="tt_file_dropzone" onclick="document.getElementById(\'tt_file\').click()" class="file-dropzone">' +
            '<i class="fas fa-cloud-upload-alt"></i><p>Click to upload PDF, Word or image</p><small>Max 20MB</small></div>' +
            '<div id="tt_file_preview" class="file-preview" style="display:none"></div></div>' +
            '<div id="tt_mcq_group" style="display:none">' +
            '<div class="mcq-builder-head"><label style="margin:0">MCQ Questions</label><span id="tt_mcq_total" class="type-badge mcq">0 marks</span></div>' +
            '<div id="tt_questions"></div>' +
            '<button type="button" class="btn btn-outline" onclick="addMCQQuestion()" style="width:100%;margin-top:8px"><i class="fas fa-plus"></i> Add Question</button>' +
            '</div>' +
            '<div class="form-group"><label>Instructions / Description</label><textarea id="tt_desc" rows="2" placeholder="Optional instructions for students"></textarea></div>' +
            '<div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary"><i class="fas fa-calendar-plus"></i> Create Test</button></div></form>');
        addMCQQuestion();
    });
}

function toggleTestType() {
    var isMcq = $('tt_type').value === 'MCQ';
    $('tt_mcq_group').style.display = isMcq ? 'block' : 'none';
    $('tt_marks_group').style.display = isMcq ? 'none' : 'block';
    $('tt_file_group').style.display = isMcq ? 'none' : 'block';
}

function addMCQQuestion() {
    var wrap = document.getElementById('tt_questions');
    if (!wrap) return;
    var div = document.createElement('div');
    div.className = 'mcq-q';
    div.innerHTML =
        '<div class="mcq-q-head"><span class="mcq-q-num">Q</span><button type="button" class="action-btn delete" onclick="removeMCQBlock(this)"><i class="fas fa-times"></i></button></div>' +
        '<textarea class="mq-text" rows="2" placeholder="Question text *"></textarea>' +
        '<div class="mcq-opts">' +
            '<div class="mcq-opt"><span class="opt-key">A</span><input class="mq-a" placeholder="Option A"></div>' +
            '<div class="mcq-opt"><span class="opt-key">B</span><input class="mq-b" placeholder="Option B"></div>' +
            '<div class="mcq-opt"><span class="opt-key">C</span><input class="mq-c" placeholder="Option C"></div>' +
            '<div class="mcq-opt"><span class="opt-key">D</span><input class="mq-d" placeholder="Option D"></div>' +
        '</div>' +
        '<div class="mcq-q-foot"><label>Correct answer <select class="mq-correct"><option>A</option><option>B</option><option>C</option><option>D</option></select></label>' +
        '<label>Marks <input type="number" class="mq-marks" value="1" min="0.5" step="0.5" style="width:80px"></label></div>';
    wrap.appendChild(div);
    div.querySelectorAll('.mq-marks').forEach(function(inp) { inp.addEventListener('input', updateMcqTotal); });
    renumberMcq();
}

function removeMCQBlock(btn) {
    var block = btn.closest('.mcq-q');
    if (block) block.remove();
    renumberMcq();
}

function renumberMcq() {
    document.querySelectorAll('#tt_questions .mcq-q').forEach(function(b, i) {
        var n = b.querySelector('.mcq-q-num');
        if (n) n.textContent = 'Q' + (i + 1);
    });
    updateMcqTotal();
}

function updateMcqTotal() {
    var total = 0;
    document.querySelectorAll('#tt_questions .mq-marks').forEach(function(i) { total += parseFloat(i.value) || 0; });
    var el = document.getElementById('tt_mcq_total');
    if (el) el.textContent = total + ' marks';
}

function collectTestQuestions() {
    var out = [];
    document.querySelectorAll('#tt_questions .mcq-q').forEach(function(b) {
        out.push({
            QuestionText: b.querySelector('.mq-text').value.trim(),
            OptionA: b.querySelector('.mq-a').value.trim(),
            OptionB: b.querySelector('.mq-b').value.trim(),
            OptionC: b.querySelector('.mq-c').value.trim(),
            OptionD: b.querySelector('.mq-d').value.trim(),
            CorrectOption: b.querySelector('.mq-correct').value,
            Marks: parseFloat(b.querySelector('.mq-marks').value) || 1
        });
    });
    return out.filter(function(q) { return q.QuestionText; });
}

function previewTestFile(input) {
    var preview = document.getElementById('tt_file_preview');
    if (!preview) return;
    if (input.files && input.files[0]) {
        var file = input.files[0];
        var ext = file.name.split('.').pop().toLowerCase();
        var icon = ext === 'pdf' ? 'fa-file-pdf' : (ext === 'doc' || ext === 'docx') ? 'fa-file-word' : 'fa-file-image';
        var iconColor = ext === 'pdf' ? '#e74c3c' : (ext === 'doc' || ext === 'docx') ? '#2b5797' : '#27ae60';
        var sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        preview.style.display = 'flex';
        preview.innerHTML = '<i class="fas ' + icon + '" style="font-size:1.3rem;color:' + iconColor + '"></i>' +
            '<div style="flex:1"><strong style="font-size:.85rem">' + mqEsc(file.name) + '</strong><br><span style="color:var(--text-muted);font-size:.75rem">' + sizeMB + ' MB</span></div>' +
            '<button type="button" onclick="clearTestFile()" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:1rem" title="Remove"><i class="fas fa-times-circle"></i></button>';
        document.getElementById('tt_file_dropzone').style.display = 'none';
    }
}

function clearTestFile() {
    document.getElementById('tt_file').value = '';
    document.getElementById('tt_file_preview').style.display = 'none';
    document.getElementById('tt_file_dropzone').style.display = 'block';
}

function viewTestFile(filePath, testName) {
    var ext = filePath.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].indexOf(ext) >= 0) {
        openModal('<div class="modal-header"><h2><i class="fas fa-image"></i> ' + mqEsc(testName) + '</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
            '<div style="text-align:center;padding:16px"><img src="' + filePath + '" style="max-width:100%;max-height:70vh;border-radius:var(--radius);box-shadow:var(--shadow)" alt="Test Paper"></div>' +
            '<div style="text-align:center;margin-top:12px"><a href="' + filePath + '" download class="btn btn-primary"><i class="fas fa-download"></i> Download</a></div>');
    } else {
        window.open(filePath, '_blank');
    }
}

async function saveTest(e) {
    e.preventDefault();
    var type = $('tt_type').value;
    var formData = new FormData();
    formData.append('TestName', $('tt_name').value);
    formData.append('TestType', type);
    formData.append('BatchId', $('tt_batch').value);
    formData.append('Subject', $('tt_subj').value);
    formData.append('TestDate', $('tt_date').value);
    formData.append('TestTime', $('tt_time').value);
    formData.append('Duration', $('tt_dur').value);
    formData.append('DriveLink', $('tt_drive').value);
    formData.append('Description', $('tt_desc').value);
    formData.append('MaximumMarks', $('tt_marks') ? $('tt_marks').value : '0');

    if (type === 'MCQ') {
        var questions = collectTestQuestions();
        if (!questions.length) { toast('Add at least one MCQ question', 'error'); return; }
        var incomplete = questions.find(function(q) { return !q.OptionA || !q.OptionB; });
        if (incomplete) { toast('Each question needs at least options A and B', 'error'); return; }
        formData.append('Questions', JSON.stringify(questions));
    } else {
        var fileInput = document.getElementById('tt_file');
        if (fileInput && fileInput.files[0]) formData.append('testFile', fileInput.files[0]);
    }
    try {
        var resp = await fetch((API || '') + '/api/tests', { method: 'POST', body: formData, credentials: 'include' });
        var r = await resp.json();
        if (r.success) { toast('Test created' + (r.questions ? ' with ' + r.questions + ' questions' : '')); closeModal(); loadTests(); }
        else toast(r.error || 'Error', 'error');
    } catch (err) { toast('Upload failed: ' + err.message, 'error'); }
}

async function toggleTestStatus(id, current) {
    var next = current === 'Upcoming' ? 'Completed' : 'Upcoming';
    var r = await put('/api/tests/' + id, { Status: next });
    if (r.success) { toast('Test marked ' + next.toLowerCase()); loadTests(); } else toast('Error', 'error');
}

// Tutor: manage questions + attempts for one test
async function manageQuestions(testId) {
    var [questions, testList, attempts] = await Promise.all([
        api('/api/tests/' + testId + '/questions'),
        api('/api/tests'),
        api('/api/tests/' + testId + '/attempts')
    ]);
    var qs = Array.isArray(questions) ? questions : [];
    var tests = Array.isArray(testList) ? testList : [];
    var test = tests.filter(function(t) { return String(t.TestId) === String(testId); })[0] || {};
    var at = Array.isArray(attempts) ? attempts : [];

    var qHtml = qs.map(function(q, i) {
        var opts = ['A', 'B', 'C', 'D'].map(function(k) {
            var txt = q['Option' + k] || '';
            var isCorrect = String(q.CorrectOption).toUpperCase() === k;
            return '<div class="mcq-opt ' + (isCorrect ? 'correct' : '') + '"><span class="opt-key">' + k + '</span><span>' + mqEsc(txt) + '</span>' + (isCorrect ? ' <i class="fas fa-check" style="color:var(--success)"></i>' : '') + '</div>';
        }).join('');
        return '<div class="mcq-q"><div class="mcq-q-head"><span class="mcq-q-num">Q' + (i + 1) + '</span><span style="color:var(--text-muted);font-size:.75rem">' + q.Marks + ' mark(s)</span>' +
            '<button class="action-btn delete" onclick="deleteQuestion(' + q.QuestionId + ',' + testId + ')"><i class="fas fa-trash"></i></button></div>' +
            '<div style="font-weight:600;margin-bottom:8px">' + mqEsc(q.QuestionText) + '</div><div class="mcq-opts">' + opts + '</div></div>';
    }).join('') || '<div class="empty-state" style="padding:16px"><p>No questions yet</p></div>';

    var atHtml = at.map(function(a) {
        return '<tr><td><strong>' + mqEsc(a.FullName) + '</strong></td><td>' + (a.Class || '-') + '</td><td>' + a.Score + '/' + a.TotalMarks + '</td><td>' + (a.TotalMarks ? Math.round(a.Score / a.TotalMarks * 100) : 0) + '%</td><td>' + formatDate(a.SubmittedAt) + '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:16px">No submissions yet</td></tr>';

    openModal('<div class="modal-header"><h2><i class="fas fa-list-ol"></i> ' + mqEsc(test.TestName || 'MCQ Test') + '</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<div class="modal-form" style="max-height:70vh;overflow-y:auto">' +
        '<div class="mcq-builder-head"><h3 style="margin:0">Questions (' + qs.length + ')</h3><span class="type-badge mcq">Max ' + (test.MaximumMarks || 0) + ' marks</span></div>' +
        '<div>' + qHtml + '</div>' +
        '<hr style="border-color:var(--border);margin:16px 0">' +
        '<h4 style="margin-bottom:8px"><i class="fas fa-plus"></i> Add Question</h4>' +
        '<textarea id="aq_text" class="mq-text" rows="2" placeholder="Question text"></textarea>' +
        '<div class="mcq-opts">' +
            '<div class="mcq-opt"><span class="opt-key">A</span><input id="aq_a" placeholder="Option A"></div>' +
            '<div class="mcq-opt"><span class="opt-key">B</span><input id="aq_b" placeholder="Option B"></div>' +
            '<div class="mcq-opt"><span class="opt-key">C</span><input id="aq_c" placeholder="Option C"></div>' +
            '<div class="mcq-opt"><span class="opt-key">D</span><input id="aq_d" placeholder="Option D"></div>' +
        '</div>' +
        '<div class="mcq-q-foot"><label>Correct <select id="aq_correct"><option>A</option><option>B</option><option>C</option><option>D</option></select></label><label>Marks <input type="number" id="aq_marks" value="1" style="width:80px"></label>' +
        '<button class="btn btn-primary" onclick="addQuestionToTest(' + testId + ')"><i class="fas fa-plus"></i> Add</button></div>' +
        '<hr style="border-color:var(--border);margin:16px 0">' +
        '<h4 style="margin-bottom:8px"><i class="fas fa-chart-bar"></i> Submissions (' + at.length + ')</h4>' +
        '<table><thead><tr><th>Student</th><th>Class</th><th>Score</th><th>%</th><th>Submitted</th></tr></thead><tbody>' + atHtml + '</tbody></table>' +
        '<div class="modal-actions" style="justify-content:space-between"><button class="btn btn-outline" style="color:var(--danger);border-color:var(--danger)" onclick="resetAttempts(' + testId + ')"><i class="fas fa-redo"></i> Reset Attempts</button><button class="btn btn-primary" onclick="closeModal()">Done</button></div>' +
        '</div>');
}

async function addQuestionToTest(testId) {
    var payload = {
        QuestionText: $('aq_text').value.trim(),
        OptionA: $('aq_a').value.trim(), OptionB: $('aq_b').value.trim(),
        OptionC: $('aq_c').value.trim(), OptionD: $('aq_d').value.trim(),
        CorrectOption: $('aq_correct').value,
        Marks: parseFloat($('aq_marks').value) || 1
    };
    if (!payload.QuestionText) { toast('Question text is required', 'error'); return; }
    var r = await post('/api/tests/' + testId + '/questions', payload);
    if (r.success) { toast('Question added'); manageQuestions(testId); } else toast(r.error || 'Error', 'error');
}

async function deleteQuestion(qid, testId) {
    if (!confirm('Delete this question?')) return;
    var r = await del('/api/tests/question/' + qid);
    if (r.success) { toast('Question deleted'); manageQuestions(testId); } else toast('Error', 'error');
}

async function resetAttempts(testId) {
    if (!confirm('Reset ALL submissions for this test and delete their marks? Students will be able to retake it.')) return;
    var r = await del('/api/tests/' + testId + '/attempts');
    if (r.success) { toast((r.deleted || 0) + ' attempts reset'); manageQuestions(testId); } else toast('Error', 'error');
}

async function deleteTest(id) {
    if (!confirm('Delete this test? Questions, submissions and marks for it will be removed.')) return;
    var r = await del('/api/tests/' + id);
    if (r.success) { toast('Deleted'); loadTests(); } else toast(r.error || 'Delete failed', 'error');
}

// Student: take an online MCQ test
var quizCache = { test: null, questions: [] };
async function startQuiz(testId) {
    var q = await api('/api/tests/' + testId + '/quiz?studentId=' + currentUser.id);
    if (!q || q.error) { toast(q && q.error ? q.error : 'Could not load test', 'error'); return; }
    quizCache = { test: q.test, questions: q.questions || [] };
    if (q.attempt) { showQuizResult(q.attempt, null); return; }
    if (!q.questions || !q.questions.length) { toast('This test has no questions yet', 'error'); return; }

    var qHtml = q.questions.map(function(question, idx) {
        var opts = ['A', 'B', 'C', 'D'].map(function(k) {
            var txt = question['Option' + k];
            if (!txt) return '';
            return '<label class="quiz-option"><input type="radio" name="quiz_' + question.QuestionId + '" value="' + k + '"><span class="opt-key">' + k + '</span><span>' + mqEsc(txt) + '</span></label>';
        }).join('');
        return '<div class="quiz-question" data-qid="' + question.QuestionId + '"><div class="quiz-q-title"><span class="quiz-q-num">' + (idx + 1) + '</span><span>' + mqEsc(question.QuestionText) + '</span><span class="quiz-q-marks">' + question.Marks + '</span></div><div class="quiz-options">' + opts + '</div></div>';
    }).join('');

    openModal('<div class="modal-header"><h2><i class="fas fa-play-circle"></i> ' + mqEsc(q.test.TestName) + '</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<div class="modal-form" style="max-height:72vh;overflow-y:auto">' +
        '<div class="quiz-meta"><span><i class="fas fa-question-circle"></i> ' + q.questions.length + ' questions</span><span><i class="fas fa-star"></i> ' + q.maxMarks + ' marks</span>' + (q.test.Duration ? '<span><i class="fas fa-clock"></i> ' + mqEsc(q.test.Duration) + '</span>' : '') + '</div>' +
        (q.test.Description ? '<div class="pay-note" style="margin-bottom:12px"><i class="fas fa-info-circle"></i> ' + mqEsc(q.test.Description) + '</div>' : '') +
        '<div>' + qHtml + '</div>' +
        '<div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="submitQuiz(' + testId + ')"><i class="fas fa-paper-plane"></i> Submit Test</button></div>' +
        '</div>');
}

async function submitQuiz(testId) {
    var answers = {};
    var unanswered = 0;
    quizCache.questions.forEach(function(q) {
        var sel = document.querySelector('input[name="quiz_' + q.QuestionId + '"]:checked');
        if (sel) answers[q.QuestionId] = sel.value;
        else unanswered++;
    });
    if (unanswered > 0 && !confirm(unanswered + ' question(s) are unanswered. Submit anyway?')) return;

    var r = await post('/api/tests/' + testId + '/submit', { StudentId: currentUser.id, Answers: answers });
    if (r.success) { showQuizResult(null, r); }
    else if (r.alreadySubmitted) { toast('You already submitted this test'); showQuizResult(r.attempt, null); }
    else toast(r.error || 'Could not submit test', 'error');
}

function showQuizResult(attempt, result) {
    var score, total, pct, grade, review = null;
    if (result) {
        score = result.score; total = result.totalMarks; pct = result.percentage; grade = result.grade; review = result.review;
    } else {
        score = attempt.Score; total = attempt.TotalMarks; grade = attempt.Grade;
        pct = total ? Math.round((score / total) * 100) : 0;
        if (!grade) grade = gradeFromPct(pct);
    }
    var color = pct >= 75 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
    var reviewHtml = '';
    if (review && quizCache.questions.length) {
        var qMap = {};
        quizCache.questions.forEach(function(q, i) { qMap[String(q.QuestionId)] = { q: q, n: i + 1 }; });
        reviewHtml = '<h4 style="margin:16px 0 8px">Answer review</h4>' + review.map(function(rv) {
            var item = qMap[String(rv.QuestionId)];
            if (!item) return '';
            return '<div class="review-row ' + (rv.IsCorrect ? 'correct' : 'wrong') + '"><i class="fas ' + (rv.IsCorrect ? 'fa-check-circle' : 'fa-times-circle') + '"></i> <strong>Q' + item.n + ':</strong> ' + mqEsc(item.q.QuestionText) + '<div style="font-size:.8rem;color:var(--text-muted);margin-left:20px">Your answer: ' + (rv.Given || '—') + ' &bull; Correct: ' + rv.CorrectOption + '</div></div>';
        }).join('');
    }
    openModal('<div class="modal-header"><h2><i class="fas fa-poll"></i> Test Result</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
        '<div class="modal-form" style="text-align:center">' +
        '<div class="quiz-score" style="color:' + color + '">' + score + '<span>/' + total + '</span></div>' +
        '<div class="quiz-score-pct" style="color:' + color + '">' + pct + '% &bull; Grade ' + (grade || '-') + '</div>' +
        '<p style="color:var(--text-muted);font-size:.85rem;margin:8px 0 0">' + (result ? 'Your test was submitted successfully.' : 'You have already submitted this test.') + '</p>' +
        reviewHtml +
        '<div class="modal-actions" style="justify-content:center"><button class="btn btn-primary" onclick="closeModal();loadTests();">Done</button></div></div>');
}

// ═══ Results Page - Class-wise Sectioned with Test Names ═══
async function loadResults() {
    var results = await api('/api/results' + (currentUser.role === 'student' ? '?studentId=' + currentUser.id : ''));
    var list = Array.isArray(results) ? results : [];
    var addBtn = currentUser.role !== "student" ? "<button class=\"btn btn-primary\" onclick=\"showResultForm()\"><i class=\"fas fa-plus\"></i> Add Result</button>" : "";

    // Group by class
    var classSections = {};
    var classOrder = ["1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th"];
    list.forEach(function(r) {
        var cls = r.Class || "Unknown";
        if (!classSections[cls]) classSections[cls] = {};
        var testKey = r.TestId + "_" + r.TestName;
        if (!classSections[cls][testKey]) {
            classSections[cls][testKey] = {
                testName: r.TestName,
                subject: r.Subject || "-",
                maxMarks: r.MaximumMarks,
                testDate: r.TestDate,
                batchName: r.BatchName || "-",
                students: []
            };
        }
        classSections[cls][testKey].students.push(r);
    });

    // Overall stats
    var totalResults = list.length;
    var avgPct = totalResults > 0 ? Math.round(list.reduce(function(sum, r) { return sum + (r.MarksObtained / r.MaximumMarks * 100); }, 0) / totalResults) : 0;
    var topGraders = list.filter(function(r) { return r.Grade === "A+" || r.Grade === "A"; }).length;

    // Build sectioned HTML
    var sectionsHTML = "";
    classOrder.forEach(function(cls) {
        if (!classSections[cls]) return;
        var tests = classSections[cls];
        var testKeys = Object.keys(tests);

        sectionsHTML += "<div style=\"margin-bottom:28px\">";
        sectionsHTML += "<div style=\"display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:12px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);border-left:4px solid var(--accent)\">";
        sectionsHTML += "<i class=\"fas fa-graduation-cap\" style=\"color:var(--accent);font-size:1.3rem\"></i>";
        sectionsHTML += "<div><h3 style=\"margin:0;font-size:1.1rem\">Class " + cls + "</h3>";
        sectionsHTML += "<small style=\"color:var(--text-muted)\">" + testKeys.length + " test(s)</small></div></div>";

        testKeys.forEach(function(key) {
            var test = tests[key];
            // Sort students by marks descending (toppers first)
            test.students.sort(function(a, b) { return b.MarksObtained - a.MarksObtained; });

            sectionsHTML += "<div class=\"data-table-container\" style=\"margin-bottom:16px\">";
            // Test header bar
            sectionsHTML += "<div style=\"padding:14px 16px;background:var(--bg-secondary);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px\">";
            sectionsHTML += "<div style=\"display:flex;align-items:center;gap:10px\">";
            sectionsHTML += "<i class=\"fas fa-file-alt\" style=\"color:var(--info);font-size:1rem\"></i>";
            sectionsHTML += "<div><strong style=\"font-size:.95rem\">" + test.testName + "</strong>";
            sectionsHTML += "<span style=\"color:var(--text-muted);font-size:.8rem;margin-left:8px\">" + test.subject + "</span></div></div>";
            sectionsHTML += "<div style=\"display:flex;gap:16px;align-items:center;flex-wrap:wrap\">";
            sectionsHTML += "<span style=\"font-size:.8rem;color:var(--text-muted)\"><i class=\"fas fa-layer-group\"></i> " + test.batchName + "</span>";
            sectionsHTML += "<span style=\"font-size:.8rem;color:var(--text-muted)\"><i class=\"fas fa-calendar\"></i> " + formatDate(test.testDate) + "</span>";
            sectionsHTML += "<span class=\"status-badge status-active\">Max: " + test.maxMarks + "</span>";
            if (currentUser.role === 'admin') {
                sectionsHTML += "<button class=\"action-btn delete\" title=\"Delete all results for this test\" onclick=\"deleteTestResults(" + test.testId + ",'" + test.testName.replace(/'/g,"") + "')\" style=\"margin-left:8px\"><i class=\"fas fa-trash\"></i> Clear All</button>";
            }
            sectionsHTML += "</div></div>";

            // Student results table
            var delHeader = currentUser.role === 'admin' ? "<th style=\"width:50px\">Action</th>" : "";
            sectionsHTML += "<table><thead><tr><th style=\"width:40px\">#</th><th>Student</th><th>Marks</th><th>Percentage</th><th>Grade</th><th>Remarks</th>" + delHeader + "</tr></thead><tbody>";

            test.students.forEach(function(r, idx) {
                var pct = Math.round(r.MarksObtained / r.MaximumMarks * 100);
                var color = pct >= 75 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--danger)";
                var gradeColor = r.Grade === "A+" ? "var(--success)" : r.Grade === "A" ? "#00c9a7" : r.Grade === "B+" ? "#00b4d8" : r.Grade === "B" ? "var(--info)" : r.Grade === "C" ? "var(--warning)" : "var(--danger)";
                var rankIcon = idx === 0 ? " <i class=\"fas fa-trophy\" style=\"color:#9E2A3A;font-size:.7rem\"></i>" : "";

                sectionsHTML += "<tr>";
                sectionsHTML += "<td style=\"font-weight:600;color:var(--text-muted)\">" + (idx + 1) + "</td>";
                sectionsHTML += "<td><strong>" + r.FullName + "</strong>" + rankIcon + "</td>";
                sectionsHTML += "<td><span style=\"font-weight:700\">" + r.MarksObtained + "</span><span style=\"color:var(--text-muted)\">/" + r.MaximumMarks + "</span></td>";
                sectionsHTML += "<td><div style=\"display:flex;align-items:center;gap:8px\"><div style=\"flex:1;max-width:80px;height:6px;background:var(--border);border-radius:3px;overflow:hidden\"><div style=\"width:" + pct + "%;height:100%;background:" + color + ";border-radius:3px\"></div></div><span style=\"color:" + color + ";font-weight:700;font-size:.9rem\">" + pct + "%</span></div></td>";
                sectionsHTML += "<td><span style=\"background:" + gradeColor + "22;color:" + gradeColor + ";padding:3px 10px;border-radius:12px;font-weight:700;font-size:.8rem\">" + (r.Grade || "-") + "</span></td>";
                sectionsHTML += "<td style=\"color:var(--text-muted);font-size:.85rem\">" + (r.Remarks || "-") + "</td>";
                if (currentUser.role === 'admin') {
                    sectionsHTML += "<td><button class=\"action-btn delete\" title=\"Delete this result\" onclick=\"deleteResult(" + r.ResultId + ")\"><i class=\"fas fa-trash\"></i></button></td>";
                }
                sectionsHTML += "</tr>";
            });

            sectionsHTML += "</tbody></table></div>";
        });

        sectionsHTML += "</div>";
    });

    if (!sectionsHTML) {
        sectionsHTML = "<div class=\"empty-state\"><i class=\"fas fa-chart-bar\"></i><h3>No results found</h3><p>Add results after completing tests</p></div>";
    }

    $("contentArea").innerHTML = "<div class=\"section-header\"><div class=\"section-title\"><i class=\"fas fa-chart-bar\"></i> Results - Class wise</div><div class=\"section-actions\">" + addBtn + "</div></div>" +
        "<div class=\"stats-grid\" style=\"margin-bottom:24px\">" +
        "<div class=\"stat-card\"><div class=\"stat-card-header\"><div class=\"stat-card-icon\"><i class=\"fas fa-poll\"></i></div><span class=\"stat-card-label\">Total Results</span></div><div class=\"stat-card-value\">" + totalResults + "</div></div>" +
        "<div class=\"stat-card\"><div class=\"stat-card-header\"><div class=\"stat-card-icon\"><i class=\"fas fa-percentage\"></i></div><span class=\"stat-card-label\">Avg Percentage</span></div><div class=\"stat-card-value\">" + avgPct + "%</div></div>" +
        "<div class=\"stat-card\"><div class=\"stat-card-header\"><div class=\"stat-card-icon\"><i class=\"fas fa-trophy\"></i></div><span class=\"stat-card-label\">A+ / A Grades</span></div><div class=\"stat-card-value\">" + topGraders + "</div></div>" +
        "</div>" + sectionsHTML;
}

function showResultForm() {
    api("/api/tests").then(function(tests) {
        var tl = Array.isArray(tests) ? tests : [];
        var tOpts = tl.map(function(t) { return '<option value="' + t.TestId + '" data-batch="' + t.BatchId + '" data-max="' + t.MaximumMarks + '">' + t.TestName + ' - ' + (t.Subject||'') + ' (' + (t.BatchName||t.Class||'') + ', Max:' + t.MaximumMarks + ')</option>'; }).join("");
        openModal('<div class="modal-header"><h2><i class="fas fa-edit"></i> Upload Marks</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>' +
            '<div class="modal-form" style="max-height:70vh;overflow-y:auto">' +
            '<div class="form-group"><label>Select Test *</label><select id="bulk_test" onchange="loadBulkStudents()">' +
            '<option value="">-- Choose a test --</option>' + tOpts + '</select></div>' +
            '<div id="bulkStudentsList"></div>' +
            '<div id="bulkActions" style="display:none;margin-top:16px"><div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="button" class="btn btn-primary" onclick="saveBulkResults()"><i class="fas fa-save"></i> Save All Marks</button></div></div>' +
            '</div>');
    });
}

async function loadBulkStudents() {
    var sel = document.getElementById("bulk_test");
    if (!sel || !sel.value) { document.getElementById("bulkStudentsList").innerHTML = ""; document.getElementById("bulkActions").style.display = "none"; return; }
    var opt = sel.options[sel.selectedIndex];
    var batchId = opt.getAttribute("data-batch");
    var maxMarks = opt.getAttribute("data-max");

    var students = await api("/api/students/batch/" + batchId);
    var existingResults = await api("/api/results");
    var testId = sel.value;

    // Build lookup of existing results for this test
    var existing = {};
    if (Array.isArray(existingResults)) {
        existingResults.forEach(function(r) {
            if (String(r.TestId) === String(testId)) existing[r.StudentId] = r;
        });
    }

    if (!Array.isArray(students) || !students.length) {
        document.getElementById("bulkStudentsList").innerHTML = '<div class="empty-state" style="padding:16px"><i class="fas fa-users"></i><p>No students found in this batch</p></div>';
        document.getElementById("bulkActions").style.display = "none";
        return;
    }

    var html = '<div style="padding:10px 0;font-size:0.85rem;color:var(--text-muted)">' + students.length + ' students &bull; Max marks: ' + maxMarks + '</div>';
    html += '<table><thead><tr><th style="width:40px">#</th><th>Student Name</th><th>Class</th><th style="width:100px">Marks /' + maxMarks + '</th><th style="width:120px">Remarks</th></tr></thead><tbody>';

    students.forEach(function(s, i) {
        var ex = existing[s.StudentId];
        var val = ex ? ex.MarksObtained : "";
        var rem = ex ? (ex.Remarks || "") : "";
        html += '<tr><td>' + (i+1) + '</td><td><strong>' + s.FullName + '</strong></td><td>' + (s.Class||'-') + '</td>';
        html += '<td><input type="number" min="0" max="' + maxMarks + '" class="bulk-mark-input" data-sid="' + s.StudentId + '" value="' + val + '" style="width:80px;padding:6px 8px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:0.9rem"></td>';
        html += '<td><input type="text" class="bulk-remark-input" data-sid="' + s.StudentId + '" value="' + rem + '" placeholder="optional" style="width:100px;padding:6px 8px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:0.85rem"></td></tr>';
    });

    html += '</tbody></table>';
    document.getElementById("bulkStudentsList").innerHTML = html;
    document.getElementById("bulkActions").style.display = "block";
}

async function saveBulkResults() {
    var testId = document.getElementById("bulk_test").value;
    if (!testId) { toast("Select a test first", "error"); return; }

    var markInputs = document.querySelectorAll(".bulk-mark-input");
    var remarkInputs = document.querySelectorAll(".bulk-remark-input");
    var entries = [];

    markInputs.forEach(function(inp) {
        var sid = inp.getAttribute("data-sid");
        var marks = inp.value;
        var remarkInp = document.querySelector('.bulk-remark-input[data-sid="' + sid + '"]');
        var remarks = remarkInp ? remarkInp.value : "";
        entries.push({ StudentId: sid, MarksObtained: marks, Remarks: remarks });
    });

    var filled = entries.filter(function(e) { return e.MarksObtained !== "" && e.MarksObtained !== null; });
    if (!filled.length) { toast("Enter marks for at least one student", "error"); return; }

    var r = await post("/api/results/bulk", { TestId: testId, results: entries });
    if (r.success) { toast(r.saved + " results saved successfully!"); closeModal(); loadResults(); }
    else toast("Error saving results", "error");
}

async function saveResult(e) {
    e.preventDefault();
    var r = await post("/api/results", { StudentId: $("rs_student").value, TestId: $("rs_test").value, MarksObtained: $("rs_marks").value, Remarks: $("rs_remarks").value });
    if (r.success) { toast("Result added"); closeModal(); loadResults(); } else toast("Error", "error");
}

async function deleteResult(resultId) {
    if (!confirm("Delete this result? You can re-enter it later.")) return;
    var r = await del("/api/results/" + resultId);
    if (r.success) { toast("Result deleted"); loadResults(); } else toast("Error deleting", "error");
}

async function deleteTestResults(testId, testName) {
    if (!confirm("Delete ALL results for '" + testName + "'? This will remove marks for every student in this test.")) return;
    var r = await del("/api/results/test/" + testId);
    if (r.success) { toast(r.deleted + " results deleted for " + testName); loadResults(); } else toast("Error deleting", "error");
}


// ═══ Notices Page ═══
async function loadNotices() {
    const notices = await api('/api/notices');
    const list = Array.isArray(notices)?notices:[];
    $('contentArea').innerHTML = `
        <div class="section-header">
            <div class="section-title"><i class="fas fa-bullhorn"></i> Notices</div>
            <div class="section-actions">${currentUser.role!=='student'?'<button class="btn btn-primary" onclick="showNoticeForm()"><i class="fas fa-plus"></i> Add Notice</button>':''}</div>
        </div>
        <div class="upcoming-list">${list.map(n=>{
            const pColor = n.Priority==='Urgent'?'var(--danger)':n.Priority==='Important'?'var(--warning)':'var(--accent)';
            return`<div class="upcoming-item" style="border-left:3px solid ${pColor}"><div style="flex:1"><h4 style="margin-bottom:4px">${n.Title} <span class="status-badge" style="background:${pColor}22;color:${pColor}">${n.Priority}</span></h4><p style="color:var(--text-secondary);font-size:.85rem;margin-bottom:4px">${n.Description||''}</p><small style="color:var(--text-muted)"><i class="fas fa-calendar"></i> ${formatDate(n.PublishDate)} • <i class="fas fa-users"></i> ${n.Audience}</small></div>
            ${currentUser.role!=='student'?`<button class="action-btn delete" onclick="deleteNotice(${n.NoticeId})"><i class="fas fa-trash"></i></button>`:''}</div>`}).join('')}
        ${!list.length?'<div class="empty-state"><i class="fas fa-bullhorn"></i><h3>No notices</h3></div>':''}</div>`;
}

function showNoticeForm() {
    openModal(`<div class="modal-header"><h2>Add Notice</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
    <form class="modal-form" onsubmit="saveNotice(event)">
        <div class="form-group"><label>Title *</label><input id="nc_title" required></div>
        <div class="form-group"><label>Description *</label><textarea id="nc_desc" rows="4" required></textarea></div>
        <div class="form-row"><div class="form-group"><label>Audience</label><select id="nc_aud"><option>All</option><option>Students</option></select></div><div class="form-group"><label>Priority</label><select id="nc_pri"><option>Normal</option><option>Important</option><option>Urgent</option></select></div></div>
        <div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Publish</button></div>
    </form>`);
}

async function saveNotice(e){e.preventDefault();const r=await post('/api/notices',{Title:$('nc_title').value,Description:$('nc_desc').value,Audience:$('nc_aud').value,Priority:$('nc_pri').value});if(r.success){toast('Notice published');closeModal();loadNotices();}else toast('Error','error');}
async function deleteNotice(id){if(confirm('Delete?')){await del(`/api/notices/${id}`);toast('Deleted');loadNotices();}}

// ═══ Timetable Page ═══
async function loadTimetable() {
    const [tt, batches] = await Promise.all([api('/api/timetable'), api('/api/batches')]);
    const list = Array.isArray(tt)?tt:[];
    const bl = Array.isArray(batches)?batches:[];
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    
    $('contentArea').innerHTML = `
        <div class="section-header">
            <div class="section-title"><i class="fas fa-clock"></i> Timetable</div>
            <div class="section-actions">
                <select id="tt_filter" class="filter-select" onchange="filterTimetable(this.value)"><option value="">All Batches</option>${bl.map(b=>`<option value="${b.BatchId}">${b.BatchName}</option>`).join('')}</select>
                ${currentUser.role==='admin'?'<button class="btn btn-primary" onclick="showTimetableForm()"><i class="fas fa-plus"></i> Add</button>':''}
            </div>
        </div>
        <div class="data-table-container"><table id="timetableTable"><thead><tr><th>Day</th><th>Batch</th><th>Subject</th><th>Time</th><th>Room</th></tr></thead>
        <tbody>${list.map(t=>`<tr data-batch="${t.BatchId}"><td><strong>${t.Day}</strong></td><td>${t.BatchName||'-'}</td><td>${t.Subject||'-'}</td><td>${t.StartTime?.substring(0,5)} - ${t.EndTime?.substring(0,5)}</td><td>${t.Room||'-'}</td></tr>`).join('')}</tbody></table></div>`;
}

function filterTimetable(batchId) {
    document.querySelectorAll('#timetableTable tbody tr').forEach(r => { r.style.display = !batchId || r.dataset.batch == batchId ? '' : 'none'; });
}

function showTimetableForm() {
    api('/api/batches').then(function(batches){
        const bl=Array.isArray(batches)?batches:[];
        openModal(`<div class="modal-header"><h2>Add Timetable Entry</h2><button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button></div>
        <form class="modal-form" onsubmit="saveTimetable(event)">
            <div class="form-row"><div class="form-group"><label>Batch *</label><select id="tte_batch">${bl.map(b=>`<option value="${b.BatchId}">${b.BatchName}</option>`).join('')}</select></div>
            <div class="form-group"><label>Day *</label><select id="tte_day">${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d=>`<option>${d}</option>`).join('')}</select></div></div>
            <div class="form-row"><div class="form-group"><label>Subject</label><input id="tte_subj"></div><div class="form-group"><label>Room</label><input id="tte_room"></div></div>
            <div class="form-row"><div class="form-group"><label>Start Time *</label><input type="time" id="tte_start" required></div><div class="form-group"><label>End Time *</label><input type="time" id="tte_end" required></div></div>
            <div class="modal-actions"><button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary">Add</button></div>
        </form>`);
    });
}

async function saveTimetable(e){e.preventDefault();const r=await post('/api/timetable',{BatchId:$('tte_batch').value,Day:$('tte_day').value,Subject:$('tte_subj').value,StartTime:$('tte_start').value,EndTime:$('tte_end').value,Room:$('tte_room').value});if(r.success){toast('Entry added');closeModal();loadTimetable();}else toast('Error','error');}

// ═══ Reports Page ═══
async function loadReports() {
    $('contentArea').innerHTML = `
        <div class="section-header"><div class="section-title"><i class="fas fa-file-alt"></i> Reports</div></div>
        <div class="quick-actions">
            <div class="quick-action" onclick="generateReport('attendance')"><i class="fas fa-calendar-check"></i><span>Attendance Report</span></div>
            <div class="quick-action" onclick="generateReport('fees')"><i class="fas fa-rupee-sign"></i><span>Fee Collection</span></div>
            <div class="quick-action" onclick="generateReport('pending')"><i class="fas fa-exclamation-triangle"></i><span>Pending Fees</span></div>
            <div class="quick-action" onclick="generateReport('toppers')"><i class="fas fa-trophy"></i><span>Topper Report</span></div>
            <div class="quick-action" onclick="generateReport('students')"><i class="fas fa-user-graduate"></i><span>Student Report</span></div>
            <div class="quick-action" onclick="generateReport('batch')"><i class="fas fa-layer-group"></i><span>Batch Performance</span></div>
        </div>
        <div id="reportOutput"></div>`;
}

async function generateReport(type) {
    let html = '';
    if (type==='attendance') {
        const data = await api('/api/attendance?date='+localDateStr());
        const list = Array.isArray(data)?data:[];
        const p=list.filter(a=>a.Status==='Present').length, ab=list.filter(a=>a.Status==='Absent').length;
        html = `<h3>Today's Attendance</h3><div class="perf-grid"><div class="perf-card"><div class="perf-value" style="color:var(--success)">${p}</div><div class="perf-label">Present</div></div><div class="perf-card"><div class="perf-value" style="color:var(--danger)">${ab}</div><div class="perf-label">Absent</div></div><div class="perf-card"><div class="perf-value">${list.length?Math.round(p/list.length*100):0}%</div><div class="perf-label">Rate</div></div></div>`;
    } else if (type==='fees') {
        const data = await api('/api/fees');
        const list = Array.isArray(data)?data:[];
        const total = list.reduce((s,f)=>s+parseFloat(f.PaidAmount||0),0);
        html = `<h3>Fee Collection Summary</h3><div class="perf-grid"><div class="perf-card"><div class="perf-value">${formatCurrency(total)}</div><div class="perf-label">Total Collected</div></div><div class="perf-card"><div class="perf-value">${list.filter(f=>f.Status==='Paid').length}</div><div class="perf-label">Paid</div></div><div class="perf-card"><div class="perf-value">${list.filter(f=>f.Status==='Pending').length}</div><div class="perf-label">Pending</div></div></div>`;
    } else if (type==='toppers') {
        const data = await api('/api/results');
        const list = (Array.isArray(data)?data:[]).sort((a,b)=>(b.Percentage||0)-(a.Percentage||0)).slice(0,10);
        html = `<h3>🏆 Top Performers</h3><table><thead><tr><th>#</th><th>Student</th><th>Test</th><th>Marks</th><th>%</th><th>Grade</th></tr></thead><tbody>${list.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${r.FullName}</strong></td><td>${r.TestName}</td><td>${r.MarksObtained}/${r.MaximumMarks}</td><td style="font-weight:700;color:var(--success)">${r.Percentage||0}%</td><td>${r.Grade}</td></tr>`).join('')}</tbody></table>`;
    } else if (type==='pending') {
        const data = await api('/api/fees/pending');
        const list = Array.isArray(data)?data:[];
        html = `<h3>Pending Fees Report</h3><table><thead><tr><th>Student</th><th>Class</th><th>Month</th><th>Pending Amount</th></tr></thead><tbody>${list.map(f=>`<tr><td>${f.FullName}</td><td>${f.Class}</td><td>${f.Month} ${f.Year}</td><td style="color:var(--danger);font-weight:700">${formatCurrency(f.TotalFee-f.PaidAmount)}</td></tr>`).join('')}</tbody></table>`;
    } else if (type==='students') {
        const data = await api('/api/students');
        const list = Array.isArray(data)?data:[];
        html = `<h3>Student Report (${list.length} students)</h3><table><thead><tr><th>Name</th><th>Class</th><th>Batch</th><th>Phone</th><th>Status</th></tr></thead><tbody>${list.map(s=>`<tr><td>${s.FullName}</td><td>${s.Class}</td><td>${s.BatchName||'-'}</td><td>${s.ParentPhone||'-'}</td><td><span class="status-badge status-${(s.Status||'').toLowerCase()}">${s.Status}</span></td></tr>`).join('')}</tbody></table>`;
    } else {
        const data = await api('/api/batches');
        const list = Array.isArray(data)?data:[];
        html = `<h3>Batch Performance</h3><table><thead><tr><th>Batch</th><th>Class</th><th>Students</th><th>Fee/Month</th></tr></thead><tbody>${list.map(b=>`<tr><td>${b.BatchName}</td><td>${b.Class}</td><td>${b.StudentCount||0}</td><td>${formatCurrency(b.MonthlyFee)}</td></tr>`).join('')}</tbody></table>`;
    }
    $('reportOutput').innerHTML = `<div class="data-table-container" style="padding:20px">${html}<div style="margin-top:16px"><button class="btn btn-outline" onclick="window.print()"><i class="fas fa-print"></i> Print</button></div></div>`;
}

// ═══ Settings Page ═══
function settingsEsc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function loadSettings() {
    const settings = await api('/api/settings');
    $('contentArea').innerHTML = `
        <div class="section-header"><div class="section-title"><i class="fas fa-cog"></i> Settings</div></div>
        <div class="data-table-container" style="padding:24px;margin-bottom:20px">
            <h3 style="margin-bottom:16px"><i class="fas fa-school" style="color:var(--accent)"></i> Institute Details</h3>
            <form onsubmit="saveInstituteSettings(event)">
                <div class="modal-form">
                    <div class="form-group"><label>Institute Name</label><input id="set_name" value="${settingsEsc(settings.instituteName)}"></div>
                    <div class="form-row"><div class="form-group"><label>Phone</label><input id="set_phone" value="${settingsEsc(settings.phone)}"></div><div class="form-group"><label>Email</label><input id="set_email" value="${settingsEsc(settings.email)}"></div></div>
                    <div class="form-group"><label>Address</label><input id="set_address" value="${settingsEsc(settings.address)}"></div>
                    <div class="form-group"><label>Classes Offered</label><input value="${(settings.classes || []).join(', ')}" readonly></div>
                </div>
                <div class="modal-actions" style="justify-content:flex-start"><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Details</button></div>
            </form>
        </div>
        <div class="data-table-container" style="padding:24px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px">
                <h3 style="margin:0"><i class="fas fa-qrcode" style="color:var(--accent)"></i> Fee Payment QR</h3>
                <button class="btn btn-primary" onclick="showPaymentSettings()"><i class="fas fa-pen"></i> Edit Payment QR / UPI</button>
            </div>
            <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">
                <div style="text-align:center">
                    ${settings.qrImage
                        ? '<img src="' + settings.qrImage + '" class="qr-image">'
                        : '<div class="qr-placeholder"><i class="fas fa-qrcode"></i><p>No QR uploaded</p><small>Upload your GPay / PhonePe QR</small></div>'}
                </div>
                <div style="flex:1;min-width:220px">
                    <div class="settings-row"><span>UPI ID</span><strong>${settings.upiId ? settingsEsc(settings.upiId) : '<span style="color:var(--text-muted);font-weight:400">Not set</span>'}</strong></div>
                    <div class="settings-row"><span>Display Name</span><strong>${settingsEsc(settings.upiName || '-')}</strong></div>
                    <p style="color:var(--text-muted);font-size:.8rem;margin-top:12px">Students see this QR on their Pay Fees page. Upload a screenshot of the QR from GPay/PhonePe, and optionally add your UPI ID so the pay buttons work.</p>
                </div>
            </div>
        </div>
        <div class="data-table-container" style="padding:24px;margin-top:20px">
            <h3 style="margin-bottom:16px"><i class="fas fa-lock" style="color:var(--accent)"></i> Change Admin Password</h3>
            <form onsubmit="saveAdminPassword(event)">
                <div class="modal-form">
                    <div class="form-group">
                        <label>New Admin Password</label>
                        <input type="password" id="set_admin_pass" placeholder="Enter new password" required>
                    </div>
                </div>
                <div class="modal-actions" style="justify-content:flex-start">
                    <button type="submit" class="btn btn-primary"><i class="fas fa-key"></i> Update Password</button>
                </div>
            </form>
        </div>`;
}

async function saveAdminPassword(e) {
    e.preventDefault();
    const pass = $('set_admin_pass').value;
    if (!pass || !pass.trim()) return toast('Password cannot be empty', 'error');
    const r = await post('/api/change-password', { newPassword: pass.trim() });
    if (r.success) {
        toast('Admin password updated successfully');
        $('set_admin_pass').value = '';
    } else {
        toast(r.message || r.error || 'Failed to update password', 'error');
    }
}

async function saveInstituteSettings(e) {
    e.preventDefault();
    const r = await post('/api/settings', {
        instituteName: $('set_name').value,
        phone: $('set_phone').value,
        email: $('set_email').value,
        address: $('set_address').value
    });
    if (r.success) toast('Settings saved'); else toast(r.error || 'Error saving', 'error');
}

// ═══ Data Export ═══
function exportData(type) { toast('Export feature - use Print button in Reports section', 'info'); }
