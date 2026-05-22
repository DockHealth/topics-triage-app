// store.jsx — shared state, persistence, sample data, helpers

const STORAGE_KEY = 'allhands-triage-v1';

const CATEGORIES = [
  { id: 'lightning', name: 'Lightning', time: '5 min', emoji: '⚡', color: '--lit', votesPerUser: 12 },
  { id: 'quick',     name: 'Quick Hit', time: '15 min', emoji: '◉',  color: '--quick', votesPerUser: 5 },
  { id: 'spotlight', name: 'Spotlight', time: '30 min', emoji: '✦',  color: '--spot', votesPerUser: 2 },
];
const CAT_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

const STEPS = [
  { id: 1, label: 'Enter Topics' },
  { id: 2, label: 'Classify' },
  { id: 3, label: 'Summarize' },
  { id: 4, label: 'Rank' },
  { id: 5, label: 'Elections' },
];
const CONFIG_STEP = { id: 'config', label: 'Configuration' };

// Seeded team — pre-loaded list per spec
const SEED_USERS = [
  { id: 'u1', name: 'Avery Chen' },
  { id: 'u2', name: 'Marcus Reid' },
  { id: 'u3', name: 'Priya Shah' },
  { id: 'u4', name: 'Jordan Kim' },
  { id: 'u5', name: 'Sam Okafor' },
  { id: 'u6', name: 'Elena Vargas' },
  { id: 'u7', name: 'Ben Tanaka' },
  { id: 'u8', name: 'Dani Hollis' },
];

const SEED_TOPICS = [
  { id: 't1', title: 'Q3 roadmap walkthrough', description: 'Where we landed on priorities, what shifted, and what we are deferring to Q4. Open Q&A.', author: 'u3' },
  { id: 't2', title: 'On-call rotation pain points', description: 'Pages per week trending up. Quick share-out on what is causing churn and one proposal.', author: 'u2' },
  { id: 't3', title: 'New hire shoutouts', description: 'Welcome the three folks who started this month — 60 seconds each.', author: 'u6' },
  { id: 't4', title: 'Customer interview highlights', description: 'Three patterns from last month\u2019s research that should change how we scope next quarter.', author: 'u4' },
  { id: 't5', title: 'Performance review timeline', description: 'Refresh on the cycle: dates, expectations, and the rubric changes from last cycle.', author: 'u1' },
  { id: 't6', title: 'Office reopen logistics', description: 'Badges, parking, hybrid days. Five-minute update from people-ops.', author: 'u7' },
  { id: 't7', title: 'AI usage policy draft', description: 'First draft of internal guidance on tooling, data handling, and what is off-limits. Need feedback.', author: 'u5' },
  { id: 't8', title: 'Birthday wins for the quarter', description: 'Two wins worth celebrating, one thing we got wrong, one lesson we are carrying forward.', author: 'u8' },
  { id: 't9', title: 'Demo: new triage workflow', description: 'Five-minute live demo of the cross-team handoff tool. No slides.', author: 'u4' },
  { id: 't10', title: 'Compensation philosophy refresh', description: 'How we think about bands, raises, equity refreshes. Long-form because there are lots of questions.', author: 'u1' },
];

const AVATAR_COLORS = [
  '#C4501E', '#2E7E6E', '#8B3A62', '#3B6BB5', '#6F4FA1', '#B07A1C', '#4A8B3A', '#A04545',
];

function avatarColor(userId) {
  if (!userId) return '#8A857A';
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function defaultState() {
  return {
    step: 'config',
    users: SEED_USERS.slice(),
    topics: [],
    // classifications[topicId][userId] = 'lightning' | 'quick' | 'spotlight'
    classifications: {},
    // overrides[topicId] = categoryId (admin override)
    overrides: {},
    // votes[userId][topicId] = true
    votes: {},
    activeClassifierId: SEED_USERS[0].id,
    activeVoterId: SEED_USERS[0].id,
    sampleLoaded: false,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

// Helpers

function tallyForTopic(state, topicId) {
  const byUser = state.classifications[topicId] || {};
  const counts = { lightning: 0, quick: 0, spotlight: 0 };
  for (const u of Object.values(byUser)) {
    if (counts[u] !== undefined) counts[u]++;
  }
  return counts;
}

function majorityCategory(counts) {
  let best = null, bestN = 0, tied = false;
  for (const c of ['spotlight', 'quick', 'lightning']) { // tie-break favoring longer time slots
    const n = counts[c] || 0;
    if (n > bestN) { best = c; bestN = n; tied = false; }
    else if (n === bestN && n > 0 && best !== c) { tied = true; }
  }
  return { category: bestN > 0 ? best : null, tied, count: bestN };
}

function effectiveCategory(state, topicId) {
  if (state.overrides[topicId]) return state.overrides[topicId];
  const { category } = majorityCategory(tallyForTopic(state, topicId));
  return category;
}

function topicsByCategory(state) {
  const groups = { lightning: [], quick: [], spotlight: [], unclassified: [] };
  for (const t of state.topics) {
    const c = effectiveCategory(state, t.id);
    if (c) groups[c].push(t); else groups.unclassified.push(t);
  }
  return groups;
}

function userVoteCounts(state, userId) {
  const votes = state.votes[userId] || {};
  const counts = { lightning: 0, quick: 0, spotlight: 0 };
  for (const topicId of Object.keys(votes)) {
    if (!votes[topicId]) continue;
    const c = effectiveCategory(state, topicId);
    if (c && counts[c] !== undefined) counts[c]++;
  }
  return counts;
}

function topicVoteCount(state, topicId) {
  let n = 0;
  const voters = [];
  for (const u of state.users) {
    if (state.votes[u.id]?.[topicId]) { n++; voters.push(u); }
  }
  return { count: n, voters };
}

function userClassifyProgress(state, userId) {
  const total = state.topics.length;
  let done = 0;
  for (const t of state.topics) {
    if (state.classifications[t.id]?.[userId]) done++;
  }
  return { done, total };
}

function uid(prefix='t') {
  return prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
}

// Generate seeded classifications/votes for sample data
function seedSampleClassifications(state) {
  // Deterministic-ish hand-tuned: gives nice distributions for the demo
  const plan = {
    t1: { spotlight: 5, quick: 2, lightning: 1 },        // spotlight winner
    t2: { quick: 5, lightning: 2, spotlight: 1 },         // quick
    t3: { lightning: 7, quick: 1 },                       // lightning
    t4: { spotlight: 4, quick: 3, lightning: 1 },         // spotlight
    t5: { quick: 6, lightning: 2 },                       // quick
    t6: { lightning: 6, quick: 2 },                       // lightning
    t7: { spotlight: 4, quick: 4 },                       // tie
    t8: { lightning: 5, quick: 3 },                       // lightning
    t9: { quick: 6, lightning: 1, spotlight: 1 },         // quick
    t10: { spotlight: 6, quick: 2 },                      // spotlight
  };
  const cls = {};
  for (const t of state.topics) {
    const dist = plan[t.id]; if (!dist) continue;
    const assignments = [];
    for (const [cat, n] of Object.entries(dist)) for (let i = 0; i < n; i++) assignments.push(cat);
    cls[t.id] = {};
    state.users.forEach((u, i) => {
      if (assignments[i]) cls[t.id][u.id] = assignments[i];
    });
  }
  return cls;
}

function seedSampleVotes(state) {
  // Plausible vote spread per topic per user.
  // Crafted so every user stays within their per-category limits
  // (≤2 Spotlight, ≤5 Quick Hit, ≤12 Lightning) given the override that
  // promotes t7 → Spotlight.
  const topicVoters = {
    // Spotlight (incl. t7 after override): every user appears in ≤2 of these
    t1:  ['u1','u2','u3','u4','u6','u7'],
    t10: ['u3','u7'],
    t4:  ['u2','u4','u5','u6','u8'],
    t7:  ['u1','u5','u8'],
    // Quick Hit
    t2:  ['u1','u2','u3','u4','u6','u7','u8'],
    t5:  ['u2','u4','u5','u6'],
    t9:  ['u1','u3','u4','u5','u6','u7','u8'],
    // Lightning
    t3:  ['u1','u2','u3','u4','u5','u6','u7','u8'],
    t6:  ['u2','u3','u4','u7'],
    t8:  ['u1','u3','u5','u8'],
  };
  const votes = {};
  for (const u of state.users) votes[u.id] = {};
  // Build a snapshot state that includes our override so effectiveCategory
  // reflects the demo's intended categories, then clamp to limits defensively.
  const snapshot = { ...state, overrides: { ...(state.overrides || {}), t7: 'spotlight' } };
  const used = Object.fromEntries(state.users.map(u => [u.id, { lightning: 0, quick: 0, spotlight: 0 }]));
  for (const [tid, users] of Object.entries(topicVoters)) {
    const cat = effectiveCategory(snapshot, tid);
    if (!cat) continue;
    const limit = CAT_BY_ID[cat].votesPerUser;
    for (const uid of users) {
      if (used[uid][cat] >= limit) continue; // defensive clamp
      votes[uid][tid] = true;
      used[uid][cat]++;
    }
  }
  return votes;
}

// Expose
// ============================================================
// CSV parsing — handles quoted fields with embedded commas / newlines
// ============================================================
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  // flush
  if (field.length || row.length) { row.push(field); rows.push(row); }
  // strip any trailing fully-empty rows
  while (rows.length && rows[rows.length - 1].every(c => c.trim() === '')) rows.pop();
  return rows;
}

function looksLikeHeader(row, kind) {
  const cells = row.map(c => c.trim().toLowerCase());
  if (kind === 'users') return cells[0] === 'name' || cells[0] === 'full name' || cells[0] === 'fullname';
  if (kind === 'topics') return cells[0] === 'title' || cells[0] === 'topic';
  return false;
}

function parseUsersCSV(text) {
  const rows = parseCSV(text);
  if (!rows.length) return { users: [], skipped: 0, error: 'File is empty.' };
  const start = looksLikeHeader(rows[0], 'users') ? 1 : 0;
  const users = [];
  let skipped = 0;
  for (let i = start; i < rows.length; i++) {
    const name = (rows[i][0] || '').trim();
    if (!name) { skipped++; continue; }
    users.push({ id: uid('u'), name });
  }
  return { users, skipped, error: users.length ? null : 'No valid names found.' };
}

function parseTopicsCSV(text) {
  const rows = parseCSV(text);
  if (!rows.length) return { topics: [], skipped: 0, error: 'File is empty.' };
  const start = looksLikeHeader(rows[0], 'topics') ? 1 : 0;
  const topics = [];
  let skipped = 0;
  for (let i = start; i < rows.length; i++) {
    const title = (rows[i][0] || '').trim();
    const desc = (rows[i][1] || '').trim();
    if (!title) { skipped++; continue; }
    topics.push({ id: uid('t'), title, description: desc });
  }
  return { topics, skipped, error: topics.length ? null : 'No valid topics found.' };
}

function usersToCSV(users) {
  const esc = (s) => /[,"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  return 'name\n' + users.map(u => esc(u.name)).join('\n');
}
function topicsToCSV(topics) {
  const esc = (s) => /[,"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  return 'title,description\n' + topics.map(t => `${esc(t.title)},${esc(t.description || '')}`).join('\n');
}

// Non-roster header names to skip when parsing classifications CSV
const NON_ROSTER_COLS = new Set(['?', 'l', 'q', 's', 'forced', 'force', 'override', 'category', 'classification', 'assign', 'topic assign l, q, s', 'topic']);

function parseClassificationsCSV(text, users, topics) {
  const rows = parseCSV(text);
  if (rows.length < 2) return { classifications: {}, overrides: {}, matched: 0, skipped: 0, error: 'File needs at least a header row and one data row.' };

  const header = rows[0].map(c => c.trim());
  const CAT_ABBR = { l: 'lightning', q: 'quick', s: 'spotlight' };

  // Map user names (lowercase) → user object
  const userByName = {};
  for (const u of users) userByName[u.name.trim().toLowerCase()] = u;

  // Map topic titles (lowercase) → topic object
  const topicByTitle = {};
  for (const t of topics) topicByTitle[t.title.trim().toLowerCase()] = t;

  // Classify each column: 'forced', {type:'user', userId}, or null (skip)
  const colRoles = header.map((h, i) => {
    if (i === 0) return null; // topic title column
    const hl = h.toLowerCase();
    if (hl === 'forced' || hl === 'force' || hl === 'override') return 'forced';
    if (NON_ROSTER_COLS.has(hl)) return null;
    const u = userByName[hl];
    return u ? { userId: u.id } : null;
  });

  const classifications = {};
  const overrides = {};
  let matched = 0, skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const title = (row[0] || '').trim();
    if (!title) { skipped++; continue; }

    const topic = topicByTitle[title.toLowerCase()];
    if (!topic) { skipped++; continue; }

    matched++;
    if (!classifications[topic.id]) classifications[topic.id] = {};

    for (let j = 1; j < row.length; j++) {
      const role = colRoles[j];
      if (!role) continue;
      const val = (row[j] || '').trim().toLowerCase();
      const cat = CAT_ABBR[val];
      if (!cat) continue;
      if (role === 'forced') {
        overrides[topic.id] = cat;
      } else {
        classifications[topic.id][role.userId] = cat;
      }
    }
  }

  return {
    classifications,
    overrides,
    matched,
    skipped,
    error: matched === 0 ? 'No topic titles matched the loaded topics. Check that topic titles are identical.' : null,
  };
}

// Non-roster header names to skip when parsing rankings CSV
const NON_ROSTER_RANK_COLS = new Set(['type', 'rank', 'total', 'votes', 'count', 'score', 'category', 'classification', 'topic']);

function parseRankingsCSV(text, users, topics) {
  const rows = parseCSV(text);
  if (rows.length < 2) return { votes: {}, matched: 0, skipped: 0, overBudget: [], error: 'File needs at least a header row and one data row.' };

  const header = rows[0].map(c => c.trim());

  const userByName = {};
  for (const u of users) userByName[u.name.trim().toLowerCase()] = u;

  const topicByTitle = {};
  for (const t of topics) topicByTitle[t.title.trim().toLowerCase()] = t;

  // Identify user columns; skip known non-roster columns
  const colRoles = header.map((h, i) => {
    if (i === 0) return null;
    const hl = h.toLowerCase();
    if (NON_ROSTER_RANK_COLS.has(hl)) return null;
    const u = userByName[hl];
    return u ? { userId: u.id } : null;
  });

  // votes[userId][topicId] = true
  const votes = {};
  for (const u of users) votes[u.id] = {};

  let matched = 0, skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const title = (row[0] || '').trim();
    if (!title) { skipped++; continue; }

    const topic = topicByTitle[title.toLowerCase()];
    if (!topic) { skipped++; continue; }

    matched++;
    for (let j = 1; j < row.length; j++) {
      const role = colRoles[j];
      if (!role) continue;
      const val = (row[j] || '').trim();
      if (val === '1' || val.toLowerCase() === 'true' || val.toLowerCase() === 'yes' || val.toLowerCase() === 'x') {
        votes[role.userId][topic.id] = true;
      }
    }
  }

  // Warn about per-user budget overruns (informational — we still import)
  // We need a minimal effectiveCategory snapshot; reuse global helpers if available
  const overBudget = [];
  for (const u of users) {
    const used = { lightning: 0, quick: 0, spotlight: 0 };
    for (const [tid, v] of Object.entries(votes[u.id])) {
      if (!v) continue;
      const topic = topics.find(t => t.id === tid);
      if (!topic) continue;
      // We don't have full state here so we can't call effectiveCategory — skip budget check;
      // the UI will show correct remaining budget when the user opens Step 4.
    }
  }

  return {
    votes,
    matched,
    skipped,
    overBudget,
    error: matched === 0 ? 'No topic titles matched the loaded topics. Check that topic titles are identical.' : null,
  };
}

window.parseClassificationsCSV = parseClassificationsCSV;
window.parseRankingsCSV = parseRankingsCSV;
window.STORAGE_KEY = STORAGE_KEY;
window.CATEGORIES = CATEGORIES;
window.CAT_BY_ID = CAT_BY_ID;
window.STEPS = STEPS;
window.CONFIG_STEP = CONFIG_STEP;
window.parseCSV = parseCSV;
window.parseUsersCSV = parseUsersCSV;
window.parseTopicsCSV = parseTopicsCSV;
window.usersToCSV = usersToCSV;
window.topicsToCSV = topicsToCSV;
window.SEED_USERS = SEED_USERS;
window.SEED_TOPICS = SEED_TOPICS;
window.defaultState = defaultState;
window.loadState = loadState;
window.saveState = saveState;
window.avatarColor = avatarColor;
window.initials = initials;
window.tallyForTopic = tallyForTopic;
window.majorityCategory = majorityCategory;
window.effectiveCategory = effectiveCategory;
window.topicsByCategory = topicsByCategory;
window.userVoteCounts = userVoteCounts;
window.topicVoteCount = topicVoteCount;
window.userClassifyProgress = userClassifyProgress;
window.uid = uid;
window.seedSampleClassifications = seedSampleClassifications;
window.seedSampleVotes = seedSampleVotes;
