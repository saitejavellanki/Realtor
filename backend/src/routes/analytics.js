const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/dashboard (admin only)
router.get('/dashboard', auth, async (req, res) => {
    try {
        const [totals, byStatus, byCategory, recentActivity] = await Promise.all([
            db.query(`
        SELECT
          COUNT(*) AS total_properties,
          COUNT(*) FILTER (WHERE is_public = true) AS public_count,
          COUNT(*) FILTER (WHERE is_public = false) AS draft_count,
          COALESCE(SUM(current_price) FILTER (WHERE status = 'Available'), 0) AS total_available_value,
          COALESCE(AVG(price_per_sqft), 0) AS avg_price_per_sqft
        FROM properties
      `),
            db.query(`
        SELECT status, COUNT(*) AS count
        FROM properties
        GROUP BY status
        ORDER BY count DESC
      `),
            db.query(`
        SELECT category_type, COUNT(*) AS count
        FROM properties
        GROUP BY category_type
      `),
            db.query(`
        SELECT id, plot_id, title, area, status, price_per_sqft, updated_at
        FROM properties
        ORDER BY updated_at DESC
        LIMIT 5
      `),
        ]);

        const stats = totals.rows[0];

        // ─── POC: transparency overview ───
        const transparency = await db.query(`
            SELECT
              COUNT(*) FILTER (WHERE is_verified = true)::int AS verified,
              COUNT(*) FILTER (WHERE rera_number IS NOT NULL)::int AS with_rera,
              COUNT(*) FILTER (WHERE circle_rate > 0 AND market_rate > 0)::int AS with_dual_rate,
              COUNT(*) FILTER (WHERE is_verified = false)::int AS unverified,
              ROUND(AVG(CASE WHEN circle_rate > 0 THEN (market_rate - circle_rate) * 100.0 / circle_rate ELSE NULL END), 1) AS avg_market_premium
            FROM properties
        `);

        res.json({
            summary: {
                totalProperties: parseInt(stats.total_properties),
                publicCount: parseInt(stats.public_count),
                draftCount: parseInt(stats.draft_count),
                totalAvailableValue: parseInt(stats.total_available_value),
                avgPricePerSqft: Math.round(parseFloat(stats.avg_price_per_sqft)),
            },
            transparency: transparency.rows[0],
            byStatus: byStatus.rows.map(r => ({ status: r.status, count: parseInt(r.count) })),
            byCategory: byCategory.rows.map(r => ({ category: r.category_type, count: parseInt(r.count) })),
            recentActivity: recentActivity.rows,
        });
    } catch (err) {
        console.error('GET /analytics/dashboard error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ────────────────────────────────────────────────────────────────────────────
// PUBLIC: NRI / Investor dashboard
// ────────────────────────────────────────────────────────────────────────────

// GET /api/analytics/nri-dashboard — public (no auth)
// Returns: top investment zones, ROI ranking, area trends, transparency stats
router.get('/nri-dashboard', async (_req, res) => {
    try {
        const [zones, roi, transparency, types] = await Promise.all([
            // Top zones by avg market rate growth (proxy: pastYearGain / currentPrice)
            db.query(`
                SELECT area,
                  COUNT(*)::int AS listings,
                  ROUND(AVG(price_per_sqft))::int AS avg_rate,
                  ROUND(AVG(market_rate))::int AS avg_market_rate,
                  ROUND(AVG(circle_rate))::int AS avg_circle_rate,
                  ROUND(AVG(CASE WHEN circle_rate > 0 THEN (market_rate - circle_rate) * 100.0 / circle_rate ELSE 0 END), 1) AS avg_premium_pct,
                  ROUND(AVG(CASE WHEN current_price > 0 THEN past_year_gain * 100.0 / current_price ELSE 0 END), 1) AS avg_yoy_pct
                FROM properties WHERE is_public = true
                GROUP BY area ORDER BY avg_yoy_pct DESC NULLS LAST LIMIT 6
            `),
            // ROI: top properties by past_year_gain / currentPrice
            db.query(`
                SELECT id, plot_id, title, area, current_price, past_year_gain, is_verified,
                  ROUND(past_year_gain * 100.0 / NULLIF(current_price,0), 1) AS roi_pct
                FROM properties
                WHERE is_public = true AND past_year_gain > 0
                ORDER BY roi_pct DESC NULLS LAST LIMIT 5
            `),
            // Transparency totals
            db.query(`
                SELECT
                  COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE is_verified = true)::int AS verified,
                  COUNT(*) FILTER (WHERE rera_number IS NOT NULL)::int AS with_rera,
                  COUNT(*) FILTER (WHERE circle_rate > 0 AND market_rate > 0)::int AS with_dual_rate,
                  ROUND(AVG(CASE WHEN circle_rate > 0 THEN (market_rate - circle_rate) * 100.0 / circle_rate ELSE NULL END), 1) AS avg_market_premium
                FROM properties WHERE is_public = true
            `),
            // Type breakdown
            db.query(`
                SELECT category_type, COUNT(*)::int AS count
                FROM properties WHERE is_public = true GROUP BY category_type
            `),
        ]);

        res.json({
            topZones: zones.rows,
            topRoi: roi.rows,
            transparency: transparency.rows[0],
            typeBreakdown: types.rows,
        });
    } catch (err) {
        console.error('GET nri-dashboard error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
