const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const RSVPS_FILE = path.join(__dirname, 'rsvps.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function loadRSVPs() {
  try {
    if (fs.existsSync(RSVPS_FILE)) {
      return JSON.parse(fs.readFileSync(RSVPS_FILE, 'utf8'));
    }
  } catch (e) { console.error('Error reading RSVPs:', e); }
  return [];
}

function saveRSVPs(rsvps) {
  try {
    fs.writeFileSync(RSVPS_FILE, JSON.stringify(rsvps, null, 2));
  } catch (e) { console.error('Error saving RSVPs:', e); }
}

app.post('/api/rsvp', (req, res) => {
  const { name, attending, contact, notes } = req.body;
  if (!name || !attending) {
    return res.status(400).json({ success: false, error: 'Name and attendance required' });
  }
  const rsvps = loadRSVPs();
  rsvps.push({
    id: Date.now(),
    name: name.trim(),
    attending,
    contact: contact ? contact.trim() : '',
    notes: notes ? notes.trim() : '',
    timestamp: new Date().toISOString()
  });
  saveRSVPs(rsvps);
  console.log('New RSVP from ' + name + ' - ' + attending);
  res.json({ success: true });
});

app.get('/admin', (req, res) => {
  const rsvps = loadRSVPs();
  const yes = rsvps.filter(r => r.attending === 'yes').length;
  const maybe = rsvps.filter(r => r.attending === 'maybe').length;
  const no = rsvps.filter(r => r.attending === 'no').length;
  const rows = rsvps.length === 0
    ? '<tr><td colspan="5" style="text-align:center;color:#b07a9a;padding:2rem;">No RSVPs yet</td></tr>'
    : rsvps.map(r => {
        const badge = r.attending === 'yes'
          ? '<span style="background:#fce4ec;color:#e91e8c;padding:3px 10px;border-radius:20px;font-size:0.8rem;">Coming</span>'
          : r.attending === 'maybe'
          ? '<span style="background:#fff9c4;color:#f9a825;padding:3px 10px;border-radius:20px;font-size:0.8rem;">Maybe</span>'
          : '<span style="background:#f5f5f5;color:#999;padding:3px 10px;border-radius:20px;font-size:0.8rem;">Cannot make it</span>';
        const date = new Date(r.timestamp).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
        return '<tr><td>' + r.name + '</td><td>' + badge + '</td><td>' + (r.contact || '-') + '</td><td style="max-width:200px">' + (r.notes || '-') + '</td><td style="color:#b07a9a;font-size:0.85rem">' + date + '</td></tr>';
      }).join('');
  res.send('<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>RSVP Admin - Lola Birthday</title><link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700&family=Sacramento&display=swap" rel="stylesheet"><style>* { margin:0; padding:0; box-sizing:border-box; } body { font-family:Quicksand,sans-serif; background:#fff9f5; color:#4a2040; } header { background:linear-gradient(135deg,#f48fb1,#ec407a); color:white; padding:2rem 3rem; } header h1 { font-family:Sacramento,cursive; font-size:3rem; } header p { opacity:.9; font-size:.9rem; letter-spacing:2px; text-transform:uppercase; margin-top:.25rem; } .stats { display:flex; gap:1.5rem; padding:2rem 3rem; flex-wrap:wrap; } .stat { background:white; border-radius:16px; padding:1.5rem 2rem; text-align:center; box-shadow:0 4px 20px rgba(236,64,122,.08); flex:1; min-width:120px; } .stat .num { font-size:2.5rem; font-weight:700; color:#ec407a; } .stat .label { font-size:.75rem; letter-spacing:2px; text-transform:uppercase; color:#b07a9a; margin-top:.25rem; } .table-wrap { padding:0 3rem 3rem; overflow-x:auto; } table { width:100%; border-collapse:collapse; background:white; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(236,64,122,.06); } th { background:#fce4ec; color:#c2185b; font-size:.75rem; letter-spacing:2px; text-transform:uppercase; padding:1rem 1.2rem; text-align:left; } td { padding:1rem 1.2rem; border-bottom:1px solid #fce4ec; vertical-align:top; } tr:last-child td { border-bottom:none; } tr:hover td { background:#fff0f5; }</style></head><body><header><h1>Lola Birthday RSVPs</h1><p>Kimpton Seafire Resort - September 26, 2026</p></header><div class="stats"><div class="stat"><div class="num">' + rsvps.length + '</div><div class="label">Total RSVPs</div></div><div class="stat"><div class="num" style="color:#e91e8c">' + yes + '</div><div class="label">Coming</div></div><div class="stat"><div class="num" style="color:#f9a825">' + maybe + '</div><div class="label">Maybe</div></div><div class="stat"><div class="num" style="color:#999">' + no + '</div><div class="label">Cannot come</div></div></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Attending</th><th>Contact</th><th>Notes</th><th>Submitted</th></tr></thead><tbody>' + rows + '</tbody></table></div></body></html>');
});

app.listen(PORT, () => {
  console.log('Lola Birthday server running on port ' + PORT);
});
