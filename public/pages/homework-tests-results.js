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
