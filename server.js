const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Static Users
const users = {
    'admin': 'admin123',
    'user': 'user123',
    'svc': 'svc123'
};

// Login Route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (users[username] && users[username] === password) {
        // Simple token for static auth
        const token = Buffer.from(`${username}:${password}`).toString('base64');
        res.json({ token, username });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Auth Middleware
function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = Buffer.from(token, 'base64').toString('ascii');
        const [username, password] = decoded.split(':');
        if (users[username] && users[username] === password) {
            return next();
        }
    }
    res.status(401).json({ error: 'Unauthorized' });
}

// API Routes
const kpiRoutes = require('./routes/kpi');
app.use('/api/kpi', requireAuth, kpiRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║          KPI Management Dashboard                ║
║          Server running on port ${PORT}              ║
║          http://localhost:${PORT}                    ║
╚══════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    const db = require('./db');
    await db.closeAll();
    process.exit(0);
});
