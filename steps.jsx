// steps.jsx — the five workflow steps

const { useState, useMemo, useRef, useEffect } = React;

// ============================================================
// STEP 1: Enter Topics
// ============================================================
function StepTopics({ state, setState, toast }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [authorId, setAuthorId] = useState(state.users[0]?.id || '');
  const [editingId, setEditingId] = useState(null);
  const titleRef = useRef(null);

  const submit = (e) => {
    e?.preventDefault();
    if (!title.trim()) return;
    if (editingId) {
      setState(s => ({
        ...s,
        topics: s.topics.map(t => t.id === editingId ? { ...t, title: title.trim(), description: desc.trim(), author: authorId } : t),
      }));
      setEditingId(null);
      toast('Topic updated');
    } else {
      const nt = { id: uid('t'), title: title.trim(), description: desc.trim(), author: authorId };
      setState(s => ({ ...s, topics: [...s.topics, nt] }));
      toast('Topic added');
    }
    setTitle(''); setDesc('');
    titleRef.current?.focus();
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setTitle(t.title);
    setDesc(t.description || '');
    setAuthorId(t.author || state.users[0]?.id);
    titleRef.current?.focus();
  };

  const cancelEdit = () => { setEditingId(null); setTitle(''); setDesc(''); };

  const remove = (id) => {
    if (!confirm('Remove this topic?')) return;
    setState(s => {
      const topics = s.topics.filter(t => t.id !== id);
      const { [id]: _x, ...classifications } = s.classifications;
      const { [id]: _y, ...overrides } = s.overrides;
      const votes = {};
      for (const [uid, m] of Object.entries(s.votes)) {
        const { [id]: _z, ...rest } = m;
        votes[uid] = rest;
      }
      return { ...s, topics, classifications, overrides, votes };
    });
    toast('Topic removed');
  };

  const loadSample = () => {
    setState(s => ({ ...s, topics: SEED_TOPICS.slice(), sampleLoaded: true }));
    toast('Sample topics loaded');
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Step 1 of 5</div>
          <h2>Collect <em>topics</em> for the agenda.</h2>
          <p>Anyone on the team can add a topic. Title is required; a sentence of context helps everyone classify it well in the next step.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {state.topics.length === 0 && (
            <button className="btn" onClick={loadSample}>Load sample agenda</button>
          )}
        </div>
      </div>

      <div className="topic-form">
        <div className="card form-card">
          <form className="card-pad" onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label className="field-label" htmlFor="t-title">Topic title</label>
              <input
                id="t-title"
                ref={titleRef}
                className="input"
                placeholder="e.g. Q3 roadmap walkthrough"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="field-label" htmlFor="t-desc">Description</label>
              <textarea
                id="t-desc"
                className="textarea"
                placeholder="One or two sentences. What is this? Why does it matter?"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="field-label" htmlFor="t-author">Proposed by</label>
              <select
                id="t-author"
                className="select"
                value={authorId}
                onChange={e => setAuthorId(e.target.value)}
              >
                {state.users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="submit" className="btn accent">
                {editingId ? 'Save changes' : 'Add topic'}
                {!editingId && <span className="kbd">⏎</span>}
              </button>
              {editingId && <button type="button" className="btn ghost" onClick={cancelEdit}>Cancel</button>}
            </div>
          </form>
        </div>

        <aside className="helper">
          <h4>What makes a good topic?</h4>
          <ul>
            <li>Specific enough that the time needed is obvious.</li>
            <li>Names a decision, a demo, or a celebration — not "discussion."</li>
            <li>If it's just an FYI, keep it Lightning.</li>
          </ul>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <div className="mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', marginBottom: 6 }}>Team</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {state.users.map(u => <UserChip key={u.id} user={u} />)}
            </div>
          </div>
        </aside>
      </div>

      <div className="topic-list">
        {state.topics.length === 0 ? (
          <div className="empty">
            <span className="serif">No topics yet.</span>
            <div>Add the first topic above, or <button className="sample-link" onClick={loadSample}>load a sample agenda</button> to explore the flow.</div>
          </div>
        ) : (
          state.topics.map((t, i) => {
            const author = state.users.find(u => u.id === t.author);
            return (
              <div key={t.id} className="topic-row">
                <span className="idx">#{String(i + 1).padStart(2, '0')}</span>
                <div className="body">
                  <h4>{t.title}</h4>
                  {t.description && <p>{t.description}</p>}
                  {author && (
                    <div className="author" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Avatar user={author} size={16} />
                      <span>Proposed by {author.name}</span>
                    </div>
                  )}
                </div>
                <div className="actions">
                  <button className="btn ghost" onClick={() => startEdit(t)}>Edit</button>
                  <button className="btn ghost danger" onClick={() => remove(t.id)}>Delete</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================
// STEP 2: Classify Topics
// ============================================================
function StepClassify({ state, setState, toast }) {
  const activeId = state.activeClassifierId;
  const activeUser = state.users.find(u => u.id === activeId);

  const setClassification = (topicId, category) => {
    setState(s => {
      const cls = { ...(s.classifications[topicId] || {}) };
      if (cls[activeId] === category) delete cls[activeId];
      else cls[activeId] = category;
      return { ...s, classifications: { ...s.classifications, [topicId]: cls } };
    });
  };

  const overallProgress = useMemo(() => {
    let total = 0, done = 0;
    for (const t of state.topics) {
      for (const u of state.users) {
        total++;
        if (state.classifications[t.id]?.[u.id]) done++;
      }
    }
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [state.topics, state.users, state.classifications]);

  const fillRemainingForUser = () => {
    // Heuristic auto-classify for demo speed: pick lightning by default
    setState(s => {
      const cls = { ...s.classifications };
      for (const t of s.topics) {
        cls[t.id] = { ...(cls[t.id] || {}) };
        if (!cls[t.id][activeId]) cls[t.id][activeId] = 'quick';
      }
      return { ...s, classifications: cls };
    });
    toast(`Auto-filled remaining as Quick Hit for ${activeUser.name.split(' ')[0]}`);
  };

  if (state.topics.length === 0) {
    return (
      <div>
        <div className="page-head">
          <div>
            <div className="page-eyebrow">Step 2 of 5</div>
            <h2>Classify by <em>time needed</em>.</h2>
            <p>Each user classifies every topic as Lightning (5 min), Quick Hit (15 min), or Spotlight (30 min).</p>
          </div>
        </div>
        <div className="empty">
          <span className="serif">No topics to classify.</span>
          <div>Add topics in Step 1 first.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Step 2 of 5</div>
          <h2>Classify by <em>time needed</em>.</h2>
          <p>Switch to your name and tag every topic. Lightning is a quick update; Quick Hit needs a discussion; Spotlight earns the full thirty.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Team progress · {overallProgress.done}/{overallProgress.total}
          </div>
          <div className="progress-bar" style={{ width: 220 }}>
            <div className="fill" style={{ width: overallProgress.pct + '%' }} />
          </div>
        </div>
      </div>

      <UserPicker
        users={state.users}
        activeId={activeId}
        onSelect={(id) => setState(s => ({ ...s, activeClassifierId: id }))}
        getProgress={(u) => userClassifyProgress(state, u.id)}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Classifying as <b style={{ color: 'var(--ink)' }}>{activeUser?.name}</b>
        </div>
        <button className="btn ghost" onClick={fillRemainingForUser}>Fill remaining as Quick Hit</button>
      </div>

      <div className="classify-grid">
        {state.topics.map((t, i) => {
          const current = state.classifications[t.id]?.[activeId];
          const counts = tallyForTopic(state, t.id);
          const totalRated = counts.lightning + counts.quick + counts.spotlight;
          return (
            <div key={t.id} className="classify-row">
              <div className="topic-body">
                <h4>
                  <span style={{ color: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, marginRight: 8 }}>#{String(i + 1).padStart(2, '0')}</span>
                  {t.title}
                </h4>
                {t.description && <p>{t.description}</p>}
                <div className="meta">
                  {totalRated > 0 ? (
                    <>
                      {counts.lightning > 0 && <span className="chip lightning">⚡ {counts.lightning}</span>}
                      {counts.quick > 0 && <span className="chip quick">◉ {counts.quick}</span>}
                      {counts.spotlight > 0 && <span className="chip spotlight">✦ {counts.spotlight}</span>}
                      <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                        {totalRated}/{state.users.length} classified
                      </span>
                    </>
                  ) : (
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>No classifications yet</span>
                  )}
                </div>
              </div>
              <div className="class-picker">
                {CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    className={"class-btn " + c.id + (current === c.id ? ' active' : '')}
                    onClick={() => setClassification(t.id, c.id)}
                  >
                    <span className="name">{c.emoji} {c.name}</span>
                    <span className="time">{c.time}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// STEP 3: Summarize Classifications
// ============================================================
function StepSummary({ state, setState, toast }) {
  const setOverride = (topicId, category) => {
    setState(s => {
      const overrides = { ...s.overrides };
      if (category === null) delete overrides[topicId];
      else overrides[topicId] = category;
      return { ...s, overrides };
    });
  };

  if (state.topics.length === 0) {
    return (
      <div>
        <div className="page-head">
          <div>
            <div className="page-eyebrow">Step 3 of 5</div>
            <h2>Review the <em>classifications</em>.</h2>
            <p>The majority pick becomes the primary classification. Override anything that doesn't feel right.</p>
          </div>
        </div>
        <div className="empty">
          <span className="serif">No topics yet.</span>
        </div>
      </div>
    );
  }

  const groupCounts = useMemo(() => topicsByCategory(state), [state]);

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Step 3 of 5</div>
          <h2>Review the <em>classifications</em>.</h2>
          <p>The majority pick is the primary classification. Override any topic to set it manually — useful for ties or when the room missed the point.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <CategoryChip category="lightning" count={groupCounts.lightning.length} />
          <CategoryChip category="quick" count={groupCounts.quick.length} />
          <CategoryChip category="spotlight" count={groupCounts.spotlight.length} />
          {groupCounts.unclassified.length > 0 && (
            <span className="chip muted">{groupCounts.unclassified.length} unclassified</span>
          )}
        </div>
      </div>

      <div>
        {state.topics.map((t, i) => {
          const counts = tallyForTopic(state, t.id);
          const total = counts.lightning + counts.quick + counts.spotlight;
          const maj = majorityCategory(counts);
          const override = state.overrides[t.id];
          const effective = override || maj.category;
          const byUser = state.classifications[t.id] || {};

          return (
            <div key={t.id} className="summary-row">
              <div className="summary-head">
                <div>
                  <h4>
                    <span style={{ color: 'var(--ink-3)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, marginRight: 8 }}>#{String(i + 1).padStart(2, '0')}</span>
                    {t.title}
                  </h4>
                  {t.description && <p>{t.description}</p>}
                </div>
                <div className="classification-row" style={{ justifyContent: 'flex-end' }}>
                  <span className="label">Primary</span>
                  {effective ? <CategoryChip category={effective} /> : <span className="chip muted">— pending —</span>}
                  {override && <span className="chip ink">Override</span>}
                  {!override && maj.tied && <span className="chip" style={{ background: 'var(--bg-3)', color: 'var(--accent-ink)', borderColor: 'var(--accent)' }}>Tie — needs override</span>}
                </div>
              </div>

              {total > 0 && (
                <div className="tally-bar">
                  <div className="tally">
                    {counts.lightning > 0 && (
                      <div className="tally-seg lightning" style={{ flex: counts.lightning }} title={`Lightning: ${counts.lightning}`}>
                        ⚡ {counts.lightning}
                      </div>
                    )}
                    {counts.quick > 0 && (
                      <div className="tally-seg quick" style={{ flex: counts.quick }} title={`Quick Hit: ${counts.quick}`}>
                        ◉ {counts.quick}
                      </div>
                    )}
                    {counts.spotlight > 0 && (
                      <div className="tally-seg spotlight" style={{ flex: counts.spotlight }} title={`Spotlight: ${counts.spotlight}`}>
                        ✦ {counts.spotlight}
                      </div>
                    )}
                    {state.users.length - total > 0 && (
                      <div className="tally-seg none" style={{ flex: state.users.length - total }}>
                        {state.users.length - total} no-vote
                      </div>
                    )}
                  </div>
                  <div className="classification-row">
                    <span className="label">Override</span>
                    {CATEGORIES.map(c => (
                      <button
                        key={c.id}
                        className={"btn " + (override === c.id ? 'primary' : '')}
                        style={{ padding: '6px 10px', fontSize: 12 }}
                        onClick={() => setOverride(t.id, override === c.id ? null : c.id)}
                      >
                        {c.emoji} {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {total === 0 && (
                <div style={{ marginTop: 12, color: 'var(--ink-3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <span>Nobody has classified this yet.</span>
                  <div className="classification-row">
                    <span className="label">Set manually</span>
                    {CATEGORIES.map(c => (
                      <button
                        key={c.id}
                        className={"btn " + (override === c.id ? 'primary' : '')}
                        style={{ padding: '6px 10px', fontSize: 12 }}
                        onClick={() => setOverride(t.id, override === c.id ? null : c.id)}
                      >
                        {c.emoji} {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {total > 0 && (
                <div className="voter-pebbles">
                  {state.users.map(u => {
                    const v = byUser[u.id];
                    if (!v) return null;
                    return (
                      <span key={u.id} className="pebble">
                        <Avatar user={u} size={18} />
                        <span>{u.name.split(' ')[0]}</span>
                        <span className={"vote " + v}>{CAT_BY_ID[v].emoji}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// STEP 4: Rank / Vote
// ============================================================
function StepVote({ state, setState, toast }) {
  const activeId = state.activeVoterId;
  const activeUser = state.users.find(u => u.id === activeId);
  const groups = useMemo(() => topicsByCategory(state), [state]);
  const counts = userVoteCounts(state, activeId);

  const toggleVote = (topicId) => {
    const cat = effectiveCategory(state, topicId);
    if (!cat) return;
    const userVotes = state.votes[activeId] || {};
    const has = !!userVotes[topicId];
    const limit = CAT_BY_ID[cat].votesPerUser;
    if (!has && counts[cat] >= limit) {
      toast(`No ${CAT_BY_ID[cat].name} votes left — ${limit}/${limit} used.`);
      return;
    }
    setState(s => {
      const uv = { ...(s.votes[activeId] || {}) };
      if (has) delete uv[topicId];
      else uv[topicId] = true;
      return { ...s, votes: { ...s.votes, [activeId]: uv } };
    });
  };

  if (state.topics.length === 0 || groups.lightning.length + groups.quick.length + groups.spotlight.length === 0) {
    return (
      <div>
        <div className="page-head">
          <div>
            <div className="page-eyebrow">Step 4 of 5</div>
            <h2>Vote for what you want to <em>see</em>.</h2>
          </div>
        </div>
        <div className="empty">
          <span className="serif">Nothing to vote on yet.</span>
          <div>Add and classify topics first.</div>
        </div>
      </div>
    );
  }

  const renderCategory = (catId) => {
    const cat = CAT_BY_ID[catId];
    const items = groups[catId];
    const used = counts[catId];
    const limit = cat.votesPerUser;
    if (items.length === 0) return null;
    return (
      <section key={catId} className="vote-category-block">
        <div className="category-head">
          <h3>{cat.emoji} {cat.name}</h3>
          <span className="count">{items.length} topic{items.length === 1 ? '' : 's'} · {cat.time} each</span>
          <span className="left">
            {used}/{limit} votes used
          </span>
        </div>
        <div className="vote-grid">
          {items.map(t => {
            const voted = !!state.votes[activeId]?.[t.id];
            const disabled = !voted && used >= limit;
            return (
              <button
                key={t.id}
                className={"vote-card " + catId + (voted ? ' voted' : '') + (disabled ? ' disabled' : '')}
                onClick={() => toggleVote(t.id)}
                disabled={disabled}
                type="button"
              >
                <div>
                  <h4>{t.title}</h4>
                  {t.description && <p>{t.description}</p>}
                </div>
                <span className="checkbox">
                  {voted && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Step 4 of 5</div>
          <h2>Vote for what you want to <em>see</em>.</h2>
          <p>Each user picks up to <b>2 Spotlight</b>, <b>5 Quick Hit</b>, and <b>12 Lightning</b> topics. Switch the active user to record everyone's votes.</p>
        </div>
      </div>

      <UserPicker
        users={state.users}
        activeId={activeId}
        onSelect={(id) => setState(s => ({ ...s, activeVoterId: id }))}
      />

      <div className="vote-budget">
        {CATEGORIES.map(c => {
          const used = counts[c.id];
          const limit = c.votesPerUser;
          return (
            <div key={c.id} className={"budget-card " + c.id + (used >= limit ? ' exhausted' : '')}>
              <div>
                <div className="label">{c.emoji} {c.name}</div>
                <div className="sub">{c.time} · {limit} votes max</div>
              </div>
              <div className="num-block">
                <div className="num">{used}<span className="of">/{limit}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
        Voting as <b style={{ color: 'var(--ink)' }}>{activeUser?.name}</b>
      </div>

      {renderCategory('spotlight')}
      {renderCategory('quick')}
      {renderCategory('lightning')}

      {groups.unclassified.length > 0 && (
        <section className="vote-category-block">
          <div className="category-head">
            <h3 style={{ color: 'var(--ink-3)' }}>Unclassified</h3>
            <span className="count">{groups.unclassified.length} topic{groups.unclassified.length === 1 ? '' : 's'} — set a category in Step 3 to enable voting</span>
          </div>
          <div className="vote-grid">
            {groups.unclassified.map(t => (
              <div key={t.id} className="vote-card disabled" style={{ cursor: 'default' }}>
                <div>
                  <h4 style={{ color: 'var(--ink-3)' }}>{t.title}</h4>
                  {t.description && <p>{t.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================
// STEP 5: Elections (results)
// ============================================================
function StepElections({ state, setState }) {
  const groups = useMemo(() => topicsByCategory(state), [state]);

  const totalsByCat = useMemo(() => {
    const out = {};
    for (const c of CATEGORIES) {
      const rows = groups[c.id].map(t => {
        const { count, voters } = topicVoteCount(state, t.id);
        return { topic: t, count, voters };
      }).sort((a, b) => b.count - a.count || a.topic.title.localeCompare(b.topic.title));
      out[c.id] = rows;
    }
    return out;
  }, [state, groups]);

  const hasAnyTopic = state.topics.length > 0;
  const hasAnyVote = useMemo(() => {
    for (const u of state.users) {
      if (Object.values(state.votes[u.id] || {}).some(Boolean)) return true;
    }
    return false;
  }, [state]);

  if (!hasAnyTopic) {
    return (
      <div>
        <div className="page-head">
          <div>
            <div className="page-eyebrow">Step 5 of 5</div>
            <h2>The <em>Elections</em>.</h2>
          </div>
        </div>
        <div className="empty"><span className="serif">No topics, no elections.</span></div>
      </div>
    );
  }

  const renderSection = (catId) => {
    const cat = CAT_BY_ID[catId];
    const rows = totalsByCat[catId];
    if (!rows.length) return null;
    const maxVotes = Math.max(...rows.map(r => r.count), 1);
    return (
      <section key={catId} className="election-section">
        <h3>
          <span style={{ color: `var(${cat.color}-ink)` }}>{cat.emoji}</span>
          <span>{cat.name}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--ink-3)' }}>· {cat.time} slot</span>
        </h3>
        <div className="section-sub">Top picks — ranked by votes received</div>
        <div className="result-list">
          {rows.map((r, i) => {
            const isWinner = r.count > 0 && r.count === maxVotes && i === 0;
            return (
              <div key={r.topic.id} className={"result-row" + (isWinner ? ' winner' : '')}>
                <div className="rank">{i + 1}</div>
                <div className="info">
                  <h4>{r.topic.title}</h4>
                  {r.topic.description && <p>{r.topic.description}</p>}
                  {r.voters.length > 0 && (
                    <div className="voter-strip">
                      {r.voters.map(v => <Avatar key={v.id} user={v} size={18} />)}
                    </div>
                  )}
                </div>
                <div className="votes">
                  <div className="vote-num">{r.count}</div>
                  <div className="vote-lbl">vote{r.count === 1 ? '' : 's'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  // Summary header stats
  const allRows = [...totalsByCat.spotlight, ...totalsByCat.quick, ...totalsByCat.lightning];
  const winnersByCat = CATEGORIES.map(c => totalsByCat[c.id][0]).filter(Boolean);
  const totalVotes = allRows.reduce((s, r) => s + r.count, 0);

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Step 5 of 5</div>
          <h2>The <em>Elections</em>.</h2>
          <p>Total votes per topic, descending within each category. Top vote-getters are your final agenda.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            {totalVotes} total vote{totalVotes === 1 ? '' : 's'} · {state.users.length} voter{state.users.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {!hasAnyVote ? (
        <div className="empty">
          <span className="serif">No votes cast yet.</span>
          <div>Head back to Step 4 to record votes.</div>
        </div>
      ) : (
        <>
          {/* Winner banner */}
          {winnersByCat.some(w => w && w.count > 0) && (
            <div className="card" style={{ marginBottom: 24, background: 'var(--bg-2)' }}>
              <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
                {CATEGORIES.map(c => {
                  const w = totalsByCat[c.id][0];
                  if (!w || w.count === 0) {
                    return (
                      <div key={c.id}>
                        <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                          {c.emoji} {c.name} winner
                        </div>
                        <div className="serif" style={{ fontSize: 22, color: 'var(--ink-3)' }}>—</div>
                      </div>
                    );
                  }
                  return (
                    <div key={c.id}>
                      <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                        {c.emoji} {c.name} winner · {w.count} vote{w.count === 1 ? '' : 's'}
                      </div>
                      <div className="serif" style={{ fontSize: 22, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
                        {w.topic.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {renderSection('spotlight')}
          {renderSection('quick')}
          {renderSection('lightning')}

          {groups.unclassified.length > 0 && (
            <section className="election-section">
              <h3 style={{ color: 'var(--ink-3)' }}>Unclassified</h3>
              <div className="section-sub">These topics never got a category — no votes possible</div>
              <div className="result-list">
                {groups.unclassified.map(t => (
                  <div key={t.id} className="result-row">
                    <div className="rank">—</div>
                    <div className="info">
                      <h4 style={{ color: 'var(--ink-3)' }}>{t.title}</h4>
                      {t.description && <p>{t.description}</p>}
                    </div>
                    <div className="votes">
                      <div className="vote-num" style={{ color: 'var(--ink-3)' }}>0</div>
                      <div className="vote-lbl">votes</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// CONFIG STEP: Upload users + topics
// ============================================================
function CSVDropZone({ onText, accept, label, hint }) {
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onText(String(reader.result || ''), file.name);
    reader.readAsText(file);
  };

  return (
    <div
      className={"drop-zone" + (drag ? ' drag' : '')}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files?.[0]); }}
      onClick={() => fileRef.current?.click()}
    >
      <input
        ref={fileRef}
        type="file"
        accept={accept || '.csv,text/csv'}
        style={{ display: 'none' }}
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
      />
      <div className="drop-zone-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
          {hint}
        </div>
      </div>
    </div>
  );
}

function StepConfig({ state, setState, toast }) {
  const [usersPreview, setUsersPreview] = useState(null); // {users, skipped, error, filename}
  const [topicsPreview, setTopicsPreview] = useState(null);

  const onUsersFile = (text, filename) => {
    const res = parseUsersCSV(text);
    setUsersPreview({ ...res, filename });
    if (res.error) toast(res.error);
  };
  const onTopicsFile = (text, filename) => {
    const res = parseTopicsCSV(text);
    setTopicsPreview({ ...res, filename });
    if (res.error) toast(res.error);
  };

  const applyUsers = () => {
    if (!usersPreview?.users?.length) return;
    setState(s => {
      const newUserIds = new Set(usersPreview.users.map(u => u.id));
      const validIds = new Set([...newUserIds]);
      // drop classifications/votes for users no longer in roster
      const classifications = {};
      for (const [tid, m] of Object.entries(s.classifications)) {
        const kept = {};
        for (const [uid, v] of Object.entries(m)) if (validIds.has(uid)) kept[uid] = v;
        classifications[tid] = kept;
      }
      const votes = {};
      for (const u of usersPreview.users) votes[u.id] = {};
      const activeClassifierId = usersPreview.users[0].id;
      const activeVoterId = usersPreview.users[0].id;
      return { ...s, users: usersPreview.users, classifications, votes, activeClassifierId, activeVoterId };
    });
    toast(`Loaded ${usersPreview.users.length} user${usersPreview.users.length === 1 ? '' : 's'}`);
    setUsersPreview(null);
  };

  const applyTopics = () => {
    if (!topicsPreview?.topics?.length) return;
    setState(s => ({
      ...s,
      topics: topicsPreview.topics,
      classifications: {},
      overrides: {},
      votes: Object.fromEntries(s.users.map(u => [u.id, {}])),
    }));
    toast(`Loaded ${topicsPreview.topics.length} topic${topicsPreview.topics.length === 1 ? '' : 's'}`);
    setTopicsPreview(null);
  };

  const loadPredefinedUsers = () => {
    setState(s => ({
      ...s,
      users: SEED_USERS.slice(),
      classifications: {},
      votes: Object.fromEntries(SEED_USERS.map(u => [u.id, {}])),
      activeClassifierId: SEED_USERS[0].id,
      activeVoterId: SEED_USERS[0].id,
    }));
    toast(`Loaded ${SEED_USERS.length} sample users`);
    setUsersPreview(null);
  };

  const loadPredefinedTopics = () => {
    setState(s => ({
      ...s,
      topics: SEED_TOPICS.slice(),
      classifications: {},
      overrides: {},
      votes: Object.fromEntries(s.users.map(u => [u.id, {}])),
    }));
    toast(`Loaded ${SEED_TOPICS.length} sample topics`);
    setTopicsPreview(null);
  };

  const clearUsers = () => {
    if (!confirm('Clear the team roster? This also clears classifications and votes.')) return;
    setState(s => ({ ...s, users: [], classifications: {}, votes: {} }));
    toast('Roster cleared');
  };
  const clearTopics = () => {
    if (!confirm('Clear all topics?')) return;
    setState(s => ({ ...s, topics: [], classifications: {}, overrides: {}, votes: Object.fromEntries(s.users.map(u => [u.id, {}])) }));
    toast('Topics cleared');
  };

  const downloadSample = (kind) => {
    const text = kind === 'users'
      ? usersToCSV(SEED_USERS)
      : topicsToCSV(SEED_TOPICS);
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = kind === 'users' ? 'users-sample.csv' : 'topics-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Configuration</div>
          <h2>Set up the <em>roster</em> and the <em>topics</em>.</h2>
          <p>Upload a CSV or use the predefined samples. Anything loaded here lives in this session only — refresh-safe via local storage, never sent anywhere.</p>
        </div>
        <button
          className="btn accent"
          disabled={state.users.length === 0 || state.topics.length === 0}
          onClick={() => setState(s => ({ ...s, step: 1 }))}
        >
          Start workflow →
        </button>
      </div>

      {/* USERS */}
      <div className="config-block">
        <div className="config-block-head">
          <div>
            <h3>Team roster</h3>
            <div className="config-sub">One full name per row. First column is treated as the name; header row optional.</div>
          </div>
          <div className="config-block-stats">
            <span className="serif" style={{ fontSize: 32, lineHeight: 1 }}>{state.users.length}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>loaded</span>
          </div>
        </div>

        <div className="config-grid">
          <div>
            <CSVDropZone
              onText={onUsersFile}
              label="Upload users.csv"
              hint="Drag a CSV here or click to browse"
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="btn" onClick={loadPredefinedUsers}>Use predefined team ({SEED_USERS.length})</button>
              <button className="btn ghost" onClick={() => downloadSample('users')}>Download sample CSV</button>
              {state.users.length > 0 && <button className="btn ghost danger" onClick={clearUsers}>Clear roster</button>}
            </div>
          </div>

          <div className="config-preview">
            {usersPreview && usersPreview.users.length > 0 ? (
              <>
                <div className="preview-head">
                  <span className="mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)' }}>
                    Preview · {usersPreview.users.length} name{usersPreview.users.length === 1 ? '' : 's'}{usersPreview.skipped ? ` · ${usersPreview.skipped} skipped` : ''}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn ghost" onClick={() => setUsersPreview(null)}>Cancel</button>
                    <button className="btn accent" onClick={applyUsers}>Apply</button>
                  </div>
                </div>
                <div className="preview-chips">
                  {usersPreview.users.slice(0, 40).map(u => <UserChip key={u.id} user={u} />)}
                  {usersPreview.users.length > 40 && (
                    <span className="chip muted">+{usersPreview.users.length - 40} more</span>
                  )}
                </div>
              </>
            ) : state.users.length > 0 ? (
              <>
                <div className="preview-head">
                  <span className="mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)' }}>
                    Current roster
                  </span>
                </div>
                <div className="preview-chips">
                  {state.users.map(u => <UserChip key={u.id} user={u} />)}
                </div>
              </>
            ) : (
              <div className="preview-empty">
                <span className="serif" style={{ fontSize: 20 }}>No team loaded.</span>
                <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 4 }}>
                  Upload a CSV or load the predefined team to continue.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOPICS */}
      <div className="config-block">
        <div className="config-block-head">
          <div>
            <h3>Topics</h3>
            <div className="config-sub">Two columns: <span className="mono">title</span>, <span className="mono">description</span>. Description is optional; quote any field that contains commas.</div>
          </div>
          <div className="config-block-stats">
            <span className="serif" style={{ fontSize: 32, lineHeight: 1 }}>{state.topics.length}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>loaded</span>
          </div>
        </div>

        <div className="config-grid">
          <div>
            <CSVDropZone
              onText={onTopicsFile}
              label="Upload topics.csv"
              hint="Drag a CSV here or click to browse"
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="btn" onClick={loadPredefinedTopics}>Use predefined topics ({SEED_TOPICS.length})</button>
              <button className="btn ghost" onClick={() => downloadSample('topics')}>Download sample CSV</button>
              {state.topics.length > 0 && <button className="btn ghost danger" onClick={clearTopics}>Clear topics</button>}
            </div>
          </div>

          <div className="config-preview">
            {topicsPreview && topicsPreview.topics.length > 0 ? (
              <>
                <div className="preview-head">
                  <span className="mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)' }}>
                    Preview · {topicsPreview.topics.length} topic{topicsPreview.topics.length === 1 ? '' : 's'}{topicsPreview.skipped ? ` · ${topicsPreview.skipped} skipped` : ''}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn ghost" onClick={() => setTopicsPreview(null)}>Cancel</button>
                    <button className="btn accent" onClick={applyTopics}>Apply (replaces existing)</button>
                  </div>
                </div>
                <ol className="preview-list">
                  {topicsPreview.topics.slice(0, 12).map(t => (
                    <li key={t.id}>
                      <b>{t.title}</b>
                      {t.description && <span> — {t.description}</span>}
                    </li>
                  ))}
                  {topicsPreview.topics.length > 12 && (
                    <li style={{ color: 'var(--ink-3)' }}>+{topicsPreview.topics.length - 12} more…</li>
                  )}
                </ol>
              </>
            ) : state.topics.length > 0 ? (
              <>
                <div className="preview-head">
                  <span className="mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)' }}>
                    Current topics
                  </span>
                </div>
                <ol className="preview-list">
                  {state.topics.slice(0, 12).map(t => (
                    <li key={t.id}>
                      <b>{t.title}</b>
                      {t.description && <span> — {t.description}</span>}
                    </li>
                  ))}
                  {state.topics.length > 12 && (
                    <li style={{ color: 'var(--ink-3)' }}>+{state.topics.length - 12} more…</li>
                  )}
                </ol>
              </>
            ) : (
              <div className="preview-empty">
                <span className="serif" style={{ fontSize: 20 }}>No topics loaded.</span>
                <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 4 }}>
                  Upload a CSV, load predefined topics, or add them manually in Step 1.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="config-format-note">
        <h4>CSV format reference</h4>
        <div className="format-grid">
          <div>
            <div className="format-label">users.csv</div>
            <pre className="code-block">{`name
Avery Chen
Marcus Reid
Priya Shah`}</pre>
          </div>
          <div>
            <div className="format-label">topics.csv</div>
            <pre className="code-block">{`title,description
Q3 roadmap,"Where we landed, what shifted"
On-call rotation,Pages per week trending up
New hire shoutouts,Welcome the three new folks`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// Expose
window.StepConfig = StepConfig;
window.StepTopics = StepTopics;
window.StepClassify = StepClassify;
window.StepSummary = StepSummary;
window.StepVote = StepVote;
window.StepElections = StepElections;
