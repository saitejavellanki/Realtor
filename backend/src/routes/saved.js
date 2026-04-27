const express = require('express');
const db = require('../db');
const mobileAuth = require('../middleware/mobileAuth');

const router = express.Router();

// All saved routes require mobile user auth
router.use(mobileAuth);

// GET /api/saved — returns saved property IDs for the current user
router.get('/', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT property_id FROM user_saved_properties WHERE user_id = $1',
            [req.user.id]
        );
        res.json({ savedIds: rows.map(r => String(r.property_id)) });
    } catch (err) {
        console.error('GET /saved error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/saved — save a property
router.post('/', async (req, res) => {
    try {
        const { property_id } = req.body;
        if (!property_id) return res.status(400).json({ error: 'property_id is required' });

        await db.query(
            'INSERT INTO user_saved_properties (user_id, property_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [req.user.id, property_id]
        );
        res.status(201).json({ saved: true, property_id: String(property_id) });
    } catch (err) {
        console.error('POST /saved error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/saved/:propertyId — remove a saved property
router.delete('/:propertyId', async (req, res) => {
    try {
        await db.query(
            'DELETE FROM user_saved_properties WHERE user_id = $1 AND property_id = $2',
            [req.user.id, req.params.propertyId]
        );
        res.json({ saved: false, property_id: req.params.propertyId });
    } catch (err) {
        console.error('DELETE /saved error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
