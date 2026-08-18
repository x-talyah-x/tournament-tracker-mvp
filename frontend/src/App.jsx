// src/App.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>CueSports Hub South Africa</h1>
      {!session ? <AuthScreen /> : <Dashboard session={session} profile={profile} />}
    </div>
  );
}

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('male');
  const [age, setAge] = useState('');

  const handleSignUp = async () => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return alert(error.message);
    
    await supabase.from('profiles').insert([{
      id: data.user.id,
      email,
      full_name: fullName,
      gender,
      age: parseInt(age)
    }]);

    alert('Account created successfully!');
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  };

  return (
    <div>
      <h2>Log In / Sign Up</h2>
      <input type="email" placeholder="Email" onChange={e => setEmail(e.target.value)} /><br /><br />
      <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} /><br /><br />
      <input type="text" placeholder="Full Name" onChange={e => setFullName(e.target.value)} /><br /><br />
      <input type="number" placeholder="Age" onChange={e => setAge(e.target.value)} /><br /><br />
      <select onChange={e => setGender(e.target.value)}>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select><br /><br />
      <button onClick={handleLogin}>Log In</button>
      <button onClick={handleSignUp} style={{ marginLeft: '10px' }}>Sign Up</button>
    </div>
  );
}

function Dashboard({ session, profile }) {
  return (
    <div>
      <h2>Welcome, {profile?.full_name || 'Player'}</h2>
      <p>Role: <strong>{profile?.role}</strong> | Age: {profile?.age} | Gender: {profile?.gender}</p>
      <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
      <hr />
      
      <TCSubscriptionSection profile={profile} userId={session.user.id} />
      <hr />
      <TournamentCreator profile={profile} userId={session.user.id} />
      <hr />
      <SocialGames userId={session.user.id} />
    </div>
  );
}

function TCSubscriptionSection({ profile, userId }) {
  const subscribeTC = async () => {
    const res = await fetch('http://localhost:5000/api/payments/mock-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, type: 'TC_SUBSCRIPTION', amount: 1000 })
    });
    const data = await res.json();
    alert(data.message);
    window.location.reload();
  };

  return (
    <div>
      <h3>Tournament Coordinator (TC) Portal</h3>
      {profile?.tc_subscription_active ? (
        <p style={{ color: 'green' }}>✓ Active TC Subscription (R1000/pm)</p>
      ) : (
        <div>
          <p>Become an official TC to host unlimited tournaments.</p>
          <button onClick={subscribeTC}>Subscribe (R1000 / month)</button>
        </div>
      )}
    </div>
  );
}

function TournamentCreator({ profile, userId }) {
  const [title, setTitle] = useState('');
  const [gameType, setGameType] = useState('8_ball');
  const [format, setFormat] = useState('knockout');
  const [entryFee, setEntryFee] = useState(0);
  const [raceTo, setRaceTo] = useState(3);

  const createTournament = async () => {
    const isTC = profile?.tc_subscription_active;
    
    if (!isTC) {
      const confirmPay = window.confirm('As a non-TC player, creating a tournament requires a R100 day-pass fee. Proceed?');
      if (!confirmPay) return;

      await fetch('http://localhost:5000/api/payments/mock-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type: 'PLAYER_DAY_COMP', amount: 100 })
      });
    }

    const { error } = await supabase.from('tournaments').insert([{
      title,
      creator_id: userId,
      game_type: gameType,
      format,
      entry_fee: parseFloat(entryFee),
      race_to: parseInt(raceTo),
      is_tc_event: isTC
    }]);

    if (error) alert(error.message);
    else alert('Tournament Created Successfully!');
  };

  return (
    <div>
      <h3>Create Tournament</h3>
      <input placeholder="Tournament Title" onChange={e => setTitle(e.target.value)} /><br /><br />
      <label>Game discipline: </label>
      <select onChange={e => setGameType(e.target.value)}>
        <option value="8_ball">8 Ball</option>
        <option value="9_ball">9 Ball</option>
        <option value="10_ball">10 Ball</option>
        <option value="blackball">Blackball</option>
        <option value="heyball">Heyball</option>
        <option value="chinese_8_ball">Chinese 8-Ball</option>
        <option value="speed_pool">Speed Pool</option>
      </select><br /><br />
      
      <label>Format: </label>
      <select onChange={e => setFormat(e.target.value)}>
        <option value="knockout">Knockout</option>
        <option value="round_robin">Round Robin</option>
        <option value="round_robin_to_knockout">Round Robin then Top 8 Knockout</option>
      </select><br /><br />

      <input type="number" placeholder="Entry Fee (ZAR)" onChange={e => setEntryFee(e.target.value)} /><br /><br />
      <input type="number" placeholder="Race To (e.g. 5)" onChange={e => setRaceTo(e.target.value)} /><br /><br />

      <button onClick={createTournament}>Create Competition</button>
    </div>
  );
}

function SocialGames({ userId }) {
  const [opponentId, setOpponentId] = useState('');
  const [gameType, setGameType] = useState('8_ball');
  const [raceTo, setRaceTo] = useState(3);

  const createSocialGame = async () => {
    const { error } = await supabase.from('social_games').insert([{
      host_id: userId,
      opponent_id: opponentId,
      game_type: gameType,
      race_to: parseInt(raceTo)
    }]);

    if (error) alert(error.message);
    else alert('Social Challenge Sent!');
  };

  return (
    <div>
      <h3>Challenge a Player (1v1 Social Game)</h3>
      <input placeholder="Opponent Profile ID" onChange={e => setOpponentId(e.target.value)} /><br /><br />
      <select onChange={e => setGameType(e.target.value)}>
        <option value="8_ball">8 Ball</option>
        <option value="blackball">Blackball</option>
        <option value="9_ball">9 Ball</option>
      </select><br /><br />
      <input type="number" placeholder="Race To" onChange={e => setRaceTo(e.target.value)} /><br /><br />
      <button onClick={createSocialGame}>Send Challenge</button>
    </div>
  );
}