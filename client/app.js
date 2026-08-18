import React, { useState } from 'react';

const GAME_TYPES = ['8-Ball', '9-Ball', '10-Ball', 'Blackball', 'Heyball', 'Chinese Pool', 'Speed Pool'];

export default function App() {
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('tournaments');

  // Form states
  const [tournaments, setTournaments] = useState([]);
  const [form, setForm] = useState({
    title: '',
    game_type: '8-Ball',
    entry_fee: 100,
    race_to: 5,
    format: 'knockout',
    is_day_pass: false
  });

  const createTournament = () => {
    const newTournament = { ...form, id: Date.now(), status: 'open' };
    setTournaments([...tournaments, newTournament]);
    alert('Tournament created successfully!');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: 'auto' }}>
      <h1>🎱 Pool Tournament Platform</h1>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('tournaments')}>Tournaments</button>
        <button onClick={() => setActiveTab('create')}>Create Tournament</button>
        <button onClick={() => setActiveTab('social')}>Social 1v1 Game</button>
        <button onClick={() => setActiveTab('banking')}>TC Banking Details</button>
      </div>

      {/* Tournaments List */}
      {activeTab === 'tournaments' && (
        <div>
          <h2>Available Tournaments</h2>
          {tournaments.length === 0 ? (
            <p>No tournaments scheduled yet.</p>
          ) : (
            tournaments.map((t) => (
              <div key={t.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '10px', borderRadius: '5px' }}>
                <h3>{t.title}</h3>
                <p><strong>Game:</strong> {t.game_type} | <strong>Race To:</strong> {t.race_to}</p>
                <p><strong>Entry Fee:</strong> R{t.entry_fee} | <strong>Format:</strong> {t.format}</p>
                <button onClick={() => alert('Proceed to payment using Coordinator\'s banking details.')}>
                  Join Waitlist
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Tournament Form */}
      {activeTab === 'create' && (
        <div>
          <h2>Create New Tournament</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="Tournament Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            
            <label>Game Discipline:</label>
            <select value={form.game_type} onChange={(e) => setForm({ ...form, game_type: e.target.value })}>
              {GAME_TYPES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>

            <label>Race To:</label>
            <input
              type="number"
              value={form.race_to}
              onChange={(e) => setForm({ ...form, race_to: parseInt(e.target.value) })}
            />

            <label>Entry Fee (ZAR):</label>
            <input
              type="number"
              value={form.entry_fee}
              onChange={(e) => setForm({ ...form, entry_fee: parseFloat(e.target.value) })}
            />

            <label>Format:</label>
            <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>
              <option value="knockout">Single Knockout</option>
              <option value="round_robin">Round Robin</option>
              <option value="rr_then_knockout">Round Robin into Top 8 Knockout</option>
            </select>

            <label>
              <input
                type="checkbox"
                checked={form.is_day_pass}
                onChange={(e) => setForm({ ...form, is_day_pass: e.target.checked })}
              />
              Player Day Pass (R100 Fee Applies)
            </label>

            <button onClick={createTournament} style={{ padding: '10px', backgroundColor: '#0070f3', color: '#fff', border: 'none' }}>
              Publish Tournament
            </button>
          </div>
        </div>
      )}

      {/* Social Game */}
      {activeTab === 'social' && (
        <div>
          <h2>Create Social 1v1 Game</h2>
          <input type="text" placeholder="Opponent Username / ID" style={{ display: 'block', marginBottom: '10px', width: '100%' }} />
          <button style={{ padding: '10px' }} onClick={() => alert('Social game challenge sent!')}>Send Challenge</button>
        </div>
      )}

      {/* TC Banking */}
      {activeTab === 'banking' && (
        <div>
          <h2>Tournament Coordinator Banking Details</h2>
          <p>Players will transfer entry fees directly to these details to complete registration.</p>
          <input type="text" placeholder="Bank Name" style={{ display: 'block', marginBottom: '10px', width: '100%' }} />
          <input type="text" placeholder="Account Number" style={{ display: 'block', marginBottom: '10px', width: '100%' }} />
          <input type="text" placeholder="Branch Code" style={{ display: 'block', marginBottom: '10px', width: '100%' }} />
          <button onClick={() => alert('Banking details saved!')}>Save Details</button>
        </div>
      )}
    </div>
  );
}