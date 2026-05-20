// --- SUPABASE CONFIGURATION (FIXED VARIABLE NAME) ---
const SUPABASE_URL = 'https://muohbhsatkbopsauykqb.supabase.co'; // <-- Ponga su URL aquí
const SUPABASE_ANON_KEY = 'sb_publishable_OLENpIjsq7qlM2p6YsC18A_tH4723Wp'; // <-- Ponga su Key aquí
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- APP STATE ---
let isExtraMode = false;
let currentDate = new Date().toISOString().split('T')[0];
let recordsCache = {}; 

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {

    // --- SECURITY PROTOCOL (SHA-256 MILITARY GRADE) ---
    // Este es el Hash de AWDCP2526. Aunque el repositorio sea público, es irreversible.
    const SECRET_HASH = "b25c3413cb00ba580bcba9e9eb0bc4631cd085f1c97a220268ec3ba65191deac";

    const modal = document.getElementById('security-modal');
    const pwdInput = document.getElementById('auth-password');
    const btnUnlock = document.getElementById('btn-unlock');
    const btnGuest = document.getElementById('btn-guest');
    const errorMsg = document.getElementById('auth-error');

    // Función que transforma lo que usted escribe en la misma "hamburguesa" para comparar
    async function attemptUnlock() {
        const password = pwdInput.value;
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        
        try {
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            if (inputHash === SECRET_HASH) {
                // Huella confirmada: Acceso concedido
                modal.style.display = 'none';
            } else {
                throw new Error("Invalid Auth");
            }
        } catch (e) {
            // Huella rechazada: Expulsión
            errorMsg.style.display = 'block';
            pwdInput.style.borderColor = '#ef4444';
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        }
    }

    btnUnlock.addEventListener('click', attemptUnlock);
    pwdInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') attemptUnlock(); });
    btnGuest.addEventListener('click', () => { window.location.href = 'dashboard.html'; });

    btnUnlock.addEventListener('click', attemptUnlock);
    pwdInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') attemptUnlock(); });
    btnGuest.addEventListener('click', () => { window.location.href = 'dashboard.html'; });

    const dateInput = document.getElementById('class-date');
    dateInput.value = currentDate;
    dateInput.addEventListener('change', (e) => {
        currentDate = e.target.value;
        loadRecords();
    });

    document.getElementById('btn-toggle-mode').addEventListener('click', toggleMode);

    document.querySelectorAll('.circle-btn').forEach(btn => {
        const studentId = parseInt(btn.getAttribute('data-id'));
        
        // Left Click = Add (+1)
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            handleAction(studentId, 'add');
        });

        // Right Click = Subtract (-1)
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            handleAction(studentId, 'subtract');
        });
    });

    loadRecords();
});

// --- CORE FUNCTIONS ---
function toggleMode() {
    isExtraMode = !isExtraMode;
    const btn = document.getElementById('btn-toggle-mode');
    const body = document.getElementById('app-body');

    if (isExtraMode) {
        body.classList.add('extra-mode');
        btn.innerText = 'CURRENT MODE: EXTRA POINTS ✨';
    } else {
        body.classList.remove('extra-mode');
        btn.innerText = 'CURRENT MODE: PARTICIPATION';
    }
    updateAllCounters();
}

async function loadRecords() {
    const { data, error } = await supabaseClient
        .from('class_records')
        .select('*')
        .eq('record_date', currentDate);

    if (error) {
        console.error("Error loading records:", error);
        return;
    }

    recordsCache = {};
    if (data) {
        data.forEach(record => {
            recordsCache[record.student_id] = record;
        });
    }
    updateAllCounters();
}

function updateAllCounters() {
    document.querySelectorAll('.circle-btn').forEach(btn => {
        const studentId = parseInt(btn.getAttribute('data-id'));
        const counterSpan = document.getElementById(`counter-${studentId}`);
        
        const record = recordsCache[studentId] || { participations: 0, extra_points: 0 };
        const valueToShow = isExtraMode ? record.extra_points : record.participations;

        if (valueToShow > 0) {
            counterSpan.innerText = valueToShow;
            counterSpan.classList.add('visible');
        } else {
            counterSpan.classList.remove('visible');
        }
    });
}

async function handleAction(studentId, action) {
    let record = recordsCache[studentId] || { 
        student_id: studentId, 
        record_date: currentDate, 
        participations: 0, 
        extra_points: 0 
    };

    const isAdd = action === 'add';

    if (isExtraMode) {
        record.extra_points = isAdd ? record.extra_points + 1 : Math.max(0, record.extra_points - 1);
    } else {
        record.participations = isAdd ? record.participations + 1 : Math.max(0, record.participations - 1);
    }

    recordsCache[studentId] = record;
    updateAllCounters();
    triggerAnimation(studentId, isAdd);

    // Guardar en base de datos usando la variable corregida
    const { error } = await supabaseClient.from('class_records').upsert({
        student_id: studentId,
        record_date: currentDate,
        participations: record.participations,
        extra_points: record.extra_points
    }, { onConflict: 'student_id,record_date' });

    if (error) console.error("Database sync error:", error);
}

// --- VISUAL EFFECTS ---
function triggerAnimation(studentId, isAdd) {
    const animContainer = document.getElementById(`anim-${studentId}`);
    if (!animContainer) return;

    const floatEl = document.createElement('div');
    floatEl.className = isAdd ? 'floating-text-plus' : 'floating-text-minus';
    floatEl.innerText = isAdd ? '+1' : '-1';
    animContainer.appendChild(floatEl);

    setTimeout(() => floatEl.remove(), 1000);

    if (isExtraMode && isAdd) {
        for (let i = 0; i < 8; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle-star';
            sparkle.innerText = '✨';
            
            const angle = Math.random() * Math.PI * 2;
            const distance = 40 + Math.random() * 50; 
            const dx = Math.cos(angle) * distance + 'px';
            const dy = Math.sin(angle) * distance + 'px';
            
            sparkle.style.setProperty('--dx', dx);
            sparkle.style.setProperty('--dy', dy);
            
            animContainer.appendChild(sparkle);
            setTimeout(() => sparkle.remove(), 800);
        }
    }
}