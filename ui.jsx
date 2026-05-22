// ui.jsx — shared small components

function Avatar({ user, size }) {
  const sz = size || 28;
  return (
    <span
      className="av"
      style={{ width: sz, height: sz, background: avatarColor(user.id), fontSize: Math.round(sz * 0.38) }}
      title={user.name}
    >{initials(user.name)}</span>
  );
}

function UserChip({ user, size }) {
  return (
    <span className="user-chip">
      <Avatar user={user} size={size || 22} />
      <span>{user.name}</span>
    </span>
  );
}

function CategoryChip({ category, count }) {
  const c = CAT_BY_ID[category];
  if (!c) return <span className="chip muted">Unclassified</span>;
  return (
    <span className={"chip " + c.id}>
      <span style={{ fontSize: '11px' }}>{c.emoji}</span>
      <span>{c.name}</span>
      <span style={{ opacity: 0.6 }}>{c.time}</span>
      {count != null && <span style={{ opacity: 0.7 }}>· {count}</span>}
    </span>
  );
}

function UserPicker({ users, activeId, onSelect, getProgress, totalTopics }) {
  return (
    <div className="user-picker">
      <span className="label">Active user</span>
      {users.map(u => {
        const prog = getProgress ? getProgress(u) : null;
        const isActive = u.id === activeId;
        return (
          <button
            key={u.id}
            className={"user-tab" + (isActive ? ' active' : '')}
            onClick={() => onSelect(u.id)}
          >
            <Avatar user={u} size={22} />
            <span>{u.name.split(' ')[0]}</span>
            {prog && (
              <span className="pip">{prog.done}/{prog.total}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

// Expose
window.Avatar = Avatar;
window.UserChip = UserChip;
window.CategoryChip = CategoryChip;
window.UserPicker = UserPicker;
window.Toast = Toast;
