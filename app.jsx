// app.jsx — main app shell + stepper navigation

function App() {
  const [state, setState] = React.useState(() => loadState());
  const [toastMsg, setToastMsg] = React.useState(null);

  React.useEffect(() => { saveState(state); }, [state]);

  const showToast = (msg) => {
    setToastMsg(msg);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToastMsg(null), 1700);
  };

  const setStep = (n) => setState(s => ({ ...s, step: n }));

  const stepDoneFlags = React.useMemo(() => {
    const out = {};
    out[1] = state.topics.length > 0;
    // step 2 done when every user has classified every topic
    out[2] = state.topics.length > 0 && state.topics.every(t =>
      state.users.every(u => state.classifications[t.id]?.[u.id])
    );
    // step 3 done when every topic has an effective category
    out[3] = state.topics.length > 0 && state.topics.every(t => !!effectiveCategory(state, t.id));
    // step 4 done when every user used at least one vote
    out[4] = state.users.every(u => Object.values(state.votes[u.id] || {}).some(v => (typeof v === 'number' ? v : (v ? 1 : 0)) > 0));
    out[5] = true;
    return out;
  }, [state]);

  const StepBody = (
    state.step === 'config' ? <StepConfig state={state} setState={setState} toast={showToast} /> :
    state.step === 1 ? <StepTopics state={state} setState={setState} toast={showToast} /> :
    state.step === 2 ? <StepClassify state={state} setState={setState} toast={showToast} /> :
    state.step === 3 ? <StepSummary state={state} setState={setState} toast={showToast} /> :
    state.step === 4 ? <StepVote state={state} setState={setState} toast={showToast} /> :
    <StepElections state={state} setState={setState} />
  );

  const resetAll = () => {
    if (!confirm('Clear all topics, classifications and votes? This cannot be undone.')) return;
    const fresh = defaultState();
    setState(fresh);
    showToast('Session cleared');
  };

  // overall stats for header
  const stats = React.useMemo(() => {
    const topicCount = state.topics.length;
    let classifiedRows = 0;
    let totalRows = topicCount * state.users.length;
    for (const t of state.topics) for (const u of state.users) {
      if (state.classifications[t.id]?.[u.id]) classifiedRows++;
    }
    let voters = 0;
    for (const u of state.users) if (Object.values(state.votes[u.id] || {}).some(v => (typeof v === 'number' ? v : (v ? 1 : 0)) > 0)) voters++;
    return { topicCount, classifiedRows, totalRows, voters };
  }, [state]);

  return (
    <div className="app" data-screen-label={state.step === 'config' ? 'Configuration' : `0${state.step} ${STEPS[state.step - 1].label}`}>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark">A</div>
            <div>
              <div className="brand-title">All Hands <span className="accent-word">Topic</span> <span className="red-word">Triage</span></div>
              <div className="brand-sub">Collect · Classify · Vote · Decide</div>
            </div>
          </div>
          <div className="session-meta">
            <span><b>{stats.topicCount}</b> topics</span>
            <span className="dot-divider" />
            <span><b>{stats.classifiedRows}</b>/{stats.totalRows} classifications</span>
            <span className="dot-divider" />
            <span><b>{stats.voters}</b>/{state.users.length} voters in</span>
          </div>
        </div>
        <nav className="stepper" role="tablist">
          {STEPS.map(s => {
            const disabled = (s.id >= 1 && state.users.length === 0);
            return (
              <button
                key={s.id}
                className={"step-tab" + (state.step === s.id ? ' active' : '') + (stepDoneFlags[s.id] ? ' done' : '')}
                onClick={() => !disabled && setStep(s.id)}
                role="tab"
                aria-selected={state.step === s.id}
                disabled={disabled}
                title={disabled ? 'Load a team in Configuration first' : s.label}
              >
                <span className="num">{stepDoneFlags[s.id] && state.step !== s.id ? '✓' : s.id}</span>
                <span className="label">{s.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <main>
        {StepBody}
      </main>

      <footer className="app-footer">
        <div className="app-footer-inner">
          <div className="footer-info">
            {state.step === 'config'
              ? 'Configuration · set up roster and topics'
              : `Step ${state.step} / 5 · ${STEPS[state.step - 1].label}`}
          </div>
          <div className="footer-actions">
            <button
              className={"btn config-btn" + (state.users.length === 0 || state.topics.length === 0 ? ' attention' : '')}
              onClick={() => setStep('config')}
              aria-pressed={state.step === 'config'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Configuration
            </button>
            <button className="btn ghost danger" onClick={resetAll}>Reset</button>
            {state.step !== 'config' && (
              <>
                <button className="btn" onClick={() => setStep(Math.max(1, state.step - 1))} disabled={state.step === 1}>
                  ← Back
                </button>
                <button className="btn accent" onClick={() => setStep(Math.min(5, state.step + 1))} disabled={state.step === 5}>
                  {state.step === 4 ? 'See elections' : 'Continue'} →
                </button>
              </>
            )}
            {state.step === 'config' && (
              <button
                className="btn accent"
                onClick={() => setStep(1)}
                disabled={state.users.length === 0 || state.topics.length === 0}
              >
                Start workflow →
              </button>
            )}
          </div>
        </div>
      </footer>

      <Toast msg={toastMsg} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
