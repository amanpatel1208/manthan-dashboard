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
