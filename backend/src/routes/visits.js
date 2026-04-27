const express = require('express');
const db = require('../db');
const mobileAuth = require('../middleware/mobileAuth');
const adminAuth = require('../middleware/auth');

const router = express.Router();

// POST /api/visits — mobile user schedules a visit
router.post('/', mobileAuth, async (req, res) => {
    try {
        const { property_id, visit_date, visit_time, visitor_name, message } = req.body;

        if (!property_id || !visit_date || !visit_time || !visitor_name) {
            return res.status(400).json({
                error: 'property_id, visit_date, visit_time and visitor_name are required'
            });
        }

        const { rows } = await db.query(
            `INSERT INTO visit_requests
               (user_id, property_id, visit_date, visit_time, visitor_name, message)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [req.user.id, property_id, visit_date, visit_time, visitor_name, message || null]
        );

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('POST /visits error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/visits — admin retrieves all visit requests (with property + user info)
router.get('/', adminAuth, async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT
               vr.id,
               vr.visit_date,
               vr.visit_time,
               vr.visitor_name,
               vr.message,
               vr.status,
               vr.created_at,
               p.title       AS property_title,
               p.area        AS property_area,
               p.plot_id,
               mu.email      AS user_email
             FROM visit_requests vr
             JOIN properties p ON p.id = vr.property_id
             LEFT JOIN mobile_users mu ON mu.id = vr.user_id
             ORDER BY vr.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error('GET /visits error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/visits/:id/status — admin updates visit status
router.patch('/:id/status', adminAuth, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Pending', 'Confirmed', 'Cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const { rows } = await db.query(
            'UPDATE visit_requests SET status=$1 WHERE id=$2 RETURNING *',
            [status, req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Visit request not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('PATCH /visits/:id/status error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
