// Vice City Trophy Atlas: checklist tracker + roadmap renderer.
// Progress and settings live in localStorage only; nothing is sent anywhere.
const KEY = 'vice-city-trophy-atlas-progress-v1';
const SPOILER_KEY = 'vice-city-trophy-atlas-spoiler-v1';
const listEl = document.getElementById('list');
const statsEl = document.getElementById('stats');
const barFill = document.getElementById('barfill');
const searchEl = document.getElementById('search');
const kindEl = document.getElementById('kind');
const gradeEl = document.getElementById('grade');
const hideEarnedEl = document.getElementById('hideearned');
const spoilerEl = document.getElementById('spoiler');

const doc = await (await fetch('data/trophies.json')).json();
const roadmapDoc = await (await fetch('data/roadmap.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));

let earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]').filter((n) => trophies.some((t) => t.name === n)));
spoilerEl.checked = localStorage.getItem(SPOILER_KEY) === '1';

function saveProgress() {
  localStorage.setItem(KEY, JSON.stringify([...earned]));
}

function spoilerHidden(t) {
  return spoilerEl.checked && t.kind === 'story' && !earned.has(t.name);
}

function trophyMatches(t) {
  const q = searchEl.value.trim().toLowerCase();
  if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) return false;
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (kindEl.value === 'missable' && !t.missable) return false;
  if (kindEl.value === 'online') return false; // the official list has no online trophies
  if (kindEl.value !== 'all' && kindEl.value !== 'missable' && kindEl.value !== 'online' && t.kind !== kindEl.value) return false;
  if (hideEarnedEl.checked && earned.has(t.name)) return false;
  return true;
}

function renderStats() {
  const n = earned.size;
  const pct = Math.round((n / trophies.length) * 100);
  statsEl.textContent = `${n} of ${trophies.length} earned — ${pct}% to the platinum`;
  barFill.style.width = `${pct}%`;
  barFill.parentElement.setAttribute('role', 'progressbar');
  barFill.parentElement.setAttribute('aria-valuenow', String(pct));
}

function renderList() {
  listEl.replaceChildren();
  let shown = 0;
  for (const t of trophies) {
    if (!trophyMatches(t)) continue;
    shown += 1;
    const li = document.createElement('li');
    li.className = 'trophy' + (earned.has(t.name) ? ' earned' : '');
    const wrap = document.createElement('div');
    wrap.className = 'earn';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', `Mark ${t.name} as earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name); else earned.delete(t.name);
      saveProgress(); renderStats(); renderList();
    });
    const body = document.createElement('div');
    const h = document.createElement('h3');
    h.textContent = spoilerHidden(t) ? 'Hidden story trophy — earn it to reveal' : t.name;
    const tags = document.createElement('p');
    const gradeTag = document.createElement('span');
    gradeTag.className = `tag ${t.grade}`;
    gradeTag.textContent = t.grade;
    tags.append(gradeTag);
    const kindTag = document.createElement('span');
    kindTag.className = 'tag kind';
    kindTag.textContent = t.kind;
    tags.append(kindTag);
    if (t.missable) { const m = document.createElement('span'); m.className = 'tag missable'; m.textContent = 'Missable'; tags.append(m); }
    if (t.hidden) { const hh = document.createElement('span'); hh.className = 'tag hidden'; hh.textContent = 'Hidden'; tags.append(hh); }
    if (t.count != null) { const c = document.createElement('span'); c.className = 'tag kind'; c.textContent = `Count: ${t.count.toLocaleString('en-US')}`; tags.append(c); }
    body.append(h, tags);
    if (!spoilerHidden(t)) {
      const desc = document.createElement('p');
      desc.className = 'desc';
      desc.textContent = t.description;
      body.append(desc);
    }
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = spoilerHidden(t) ? 'Guide hidden until earned (spoiler-safe)' : 'Guide & sources';
    details.append(summary);
    if (!spoilerHidden(t)) {
      const guide = document.createElement('p');
      guide.className = 'guide';
      guide.textContent = t.guide;
      const steps = document.createElement('ol');
      steps.className = 'steps';
      for (const s of t.steps ?? []) { const sli = document.createElement('li'); sli.textContent = s; steps.append(sli); }
      const src = document.createElement('p');
      src.className = 'sources';
      src.textContent = 'Sources: ' + (t.sources ?? []).join(' · ');
      details.append(guide, steps, src);
    }
    body.append(details);
    wrap.append(box, body);
    li.append(wrap);
    listEl.append(li);
  }
  document.getElementById('empty').hidden = shown !== 0;
  renderStats();
}

function renderRoadmap() {
  const road = document.getElementById('roadmap');
  road.replaceChildren();
  for (const s of roadmapDoc.stages) {
    const li = document.createElement('li');
    const b = document.createElement('b');
    b.textContent = `Stage ${s.stage}: ${s.title}`;
    const p = document.createElement('p');
    p.textContent = s.text;
    const names = document.createElement('p');
    names.textContent = 'Trophies: ' + s.trophies.map((id) => byId.get(id)?.name ?? id).join(' · ');
    li.append(b, p, names);
    road.append(li);
  }
  const miss = document.getElementById('missables');
  miss.replaceChildren();
  for (const t of trophies.filter((x) => x.missable)) {
    const li = document.createElement('li');
    li.textContent = `${t.name} (${t.grade}) — ${t.description}`;
    miss.append(li);
  }
}

document.querySelectorAll('.tabs button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b === btn));
    for (const id of ['guide', 'roadmap', 'about']) {
      document.getElementById(`tab-${id}`).hidden = btn.dataset.tab !== id;
    }
  });
});

for (const el of [searchEl, kindEl, gradeEl, hideEarnedEl]) el.addEventListener('input', renderList);
spoilerEl.addEventListener('change', () => {
  localStorage.setItem(SPOILER_KEY, spoilerEl.checked ? '1' : '0');
  renderList();
});

document.getElementById('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned] }, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    earned = new Set(names.filter((n) => trophies.some((t) => t.name === n)));
    saveProgress(); renderList();
  } catch { alert('That file is not a valid progress export.'); }
});
document.getElementById('reset').addEventListener('click', () => {
  if (!confirm('Clear all earned trophies?')) return;
  earned = new Set(); saveProgress(); renderList();
});

renderRoadmap();
renderList();
