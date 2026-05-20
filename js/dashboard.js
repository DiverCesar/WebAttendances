// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://muohbhsatkbopsauykqb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OLENpIjsq7qlM2p6YsC18A_tH4723Wp';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    const { data, error } = await supabaseClient
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
            extraPoints: record.extra_points
        };
    });

    // Sort by Participations (Descending). If tied, sort by ID (Ascending)
    summaryList.sort((a, b) => {
        if (b.participations !== a.participations) {
            return b.participations - a.participations;
        }
        return a.id - b.id;
    });

    // Render Rows (Showing everyone, including zeros)
    summaryList.forEach(student => {
        const tr = document.createElement('tr');
        tr.id = `row-${student.id}`; 

        tr.innerHTML = `
        <td class="col-student">${student.lastName}</td>
        <td><span class="${student.participations > 0 ? 'badge-blue' : ''}">${student.participations}</span></td>
        <td><span class="${student.extraPoints > 0 ? 'badge-gold' : ''}">${student.extraPoints}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// --- REAL-TIME LISTENER ---
function subscribeToRealTimeUpdates() {
    supabaseClient
    .channel('public:class_records')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'class_records' }, payload => {
        const updatedRecord = payload.new;

        if (updatedRecord && updatedRecord.record_date === currentDate) {
            loadDashboardData().then(() => {
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
        void row.offsetWidth; 
        row.classList.add('row-updated');
    }
}

function showToastAlert(studentName) {
    const alertBox = document.getElementById('real-time-alert');
    alertBox.innerText = `Record updated for ${studentName}`;
    alertBox.classList.add('show');

    setTimeout(() => {
        alertBox.classList.remove('show');
    }, 3000);
}