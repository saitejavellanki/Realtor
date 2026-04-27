const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// ─── Helper: fetch price history for a property ──────────────────────────────
async function getPriceHistory(propertyId) {
    const { rows } = await db.query(
        'SELECT year, price FROM price_history WHERE property_id = $1 ORDER BY year ASC',
        [propertyId]
    );
    return rows;
}

// ─── Transparency score (0-100) ──────────────────────────────────────────────
// Captures the POC's "trust" pitch in one number.
function transparencyScore(p) {
    let score = 0;
    if (p.is_verified) score += 30;
    if (p.rera_number) score += 15;
    if (p.circle_rate && p.market_rate) score += 20;
    if (p.rate_source) score += 5;
    if (p.site_status) score += 5;
    if (Array.isArray(p.site_photos) && p.site_photos.length > 0) score += 10;
    if (p.developer_id) score += 5;
    if (p.flood_risk && p.safety_index != null) score += 5;
    if (p.verified_at) {
        const days = (Date.now() - new Date(p.verified_at).getTime()) / 86400000;
        if (days < 30) score += 5;
    }
    return Math.min(100, score);
}

// ─── Format property row for mobile app consumption ──────────────────────────
function formatForMobile(p, history = []) {
    const circle = parseInt(p.circle_rate) || 0;
    const market = parseInt(p.market_rate) || p.price_per_sqft || 0;
    const variance = circle > 0 ? Math.round(((market - circle) / circle) * 1000) / 10 : 0;
    return {
        id: String(p.id),
        plot: p.plot_id,
        title: p.title,
        area: p.area,
        location: p.location || p.area,
        type: p.category_type,
        status: p.status,
        demand: p.demand,
        pricePerSqft: p.price_per_sqft,
        size: `${parseFloat(p.size).toLocaleString()} ${p.unit}`,
        zoning: p.zoning || `${p.category_type === 'residential' ? 'Residential' : 'Commercial'} - ${p.property_type || 'General'}`,
        description: p.description || '',
        beds: p.beds || 0,
        baths: p.baths || 0,
        garage: p.garage || 0,
        yearBuilt: p.year_built || 2020,
        agentName: p.agent_name || 'Agent',
        agentRole: p.agent_role || 'Property Consultant',
        agentPhone: p.agent_contact || '',
        currentPrice: parseInt(p.current_price) || p.price_per_sqft * parseFloat(p.size),
        pastYearGain: parseInt(p.past_year_gain) || 0,
        priceChange: p.price_change || '+0% vs last year',
        priceHistory: history.map(h => ({ year: h.year, price: parseInt(h.price) })),
        lat: parseFloat(p.lat) || 17.4123,
        lng: parseFloat(p.lng) || 78.4234,
        isPublic: p.is_public,
        // ─── POC Transparency fields ───
        circleRate: circle,
        marketRate: market,
        rateVariance: variance,            // % premium of market over circle
        rateSource: p.rate_source || null,
        rateLastUpdated: p.rate_last_updated || null,
        isVerified: !!p.is_verified,
        verifiedAt: p.verified_at || null,
        verifiedBy: p.verified_by || null,
        verificationNotes: p.verification_notes || null,
        reraNumber: p.rera_number || null,
        siteStatus: p.site_status || 'developed',
        developerName: p.developer_name || null,
        developerId: p.developer_id || null,
        floodRisk: p.flood_risk || 'low',
        pollutionIndex: p.pollution_index || null,
        safetyIndex: p.safety_index || null,
        nearbyInfra: p.nearby_infra || [],
        localUpdates: p.local_updates || [],
        sitePhotos: p.site_photos || [],
        sourceAttribution: p.source_attribution || null,
        transparencyScore: transparencyScore(p),
    };
}

// ────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES (mobile app)
// ────────────────────────────────────────────────────────────────────────────

// GET /api/properties  — public listings for mobile app
router.get('/', async (req, res) => {
    try {
        const { category, status, area, verified, developer, minPrice, maxPrice, siteStatus } = req.query;
        let where = ['p.is_public = true'];
        const params = [];
        if (category) { params.push(category); where.push(`p.category_type = $${params.length}`); }
        if (status) { params.push(status); where.push(`p.status = $${params.length}`); }
        if (area) { params.push(`%${area}%`); where.push(`p.area ILIKE $${params.length}`); }
        if (verified === 'true') where.push('p.is_verified = true');
        if (developer) { params.push(`%${developer}%`); where.push(`p.developer_name ILIKE $${params.length}`); }
        if (minPrice) { params.push(parseInt(minPrice)); where.push(`p.current_price >= $${params.length}`); }
        if (maxPrice) { params.push(parseInt(maxPrice)); where.push(`p.current_price <= $${params.length}`); }
        if (siteStatus) { params.push(siteStatus); where.push(`p.site_status = $${params.length}`); }

        const { rows } = await db.query(
            `SELECT * FROM properties p WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC`,
            params
        );

        const result = await Promise.all(
            rows.map(async (p) => formatForMobile(p, await getPriceHistory(p.id)))
        );

        res.json(result);
    } catch (err) {
        console.error('GET /properties error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/properties/:id — single property detail (public)
router.get('/:id', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM properties WHERE id = $1 AND is_public = true',
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Property not found' });
        const history = await getPriceHistory(rows[0].id);
        res.json(formatForMobile(rows[0], history));
    } catch (err) {
        console.error('GET /properties/:id error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES (JWT required)
// ────────────────────────────────────────────────────────────────────────────

// GET /api/properties/admin/all — all properties for admin dashboard
router.get('/admin/all', auth, async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM properties ORDER BY created_at DESC'
        );
        const result = await Promise.all(
            rows.map(async (p) => {
                const history = await getPriceHistory(p.id);
                return { ...p, price_history: history };
            })
        );
        res.json(result);
    } catch (err) {
        console.error('GET /properties/admin/all error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/properties — create new property (admin)
router.post('/', auth, async (req, res) => {
    try {
        const {
            plot_id, title, area, location, category_type, property_type, room_count,
            status, price_per_sqft, size, unit, zoning, description,
            beds, baths, garage, year_built, demand,
            agent_name, agent_role, agent_contact,
            approval_status, is_public, notes, lat, lng,
            current_price, past_year_gain, price_change,
            price_history,
        } = req.body;

        if (!plot_id || !title || !area || !category_type || !price_per_sqft) {
            return res.status(400).json({ error: 'plot_id, title, area, category_type, and price_per_sqft are required' });
        }

        const { rows } = await db.query(
            `INSERT INTO properties (
        plot_id, title, area, location, category_type, property_type, room_count,
        status, price_per_sqft, size, unit, zoning, description,
        beds, baths, garage, year_built, demand,
        agent_name, agent_role, agent_contact,
        approval_status, is_public, notes, lat, lng,
        current_price, past_year_gain, price_change
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29
      ) RETURNING *`,
            [
                plot_id, title, area, location || area, category_type, property_type || null, room_count || null,
                status || 'Draft', price_per_sqft, size || 0, unit || 'sq.ft', zoning || null, description || null,
                beds || 0, baths || 0, garage || 0, year_built || null, demand || 'Medium',
                agent_name || null, agent_role || null, agent_contact || null,
                approval_status || 'Pending', is_public || false, notes || null, lat || null, lng || null,
                current_price || (price_per_sqft * (size || 0)), past_year_gain || 0, price_change || null,
            ]
        );

        const newProperty = rows[0];

        // Persist POC transparency fields if provided
        const {
            circle_rate, market_rate, rate_source, rera_number, is_verified, verification_notes,
            site_status, developer_name, flood_risk, pollution_index, safety_index,
        } = req.body;
        if (
            circle_rate !== undefined || market_rate !== undefined || rate_source !== undefined ||
            rera_number !== undefined || is_verified !== undefined || verification_notes !== undefined ||
            site_status !== undefined || developer_name !== undefined || flood_risk !== undefined ||
            pollution_index !== undefined || safety_index !== undefined
        ) {
            await db.query(
                `UPDATE properties SET
                    circle_rate = COALESCE($1, circle_rate),
                    market_rate = COALESCE($2, market_rate),
                    rate_source = COALESCE($3, rate_source),
                    rera_number = COALESCE($4, rera_number),
                    is_verified = COALESCE($5, is_verified),
                    verification_notes = COALESCE($6, verification_notes),
                    site_status = COALESCE($7, site_status),
                    developer_name = COALESCE($8, developer_name),
                    flood_risk = COALESCE($9, flood_risk),
                    pollution_index = COALESCE($10, pollution_index),
                    safety_index = COALESCE($11, safety_index),
                    verified_at = CASE WHEN $5 = true THEN NOW() ELSE verified_at END
                 WHERE id = $12`,
                [circle_rate ?? null, market_rate ?? null, rate_source ?? null, rera_number ?? null,
                 is_verified ?? null, verification_notes ?? null, site_status ?? null, developer_name ?? null,
                 flood_risk ?? null, pollution_index ?? null, safety_index ?? null, newProperty.id]
            );
        }
        // Site photos, local updates, source attribution on create
        const { site_photos: sp, local_updates: lu, source_attribution: sa } = req.body;
        if (sp || lu || sa) {
            const sets2 = []; const vals2 = [];
            if (sp) { vals2.push(JSON.stringify(sp)); sets2.push(`site_photos = $${vals2.length}`); }
            if (lu) { vals2.push(JSON.stringify(lu)); sets2.push(`local_updates = $${vals2.length}`); }
            if (sa) { vals2.push(sa); sets2.push(`source_attribution = $${vals2.length}`); }
            vals2.push(newProperty.id);
            await db.query(`UPDATE properties SET ${sets2.join(', ')} WHERE id = $${vals2.length}`, vals2);
        }

        // Insert price history if provided
        if (Array.isArray(price_history) && price_history.length > 0) {
            for (const h of price_history) {
                await db.query(
                    'INSERT INTO price_history (property_id, year, price) VALUES ($1, $2, $3)',
                    [newProperty.id, h.year, h.price]
                );
            }
        }

        res.status(201).json(newProperty);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Plot ID already exists' });
        }
        console.error('POST /properties error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/properties/:id — update property (admin)
router.put('/:id', auth, async (req, res) => {
    try {
        const {
            title, area, location, category_type, property_type, room_count,
            status, price_per_sqft, size, unit, zoning, description,
            beds, baths, garage, year_built, demand,
            agent_name, agent_role, agent_contact,
            approval_status, is_public, notes, lat, lng,
            current_price, past_year_gain, price_change,
        } = req.body;

        const { rows } = await db.query(
            `UPDATE properties SET
        title=$1, area=$2, location=$3, category_type=$4, property_type=$5, room_count=$6,
        status=$7, price_per_sqft=$8, size=$9, unit=$10, zoning=$11, description=$12,
        beds=$13, baths=$14, garage=$15, year_built=$16, demand=$17,
        agent_name=$18, agent_role=$19, agent_contact=$20,
        approval_status=$21, is_public=$22, notes=$23, lat=$24, lng=$25,
        current_price=$26, past_year_gain=$27, price_change=$28
      WHERE id=$29 RETURNING *`,
            [
                title, area, location, category_type, property_type, room_count,
                status, price_per_sqft, size, unit, zoning, description,
                beds, baths, garage, year_built, demand,
                agent_name, agent_role, agent_contact,
                approval_status, is_public, notes, lat, lng,
                current_price, past_year_gain, price_change,
                req.params.id,
            ]
        );

        if (rows.length === 0) return res.status(404).json({ error: 'Property not found' });

        const updatedProperty = rows[0];

        // Persist POC transparency fields on update
        const pocFields = {};
        ['circle_rate','market_rate','rate_source','rera_number','is_verified','verification_notes',
         'site_status','developer_name','developer_id','flood_risk','pollution_index','safety_index',
         'source_attribution'].forEach(k => { if (req.body[k] !== undefined) pocFields[k] = req.body[k]; });
        if (req.body.site_photos !== undefined) pocFields.site_photos = JSON.stringify(req.body.site_photos);
        if (req.body.local_updates !== undefined) pocFields.local_updates = JSON.stringify(req.body.local_updates);
        if (Object.keys(pocFields).length > 0) {
            const sets = [];
            const vals = [];
            Object.entries(pocFields).forEach(([k, v]) => { vals.push(v); sets.push(`${k} = $${vals.length}`); });
            if (req.body.is_verified === true) { sets.push('verified_at = NOW()'); }
            vals.push(updatedProperty.id);
            await db.query(`UPDATE properties SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
        }

        // Update price history if provided
        if (Array.isArray(req.body.price_history)) {
            // Delete old history
            await db.query('DELETE FROM price_history WHERE property_id = $1', [updatedProperty.id]);

            // Insert new history
            if (req.body.price_history.length > 0) {
                for (const h of req.body.price_history) {
                    await db.query(
                        'INSERT INTO price_history (property_id, year, price) VALUES ($1, $2, $3)',
                        [updatedProperty.id, h.year, h.price]
                    );
                }
            }
        }

        // Attach history to response
        const history = await getPriceHistory(updatedProperty.id);
        res.json({ ...updatedProperty, price_history: history });
    } catch (err) {
        console.error('PUT /properties/:id error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/properties/:id (admin)
router.delete('/:id', auth, async (req, res) => {
    try {
        const { rows } = await db.query(
            'DELETE FROM properties WHERE id=$1 RETURNING id',
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Property not found' });
        res.json({ deleted: true, id: rows[0].id });
    } catch (err) {
        console.error('DELETE /properties/:id error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/properties/:id/publish — toggle is_public (admin)
router.patch('/:id/publish', auth, async (req, res) => {
    try {
        const { is_public } = req.body;
        const { rows } = await db.query(
            'UPDATE properties SET is_public=$1 WHERE id=$2 RETURNING id, plot_id, is_public',
            [is_public, req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Property not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('PATCH /properties/:id/publish error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ────────────────────────────────────────────────────────────────────────────
// POC: TRANSPARENCY / VERIFICATION / FRAUD ENDPOINTS
// ────────────────────────────────────────────────────────────────────────────

// GET /api/properties/:id/fraud-check — flag potential duplicates near same coords
router.get('/:id/fraud-check', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT lat, lng, plot_id FROM properties WHERE id = $1',
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        const latF = parseFloat(rows[0].lat);
        const lngF = parseFloat(rows[0].lng);
        const plot_id = rows[0].plot_id;
        if (isNaN(latF) || isNaN(lngF)) return res.json({ duplicates: [], risk: 'unknown' });

        // Bounding box ~50m
        const delta = 0.0005;
        const dup = await db.query(
            `SELECT id, plot_id, title, area, is_verified
             FROM properties
             WHERE id <> $1 AND lat IS NOT NULL AND lng IS NOT NULL AND lat BETWEEN $2 AND $3 AND lng BETWEEN $4 AND $5`,
            [req.params.id, latF - delta, latF + delta, lngF - delta, lngF + delta]
        );
        const risk = dup.rows.length === 0 ? 'low' : dup.rows.length < 2 ? 'medium' : 'high';
        res.json({ plotId: plot_id, duplicates: dup.rows, risk });
    } catch (err) {
        console.error('GET fraud-check error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/properties/:id/comparables — last sales within ~2km, similar size
router.get('/:id/comparables', async (req, res) => {
    try {
        const { rows: pRows } = await db.query('SELECT * FROM properties WHERE id = $1', [req.params.id]);
        if (pRows.length === 0) return res.status(404).json({ error: 'Not found' });
        const p = pRows[0];
        const delta = 0.02;
        const pLat = parseFloat(p.lat);
        const pLng = parseFloat(p.lng);
        const pSize = parseFloat(p.size);
        const sizeMin = pSize * 0.7;
        const sizeMax = pSize * 1.3;
        const { rows } = await db.query(
            `SELECT id, plot_id, title, area, size, current_price, market_rate, status
             FROM properties
             WHERE id <> $1 AND category_type = $2
               AND lat IS NOT NULL AND lng IS NOT NULL
               AND lat BETWEEN $3 AND $4 AND lng BETWEEN $5 AND $6
               AND size BETWEEN $7 AND $8
             ORDER BY ABS(size - $9) ASC LIMIT 5`,
            [p.id, p.category_type, pLat - delta, pLat + delta, pLng - delta, pLng + delta, sizeMin, sizeMax, pSize]
        );
        res.json({ comparables: rows });
    } catch (err) {
        console.error('GET comparables error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/properties/developers/list — list of developers (public)
router.get('/developers/list', async (_req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT d.*, COUNT(p.id)::int AS property_count
             FROM developers d LEFT JOIN properties p ON p.developer_id = d.id
             GROUP BY d.id ORDER BY d.name`
        );
        res.json(rows);
    } catch (err) {
        console.error('GET developers error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ────────────────────────────────────────────────────────────────────────────
// DEVELOPERS CRUD (admin)
// ────────────────────────────────────────────────────────────────────────────

router.post('/developers', auth, async (req, res) => {
    try {
        const { name, rera_id, established, is_verified, website, description } = req.body;
        if (!name) return res.status(400).json({ error: 'name is required' });
        const { rows } = await db.query(
            `INSERT INTO developers (name, rera_id, established, is_verified, website, description)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [name, rera_id || null, established || null, is_verified || false, website || null, description || null]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Developer name already exists' });
        console.error('POST developers error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/developers/:id', auth, async (req, res) => {
    try {
        const { name, rera_id, established, is_verified, website, description } = req.body;
        const { rows } = await db.query(
            `UPDATE developers SET name=$1, rera_id=$2, established=$3, is_verified=$4, website=$5, description=$6
             WHERE id=$7 RETURNING *`,
            [name, rera_id, established, is_verified, website, description, req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Developer not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('PUT developers error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/developers/:id', auth, async (req, res) => {
    try {
        const { rows } = await db.query('DELETE FROM developers WHERE id=$1 RETURNING id', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Developer not found' });
        res.json({ deleted: true });
    } catch (err) {
        console.error('DELETE developers error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ────────────────────────────────────────────────────────────────────────────
// VERIFICATION REPORTS CRUD
// ────────────────────────────────────────────────────────────────────────────

router.get('/:id/verification-reports', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM verification_reports WHERE property_id = $1 ORDER BY created_at DESC',
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        console.error('GET verification-reports error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/:id/verification-reports', auth, async (req, res) => {
    try {
        const { verified_by, visited_at, site_status, photos, notes } = req.body;
        const { rows } = await db.query(
            `INSERT INTO verification_reports (property_id, verified_by, visited_at, site_status, photos, notes)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [req.params.id, verified_by || 'Admin', visited_at || new Date(), site_status || null,
             JSON.stringify(photos || []), notes || null]
        );
        // Auto-mark the property as verified
        await db.query(
            `UPDATE properties SET is_verified = true, verified_at = NOW(), verified_by = $1,
             verification_notes = $2, site_status = COALESCE($3, site_status)
             WHERE id = $4`,
            [verified_by || 'Admin', notes || null, site_status || null, req.params.id]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('POST verification-reports error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/verification-reports/:reportId', auth, async (req, res) => {
    try {
        const { rows } = await db.query(
            'DELETE FROM verification_reports WHERE id=$1 RETURNING id', [req.params.reportId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });
        res.json({ deleted: true });
    } catch (err) {
        console.error('DELETE verification-report error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── CSV Bulk Upload ────────────────────────────────────────────────────────
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/csv-upload', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

        const content = req.file.buffer.toString('utf-8');
        const records = parse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true,
        });

        if (records.length === 0) return res.status(400).json({ error: 'CSV file is empty' });

        const results = { created: 0, skipped: 0, errors: [] };

        for (let i = 0; i < records.length; i++) {
            const r = records[i];
            try {
                const plotId = r.plot_id || r.plotId || `CSV-${Date.now()}-${i}`;
                const title = r.title || `${r.area || 'Property'} - ${r.category_type || 'General'}`;
                const area = r.area || 'Unknown';
                const categoryType = (r.category_type || r.categoryType || 'residential').toLowerCase();
                const pricePerSqft = parseInt(r.price_per_sqft || r.pricePerSqft) || 0;
                const size = parseFloat(r.size) || 0;
                const currentPrice = parseInt(r.current_price || r.currentPrice) || (pricePerSqft * size);

                const { rows } = await db.query(
                    `INSERT INTO properties (
                        plot_id, title, area, location, category_type, property_type, room_count,
                        status, price_per_sqft, size, unit, zoning, description,
                        beds, baths, garage, year_built, demand,
                        agent_name, agent_role, agent_contact,
                        approval_status, is_public, notes, lat, lng,
                        current_price, past_year_gain, price_change,
                        circle_rate, market_rate, rera_number, is_verified,
                        site_status, developer_name, flood_risk
                    ) VALUES (
                        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
                        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,
                        $27,$28,$29,$30,$31,$32,$33,$34,$35,$36
                    ) RETURNING id`,
                    [
                        plotId, title, area, r.location || area,
                        categoryType, r.property_type || r.propertyType || null, r.room_count || r.roomCount || null,
                        r.status || 'Available',
                        pricePerSqft, size, r.unit || 'sq.ft',
                        r.zoning || null, r.description || null,
                        parseInt(r.beds) || 0, parseInt(r.baths) || 0, parseInt(r.garage) || 0,
                        parseInt(r.year_built || r.yearBuilt) || null,
                        r.demand || 'Medium',
                        r.agent_name || r.agentName || null,
                        r.agent_role || r.agentRole || null,
                        r.agent_contact || r.agentContact || null,
                        r.approval_status || 'Approved',
                        r.is_public === 'true' || r.is_public === '1' || r.isPublic === 'true',
                        r.notes || null,
                        parseFloat(r.lat) || null, parseFloat(r.lng) || null,
                        currentPrice,
                        parseInt(r.past_year_gain || r.pastYearGain) || 0,
                        r.price_change || r.priceChange || null,
                        parseInt(r.circle_rate || r.circleRate) || 0,
                        parseInt(r.market_rate || r.marketRate) || 0,
                        r.rera_number || r.reraNumber || null,
                        r.is_verified === 'true' || r.is_verified === '1' || r.isVerified === 'true',
                        r.site_status || r.siteStatus || 'developed',
                        r.developer_name || r.developerName || null,
                        r.flood_risk || r.floodRisk || 'low',
                    ]
                );

                // Insert price history if columns exist (price_2020, price_2021, etc.)
                const priceYearCols = Object.keys(r).filter(k => /^price_\d{4}$/.test(k));
                for (const col of priceYearCols) {
                    const year = parseInt(col.split('_')[1]);
                    const price = parseInt(r[col]);
                    if (year && price) {
                        await db.query(
                            'INSERT INTO price_history (property_id, year, price) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                            [rows[0].id, year, price]
                        );
                    }
                }

                results.created++;
            } catch (rowErr) {
                if (rowErr.code === '23505') {
                    results.skipped++;
                    results.errors.push(`Row ${i + 1}: Plot ID already exists`);
                } else {
                    results.errors.push(`Row ${i + 1}: ${rowErr.message}`);
                }
            }
        }

        res.json({
            message: `Imported ${results.created} properties, ${results.skipped} skipped`,
            ...results,
            total: records.length,
        });
    } catch (err) {
        console.error('CSV upload error:', err);
        res.status(500).json({ error: 'Failed to process CSV: ' + err.message });
    }
});

module.exports = router;
