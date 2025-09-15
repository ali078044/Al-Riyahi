// ==========================================================
//                     الإعدادات الرئيسية
// ==========================================================
// !!! تنبيه هام: بعد نشر الكود الجديد في Apps Script،
// !!! انسخ رابط النشر الجديد والصقه هنا
const API_URL = 'https://script.google.com/macros/s/AKfycbxHIg8GYC74NX_jWvVZVUPWa_XoUA77tMIQi1HhUrGCgdT2nQ8Y_oqu9zokA-HNuFFL/exec'; 

// ==========================================================
//                   دالة مساعدة للتواصل مع API
// ==========================================================
async function callApi(action, payload = {}) {
    const userInfo = JSON.parse(localStorage.getItem('userData'));
    try {
        document.body.style.cursor = 'wait';
        const res = await fetch(API_URL, {
            method: 'POST',
            cache: 'no-cache',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, payload, userInfo })
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const result = await res.json();
        if (!result.success) {
          console.error("API Error Response:", result.message, result.stack);
          if (action !== 'getWeeklySchedule') {
            alert(`خطأ من الخادم: ${result.message || 'حدث خطأ غير متوقع.'}`);
          }
        }
        return result;
    } catch (error) {
        console.error('API Call Error:', action, error);
        alert(`فشل الاتصال بالخادم: ${error.message}`);
        return { success: false, message: `فشل الاتصال بالخادم.` };
    } finally {
        document.body.style.cursor = 'default';
    }
}

// ==========================================================
//                   الموجه الرئيسي والتوابع العامة
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('StudentInterface.html')) { handleStudentPage(); }
    else if (path.includes('TeacherInterface.html')) { handleTeacherPage(); }
    else if (path.includes('AdminInterface.html')) { handleAdminPage(); }
    else { handleLoginPage(); }
});

function handleLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        document.getElementById('message').textContent = 'جاري التحقق...';
        
        const result = await callApi('login', { email, password });
        
        if (result.success) {
            localStorage.setItem('userData', JSON.stringify(result.user));
            switch(result.user.role) {
                case 'إداري': window.location.href = 'AdminInterface.html'; break;
                case 'مدرس': window.location.href = 'TeacherInterface.html'; break;
                case 'طالب': window.location.href = 'StudentInterface.html'; break;
                default: document.getElementById('message').textContent = 'دور المستخدم غير معروف.';
            }
        } else {
            document.getElementById('message').textContent = result.message || 'خطأ في تسجيل الدخول';
        }
    });
}

function setupCommonElements() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) {
        window.location.href = 'index.html';
        return null;
    }
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        if (document.body.classList.contains('student-page')) {
            userNameEl.textContent = `الطالب ${userData.name}`;
        } else if (document.body.classList.contains('teacher-page')) {
            userNameEl.textContent = `الأستاذ ${userData.name}`;
        } else {
            userNameEl.textContent = `${userData.name}`;
        }
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
    });
    return userData;
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.getElementById(tabId).style.display = 'block';
    const activeButton = document.querySelector(`[onclick="showTab('${tabId}')"]`);
    if(activeButton) activeButton.classList.add('active');
}

function populateSelect(selectId, options, defaultOptionText = '-- اختر --') {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = `<option value="">${defaultOptionText}</option>` + options.map(o => `<option value="${o}">${o}</option>`).join('');
}


// ... (All Student and Teacher functions remain the same)
// ==========================================================
//                  منطق صفحة الطالب
// ==========================================================
function handleStudentPage() {
    const userData = setupCommonElements();
    if (!userData) return;
    showTab('announcementsTab');
    
    callApi('getStudentDashboard').then(result => {
        if (result.success) {
            renderAnnouncements(result.data.announcements, 'announcementsContainer');
            renderGrades(result.data.grades);
            renderAbsences(result.data.absences);
            renderHomework(result.data.homework);
            renderEvaluations(result.data.evaluations);
            renderLibrary(result.data.library);
            renderWeeklySchedule(result.data.weeklySchedule);
            renderExamSchedules(result.data.examSchedules);
        } else {
             document.body.innerHTML = `<p style="color:red; text-align:center; padding: 50px;">فشل تحميل بيانات الطالب. الرجاء محاولة تسجيل الدخول مرة أخرى.</p>`;
        }
    });
}

function renderAnnouncements(announcements, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!announcements || announcements.length === 0) {
        container.innerHTML = '<div class="card"><p>لا توجد إعلانات حالياً.</p></div>';
        return;
    }
    container.innerHTML = announcements.map(ann => `
        <div class="card announcement-card">
            <h4>${ann.title}</h4>
            <p>${ann.content.replace(/\n/g, '<br>')}</p>
            <small>تاريخ النشر: ${ann.date}</small>
        </div>
    `).join('');
}

function renderGrades(grades) {
    const container = document.getElementById('gradesContainer');
    if (!container) return;
    if (!grades || grades.length === 0) {
        container.innerHTML = '<p>لا توجد درجات منشورة لك حالياً.</p>';
        return;
    }
    container.innerHTML = `
        <div class="table-responsive">
        <table class="data-table">
            <thead>
                <tr><th rowspan="2">المادة</th><th colspan="3">الفصل الأول</th><th rowspan="2">نصف السنة</th><th colspan="3">الفصل الثاني</th><th rowspan="2">السعي السنوي</th><th rowspan="2">الامتحان النهائي</th><th rowspan="2">الدرجة النهائية</th></tr>
                <tr><th>شهر 1</th><th>شهر 2</th><th>المعدل</th><th>شهر 1</th><th>شهر 2</th><th>المعدل</th></tr>
            </thead>
            <tbody>
                ${grades.map(g => `
                    <tr>
                        <td>${g.subject || ''}</td><td>${g.term1_month1 || ''}</td><td>${g.term1_month2 || ''}</td><td><strong>${g.term1_avg || ''}</strong></td>
                        <td>${g.mid_year || ''}</td><td>${g.term2_month1 || ''}</td><td>${g.term2_month2 || ''}</td><td><strong>${g.term2_avg || ''}</strong></td>
                        <td>${g.yearly_effort || ''}</td><td>${g.final_exam || ''}</td><td><strong>${g.final_result || ''}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        </div>
    `;
}

function renderAbsences(absences) {
    const container = document.getElementById('absencesContainer');
    if (!container) return;
    if (!absences || absences.length === 0) {
        container.innerHTML = '<p>لا توجد غيابات مسجلة لك.</p>';
        return;
    }
    container.innerHTML = `
        <ul class="absences-list">
            ${absences.map(a => `<li><span>${a.date}</span>: ${a.notes || 'غياب بدون ملاحظات'}</li>`).join('')}
        </ul>
    `;
}

function renderHomework(homework) {
    const container = document.getElementById('homeworkContainer');
    if (!container) return;
    if (!homework || homework.length === 0) {
        container.innerHTML = '<p>لا توجد واجبات حالياً.</p>';
        return;
    }
    container.innerHTML = homework.map(hw => `
        <div class="card">
            <h4>${hw.subject} <small>(${hw.date})</small></h4>
            <p>${hw.content.replace(/\n/g, '<br>')}</p>
        </div>
    `).join('');
}

function renderEvaluations(evaluations) {
    const container = document.getElementById('evaluationsContainer');
    if (!container) return;
    if (!evaluations || evaluations.length === 0) {
        container.innerHTML = '<p>لا توجد تقييمات مسجلة لك.</p>';
        return;
    }
    container.innerHTML = `
        <div class="table-responsive">
        <table class="data-table">
            <thead><tr><th>التاريخ</th><th>المادة</th><th>تحضير</th><th>مشاركة</th><th>سلوك</th><th>واجبات</th><th>ملاحظات</th></tr></thead>
            <tbody>
                ${evaluations.map(ev => `
                    <tr><td>${ev.date}</td><td>${ev.subject}</td><td>${ev.daily_prep || '-'}</td><td>${ev.participation || '-'}</td><td>${ev.behavior || '-'}</td><td>${ev.homework || '-'}</td><td>${ev.note || '-'}</td></tr>
                `).join('')}
            </tbody>
        </table>
        </div>
    `;
}

function renderLibrary(links) {
    const container = document.getElementById('libraryContainer');
    if (!container) return;
    if (!links || links.length === 0) {
        container.innerHTML = '<p>لا توجد مواد في المكتبة حالياً.</p>';
        return;
    }
    container.innerHTML = links.map(link => `
        <div class="card">
            <h4>${link.title} <small>(${link.subject})</small></h4>
            <p>${link.description || ''}</p>
            <a href="${link.url}" target="_blank" class="button">فتح الرابط <i class="fas fa-external-link-alt"></i></a>
        </div>
    `).join('');
}

function renderWeeklySchedule(scheduleData) {
    const container = document.getElementById('weeklyScheduleContainer');
    if (!container) return;
    if (!scheduleData) {
        container.innerHTML = '<p>لم يتم نشر الجدول الأسبوعي الخاص بصفك بعد.</p>';
        return;
    }
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    let tableHtml = '<div class="table-responsive"><table class="data-table weekly-schedule-table"><thead><tr><th>اليوم</th>';
    for(let i = 1; i <= 6; i++) {
        tableHtml += `<th>الدرس ${i}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';
    
    days.forEach(day => {
        tableHtml += `<tr><td><strong>${day}</strong></td>`;
        for(let i = 1; i <= 6; i++) {
            tableHtml += `<td>${scheduleData[day]?.[`lesson${i}`] || ''}</td>`;
        }
        tableHtml += '</tr>';
    });
    
    tableHtml += '</tbody></table></div>';
    container.innerHTML = tableHtml;
}

function renderExamSchedules(schedules) {
    const container = document.getElementById('examSchedulesContainer');
    if (!container) return;
    if (!schedules || schedules.length === 0) {
        container.innerHTML = '<p>لا توجد جداول امتحانات منشورة حالياً.</p>';
        return;
    }
    
    container.innerHTML = schedules.map(schedule => `
        <div class="card exam-schedule-card">
            <h3>${schedule.title}</h3>
            <ul>
                ${schedule.scheduleData.map(day => `
                    <li>
                        <span><strong>${day.date} (${day.day})</strong></span>
                        <span>${day.subject}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');
}

// ==========================================================
//                  منطق صفحة المدرس
// ==========================================================
function handleTeacherPage() {
    const userData = setupCommonElements();
    if (!userData) return;

    callApi('getTeacherDashboard').then(result => {
        if(result.success) {
            const { classes, sections, subjects, announcements, canRecordAbsence, weeklySchedules } = result.data;
            populateSelect('teacherClasses', classes);
            populateSelect('teacherSections', sections);
            populateSelect('teacherSubjects', subjects);
            populateSelect('hwClasses', classes);
            populateSelect('hwSections', sections);
            populateSelect('hwSubjects', subjects);
            populateSelect('evalClasses', classes);
            populateSelect('evalSections', sections);
            populateSelect('evalSubjects', subjects);
            populateSelect('libClasses', classes);
            populateSelect('libSubjects', subjects);

            renderAnnouncements(announcements, 'announcementsContainer');
            renderTeacherWeeklySchedules(weeklySchedules, subjects);
            
            const absenceTabButton = document.querySelector('[onclick="showTab(\'absencesTab\')"]');
            if (canRecordAbsence) {
                absenceTabButton.style.display = '';
                populateSelect('absenceClasses', classes);
                populateSelect('absenceSections', sections);
            } else {
                absenceTabButton.style.display = 'none';
            }
            showTab('gradesTab');
        } else {
             document.body.innerHTML = `<p style="color:red; text-align:center; padding: 50px;">فشل تحميل بيانات المدرس.</p>`;
        }
    });
    
    document.getElementById('loadStudentsBtn').addEventListener('click', loadStudentsForGrading);
    document.getElementById('gradesForm').addEventListener('submit', submitGradesForReview);
    document.getElementById('loadStudentsForAbsenceBtn').addEventListener('click', loadStudentsForAttendance);
    document.getElementById('absenceForm').addEventListener('submit', recordAbsencesHandler);
    document.getElementById('homeworkForm').addEventListener('submit', submitHomeworkHandler);
    document.getElementById('loadStudentsForEvalBtn').addEventListener('click', loadStudentsForEvaluation);
    document.getElementById('evaluationsForm').addEventListener('submit', submitEvaluationsHandler);
    document.getElementById('libraryForm').addEventListener('submit', addLibraryLinkHandler);
    
    document.getElementById('absenceDate').valueAsDate = new Date();
    document.getElementById('evalDate').valueAsDate = new Date();
}

function renderTeacherWeeklySchedules(schedules, teacherSubjects) {
    const container = document.getElementById('teacherScheduleContainer');
    if (!container) return;
    if (!schedules || schedules.length === 0) {
        container.innerHTML = '<p>لم يتم نشر أي جداول للصفوف والشعب المسندة إليك بعد.</p>';
        return;
    }

    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    let finalHtml = '';

    schedules.forEach(schedule => {
        finalHtml += `<div class="form-section"><h3>الصف: ${schedule.targetClass} - الشعبة: ${schedule.targetSection}</h3>`;
        let tableHtml = '<div class="table-responsive"><table class="data-table weekly-schedule-table"><thead><tr><th>اليوم</th>';
        for (let i = 1; i <= 6; i++) {
            tableHtml += `<th>الدرس ${i}</th>`;
        }
        tableHtml += '</tr></thead><tbody>';

        days.forEach(day => {
            tableHtml += `<tr><td><strong>${day}</strong></td>`;
            for (let i = 1; i <= 6; i++) {
                const subject = schedule.scheduleData[day]?.[`lesson${i}`] || '';
                const isMySubject = teacherSubjects.includes(subject);
                tableHtml += `<td class="${isMySubject ? 'my-subject' : ''}">${subject}</td>`;
            }
            tableHtml += '</tr>';
        });

        tableHtml += '</tbody></table></div></div>';
        finalHtml += tableHtml;
    });
    
    container.innerHTML = finalHtml;
}


async function loadStudentsForGrading() {
    const payload = {
        studentClass: document.getElementById('teacherClasses').value,
        studentSection: document.getElementById('teacherSections').value,
    };
    if (!payload.studentClass || !payload.studentSection) {
        return alert('الرجاء اختيار الصف والشعبة.');
    }
    
    const result = await callApi('getStudentsForGrading', payload);
    const container = document.getElementById('studentsGradeContainer');
    const subject = document.getElementById('teacherSubjects').value;

    if (!subject) {
        container.innerHTML = '<p>الرجاء اختيار المادة لعرض درجات الطلاب.</p>';
        return;
    }

    if (result.success && result.students.length > 0) {
        container.innerHTML = `
            <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>اسم الطالب</th><th>شهر 1 (ف1)</th><th>شهر 2 (ف1)</th><th>نصف السنة</th><th>شهر 1 (ف2)</th><th>شهر 2 (ف2)</th><th>النهائي</th><th>الحالة</th></tr></thead>
                <tbody>
                    ${result.students.map(s => {
                        const studentGrades = result.grades[s.studentId]?.[subject] || {};
                        return `
                        <tr data-student-id="${s.studentId}">
                            <td>${s.name}</td>
                            <td><input type="number" class="grade-input" data-grade-type="Term1_Month1" value="${studentGrades.Term1_Month1 || ''}"></td>
                            <td><input type="number" class="grade-input" data-grade-type="Term1_Month2" value="${studentGrades.Term1_Month2 || ''}"></td>
                            <td><input type="number" class="grade-input" data-grade-type="MidYear_Exam" value="${studentGrades.MidYear_Exam || ''}"></td>
                            <td><input type="number" class="grade-input" data-grade-type="Term2_Month1" value="${studentGrades.Term2_Month1 || ''}"></td>
                            <td><input type="number" class="grade-input" data-grade-type="Term2_Month2" value="${studentGrades.Term2_Month2 || ''}"></td>
                            <td><input type="number" class="grade-input" data-grade-type="Final_Exam" value="${studentGrades.Final_Exam || ''}"></td>
                            <td><span class="status">${studentGrades.Status || 'جديد'}</span></td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
            </div>`;
        document.getElementById('submitGradesBtn').style.display = 'block';
    } else {
        container.innerHTML = `<p>${result.message || 'لا يوجد طلاب في هذه الشعبة.'}</p>`;
    }
}


async function submitGradesForReview(e) {
    e.preventDefault();
    const grades = [];
    document.querySelectorAll('#studentsGradeContainer tbody tr').forEach(row => {
        const studentGrade = { studentId: row.dataset.studentId, grades: {} };
        let hasChanged = false;
        row.querySelectorAll('.grade-input').forEach(input => {
            if (input.value !== '') { 
                studentGrade.grades[input.dataset.gradeType] = input.value;
                hasChanged = true;
            }
        });
        if(hasChanged) grades.push(studentGrade);
    });

    if (grades.length === 0) return alert('لم يتم إدخال أي درجات جديدة.');

    const payload = {
        subject: document.getElementById('teacherSubjects').value,
        grades: grades
    };

    const result = await callApi('submitGrades', payload);
    if (result.success) {
        alert(result.message);
        loadStudentsForGrading();
    }
}

async function loadStudentsForAttendance() {
    const payload = {
        studentClass: document.getElementById('absenceClasses').value,
        studentSection: document.getElementById('absenceSections').value
    };
    if (!payload.studentClass || !payload.studentSection) return alert('الرجاء اختيار الصف والشعبة.');

    const result = await callApi('getStudentsForAttendance', payload);
    const container = document.getElementById('studentsForAbsenceContainer');
    if (result.success && result.students.length > 0) {
        container.innerHTML = `<ul class="students-list">${result.students.map(s => `<li><label><input type="checkbox" name="absentStudent" value="${s.studentId}"> ${s.name}</label></li>`).join('')}</ul>`;
        document.getElementById('submitAbsencesBtn').style.display = 'block';
    } else {
        container.innerHTML = '<p>لا يوجد طلاب في هذه الشعبة.</p>';
    }
}

async function recordAbsencesHandler(e) {
    e.preventDefault();
    const studentIds = Array.from(document.querySelectorAll('input[name="absentStudent"]:checked')).map(cb => cb.value);
    if (studentIds.length === 0) return alert('الرجاء تحديد طالب واحد على الأقل.');

    const payload = {
        date: document.getElementById('absenceDate').value,
        studentIds: studentIds,
        notes: document.getElementById('absenceNotes').value
    };
    
    const result = await callApi('recordAbsences', payload);
    if (result.success) {
        alert(result.message);
        e.target.reset();
        document.getElementById('absenceDate').valueAsDate = new Date();
        document.getElementById('studentsForAbsenceContainer').innerHTML = '<p>الرجاء اختيار الصف والشعبة والتاريخ لعرض الطلاب.</p>';
        document.getElementById('submitAbsencesBtn').style.display = 'none';
    }
}

async function submitHomeworkHandler(e) {
    e.preventDefault();
    const payload = {
        content: document.getElementById('hwContent').value,
        targetClass: document.getElementById('hwClasses').value,
        targetSection: document.getElementById('hwSections').value,
        targetSubject: document.getElementById('hwSubjects').value
    };
    if(!payload.targetClass || !payload.targetSection || !payload.targetSubject || !payload.content) return alert('الرجاء ملء جميع الحقول.');
    
    const result = await callApi('submitHomework', payload);
    if(result.success) {
        alert(result.message);
        e.target.reset();
    }
}

async function loadStudentsForEvaluation() {
    const payload = {
        studentClass: document.getElementById('evalClasses').value,
        studentSection: document.getElementById('evalSections').value
    };
    if(!payload.studentClass || !payload.studentSection) return alert('الرجاء اختيار الصف والشعبة.');
    
    const result = await callApi('getStudentsForAttendance', payload);
    const container = document.getElementById('studentsForEvalContainer');
    
    if (result.success && result.students.length > 0) {
        const evalTypes = {
            'DailyPrep': 'تحضير يومي',
            'Participation': 'مشاركة',
            'Behavior': 'سلوك',
            'Homework': 'واجب بيتي'
        };
        const optionsHtml = `
            <option value="">--</option>
            <option value="جيد">جيد</option>
            <option value="متوسط">متوسط</option>
            <option value="ضعيف">ضعيف</option>
        `;

        let tableHtml = `
            <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>اسم الطالب</th>
                        ${Object.values(evalTypes).map(name => `<th>${name}</th>`).join('')}
                        <th>ملاحظات</th>
                    </tr>
                </thead>
                <tbody>
        `;
        result.students.forEach(s => {
            tableHtml += `
                <tr data-student-id="${s.studentId}">
                    <td>${s.name}</td>
                    ${Object.keys(evalTypes).map(key => `
                        <td>
                            <select class="eval-select" data-type="${key}">${optionsHtml}</select>
                        </td>
                    `).join('')}
                    <td><input type="text" class="eval-note" placeholder="ملاحظة"></td>
                </tr>
            `;
        });
        tableHtml += '</tbody></table></div>';
        container.innerHTML = tableHtml;
        document.getElementById('submitEvaluationsBtn').style.display = 'block';
    } else {
        container.innerHTML = '<p>لا يوجد طلاب في هذه الشعبة.</p>';
    }
}

async function submitEvaluationsHandler(e) {
    e.preventDefault();
    const evaluationsPayload = [];
    const date = document.getElementById('evalDate').value;
    const subject = document.getElementById('evalSubjects').value;
    
    if (!subject) return alert('الرجاء اختيار المادة.');

    document.querySelectorAll('#studentsForEvalContainer tbody tr').forEach(row => {
        const studentEvals = {
            studentId: row.dataset.studentId,
            evaluations: {},
            note: row.querySelector('.eval-note').value
        };
        let hasEval = false;
        row.querySelectorAll('.eval-select').forEach(select => {
            if (select.value) {
                studentEvals.evaluations[select.dataset.type] = select.value;
                hasEval = true;
            }
        });
        if (hasEval) {
            evaluationsPayload.push(studentEvals);
        }
    });

    if (evaluationsPayload.length === 0) return alert('الرجاء تقييم طالب واحد على الأقل.');

    const result = await callApi('submitDailyEvaluation', { evaluations: evaluationsPayload, date: date, subject: subject });
    if (result.success) {
        alert(result.message);
        document.getElementById('studentsForEvalContainer').innerHTML = '<p>الرجاء اختيار الصف والشعبة والمادة والتاريخ لعرض الطلاب.</p>';
        document.getElementById('submitEvaluationsBtn').style.display = 'none';
    }
}

async function addLibraryLinkHandler(e) {
    e.preventDefault();
    const payload = {
        title: document.getElementById('libTitle').value,
        url: document.getElementById('libUrl').value,
        description: document.getElementById('libDescription').value,
        targetClass: document.getElementById('libClasses').value,
        targetSubject: document.getElementById('libSubjects').value
    };
    if (!payload.title || !payload.url || !payload.targetClass || !payload.targetSubject) return alert('الرجاء ملء الحقول المطلوبة.');
    
    const result = await callApi('addLibraryLink', payload);
    if (result.success) {
        alert(result.message);
        e.target.reset();
    }
}


// ==========================================================
//                  منطق صفحة المشرف
// ==========================================================
function handleAdminPage() {
    const userData = setupCommonElements();
    if (!userData) return;
    
    showTab('gradesApprovalTab');
    loadPendingGrades();
    loadPendingAbsences();
    loadPendingEvaluations();
    loadAllUsers();
    loadSystemSettings();

    callApi('getUniqueClassesAndSubjects').then(result => {
        if (result.success) {
            window.allSubjects = result.subjects; 
            populateSelect('examScheduleClass', result.classes, '-- اختر الصف --');
            populateSelect('weeklyScheduleClass', result.classes, '-- اختر الصف --');
            populateSelect('weeklyScheduleSection', result.sections, '-- اختر الشعبة --');
            buildWeeklyScheduleGrid(result.subjects);
            addExamDayField(); // Call it here to ensure subjects are loaded
        }
    });

    document.getElementById('announcementForm').addEventListener('submit', async (e) => { e.preventDefault(); const payload = { title: document.getElementById('annTitle').value, content: document.getElementById('annContent').value, audience: document.getElementById('annAudience').value }; const result = await callApi('createAnnouncement', payload); if (result.success) { alert('تم نشر الإعلان بنجاح.'); e.target.reset(); } });
    document.getElementById('addExamDayBtn').addEventListener('click', addExamDayField);
    document.getElementById('examScheduleForm').addEventListener('submit', publishExamScheduleHandler);
    document.getElementById('weeklyScheduleForm').addEventListener('submit', publishWeeklyScheduleHandler);
    document.getElementById('loadWeeklyScheduleBtn').addEventListener('click', loadExistingWeeklySchedule);
}

async function loadSystemSettings() {
    const result = await callApi('getSystemSettings');
    if (result.success) {
        const container = document.getElementById('settingsContainer');
        container.innerHTML = Object.keys(result.settings).map(key => {
            const setting = result.settings[key];
            return `<div class="setting-item"><label>${setting.description}</label><label class="switch"><input type="checkbox" data-key="${key}" ${setting.value === 'مفتوح' ? 'checked' : ''}><span class="slider round"></span></label></div>`;
        }).join('');
        
        container.querySelectorAll('input[type="checkbox"]').forEach(toggle => {
            toggle.addEventListener('change', async (event) => {
                const key = event.target.dataset.key;
                const value = event.target.checked ? 'مفتوح' : 'مغلق';
                await callApi('updateSystemSettings', { [key]: value });
            });
        });
    }
}

async function loadPendingGrades() {
    const result = await callApi('getPendingGrades');
    const container = document.getElementById('pendingGradesContainer');
    if (result.success && result.grades.length > 0) {
        container.innerHTML = `<div class="table-responsive"><table class="data-table"><thead><tr><th><input type="checkbox" id="selectAllGrades"></th><th>الطالب</th><th>المادة</th><th>التغييرات</th><th>المدرس</th></tr></thead><tbody>${result.grades.map(g => `<tr><td><input type="checkbox" class="grade-checkbox" value="${g.recordId}"></td><td>${g.studentName}</td><td>${g.subject}</td><td><details><summary class="details-toggle">عرض</summary><div class="changes-details">${Object.keys(g.changes).map(key => `<div><span>${key}: </span><span class="old-value">${g.changes[key].old}</span> &rarr; <span class="new-value">${g.changes[key].new}</span></div>`).join('') || 'لا تغييرات.'}</div></details></td><td>${g.updatedBy}</td></tr>`).join('')}</tbody></table></div><br><button id="approveGradesBtn" class="button">موافقة على المحدد</button>`;
        document.getElementById('approveGradesBtn').addEventListener('click', approveSelectedGrades);
        document.getElementById('selectAllGrades').addEventListener('change', (e) => { document.querySelectorAll('.grade-checkbox').forEach(cb => cb.checked = e.target.checked); });
    } else { container.innerHTML = '<p>لا توجد درجات بانتظار الموافقة.</p>'; }
}

async function approveSelectedGrades() {
    const recordIds = Array.from(document.querySelectorAll('.grade-checkbox:checked')).map(cb => cb.value);
    if(recordIds.length === 0) return alert('الرجاء تحديد سجل.');
    const result = await callApi('approveGrades', { recordIds });
    if(result.success) { alert(result.message); loadPendingGrades(); }
}

async function loadPendingAbsences() {
    const result = await callApi('getPendingAbsences');
    const container = document.getElementById('pendingAbsencesContainer');
    if (result.success && result.absences.length > 0) {
         container.innerHTML = `<div class="table-responsive"><table class="data-table"><thead><tr><th><input type="checkbox" id="selectAllAbsences"></th><th>الطالب</th><th>التاريخ</th><th>الملاحظات</th><th>بواسطة</th></tr></thead><tbody>${result.absences.map(a => `<tr><td><input type="checkbox" class="absence-checkbox" value="${a.absenceId}"></td><td>${a.studentName}</td><td>${a.date}</td><td>${a.notes || '-'}</td><td>${a.recordedBy}</td></tr>`).join('')}</tbody></table></div><br><button id="approveAbsencesBtn" class="button">موافقة على المحدد</button>`;
        document.getElementById('approveAbsencesBtn').addEventListener('click', approveSelectedAbsences);
        document.getElementById('selectAllAbsences').addEventListener('change', (e) => { document.querySelectorAll('.absence-checkbox').forEach(cb => cb.checked = e.target.checked); });
    } else { container.innerHTML = '<p>لا توجد غيابات بانتظار الموافقة.</p>'; }
}

async function approveSelectedAbsences() {
    const absenceIds = Array.from(document.querySelectorAll('.absence-checkbox:checked')).map(cb => cb.value);
    if(absenceIds.length === 0) return alert('الرجاء تحديد سجل.');
    const result = await callApi('approveAbsences', { absenceIds });
    if(result.success) { alert(result.message); loadPendingAbsences(); }
}

async function loadPendingEvaluations() {
    const result = await callApi('getPendingEvaluations');
    const container = document.getElementById('pendingEvaluationsContainer');
    if (result.success && result.evaluations.length > 0) {
         container.innerHTML = `<div class="table-responsive"><table class="data-table"><thead><tr><th><input type="checkbox" id="selectAllEvals"></th><th>الطالب</th><th>المادة</th><th>التاريخ</th><th>التقييم</th><th>ملاحظات</th><th>بواسطة</th></tr></thead><tbody>${result.evaluations.map(ev => `<tr><td><input type="checkbox" class="eval-checkbox" value="${ev.evaluationId}"></td><td>${ev.studentName}</td><td>${ev.subject}</td><td>${ev.date}</td><td><ul style="padding-right: 20px; margin: 0; text-align: right;">${ev.daily_prep ? `<li>تحضير: ${ev.daily_prep}</li>` : ''}${ev.participation ? `<li>مشاركة: ${ev.participation}</li>` : ''}${ev.behavior ? `<li>سلوك: ${ev.behavior}</li>` : ''}${ev.homework ? `<li>واجب: ${ev.homework}</li>` : ''}</ul></td><td>${ev.note || '-'}</td><td>${ev.teacherName}</td></tr>`).join('')}</tbody></table></div><br><button id="approveEvalsBtn" class="button">موافقة على المحدد</button>`;
        document.getElementById('approveEvalsBtn').addEventListener('click', approveSelectedEvaluations);
        document.getElementById('selectAllEvals').addEventListener('change', (e) => { document.querySelectorAll('.eval-checkbox').forEach(cb => cb.checked = e.target.checked); });
    } else { container.innerHTML = '<p>لا توجد تقييمات بانتظار الموافقة.</p>'; }
}

async function approveSelectedEvaluations() {
    const evaluationIds = Array.from(document.querySelectorAll('.eval-checkbox:checked')).map(cb => cb.value);
    if(evaluationIds.length === 0) return alert('الرجاء تحديد سجل.');
    const result = await callApi('approveEvaluations', { evaluationIds });
    if(result.success) { alert(result.message); loadPendingEvaluations(); }
}

async function loadAllUsers() {
    const result = await callApi('getAllUsers');
    const container = document.getElementById('usersContainer');
    if (result.success) {
        container.innerHTML = `<div class="table-responsive"><table class="data-table"><thead><tr><th>الاسم الكامل</th><th>الدور</th><th>الحالة</th><th>صلاحية تسجيل الغياب</th></tr></thead><tbody>${result.users.map(user => `<tr><td>${user.fullName}</td><td>${user.role}</td><td>${user.status}</td><td>${user.role === 'مدرس' ? `<label class="switch"><input type="checkbox" class="permission-toggle" data-userid="${user.userId}" data-permission="canRecordAbsence" ${user.canRecordAbsence ? 'checked' : ''}><span class="slider round"></span></label>` : 'N/A'}</td></tr>`).join('')}</tbody></table></div>`;
        document.querySelectorAll('.permission-toggle').forEach(toggle => {
            toggle.addEventListener('change', async (event) => {
                const payload = { userId: event.target.dataset.userid, permission: event.target.dataset.permission, value: event.target.checked };
                await callApi('updateUserPermission', payload);
            });
        });
    }
}

function addExamDayField() {
    const container = document.getElementById('examDaysContainer');
    const div = document.createElement('div');
    div.className = 'exam-day-row';
    const subjectOptions = (window.allSubjects || []).map(s => `<option value="${s}">${s}</option>`).join('');

    div.innerHTML = `
        <div class="controls" style="padding: 5px; background: #f9f9f9;">
            <input type="date" class="exam-date" required>
            <input type="text" class="exam-day" placeholder="اليوم" required>
            <select class="exam-subject" required><option value="">-- اختر المادة --</option>${subjectOptions}</select>
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="button" style="background-color: #dc3545; padding: 8px 12px;">حذف</button>
        </div>
    `;
    container.appendChild(div);
}


async function publishExamScheduleHandler(e) {
    e.preventDefault();
    const scheduleData = [];
    document.querySelectorAll('#examDaysContainer .exam-day-row').forEach(row => {
        scheduleData.push({
            date: row.querySelector('.exam-date').value,
            day: row.querySelector('.exam-day').value,
            subject: row.querySelector('.exam-subject').value
        });
    });
    
    const payload = {
        title: document.getElementById('examScheduleTitle').value,
        targetClass: document.getElementById('examScheduleClass').value,
        scheduleData: scheduleData
    };

    const result = await callApi('publishExamSchedule', payload);
    if (result.success) {
        alert(result.message);
        e.target.reset();
        document.getElementById('examDaysContainer').innerHTML = '';
        addExamDayField();
    }
}

function buildWeeklyScheduleGrid(subjects = []) {
    const container = document.getElementById('weeklyScheduleContainer');
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    let html = '';
    const subjectOptions = `<option value="">--</option>` + subjects.map(s => `<option value="${s}">${s}</option>`).join('');

    html += `<div class="schedule-grid">
        <div class="schedule-header"></div> 
        ${[1,2,3,4,5,6].map(i => `<div class="schedule-header">الدرس ${i}</div>`).join('')}
    </div>`;

    days.forEach(day => {
        html += `<div class="schedule-grid">
            <div class="schedule-header">${day}</div>
            ${[1,2,3,4,5,6].map(i => `<select id="${day}-lesson${i}">${subjectOptions}</select>`).join('')}
        </div>`;
    });
    container.innerHTML = html;
}

async function publishWeeklyScheduleHandler(e) {
    e.preventDefault();
    const scheduleData = {};
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    
    days.forEach(day => {
        scheduleData[day] = {};
        for (let i = 1; i <= 6; i++) {
            const lessonInput = document.getElementById(`${day}-lesson${i}`);
            if (lessonInput && lessonInput.value) {
                scheduleData[day][`lesson${i}`] = lessonInput.value;
            }
        }
    });

    const payload = {
        targetClass: document.getElementById('weeklyScheduleClass').value,
        targetSection: document.getElementById('weeklyScheduleSection').value,
        scheduleData: scheduleData
    };

    if (!payload.targetClass || !payload.targetSection) {
        return alert('الرجاء اختيار الصف والشعبة.');
    }
    
    const result = await callApi('publishWeeklySchedule', payload);
    if (result.success) {
        alert(result.message);
    }
}

async function loadExistingWeeklySchedule() {
    const payload = {
        targetClass: document.getElementById('weeklyScheduleClass').value,
        targetSection: document.getElementById('weeklyScheduleSection').value,
    };

    if (!payload.targetClass || !payload.targetSection) {
        return alert('الرجاء اختيار الصف والشعبة لتحميل الجدول.');
    }

    const result = await callApi('getWeeklySchedule', payload);
    if (result.success && result.schedule) {
        const schedule = result.schedule;
        const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        days.forEach(day => {
            for (let i = 1; i <= 6; i++) {
                const lessonSelect = document.getElementById(`${day}-lesson${i}`);
                if (lessonSelect) {
                    lessonSelect.value = schedule[day]?.[`lesson${i}`] || '';
                }
            }
        });
        alert('تم تحميل الجدول بنجاح.');
    } else {
        alert('لم يتم العثور على جدول محفوظ لهذا الصف والشعبة. يمكنك إنشاء جدول جديد الآن.');
        buildWeeklyScheduleGrid(window.allSubjects || []);
    }
}

