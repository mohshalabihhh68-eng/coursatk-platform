// ==========================================
// 1. دالة الـ Fetch الآمنة (عشان نمنع خطأ Unexpected token '<')
// ==========================================
async function apiFetch(url) {
    try {
        const response = await fetch(url);
        const contentType = response.headers.get("content-type");

        // لو السيرفر رجع HTML بدل JSON
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error(`❌ [API Error] المسار: ${url}`);
            console.error(`❌ الرد المستلم:`, text.substring(0, 100) + "...");
            throw new Error(`استلمت صفحة HTML بدل البيانات. تأكد من أن المسار ${url} يعمل في السيرفر.`);
        }

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || errData.error || `HTTP Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Fetch Error:", error);
        throw error; 
    }
}

// ==========================================
// 2. عناصر الواجهة (DOM)
// ==========================================
const container = document.getElementById('app-container') || document.body;
const loadingSpinner = document.getElementById('loading');

function showLoading(show) {
    if (loadingSpinner) loadingSpinner.style.display = show ? 'block' : 'none';
}

function showError(message) {
    container.innerHTML = `
        <div style="text-align:center; padding: 50px; color: #fff; font-family: sans-serif;">
            <div style="font-size: 50px; margin-bottom: 20px;">⚠️</div>
            <h2 style="color: #f44336;">حدث خطأ</h2>
            <p style="color: #aaa;">${message}</p>
            <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #2196F3; color: #fff; border: none; border-radius: 5px; cursor: pointer;">
                إعادة المحاولة
            </button>
        </div>
    `;
    showLoading(false);
}

// ==========================================
// 3. منطق التطبيق (Routing & Rendering)
// ==========================================

// دالة لجلب السنوات الدراسية وعرضها
async function loadYears() {
    showLoading(true);
    try {
        const data = await apiFetch('/api/years');
        // افترض إن الرد فيه مصفوفة اسمها data أو years
        const years = data.data || data.years || data; 
        
        if (!Array.isArray(years)) {
            throw new Error("البيانات المستلمة غير صحيحة");
        }

        // رسم الواجهة (مثال بسيط)
        let html = '<h1>السنوات الدراسية</h1><div class="grid">';
        years.forEach(year => {
            html += `
                <div class="card" onclick="window.location.href='/subjects.html?yearId=${year.id}'">
                    <h3>${year.name || year.title}</h3>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;

    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// دالة لجلب المواد (بتتنادى من صفحة subjects.html)
async function loadSubjects(yearId) {
    showLoading(true);
    try {
        // لو مش موجود yearId، نجيبه من الرابط
        if (!yearId) {
            const params = new URLSearchParams(window.location.search);
            yearId = params.get('yearId');
        }

        const data = await apiFetch(`/api/years`); // أو المسار اللي بيجيب المواد
        // هنا تحط كود رسم المواد
        console.log("Subjects Data:", data);
        
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// ==========================================
// 4. تشغيل الصفحة بناءً على المسار الحالي
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path === '/' || path === '/index.html') {
        loadYears();
    } else if (path === '/subjects.html') {
        const params = new URLSearchParams(window.location.search);
        loadSubjects(params.get('yearId'));
    } 
    // ... (تقدر تضيف باقي الصفحات هنا زي teachers, chapters, إلخ)
});
