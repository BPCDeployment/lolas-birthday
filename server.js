const express = require('express');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const RSVPS_FILE = path.join(__dirname, 'rsvps.json');

const PASSWORD   = 'Coquette2026';
const AUTH_TOKEN = 'lola-vip-seafire-2026';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Auth helper ──
function isAuthenticated(req) {
    return req.cookies && req.cookies['lola-vip'] === AUTH_TOKEN;
}

// ── Login endpoint (no auth required) ──
app.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === PASSWORD) {
        res.cookie('lola-vip', AUTH_TOKEN, {
            maxAge: 7 * 24 * 60 * 60 * 1000,   // 7 days
            httpOnly: true,
            sameSite: 'lax'
        });
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: 'Wrong password, darling! 💔' });
    }
});

// ── Auth middleware — runs before static files & all other routes ──
app.use((req, res, next) => {
    // Always allow the login endpoint and the gateway page itself
    if (req.path === '/login' || req.path === '/gateway.html') return next();

    if (!isAuthenticated(req)) {
        // API calls get a proper 401
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Everything else (/, /admin, etc.) gets the gateway
        return res.sendFile(path.join(__dirname, 'public', 'gateway.html'));
    }
    next();
});

// ── Static files (serves public/index.html for /) ──
app.use(express.static(path.join(__dirname, 'public')));

// ── RSVP endpoint ──
app.post('/api/rsvp', (req, res) => {
    const { name, attending, contact, notes } = req.body;
    if (!name || !attending) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    let rsvps = [];
    if (fs.existsSync(RSVPS_FILE)) {
        try { rsvps = JSON.parse(fs.readFileSync(RSVPS_FILE, 'utf8')); } catch (e) { rsvps = []; }
    }

    rsvps.push({
        id: Date.now(), name, attending,
        contact: contact || '',
        notes: notes || '',
        submittedAt: new Date().toISOString()
    });

    fs.writeFileSync(RSVPS_FILE, JSON.stringify(rsvps, null, 2));
    res.json({ success: true, message: 'RSVP received! 🎀' });
});

// ── Admin dashboard ──
app.get('/admin', (req, res) => {
    let rsvps = [];
    if (fs.existsSync(RSVPS_FILE)) {
        try { rsvps = JSON.parse(fs.readFileSync(RSVPS_FILE, 'utf8')); } catch (e) { rsvps = []; }
    }

    const yes   = rsvps.filter(r => r.attending === 'yes').length;
    const no    = rsvps.filter(r => r.attending === 'no').length;
    const maybe = rsvps.filter(r => r.attending === 'maybe').length;

    const rows = rsvps.map(r => `
        <tr>
            <td>${r.name}</td>
            <td>${r.attending === 'yes' ? '✅ Yes' : r.attending === 'no' ? '❌ No' : '🤔 Maybe'}</td>
            <td>${r.contact || '—'}</td>
            <td>${r.notes || '—'}</td>
            <td>${new Date(r.submittedAt).toLocaleDateString()}</td>
        </tr>`).join('');

    res.send(`<!DOCTYPE html>
<html><head>
    <title>Lola's Party — RSVP Admin 🎀</title>
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700&family=Sacramento&display=swap" rel="stylesheet">
    <style>
        body { font-family:'Quicksand',sans-serif; background:#fff9f5; padding:2rem; color:#4a2040; }
        h1   { font-family:'Sacramento',cursive; font-size:3rem; color:#ec407a; margin-bottom:.4rem; }
        .meta{ color:#b07a9a; letter-spacing:2px; font-size:.82rem; text-transform:uppercase; margin-bottom:1.5rem; }
        .stats{ display:flex; gap:1rem; margin-bottom:2rem; flex-wrap:wrap; }
        .stat{ background:#fff; border-radius:16px; padding:1.2rem 2rem; box-shadow:0 4px 20px rgba(236,64,122,.07); border:1px solid rgba(244,143,177,.15); text-align:center; min-width:110px; }
        .stat-num{ font-size:2rem; font-weight:700; color:#ec407a; }
        .stat-label{ font-size:.72rem; letter-spacing:2px; text-transform:uppercase; color:#b07a9a; }
        table{ width:100%; border-collapse:collapse; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(236,64,122,.07); }
        th{ background:linear-gradient(135deg,#f48fb1,#ec407a); color:#fff; padding:1rem; text-align:left; font-size:.78rem; letter-spacing:2px; text-transform:uppercase; }
        td{ padding:.9rem 1rem; border-bottom:1px solid rgba(244,143,177,.1); color:#7a4a6a; }
        tr:hover td{ background:rgba(255,240,245,.5); }
        tr:last-child td{ border-bottom:none; }
        .empty{ text-align:center; color:#b07a9a; padding:3rem; }
    </style>
</head><body>
    <h1>🎀 Lola's Party RSVPs</h1>
    <p class="meta">September 26, 2026 · Kimpton Seafire Resort · Grand Cayman</p>
    <div class="stats">
        <div class="stat"><div class="stat-num">${rsvps.length}</div><div class="stat-label">Total</div></div>
        <div class="stat"><div class="stat-num" style="color:#4caf50">${yes}</div><div class="stat-label">Coming ✅</div></div>
        <div class="stat"><div class="stat-num" style="color:#ff9800">${maybe}</div><div class="stat-label">Maybe 🤔</div></div>
        <div class="stat"><div class="stat-num" style="color:#f44336">${no}</div><div class="stat-label">Can't Come ❌</div></div>
    </div>
    ${rsvps.length === 0
        ? '<p class="empty">No RSVPs yet — the party\'s just getting started! 🎀</p>'
        : `<table><thead><tr><th>Name</th><th>Attending</th><th>Contact</th><th>Notes</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>`}
</body></html>`);
});

app.listen(PORT, () => console.log(`🎀 Lola's Birthday server running on port ${PORT}`));
