const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// --- MOCK PAYMENT GATEWAY ---
// Handles TC Subscription (R1000/pm), Player Comp Fee (R100/day), or Entry Fees
app.post('/api/payments/mock-checkout', async (req, res) => {
    const { userId, type, amount, tournamentId } = req.body;

    // Simulate payment processing (Always succeeds in mock mode)
    const transactionId = `MOCK_TXN_${Date.now()}`;

    if (type === 'TC_SUBSCRIPTION') {
        await supabase
            .from('profiles')
            .update({ tc_subscription_active: true, role: 'tc' })
            .eq('id', userId);

        return res.json({ success: true, message: 'TC Subscription activated (R1000/pm)', transactionId });
    }

    if (type === 'PLAYER_DAY_COMP') {
        // Allows player to host a tournament for 1 day
        return res.json({ success: true, message: 'R100 Day Fee paid. Tournament published.', transactionId });
    }

    if (type === 'TOURNAMENT_ENTRY') {
        await supabase
            .from('tournament_registrations')
            .update({ payment_status: 'paid', is_waitlist: false })
            .match({ tournament_id: tournamentId, player_id: userId });

        return res.json({ success: true, message: 'Entry fee confirmed. Moved from waitlist to official draw.', transactionId });
    }

    res.status(400).json({ error: 'Invalid payment type' });
});

// --- MATCH SCORING ---
app.post('/api/matches/update-score', async (req, res) => {
    const { matchId, score1, score2, raceTo } = req.body;

    let winnerId = null;
    let status = 'in_progress';

    // Get match data
    const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single();

    if (score1 >= raceTo) {
        winnerId = match.player1_id;
        status = 'completed';
    } else if (score2 >= raceTo) {
        winnerId = match.player2_id;
        status = 'completed';
    }

    const { data, error } = await supabase
        .from('matches')
        .update({ score_player1: score1, score_player2: score2, winner_id: winnerId, status })
        .eq('id', matchId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, match: data });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));