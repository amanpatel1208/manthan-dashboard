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
