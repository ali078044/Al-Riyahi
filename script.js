// ==========================================================
//                     الإعدادات الرئيسية
// ==========================================================
// !!! تنبيه هام: هذا هو رابط النشر الجديد الذي زودتني به
const API_URL = 'https://script.google.com/macros/s/AKfycbydd66W-72Tpcg6ah0DLl-RuGEntdmpPLbDBGjcVZeBIzvU2I6LHgr5go5guBzlyvAs/exec'; 

// (جديد) تعريف أسماء الصفحات لمطابقة الخادم
const SHEETS = {
  USERS: 'المستخدمون',
  GRADES: 'الدرجات_2025_2026',
  GRADES_ARCHIVE: 'أرشيف_الدرجات',
  ABSENCES: 'الغيابات',
  ANNOUNCEMENTS: 'الاخبار',
  SETTINGS: 'إعدادات_النظام',
  HOMEWORK: 'الواجبات',
  DAILY_EVALUATIONS: 'التقييمات_اليومية',
  LIBRARY: 'المكتبة_الرقمية',
  EXAM_SCHEDULES: 'جداول_الامتحانات',
  WEEKLY_SCHEDULES: 'الجداول_الأسبوعية',
  TEACHER_ASSIGNMENTS: 'TeacherAssignments'
};

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
          // (تعديل) لا تعرض الخطأ إذا كان مجرد "لم يتم العثور على"
          // (تعديل) إضافة getUserDetails إلى القائمة
          if (action !== 'getWeeklySchedule' && action !== 'getExistingEvaluations' && action !== 'getUniqueClassesAndSubjects' && action !== 'getUserDetails') { 
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
    select.innerHTML = `<option value="">${defaultOptionText}</option>` + (options || []).map(o => `<option value="${o}">${o}</option>`).join('');
}


// ==========================================================
//                  منطق صفحة الطالب
// ==========================================================
// (لا تغييرات هنا، الخادم يفلتر المحتوى "المنشور" فقط)
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
             document.body.innerHTML = `<p style="color:red; text-align:center; padding: 50px;">فشل تحميل بيانات الطالب.</p>`;
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
    // (تعديل) تم تغيير الأسماء لتطابق الخادم (e.g., term1_month1)
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
                        <td>${g.midYear_exam || ''}</td><td>${g.term2_month1 || ''}</td><td>${g.term2_month2 || ''}</td><td><strong>${g.term2_avg || ''}</strong></td>
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
//                  منطق صفحة المدرس (محدث)
// ==========================================================
function handleTeacherPage() {
    const userData = setupCommonElements();
    if (!userData) return;

    callApi('getTeacherDashboard').then(result => {
        if(result.success) {
            const { classes, sections, subjects, announcements, canRecordAbsence, weeklySchedules } = result.data;
            // تعبئة جميع القوائم المنسدلة
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
            populateSelect('absenceClasses', classes);
            populateSelect('absenceSections', sections);

            renderAnnouncements(announcements, 'announcementsContainer');
            renderTeacherWeeklySchedules(weeklySchedules, subjects || []);
            
            const absenceTabButton = document.querySelector('[onclick="showTab(\'absencesTab\')"]');
            if (canRecordAbsence) {
                absenceTabButton.style.display = '';
            } else {
                absenceTabButton.style.display = 'none';
            }
            showTab('gradesTab');
        } else {
             document.body.innerHTML = `<p style="color:red; text-align:center; padding: 50px;">فشل تحميل بيانات المدرس. ${result.message}</p>`;
        }
    });
    
    // ربط الأحداث
    document.getElementById('loadStudentsBtn').addEventListener('click', loadStudentsForGrading);
    document.getElementById('gradesForm').addEventListener('submit', submitGradesForReview);
    document.getElementById('loadStudentsForAbsenceBtn').addEventListener('click', loadStudentsForAttendance);
    document.getElementById('absenceForm').addEventListener('submit', recordAbsencesHandler);
    document.getElementById('homeworkForm').addEventListener('submit', submitHomeworkHandler); // (محدث)
    document.getElementById('loadStudentsForEvalBtn').addEventListener('click', loadStudentsForEvaluation); // (محدث)
    document.getElementById('evaluationsForm').addEventListener('submit', submitEvaluationsHandler); // (محدث)
    document.getElementById('libraryForm').addEventListener('submit', addLibraryLinkHandler);
    
    // تعيين التواريخ الافتراضية
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
        for (let i = 1; i <= 6; i++) { tableHtml += `<th>الدرس ${i}</th>`; }
        tableHtml += '</tr></thead><tbody>';
        days.forEach(day => {
            tableHtml += `<tr><td><strong>${day}</strong></td>`;
            for (let i = 1; i <= 6; i++) {
                const subject = schedule.scheduleData[day]?.[`lesson${i}`] || '';
                const isMySubject = (teacherSubjects || []).includes(subject);
                tableHtml += `<td class="${isMySubject ? 'my-subject' : ''}">${subject}</td>`;
            }
            tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table></div></div>';
        finalHtml += tableHtml;
    });
    container.innerHTML = finalHtml;
}

// (محدث بالكامل - يلتزم بصلاحيات الخادم)
async function loadStudentsForGrading() {
    const payload = {
        studentClass: document.getElementById('teacherClasses').value,
        studentSection: document.getElementById('teacherSections').value,
        subject: document.getElementById('teacherSubjects').value,
    };
    if (!payload.studentClass || !payload.studentSection || !payload.subject) {
        return alert('الرجاء اختيار الصف والشعبة والمادة.');
    }
    
    const result = await callApi('getStudentsForGrading', payload);
    const container = document.getElementById('studentsGradeContainer');
    
    if (result.success && result.students && result.students.length > 0) {
        const settings = result.settings || {}; // جلب الإعدادات من الخادم

        // دالة مساعدة للتحقق من الصلاحية وإضافة 'readonly'
        const getInputState = (gradeType) => {
            const settingKey = `${gradeType}_Status`; // e.g., Term1_Month1_Status
            // إذا كان الإعداد غير موجود أو "مفتوح"، اسمح بالكتابة
            if (!settings[settingKey] || settings[settingKey].value === 'مفتوح') {
                return '';
            }
            // وإلا، اجعله للقراءة فقط
            return 'readonly style="background-color: #eee;"';
        };
        
        // (تعديل) التأكد من أن studentGrades معرفة قبل الوصول إليها
        container.innerHTML = `
            <div class="table-responsive">
            <table class="data-table">
                <thead><tr><th>اسم الطالب</th><th>شهر 1 (ف1)</th><th>شهر 2 (ف1)</th><th>نصف السنة</th><th>شهر 1 (ف2)</th><th>شهر 2 (ف2)</th><th>النهائي</th><th>الحالة</th></tr></thead>
                <tbody>
                    ${result.students.map(s => {
                        const studentGrades = result.grades[s.studentId] || {};
                        // عرض آخر حالة مسجلة لأي درجة
                        const latestStatus = studentGrades.Term1_Month1?.status || studentGrades.Term1_Month2?.status || 'جديد';
                        return `
                        <tr data-student-id="${s.studentId}">
                            <td>${s.name}</td>
                            <td><input type="number" class="grade-input" data-grade-type="Term1_Month1" value="${studentGrades.Term1_Month1?.grade || ''}" ${getInputState('Term1_Month1')}></td>
                            <td><input type="number" class="grade-input" data-grade-type="Term1_Month2" value="${studentGrades.Term1_Month2?.grade || ''}" ${getInputState('Term1_Month2')}></td>
                            <td><input type="number" class="grade-input" data-grade-type="MidYear_Exam" value="${studentGrades.MidYear_Exam?.grade || ''}" ${getInputState('MidYear_Exam')}></td>
                            <td><input type="number" class="grade-input" data-grade-type="Term2_Month1" value="${studentGrades.Term2_Month1?.grade || ''}" ${getInputState('Term2_Month1')}></td>
                            <td><input type="number" class="grade-input" data-grade-type="Term2_Month2" value="${studentGrades.Term2_Month2?.grade || ''}" ${getInputState('Term2_Month2')}></td>
                            <td><input type="number" class="grade-input" data-grade-type="Final_Exam" value="${studentGrades.Final_Exam?.grade || ''}" ${getInputState('Final_Exam')}></td>
                            <td><span class="status">${latestStatus}</span></td>
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
            // فقط أضف الدرجة إذا لم تكن للقراءة فقط
            if (input.value !== '' && !input.hasAttribute('readonly')) { 
                studentGrade.grades[input.dataset.gradeType] = input.value;
                hasChanged = true;
            }
        });
        if(hasChanged) grades.push(studentGrade);
    });

    if (grades.length === 0) return alert('لم يتم إدخال أي درجات جديدة (أو أن الحقول المفتوحة فارغة).');

    const payload = {
        subject: document.getElementById('teacherSubjects').value,
        grades: grades
    };

    const result = await callApi('submitGrades', payload);
    if (result.success) {
        alert(result.message); // سيعرض (تم الإرسال للمراجعة)
        loadStudentsForGrading(); // إعادة تحميل لإظهار الحالة الجديدة "بانتظار الموافقة"
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
        alert(result.message); // سيعرض (تم الإرسال للمراجعة)
        e.target.reset();
        document.getElementById('absenceDate').valueAsDate = new Date();
        document.getElementById('studentsForAbsenceContainer').innerHTML = '<p>الرجاء اختيار الصف والشعبة والتاريخ لعرض الطلاب.</p>';
        document.getElementById('submitAbsencesBtn').style.display = 'none';
    }
}

// (محدث - تم إزالة تاريخ الاستحقاق)
async function submitHomeworkHandler(e) {
    e.preventDefault();
    const payload = {
        content: document.getElementById('hwContent').value,
        targetClass: document.getElementById('hwClasses').value,
        targetSection: document.getElementById('hwSections').value,
        targetSubject: document.getElementById('hwSubjects').value
        // (لا يوجد تاريخ استحقاق، النظام سيجدوله آلياً)
    };
    if(!payload.targetClass || !payload.targetSection || !payload.targetSubject || !payload.content) return alert('الرجاء ملء جميع الحقول.');
    
    const result = await callApi('submitHomework', payload);
    if(result.success) {
        alert(result.message); // سيعرض (تم الإرسال للمراجعة)
        e.target.reset();
    }
}

// (محدث بالكامل - لجلب التقييمات الموجودة مسبقاً)
async function loadStudentsForEvaluation() {
    const payload = {
        studentClass: document.getElementById('evalClasses').value,
        studentSection: document.getElementById('evalSections').value
    };
    if(!payload.studentClass || !payload.studentSection) return alert('الرجاء اختيار الصف والشعبة.');
    
    // 1. جلب قائمة الطلاب
    const studentsResult = await callApi('getStudentsForAttendance', payload);
    const container = document.getElementById('studentsForEvalContainer');
    
    if (!studentsResult.success || studentsResult.students.length === 0) {
        container.innerHTML = '<p>لا يوجد طلاب في هذه الشعبة.</p>';
        return;
    }
    
    const students = studentsResult.students;
    const studentIds = students.map(s => s.studentId);
    
    // 2. (جديد) جلب التقييمات الموجودة مسبقاً لهذا اليوم والمادة
    const evalPayload = {
        date: document.getElementById('evalDate').value,
        subject: document.getElementById('evalSubjects').value,
        studentIds: studentIds
    };
    
    // لن نعرض خطأ إذا لم يتم العثور على تقييمات (هذا طبيعي)
    const existingEvalsResult = await callApi('getExistingEvaluations', evalPayload);
    const existingEvalsMap = new Map();
    if (existingEvalsResult.success) {
        existingEvalsResult.evaluations.forEach(ev => {
            existingEvalsMap.set(ev.studentId, ev);
        });
    }

    // 3. بناء الجدول مع ملء البيانات الموجودة
    const evalTypes = { 'DailyPrep': 'تحضير يومي', 'Participation': 'مشاركة', 'Behavior': 'سلوك', 'Homework': 'واجب بيتي' };
    const optionsHtml = (selectedValue = "") => `
        <option value="" ${selectedValue === "" ? "selected" : ""}>--</option>
        <option value="جيد" ${selectedValue === "جيد" ? "selected" : ""}>جيد</option>
        <option value="متوسط" ${selectedValue === "متوسط" ? "selected" : ""}>متوسط</option>
        <option value="ضعيف" ${selectedValue === "ضعيف" ? "selected" : ""}>ضعيف</option>
    `;

    let tableHtml = `
        <div class="table-responsive">
        <table class="data-table">
            <thead>
                <tr><th>اسم الطالب</th><th>تحضير يومي</th><th>مشاركة</th><th>سلوك</th><th>واجب بيتي</th><th>ملاحظات</th><th>الحالة</th></tr>
            </thead>
            <tbody>
    `;
    students.forEach(s => {
        const existing = existingEvalsMap.get(s.studentId) || {};
        const status = existing.status || 'جديد';
        // لا يمكن التعديل إذا كان منشوراً أو مرفوضاً أو تمت الموافقة عليه (حفظ فقط)
        const isEditable = (status === 'جديد' || status === 'بانتظار الموافقة');
        
        tableHtml += `
            <tr data-student-id="${s.studentId}" data-evaluation-id="${existing.evaluationId || ''}">
                <td>${s.name}</td>
                <td><select class="eval-select" data-type="DailyPrep" ${!isEditable ? 'disabled' : ''}>${optionsHtml(existing.daily_prep)}</select></td>
                <td><select class="eval-select" data-type="Participation" ${!isEditable ? 'disabled' : ''}>${optionsHtml(existing.participation)}</select></td>
                <td><select class="eval-select" data-type="Behavior" ${!isEditable ? 'disabled' : ''}>${optionsHtml(existing.behavior)}</select></td>
                <td><select class="eval-select" data-type="Homework" ${!isEditable ? 'disabled' : ''}>${optionsHtml(existing.homework)}</select></td>
                <td><input type="text" class="eval-note" placeholder="ملاحظة" value="${existing.note || ''}" ${!isEditable ? 'readonly' : ''}></td>
                <td><span class="status" style="color: ${isEditable ? '#ffc107' : '#28a745'}">${status}</span></td>
            </tr>
        `;
    });
    tableHtml += '</tbody></table></div>';
    container.innerHTML = tableHtml;
    document.getElementById('submitEvaluationsBtn').style.display = 'block';
}

// (محدث بالكامل - ليدعم إرسال التعديلات)
async function submitEvaluationsHandler(e) {
    e.preventDefault();
    const evaluationsPayload = [];
    const date = document.getElementById('evalDate').value;
    const subject = document.getElementById('evalSubjects').value;
    
    if (!subject) return alert('الرجاء اختيار المادة.');

    document.querySelectorAll('#studentsForEvalContainer tbody tr').forEach(row => {
        const evaluationId = row.dataset.evaluationId; // جلب ID التقييم
        
        // إذا كان السجل غير قابل للتعديل (select معطل)، تجاهله
        if (row.querySelector('select').disabled) return;
        
        const studentEvals = {
            studentId: row.dataset.studentId,
            evaluationId: evaluationId || null, // إرسال ID السجل للتعديل
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
        
        // إرسال فقط إذا كان هناك تقييم أو ملاحظة
        if (hasEval || studentEvals.note) {
            evaluationsPayload.push(studentEvals);
        }
    });

    if (evaluationsPayload.length === 0) return alert('الرجاء تقييم طالب واحد على الأقل أو كتابة ملاحظة (في الحقول القابلة للتعديل).');

    const result = await callApi('submitDailyEvaluation', { evaluations: evaluationsPayload, date: date, subject: subject });
    if (result.success) {
        alert(result.message); // سيعرض (تم الإرسال للمراجعة)
        loadStudentsForEvaluation(); // إعادة تحميل لإظهار الحالة "بانتظار الموافقة"
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
        alert(result.message); // سيعرض (تم الإرسال للمراجعة)
        e.target.reset();
    }
}


// ==========================================================
//                  منطق صفحة المشرف (محدث بالكامل)
// ==========================================================
function handleAdminPage() {
    const userData = setupCommonElements();
    if (!userData) return;
    
    showTab('pendingTab'); // عرض تبويب الموافقات الافتراضي
    
    // تحميل جميع بيانات الموافقات
    loadPendingGrades();
    loadPendingAbsences();
    loadPendingEvaluations();
    loadPendingHomeworks();
    loadPendingLibraryLinks();
    
    // تحميل بيانات باقي التبويبات
    loadAllUsers();
    loadSystemSettings();

    // تحميل بيانات الجداول والتقارير
    callApi('getUniqueClassesAndSubjects').then(result => {
        if (result.success) {
            window.allSubjects = result.subjects || []; 
            window.allClasses = result.classes || [];
            window.allSections = result.sections || [];
            
            populateSelect('examScheduleClass', window.allClasses, '-- اختر الصف --');
            populateSelect('weeklyScheduleClass', window.allClasses, '-- اختر الصف --');
            populateSelect('weeklyScheduleSection', window.allSections, '-- اختر الشعبة --');
            // تعبئة قوائم التقارير
            populateSelect('reportClassSelect', window.allClasses, '-- اختر الصف --');
            populateSelect('reportSectionSelect', window.allSections, '-- اختر الشعبة --');
            
            buildWeeklyScheduleGrid(window.allSubjects);
            addExamDayField();
        }
    });

    // مستمعي الأحداث
    document.getElementById('announcementForm').addEventListener('submit', handleAnnouncementSubmit);
    document.getElementById('addExamDayBtn').addEventListener('click', addExamDayField);
    document.getElementById('examScheduleForm').addEventListener('submit', publishExamScheduleHandler);
    document.getElementById('weeklyScheduleForm').addEventListener('submit', publishWeeklyScheduleHandler);
    document.getElementById('loadWeeklyScheduleBtn').addEventListener('click', loadExistingWeeklySchedule);
    document.getElementById('archiveStudentBtn').addEventListener('click', archiveStudent);
    
    // (جديد) مستمعي أحداث التقارير
    document.getElementById('loadMissingSubmissionsBtn').addEventListener('click', loadMissingSubmissions);
    document.getElementById('getSummaryBtn').addEventListener('click', getStudentEvaluationSummary);
    document.getElementById('sendSummaryToTelegramBtn').addEventListener('click', sendSummaryToTelegram);
    document.getElementById('getGradesReportBtn').addEventListener('click', getGradesReportBySection);
    
    // (جديد) مستمعي أحداث إدارة المستخدمين
    document.getElementById('loadUserBtn').addEventListener('click', loadUserForEditing);
    document.getElementById('closeModalBtn').addEventListener('click', closeUserModal);
    document.getElementById('saveUserBtn').addEventListener('click', saveUserChanges);

    // (جديد) مستمعي أحداث متابعة الإرسال
    document.getElementById('loadHwStatusBtn').addEventListener('click', () => loadSubmissionStatusReport(SHEETS.HOMEWORK, 'hwStatusContainer'));
    document.getElementById('loadEvalStatusBtn').addEventListener('click', () => loadSubmissionStatusReport(SHEETS.DAILY_EVALUATIONS, 'evalStatusContainer'));
    
    // تهيئة تواريخ التقارير
    document.getElementById('summaryStartDate').valueAsDate = new Date();
    document.getElementById('summaryEndDate').valueAsDate = new Date();
}

// --- دوال الموافقات (محدثة بالكامل) ---

// (دالة معالجة مركزية جديدة)
async function handleApproval(sheetName, action, sendTelegram = false) {
    const checkboxClass = `.checkbox-${sheetName.replace(/[_\.]/g, '-')}`; // تحويل _ إلى - ليطابق ID
    const itemIds = Array.from(document.querySelectorAll(`${checkboxClass}:checked`)).map(cb => cb.value);
    
    if (itemIds.length === 0) return alert('الرجاء تحديد سجل واحد على الأقل.');

    const payload = {
        itemIds: itemIds,
        action: action, // 'approve', 'publish', 'reject'
        sendTelegram: sendTelegram,
        sheetName: sheetName // إرسال الاسم الحقيقي للورقة
    };
    
    const result = await callApi('handleApproval', payload);
    if (result.success) {
        alert(result.message);
        // إعادة تحميل القسم المناسب
        if (sheetName === SHEETS.GRADES) loadPendingGrades();
        else if (sheetName === SHEETS.ABSENCES) loadPendingAbsences();
        else if (sheetName === SHEETS.DAILY_EVALUATIONS) loadPendingEvaluations();
        else if (sheetName === SHEETS.HOMEWORK) loadPendingHomeworks();
        else if (sheetName === SHEETS.LIBRARY) loadPendingLibraryLinks();
    }
}

// (دالة عرض أزرار الموافقة الثلاثية الجديدة)
function getApprovalControls(sheetName) {
    const sheetId = sheetName.replace(/[_\.]/g, '-'); // اسم فريد للاختصارات
    const checkboxClass = `checkbox-${sheetId}`;
    const selectAllId = `selectAll-${sheetId}`;
    
    // (جديد) تخصيص الأزرار للواجبات
    const isHomework = (sheetName === SHEETS.HOMEWORK);
    const publishText = isHomework ? 'جدولة للمنصة' : 'حفظ ونشر للمنصة';
    const telegramText = isHomework ? 'جدولة + إرسال آلي' : 'نشر + إرسال تليجرام';
    const publishTitle = isHomework ? 'جدولة الواجب ليتم إرساله آلياً (للمنصة فقط) قبل يوم الحصة' : 'حفظ ونشر السجلات لتظهر في واجهة الطالب.';
    const telegramTitle = isHomework ? 'جدولة الواجب ليتم إرساله آلياً (للمنصة وتليجرام) قبل يوم الحصة' : 'حفظ ونشر، وإرسال إشعار فوري لولي الأمر عبر تليجرام.';

    // ربط المستمع ديناميكياً
    setTimeout(() => {
        try {
            const updateCount = () => {
                const count = document.querySelectorAll(`.${checkboxClass}:checked`).length;
                const label = document.querySelector(`#controls-${sheetId} label`);
                if (label) label.innerText = 'للـ ' + count + ' محدد:';
            };
            
            document.querySelectorAll(`.${checkboxClass}`).forEach(cb => {
                cb.onchange = updateCount;
            });
            const selectAll = document.getElementById(selectAllId);
            if (selectAll) {
                selectAll.onchange = (e) => {
                    document.querySelectorAll(`.${checkboxClass}`).forEach(cb => cb.checked = e.target.checked);
                    updateCount();
                };
            }
        } catch (e) {
            console.error("Error attaching listeners:", e);
        }
    }, 100);

    return `
    <div class="approval-controls" id="controls-${sheetId}">
        <label>للـ 0 محدد:</label>
        <button onclick="handleApproval('${sheetName}', 'approve', false)" class="button btn-approve" title="حفظ السجلات في النظام (للاستخدام الداخلي) دون إظهارها للطالب.">
            <i class="fas fa-save"></i> حفظ فقط (موافقة)
        </button>
        <button onclick="handleApproval('${sheetName}', 'publish', false)" class="button btn-publish" title="${publishTitle}">
            <i class="fas fa-check"></i> ${publishText}
        </button>
        <button onclick="handleApproval('${sheetName}', 'publish', true)" class="button btn-telegram" title="${telegramTitle}">
            <i class="fab fa-telegram-plane"></i> ${telegramText}
        </button>
        <button onclick="handleApproval('${sheetName}', 'reject', false)" class="button btn-reject" title="رفض السجلات، لن يتم حفظها أو نشرها.">
            <i class="fas fa-times"></i> رفض
        </button>
    </div>
    `;
}

async function loadPendingGrades() {
    const result = await callApi('getPendingGrades');
    const container = document.getElementById('pendingGradesContainer');
    const sheetName = SHEETS.GRADES;
    const sheetId = sheetName.replace(/[_\.]/g, '-');
    
    if (result.success && result.items.length > 0) {
        container.innerHTML = `<div class="table-responsive"><table class="data-table"><thead><tr><th><input type="checkbox" id="selectAll-${sheetId}"></th><th>الطالب</th><th>المادة</th><th>نوع الدرجة</th><th>التغييرات</th><th>المدرس</th></tr></thead><tbody>${result.items.map(g => `<tr><td><input type="checkbox" class="checkbox-${sheetId}" value="${g.id}"></td><td>${g.studentName}</td><td>${g.subject}</td><td>${g.gradeType}</td><td><details><summary class="details-toggle">عرض</summary><div class="changes-details"><span class="old-value">${g.changes.old || '(فارغ)'}</span> &rarr; <span class="new-value">${g.changes.new}</span></div></details></td><td>${g.teacher}</td></tr>`).join('')}</tbody></table></div>
        ${getApprovalControls(sheetName)}`;
    } else { container.innerHTML = '<p>لا توجد درجات بانتظار الموافقة.</p>'; }
}

async function loadPendingAbsences() {
    const result = await callApi('getPendingAbsences');
    const container = document.getElementById('pendingAbsencesContainer');
    const sheetName = SHEETS.ABSENCES;
    const sheetId = sheetName.replace(/[_\.]/g, '-');

    if (result.success && result.items.length > 0) {
         container.innerHTML = `<div class="table-responsive"><table class="data-table"><thead><tr><th><input type="checkbox" id="selectAll-${sheetId}"></th><th>الطالب</th><th>التاريخ</th><th>الملاحظات</th><th>بواسطة</th></tr></thead><tbody>${result.items.map(a => `<tr><td><input type="checkbox" class="checkbox-${sheetId}" value="${a.id}"></td><td>${a.studentName}</td><td>${new Date(a.date).toLocaleDateString('ar-IQ')}</td><td>${a.notes || '-'}</td><td>${a.teacher}</td></tr>`).join('')}</tbody></table></div>
         ${getApprovalControls(sheetName)}`;
    } else { container.innerHTML = '<p>لا توجد غيابات بانتظار الموافقة.</p>'; }
}

async function loadPendingEvaluations() {
    const result = await callApi('getPendingEvaluations');
    const container = document.getElementById('pendingEvaluationsContainer');
    const sheetName = SHEETS.DAILY_EVALUATIONS;
    const sheetId = sheetName.replace(/[_\.]/g, '-');

    if (result.success && result.items.length > 0) {
         container.innerHTML = `<div class="table-responsive"><table class="data-table"><thead><tr><th><input type="checkbox" id="selectAll-${sheetId}"></th><th>الطالب</th><th>المادة</th><th>التاريخ</th><th>التقييم</th><th>ملاحظات</th><th>بواسطة</th></tr></thead><tbody>${result.items.map(ev => `<tr><td><input type="checkbox" class="checkbox-${sheetId}" value="${ev.id}"></td><td>${ev.studentName}</td><td>${ev.subject}</td><td>${new Date(ev.date).toLocaleDateString('ar-IQ')}</td><td><ul style="padding-right: 20px; margin: 0; text-align: right;">${ev.data.daily_prep ? `<li>تحضير: ${ev.data.daily_prep}</li>` : ''}${ev.data.participation ? `<li>مشاركة: ${ev.data.participation}</li>` : ''}${ev.data.behavior ? `<li>سلوك: ${ev.data.behavior}</li>` : ''}${ev.data.homework ? `<li>واجب: ${ev.data.homework}</li>` : ''}</ul></td><td>${ev.data.note || '-'}</td><td>${ev.teacher}</td></tr>`).join('')}</tbody></table></div>
         ${getApprovalControls(sheetName)}`;
    } else { container.innerHTML = '<p>لا توجد تقييمات بانتظار الموافقة.</p>'; }
}

async function loadPendingHomeworks() {
    const result = await callApi('getPendingHomeworks');
    const container = document.getElementById('pendingHomeworkContainer');
    const sheetName = SHEETS.HOMEWORK;
    const sheetId = sheetName.replace(/[_\.]/g, '-');
    
     if (result.success && result.items.length > 0) {
        container.innerHTML = `<div class="table-responsive"><table class="data-table">
            <thead><tr><th><input type="checkbox" id="selectAll-${sheetId}"></th><th>تاريخ الإرسال</th><th>المدرس</th><th>الصف</th><th>المادة</th><th>المحتوى</th></tr></thead>
            <tbody>${result.items.map(hw => `<tr>
                <td><input type="checkbox" class="checkbox-${sheetId}" value="${hw.id}"></td>
                <td>${new Date(hw.date).toLocaleDateString('ar-IQ')}</td>
                <td>${hw.teacher}</td>
                <td>${hw.class} ${hw.section}</td>
                <td>${hw.subject}</td>
                <td>${hw.content.substring(0, 100)}...</td>
            </tr>`).join('')}</tbody></table></div>
            ${getApprovalControls(sheetName)}`;
     } else { container.innerHTML = '<p>لا توجد واجبات بانتظار الموافقة.</p>'; }
}

async function loadPendingLibraryLinks() {
    const result = await callApi('getPendingLibraryLinks');
    const container = document.getElementById('pendingLibraryContainer');
    const sheetName = SHEETS.LIBRARY;
    const sheetId = sheetName.replace(/[_\.]/g, '-');

     if (result.success && result.items.length > 0) {
        container.innerHTML = `<div class="table-responsive"><table class="data-table">
            <thead><tr><th><input type="checkbox" id="selectAll-${sheetId}"></th><th>التاريخ</th><th>المدرس</th><th>الصف</th><th>المادة</th><th>العنوان</th><th>الرابط</th></tr></thead>
            <tbody>${result.items.map(lib => `<tr>
                <td><input type="checkbox" class="checkbox-${sheetId}" value="${lib.id}"></td>
                <td>${new Date(lib.date).toLocaleDateString('ar-IQ')}</td>
                <td>${lib.teacher}</td>
                <td>${lib.class}</td>
                <td>${lib.subject}</td>
                <td>${lib.title}</td>
                <td><a href="${lib.url}" target="_blank">فتح</a></td>
            </tr>`).join('')}</tbody></table></div>
            ${getApprovalControls(sheetName)}`;
     } else { container.innerHTML = '<p>لا توجد روابط مكتبة بانتظار الموافقة.</p>'; }
}


// --- دوال التقارير (جديد) ---
async function loadMissingSubmissions() {
    const container = document.getElementById('missingSubmissionsContainer');
    container.style.display = 'block';
    container.innerHTML = '<p>جاري تحليل جداول آخر 7 أيام... الرجاء الانتظار.</p>';
    
    const result = await callApi('getMissingSubmissions');
    if (!result.success) {
        container.innerHTML = `<p>خطأ: ${result.message}</p>`;
        return;
    }
    
    const report = result.report;
    if (Object.keys(report).length === 0) {
        container.innerHTML = '<p>ممتاز! جميع المدرسين ملتزمون بإرسال الواجبات والتقييمات لآخر 7 أيام.</p>';
        return;
    }
    
    let html = `<table class="data-table">
                    <thead>
                        <tr>
                            <th>المدرس</th>
                            <th>عدد تقصير (تقييمات)</th>
                            <th>عدد تقصير (واجبات)</th>
                            <th>التفاصيل</th>
                            <th>إجراء</th>
                        </tr>
                    </thead>
                    <tbody>`;
    
    for (const teacherId in report) {
        const item = report[teacherId];
        const message = `الأستاذ ${item.teacherName}، \nيرجى متابعة إرسال التقييمات والواجبات اليومية للحصص. \n\nتفاصيل التقصير (آخر 7 أيام):\n- ${item.details.join('\n- ')}`;
        
        html += `<tr>
            <td>${item.teacherName} (ID: ${item.teacherId})</td>
            <td>${item.evalMisses}</td>
            <td>${item.hwMisses}</td>
            <td>${item.details.join('<br>')}</td>
            <td>
                <button onclick="sendReminder('${item.teacherId}', \`${message}\`)" class="button btn-telegram" style="padding: 5px 10px; font-size: 0.8em;">
                    <i class="fab fa-telegram-plane"></i> إرسال تذكير
                </button>
            </td>
        </tr>`;
    }
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function sendReminder(teacherId, message) {
    // (تعديل) استبدال confirm بـ alert بسيط مؤقتاً
    // if (!confirm(`هل أنت متأكد من إرسال هذا التذكير؟\n\n${message}`)) return;
    const result = await callApi('sendSubmissionReminder', { teacherId, message });
    if (result.success) {
        alert(result.message);
    }
}

async function getStudentEvaluationSummary() {
    const payload = {
        studentId: document.getElementById('summaryStudentId').value,
        startDate: document.getElementById('summaryStartDate').value,
        endDate: document.getElementById('summaryEndDate').value,
    };
    if (!payload.studentId || !payload.startDate || !payload.endDate) {
        return alert('الرجاء إدخال ID الطالب وتحديد فترة زمنية.');
    }
    
    const result = await callApi('getStudentEvaluationSummary', payload);
    const container = document.getElementById('summaryReportContainer');
    const textArea = document.getElementById('summaryText');
    
    if (result.success) {
        container.style.display = 'block';
        textArea.value = result.summaryText; // (محدث) استخدام النص المنسق من الخادم
    } else {
        container.style.display = 'none';
        textArea.value = '';
        alert(result.message); // إظهار خطأ "لا توجد تقييمات"
    }
}

async function sendSummaryToTelegram() {
    const studentId = document.getElementById('summaryStudentId').value;
    const summaryText = document.getElementById('summaryText').value;
    if (!studentId || !summaryText) {
        return alert('الرجاء إنشاء الخلاصة أولاً.');
    }
    
    const result = await callApi('sendSummaryToTelegram', { studentId, summaryText });
    if (result.success) {
        alert(result.message);
    }
}

async function getGradesReportBySection() {
    const payload = {
        studentClass: document.getElementById('reportClassSelect').value,
        studentSection: document.getElementById('reportSectionSelect').value
    };
    if (!payload.studentClass || !payload.studentSection) {
        return alert('الرجاء اختيار الصف والشعبة.');
    }
    
    const result = await callApi('getGradesReportBySection', payload);
    const container = document.getElementById('gradesReportContainer');
    
    if (result.success && result.report.length > 0) {
        const allSubjects = new Set();
        result.report.forEach(student => {
            Object.keys(student.grades).forEach(subject => allSubjects.add(subject));
        });
        const subjectsArray = Array.from(allSubjects);
        
        let html = `<table class="data-table"><thead><tr><th>اسم الطالب</th>`;
        subjectsArray.forEach(subject => {
            html += `<th colspan="6">${subject}</th>`;
        });
        html += `</tr><tr><th></th>`;
        subjectsArray.forEach(subject => {
            html += `<th>ش1 ف1</th><th>ش2 ف1</th><th>نصف سنة</th><th>ش1 ف2</th><th>ش2 ف2</th><th>نهائي</th>`;
        });
        html += `</tr></thead><tbody>`;

        result.report.forEach(student => {
            html += `<tr><td>${student.studentName}</td>`;
            subjectsArray.forEach(subject => {
                const gradeData = student.grades[subject] || {};
                html += `
                    <td>${gradeData.Term1_Month1 || '-'}</td><td>${gradeData.Term1_Month2 || '-'}</td>
                    <td>${gradeData.MidYear_Exam || '-'}</td><td>${gradeData.Term2_Month1 || '-'}</td>
                    <td>${gradeData.Term2_Month2 || '-'}</td><td>${gradeData.Final_Exam || '-'}</td>
                `;
            });
            html += `</tr>`;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    } else {
        container.innerHTML = '<p>لا توجد درجات معتمدة لعرضها لهذه الشعبة.</p>';
    }
}

// ==========================================================
//                   (جديد) دوال متابعة الإرسال
// ==========================================================
async function loadSubmissionStatusReport(sheetName, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '<p>جاري تحميل السجلات...</p>';
    
    const result = await callApi('getSubmissionStatusReport', { sheetName });
    
    if (result.success && result.items.length > 0) {
        renderSubmissionStatusReport(result.items, containerId, sheetName);
    } else {
        container.innerHTML = `<p>${result.message || 'لا توجد سجلات لعرضها.'}</p>`;
    }
}

function renderSubmissionStatusReport(items, containerId, sheetName) {
    const container = document.getElementById(containerId);
    let html = `<div class="table-responsive"><table class="data-table">
                    <thead>
                        <tr>
                            <th>المدرس</th>
                            <th>الصف</th>
                            <th>المادة/المحتوى</th>
                            <th>حالة الموافقة</th>
                            <th>حالة التليجرام</th>
                            <th>إجراء</th>
                        </tr>
                    </thead>
                    <tbody>`;
    
    items.forEach(item => {
        let statusColor = 'black';
        if (item.telegramStatus.includes('فشل')) statusColor = '#dc3545';
        if (item.telegramStatus.includes('تم الإرسال')) statusColor = '#28a745';
        if (item.telegramStatus.includes('جاهز')) statusColor = '#007bff';
        
        const canBeSent = (item.status === 'منشور' || item.status === 'مجدول') && 
                          (item.telegramStatus.includes('فشل') || item.telegramStatus === 'جاهز للإرسال الآلي');

        html += `<tr>
            <td>${item.teacher}</td>
            <td>${item.class}</td>
            <td>${item.subject}</td>
            <td>${item.status}</td>
            <td style="color: ${statusColor}; font-weight: bold;">${item.telegramStatus}</td>
            <td>
                <button onclick="manualSend('${item.id}', '${sheetName}', this)" 
                        class="button btn-telegram" 
                        style="padding: 5px 10px; font-size: 0.8em;"
                        ${!canBeSent ? 'disabled' : ''}
                        title="${canBeSent ? 'إرسال هذا السجل الآن' : 'لا يمكن إرساله يدوياً'}">
                    <i class="fab fa-telegram-plane"></i> إرسال يدوي
                </button>
            </td>
        </tr>`;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

async function manualSend(itemId, sheetName, btnElement) {
    if (!confirm('هل أنت متأكد من رغبتك في إرسال هذا الإشعار يدوياً الآن؟')) return;
    
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    const result = await callApi('manualSendTelegram', { itemId, sheetName });
    
    if (result.success) {
        alert(result.message);
        // إعادة تحميل الجدول لتحديث الحالة
        if (sheetName === SHEETS.HOMEWORK) {
            loadSubmissionStatusReport(SHEETS.HOMEWORK, 'hwStatusContainer');
        } else {
            loadSubmissionStatusReport(SHEETS.DAILY_EVALUATIONS, 'evalStatusContainer');
        }
    } else {
        alert(result.message);
        btnElement.disabled = false;
        btnElement.innerHTML = '<i class="fab fa-telegram-plane"></i> إرسال يدوي';
    }
}


// --- دوال الإدارة (مستخدمين، إعدادات، جداول، أرشفة) ---

async function loadSystemSettings() {
    const result = await callApi('getSystemSettings');
    if (result.success) {
        const container = document.getElementById('settingsContainer');
        container.innerHTML = Object.keys(result.settings).map(key => {
            const setting = result.settings[key];
            return `<div class="setting-item">
                        <label>${setting.description}</label>
                        <label class="switch">
                            <input type="checkbox" data-key="${key}" ${setting.value === 'مفتوح' ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    </div>`;
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

async function loadAllUsers() {
    const result = await callApi('getAllUsers');
    const container = document.getElementById('usersContainer');
    if (result.success) {
        container.innerHTML = `<div class="table-responsive"><table class="data-table"><thead><tr><th>ID</th><th>الاسم الكامل</th><th>الدور</th><th>الحالة</th><th>ID تليجرام</th><th>صلاحية غياب</th></tr></thead><tbody>${result.users.map(user => `<tr><td>${user.userId}</td><td>${user.fullName}</td><td>${user.role}</td><td>${user.status}</td><td>${user.telegramId || 'لا يوجد'}</td><td>${user.role === 'مدرس' ? `<label class="switch"><input type="checkbox" class="permission-toggle" data-userid="${user.userId}" data-permission="canRecordAbsence" ${user.canRecordAbsence ? 'checked' : ''}><span class="slider round"></span></label>` : 'N/A'}</td></tr>`).join('')}</tbody></table></div>`;
        document.querySelectorAll('.permission-toggle').forEach(toggle => {
            toggle.addEventListener('change', async (event) => {
                const payload = { userId: event.target.dataset.userid, permission: event.target.dataset.permission, value: event.target.checked };
                // (تعديل) استخدام الدالة الجديدة الآمنة
                await callApi('updateUserPermission', payload);
            });
        });
    }
}

// (جديد) دوال المودال لإدارة المستخدمين
async function loadUserForEditing() {
    const userId = document.getElementById('searchUserId').value;
    if (!userId) return alert('الرجاء إدخال ID المستخدم.');
    
    const result = await callApi('getUserDetails', { userId });
    if (!result.success) return alert(result.message);
    
    const { headers, userData } = result;
    const form = document.getElementById('userEditForm');
    form.innerHTML = ''; // إفراغ النموذج
    form.dataset.currentUserId = userId; // تخزين ID المستخدم الحالي
    
    // بناء حقول النموذج ديناميكياً
    headers.forEach((header, index) => {
        const value = userData[index];
        const isReadOnly = (header === 'ID'); // جعل حقل ID للقراءة فقط
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.setAttribute('for', `edit-${header}`);
        label.textContent = header;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `edit-${header}`;
        input.name = header;
        input.value = value;
        if (isReadOnly) input.readOnly = true;
        
        formGroup.appendChild(label);
        formGroup.appendChild(input);
        
        // جعل بعض الحقول بعرض كامل
        if (['FullName', 'Email', 'Password', 'TelegramID', 'GuardianName', 'GuardianPhone', 'StudentPhone'].includes(header)) {
            formGroup.classList.add('full-width');
        }
        
        form.appendChild(formGroup);
    });
    
    document.getElementById('modalUserName').textContent = userData[4]; // (FullName)
    document.getElementById('userEditModal').style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('userEditModal').style.display = 'none';
}

async function saveUserChanges() {
    const form = document.getElementById('userEditForm');
    const userId = form.dataset.currentUserId;
    if (!userId) return alert('خطأ: لم يتم العثور على ID المستخدم.');
    
    const inputs = form.querySelectorAll('input, select');
    // (مهم) التأكد من الحفاظ على ترتيب الأعمدة
    const newRowData = Array.from(inputs).map(input => input.value); 
    
    const result = await callApi('updateUser', { userId, newRowData });
    if (result.success) {
        alert(result.message);
        closeUserModal();
        loadAllUsers(); // إعادة تحميل قائمة المستخدمين
    }
}
// ---------------------------------

async function archiveStudent() {
    const studentId = document.getElementById('archiveStudentId').value;
    if (!studentId) return alert('الرجاء إدخال ID الطالب.');
    // (تعديل) إزالة confirm
    // if (!confirm(`هل أنت متأكد من رغبتك في أرشفة جميع درجات الطالب صاحب الـ ID: ${studentId}؟`)) return;
    const result = await callApi('archiveStudentGrades', { studentId });
    if (result.success) {
        alert(result.message);
        document.getElementById('archiveStudentId').value = '';
    }
}

async function handleAnnouncementSubmit(e) {
    e.preventDefault(); 
    const payload = { 
        title: document.getElementById('annTitle').value, 
        content: document.getElementById('annContent').value, 
        audience: document.getElementById('annAudience').value,
        sendTelegram: document.getElementById('annSendTelegram').checked
    }; 
    const result = await callApi('createAnnouncement', payload); 
    if (result.success) { 
        alert(result.message); 
        e.target.reset(); 
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
    const subjectOptions = `<option value="">--</option>` + (subjects || []).map(s => `<option value="${s}">${s}</option>`).join('');

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
            } else {
                scheduleData[day][`lesson${i}`] = ''; // حفظ الفراغ
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