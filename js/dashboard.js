// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://muohbhsatkbopsauykqb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OLENpIjsq7qlM2p6YsC18A_tH4723Wp';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentDate = new Date().toISOString().split('T')[0];

// Catalog to map IDs to Last Names for the table
const studentCatalog = {
    1: "ALVARADO", 2: "ANDINO", 3: "CALDERON",
    4: "CARDENAS", 5: "CHUQUI", 6: "DIAZ",
    7: "ERAZO", 8: "GALARZA", 9: "GUALOTUÑA",
    10: "MOLINA", 11: "MONGE", 12: "OBANDO",
    13: "QUIROGA", 14: "RODRIGUEZ", 15: "SABANDO",
    16: "TORRES", 17: "VILLARREAL"
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('dashboard-date');
    dateInput.value = currentDate;

    dateInput.addEventListener('change', (e) => {
        currentDate = e.target.value;
        loadDashboardData();
    });

    loadDashboardData();
    subscribeToRealTimeUpdates();
});

// --- CORE FUNCTIONS ---
async function loadDashboardData() {
    const { data, error } = await supabase
    .from('class_records')
    .select('*')
    .eq('record_date', currentDate);

    if (error) {
        console.error("Error fetching dashboard data:", error);
        return;
    }

    renderTable(data || []);
}

function renderTable(records) {
    const tbody = document.getElementById('summary-table-body');
    tbody.innerHTML = '';

    // Merge Catalog with DB Records
    const summaryList = Object.keys(studentCatalog).map(idStr => {
        const id = parseInt(idStr);
        const record = records.find(r => r.student_id === id) || { participations: 0, extra_points: 0 };
        return {
            id: id,
            lastName: studentCatalog[id],
            participations: record.participations,
            extraPoints: record.extra_points,
            // Logic: Extra points weight more for sorting
            total: record.participations + (record.extra_points * 2)
        };
    });

    // Sort by Total (Descending)
    summaryList.sort((a, b) => b.total - a.total);

    // Render Rows
    summaryList.forEach(student => {
        if (student.total === 0) return; // Keep table clean, hide zero records

        const tr = document.createElement('tr');
        tr.id = `row-${student.id}`; // Crucial ID for real-time highlighting

        tr.innerHTML = `
        <td class="col-student">${student.lastName}</td>
        <td><span class="${student.participations > 0 ? 'badge-blue' : ''}">${student.participations > 0 ? student.participations : '-'}</span></td>
        <td><span class="${student.extraPoints > 0 ? 'badge-gold' : ''}">${student.extraPoints > 0 ? student.extraPoints : '-'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- REAL-TIME LISTENER ---
function subscribeToRealTimeUpdates() {
    supabase
    .channel('public:class_records')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'class_records' }, payload => {
        // Check if the change corresponds to the date currently being viewed
        const updatedRecord = payload.new;

        if (updatedRecord && updatedRecord.record_date === currentDate) {
            // Reload data to ensure proper sorting
            loadDashboardData().then(() => {
                // Trigger visual feedback once table is re-rendered
                highlightRow(updatedRecord.student_id);
                showToastAlert(studentCatalog[updatedRecord.student_id]);
            });
        }
    })
    .subscribe();
}

// --- VISUAL FEEDBACK ---
function highlightRow(studentId) {
    const row = document.getElementById(`row-${studentId}`);
    if (row) {
        row.classList.remove('row-updated');
        void row.offsetWidth; // Force DOM reflow to restart animation
        row.classList.add('row-updated');
    }
}

function showToastAlert(studentName) {
    const alertBox = document.getElementById('real-time-alert');
    alertBox.innerText = `Record updated for ${studentName}`;
    alertBox.classList.add('show');

    // Hide after 3 seconds
    setTimeout(() => {
        alertBox.classList.remove('show');
    }, 3000);
}
