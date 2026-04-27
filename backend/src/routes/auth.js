const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const { rows } = await db.query(
            'SELECT * FROM admin_users WHERE email = $1',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({ token, email: user.email });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/register (admin only — for adding new admin users)
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const hash = await bcrypt.hash(password, 12);
        const { rows } = await db.query(
            'INSERT INTO admin_users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
            [email, hash]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── Mobile User Routes ────────────────────────────────────────────────────────

// POST /api/auth/mobile/register
router.post('/mobile/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        const hash = await bcrypt.hash(password, 12);
        const { rows } = await db.query(
            'INSERT INTO mobile_users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
            [name, email, hash]
        );
        const user = rows[0];
        const token = jwt.sign(
            { id: user.id, email: user.email, type: 'mobile' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );
        res.status(201).json({ token, user });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }
        console.error('Mobile register error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/auth/mobile/login
router.post('/mobile/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const { rows } = await db.query(
            'SELECT * FROM mobile_users WHERE email = $1',
            [email]
        );
        if (rows.length === 0) {
            return res.status(401).json({ error: 'No account found with this email' });
        }
        const user = rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Incorrect password' });
        }
        const token = jwt.sign(
            { id: user.id, email: user.email, type: 'mobile' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error('Mobile login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── Mobile User Profile ─────────────────────────────────────────────────────

const mobileAuth = require('../middleware/mobileAuth');

// GET /api/auth/mobile/profile — get current user profile
router.get('/mobile/profile', mobileAuth, async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, name, email, phone, gender, created_at FROM mobile_users WHERE id = $1',
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('GET /auth/mobile/profile error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/auth/mobile/profile — update current user profile
router.put('/mobile/profile', mobileAuth, async (req, res) => {
    try {
        const { name, phone, gender } = req.body;
        const { rows } = await db.query(
            `UPDATE mobile_users SET name = COALESCE($1, name), phone = $2, gender = $3
             WHERE id = $4 RETURNING id, name, email, phone, gender`,
            [name, phone || null, gender || null, req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('PUT /auth/mobile/profile error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
