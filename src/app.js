import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const GAME_TYPES = ['8-Ball', '9-Ball', '10-Ball', 'Blackball', 'Heyball', 'Chinese Pool', 'Speed Pool'];

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('tournaments');

  // Auth Form State
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('player');

  // Data States
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingTournamentId, setPendingTournamentId] = useState(null);

  const [tournamentForm, setTournamentForm] = useState({
    title: '',
    game_type: '8-Ball',
    entry_fee: 100,
    race_to: 5,
    format: 'knockout',
    is_day_pass: false
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === 'tournaments') fetchTournaments();
  }, [activeTab]);

  async function fetchUserProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  }

  async function fetchTournaments() {
    setLoading(true);
    const { data, error } = await supabase
      .from('tournaments')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false });

    setLoading(false);
    if (!error) setTournaments(data || []);
  }

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);

    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role } }
      });
      setLoading(false);
      if (error) alert(error.message);
      else alert('Account created successfully!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) alert(error.message);
    }
  }

  async function handleCreateTournament(e) {
    e.preventDefault();
    if (!session) return alert('Please log in first.');

    setLoading(true);
    const { error } = await supabase.from('tournaments').insert([
      { ...tournamentForm, creator_id: session.user.id }
    ]);

    setLoading(false);
    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      alert('Tournament created successfully!');
      setActiveTab('tournaments');
      fetchTournaments();
    }
  }

  // --- MOCK PAYMENT FLOW ---
  function initiateWaitlistJoin(tournamentId) {
    if (!session) return alert('Please log in to join.');
    setPendingTournamentId(tournamentId);
    setShowPaymentModal(true);
  }

  async function processMockPayment(success = true) {
    setLoading(true);
    setShowPaymentModal(false);

    if (!success) {
      setLoading(false);
      return alert('Payment cancelled/failed.');
    }

    // Simulate gateway response delay
    setTimeout(async () => {
      const { error } = await supabase.from('tournament_participants').insert([
        {
          tournament_id: pendingTournamentId,
          player_id: session.user.id,
          payment_status: 'paid'
        }
      ]);

      setLoading(false);
      if (error) {
        if (error.code === '23505') alert('You are already registered for this tournament.');
        else alert(error.message);
      } else {
        alert('Payment successful! You are now confirmed on the roster.');
      }
    }, 1000);
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>🎱 Pool Platform</h1>
        {session ? (
          <div>
            <span>Welcome, <strong>{profile?.name || session.user.email}</strong></span>
            <button onClick={() => supabase.auth.signOut()} style={{ marginLeft: '10px' }}>Log Out</button>
          </div>
        ) : (
          <button onClick={() => setActiveTab('auth')}>Log In / Sign Up</button>
        )}
      </header>

      <nav style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('tournaments')}>Tournaments</button>
        {session && <button onClick={() => setActiveTab('create')}>Create Tournament</button>}
      </nav>

      {/* Auth View */}
      {activeTab === 'auth' && !session && (
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
          <h2>{authMode === 'login' ? 'Log In' : 'Sign Up'}</h2>
          {authMode === 'signup' && (
            <>
              <input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required />
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="player">Player</option>
                <option value="tournament_coordinator">Coordinator</option>
              </select>
            </>
          )}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>{authMode === 'login' ? 'Log In' : 'Sign Up'}</button>
          <p onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} style={{ cursor: 'pointer', color: 'blue' }}>
            Switch to {authMode === 'login' ? 'Sign Up' : 'Log In'}
          </p>
        </form>
      )}

      {/* Tournaments List */}
      {activeTab === 'tournaments' && (
        <div>
          <h2>Tournaments</h2>
          {tournaments.map(t => (
            <div key={t.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
              <h3>{t.title}</h3>
              <p>Entry Fee: R{t.entry_fee} | Format: {t.format}</p>
              <button onClick={() => initiateWaitlistJoin(t.id)} style={{ backgroundColor: '#10B981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
                Pay & Join (R{t.entry_fee})
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Tournament */}
      {activeTab === 'create' && session && (
        <form onSubmit={handleCreateTournament} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
          <h2>Create Tournament</h2>
          <input placeholder="Title" value={tournamentForm.title} onChange={e => setTournamentForm({ ...tournamentForm, title: e.target.value })} required />
          <label>Entry Fee (ZAR)</label>
          <input type="number" value={tournamentForm.entry_fee} onChange={e => setTournamentForm({ ...tournamentForm, entry_fee: parseFloat(e.target.value) })} required />
          <button type="submit" disabled={loading}>Publish Tournament</button>
        </form>
      )}

      {/* Fake Payment Gateway Modal */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', textAlign: 'center', maxWidth: '350px' }}>
            <h3>💳 Mock Payment Gateway</h3>
            <p>Simulating PayFast / Stitch Checkout</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
              <button onClick={() => processMockPayment(true)} style={{ backgroundColor: '#10B981', color: '#fff', padding: '10px', border: 'none', borderRadius: '4px' }}>
                Simulate Successful Payment
              </button>
              <button onClick={() => processMockPayment(false)} style={{ backgroundColor: '#EF4444', color: '#fff', padding: '10px', border: 'none', borderRadius: '4px' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}