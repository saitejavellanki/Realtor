const express = require('express');
const jwt = require('jsonwebtoken');
const OpenAI = require('openai');
const db = require('../db');

const router = express.Router();

// Optional auth — extracts user ID if token present, but doesn't block
function optionalAuth(req, res, next) {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
        try {
            const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
            req.userId = payload.id;
        } catch { }
    }
    next();
}

// ─── Tool definitions for OpenAI function calling ─────────────────────────
const tools = [
    {
        type: 'function',
        function: {
            name: 'search_properties',
            description: 'Search and filter property listings. Returns a list of properties matching the criteria.',
            parameters: {
                type: 'object',
                properties: {
                    area: { type: 'string', description: 'Filter by area/locality name (partial match)' },
                    category: { type: 'string', description: 'residential or commercial' },
                    status: { type: 'string', description: 'Available, Sold, Reserved, or Draft' },
                    verified: { type: 'boolean', description: 'Only show verified properties' },
                    minPrice: { type: 'number', description: 'Minimum total price' },
                    maxPrice: { type: 'number', description: 'Maximum total price' },
                    siteStatus: { type: 'string', description: 'vacant, under_construction, or developed' },
                    developer: { type: 'string', description: 'Filter by developer name' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_property_detail',
            description: 'Get full details of a specific property by its plot ID (e.g. PLT-001) or database ID.',
            parameters: {
                type: 'object',
                properties: {
                    identifier: { type: 'string', description: 'Plot ID (e.g. PLT-001) or numeric database ID' },
                },
                required: ['identifier'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_comparables',
            description: 'Find comparable properties (similar size, nearby location) for a given property ID.',
            parameters: {
                type: 'object',
                properties: {
                    propertyId: { type: 'number', description: 'Database ID of the property' },
                },
                required: ['propertyId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_fraud_check',
            description: 'Check if a property has potential duplicate listings nearby (fraud detection).',
            parameters: {
                type: 'object',
                properties: {
                    propertyId: { type: 'number', description: 'Database ID of the property' },
                },
                required: ['propertyId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_nri_dashboard',
            description: 'Get NRI investor dashboard: top zones by growth, best ROI properties, transparency stats, and property type breakdown.',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_developers',
            description: 'List all developers with their verification status, RERA ID, and property count.',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_analytics',
            description: 'Get platform analytics: total properties, average price, status breakdown, transparency metrics (verified count, RERA count, dual rate count, avg market premium).',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_verification_reports',
            description: 'Get verification/audit reports for a specific property.',
            parameters: {
                type: 'object',
                properties: {
                    propertyId: { type: 'number', description: 'Database ID of the property' },
                },
                required: ['propertyId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_user_saved_properties',
            description: 'Get the current user\'s saved/bookmarked properties list. Use this when the user asks about "my saved list", "my bookmarks", "properties I saved", etc.',
            parameters: { type: 'object', properties: {} },
        },
    },
    {
        type: 'function',
        function: {
            name: 'predict_price',
            description: 'Predict future price of a property or area based on historical price trends, comparable sales, and market data. Use this when user asks about price prediction, future value, expected appreciation, or investment projections.',
            parameters: {
                type: 'object',
                properties: {
                    propertyId: { type: 'number', description: 'Database ID of a specific property to predict price for' },
                    area: { type: 'string', description: 'Area/locality name to predict prices for (used if no specific property)' },
                    years: { type: 'number', description: 'Number of years to project into the future (default 3)' },
                },
            },
        },
    },
];

// ─── Tool executors ─────────────────────────────────────────────────────────
async function executeTool(name, args, userId) {
    switch (name) {
        case 'search_properties': {
            let where = ['is_public = true'];
            const params = [];
            if (args.area) { params.push(`%${args.area}%`); where.push(`area ILIKE $${params.length}`); }
            if (args.category) { params.push(args.category.toLowerCase()); where.push(`LOWER(category_type) = $${params.length}`); }
            if (args.status) { params.push(args.status); where.push(`LOWER(status) = LOWER($${params.length})`); }
            if (args.verified) where.push('is_verified = true');
            if (args.minPrice) { params.push(args.minPrice); where.push(`current_price >= $${params.length}`); }
            if (args.maxPrice) { params.push(args.maxPrice); where.push(`current_price <= $${params.length}`); }
            if (args.siteStatus) { params.push(args.siteStatus); where.push(`site_status = $${params.length}`); }
            if (args.developer) { params.push(`%${args.developer}%`); where.push(`developer_name ILIKE $${params.length}`); }
            const { rows } = await db.query(
                `SELECT id, plot_id, title, area, category_type, status, price_per_sqft, size, unit,
                        current_price, circle_rate, market_rate, is_verified, rera_number,
                        developer_name, site_status, flood_risk, demand
                 FROM properties WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 20`, params
            );
            return { count: rows.length, properties: rows };
        }
        case 'get_property_detail': {
            const id = args.identifier;
            const isNumeric = /^\d+$/.test(id);
            const { rows } = await db.query(
                isNumeric
                    ? 'SELECT * FROM properties WHERE id = $1'
                    : 'SELECT * FROM properties WHERE plot_id = $1',
                [isNumeric ? parseInt(id) : id]
            );
            if (rows.length === 0) return { error: 'Property not found' };
            const p = rows[0];
            const hist = await db.query('SELECT year, price FROM price_history WHERE property_id = $1 ORDER BY year', [p.id]);
            return { ...p, price_history: hist.rows };
        }
        case 'get_comparables': {
            const { rows: pRows } = await db.query('SELECT * FROM properties WHERE id = $1', [args.propertyId]);
            if (pRows.length === 0) return { error: 'Property not found' };
            const p = pRows[0];
            const pLat = parseFloat(p.lat); const pLng = parseFloat(p.lng); const pSize = parseFloat(p.size);
            if (isNaN(pLat) || isNaN(pLng)) return { comparables: [], note: 'No GPS coordinates' };
            const delta = 0.02;
            const { rows } = await db.query(
                `SELECT id, plot_id, title, area, size, current_price, market_rate, status
                 FROM properties WHERE id <> $1 AND category_type = $2
                 AND lat IS NOT NULL AND lng IS NOT NULL
                 AND lat BETWEEN $3 AND $4 AND lng BETWEEN $5 AND $6
                 AND size BETWEEN $7 AND $8
                 ORDER BY ABS(size - $9) ASC LIMIT 5`,
                [p.id, p.category_type, pLat - delta, pLat + delta, pLng - delta, pLng + delta, pSize * 0.7, pSize * 1.3, pSize]
            );
            return { comparables: rows, baseProperty: p.plot_id };
        }
        case 'get_fraud_check': {
            const { rows } = await db.query('SELECT lat, lng, plot_id FROM properties WHERE id = $1', [args.propertyId]);
            if (rows.length === 0) return { error: 'Property not found' };
            const latF = parseFloat(rows[0].lat); const lngF = parseFloat(rows[0].lng);
            if (isNaN(latF) || isNaN(lngF)) return { risk: 'unknown', duplicates: [] };
            const delta = 0.0005;
            const dup = await db.query(
                `SELECT id, plot_id, title, area, is_verified FROM properties
                 WHERE id <> $1 AND lat IS NOT NULL AND lng IS NOT NULL
                 AND lat BETWEEN $2 AND $3 AND lng BETWEEN $4 AND $5`,
                [args.propertyId, latF - delta, latF + delta, lngF - delta, lngF + delta]
            );
            const risk = dup.rows.length === 0 ? 'low' : dup.rows.length < 2 ? 'medium' : 'high';
            return { plotId: rows[0].plot_id, duplicates: dup.rows, risk };
        }
        case 'get_nri_dashboard': {
            const zones = await db.query(`
                SELECT area, COUNT(*)::int AS listings,
                    ROUND(AVG(price_per_sqft)) AS avg_rate,
                    ROUND(AVG(market_rate)) AS avg_market_rate,
                    ROUND(AVG(circle_rate)) AS avg_circle_rate,
                    ROUND(AVG(CASE WHEN circle_rate > 0 THEN (market_rate - circle_rate) * 100.0 / circle_rate ELSE NULL END), 1) AS avg_premium_pct,
                    ROUND(AVG(CASE WHEN past_year_gain > 0 AND current_price > 0 THEN past_year_gain * 100.0 / current_price ELSE NULL END), 1) AS avg_yoy_pct
                FROM properties WHERE is_public = true GROUP BY area ORDER BY avg_yoy_pct DESC NULLS LAST LIMIT 5
            `);
            const roi = await db.query(`
                SELECT id, plot_id, title, area, current_price, past_year_gain,
                    ROUND(past_year_gain * 100.0 / NULLIF(current_price, 0), 1) AS roi_pct
                FROM properties WHERE is_public = true AND past_year_gain > 0
                ORDER BY roi_pct DESC LIMIT 4
            `);
            const trans = await db.query(`
                SELECT COUNT(*) FILTER (WHERE is_verified)::int AS verified,
                    COUNT(*) FILTER (WHERE rera_number IS NOT NULL)::int AS with_rera,
                    COUNT(*) FILTER (WHERE circle_rate > 0 AND market_rate > 0)::int AS with_dual_rate,
                    COUNT(*)::int AS total
                FROM properties
            `);
            return { topZones: zones.rows, topRoi: roi.rows, transparency: trans.rows[0] };
        }
        case 'get_developers': {
            const { rows } = await db.query(
                `SELECT d.*, COUNT(p.id)::int AS property_count
                 FROM developers d LEFT JOIN properties p ON p.developer_id = d.id
                 GROUP BY d.id ORDER BY d.name`
            );
            return { developers: rows };
        }
        case 'get_analytics': {
            const summary = await db.query(`
                SELECT COUNT(*)::int AS total,
                    ROUND(AVG(price_per_sqft))::int AS avg_price_sqft,
                    ROUND(AVG(current_price))::int AS avg_total_price,
                    COUNT(*) FILTER (WHERE status = 'Available')::int AS available,
                    COUNT(*) FILTER (WHERE status = 'Sold')::int AS sold
                FROM properties
            `);
            const transparency = await db.query(`
                SELECT COUNT(*) FILTER (WHERE is_verified)::int AS verified,
                    COUNT(*) FILTER (WHERE rera_number IS NOT NULL)::int AS with_rera,
                    COUNT(*) FILTER (WHERE circle_rate > 0 AND market_rate > 0)::int AS with_dual_rate,
                    COUNT(*) FILTER (WHERE is_verified = false)::int AS unverified,
                    ROUND(AVG(CASE WHEN circle_rate > 0 THEN (market_rate - circle_rate) * 100.0 / circle_rate ELSE NULL END), 1) AS avg_market_premium
                FROM properties
            `);
            return { summary: summary.rows[0], transparency: transparency.rows[0] };
        }
        case 'get_verification_reports': {
            const { rows } = await db.query(
                'SELECT * FROM verification_reports WHERE property_id = $1 ORDER BY created_at DESC',
                [args.propertyId]
            );
            return { reports: rows };
        }
        case 'predict_price': {
            const years = args.years || 3;
            let properties = [];
            let areaName = args.area;

            if (args.propertyId) {
                // Specific property
                const { rows } = await db.query('SELECT * FROM properties WHERE id = $1', [args.propertyId]);
                if (rows.length === 0) return { error: 'Property not found' };
                properties = rows;
                areaName = rows[0].area;
            } else if (args.area) {
                // Area-based prediction
                const { rows } = await db.query(
                    `SELECT * FROM properties WHERE area ILIKE $1 AND is_public = true ORDER BY created_at DESC LIMIT 20`,
                    [`%${args.area}%`]
                );
                if (rows.length === 0) return { error: `No properties found in area: ${args.area}` };
                properties = rows;
            } else {
                return { error: 'Please provide a propertyId or area name' };
            }

            // Get price history for all relevant properties
            const propIds = properties.map(p => p.id);
            const { rows: historyRows } = await db.query(
                `SELECT ph.property_id, ph.year, ph.price FROM price_history ph
                 WHERE ph.property_id = ANY($1) ORDER BY ph.year ASC`,
                [propIds]
            );

            // Group history by property
            const historyByProp = {};
            for (const h of historyRows) {
                if (!historyByProp[h.property_id]) historyByProp[h.property_id] = [];
                historyByProp[h.property_id].push({ year: h.year, price: parseFloat(h.price) });
            }

            // Calculate area-wide stats
            const avgPrice = properties.reduce((s, p) => s + (parseFloat(p.current_price) || 0), 0) / properties.length;
            const avgPricePerSqft = properties.reduce((s, p) => s + (parseFloat(p.price_per_sqft) || 0), 0) / properties.length;
            const avgCircleRate = properties.reduce((s, p) => s + (parseFloat(p.circle_rate) || 0), 0) / properties.filter(p => p.circle_rate > 0).length || 0;
            const avgMarketRate = properties.reduce((s, p) => s + (parseFloat(p.market_rate) || 0), 0) / properties.filter(p => p.market_rate > 0).length || 0;

            // Calculate year-over-year growth rates from price history
            const allGrowthRates = [];
            for (const [, history] of Object.entries(historyByProp)) {
                if (history.length < 2) continue;
                for (let i = 1; i < history.length; i++) {
                    const prev = history[i - 1].price;
                    const curr = history[i].price;
                    if (prev > 0) allGrowthRates.push((curr - prev) / prev);
                }
            }

            // Also use past_year_gain from properties
            for (const p of properties) {
                const gain = parseFloat(p.past_year_gain) || 0;
                const price = parseFloat(p.current_price) || 0;
                if (price > 0 && gain !== 0) allGrowthRates.push(gain / price);
            }

            const avgGrowthRate = allGrowthRates.length > 0
                ? allGrowthRates.reduce((s, r) => s + r, 0) / allGrowthRates.length
                : 0.05; // default 5% if no data

            // Generate predictions
            const predictions = [];
            const currentYear = new Date().getFullYear();
            let projectedPrice = avgPrice;
            let projectedPricePerSqft = avgPricePerSqft;
            for (let y = 1; y <= years; y++) {
                projectedPrice *= (1 + avgGrowthRate);
                projectedPricePerSqft *= (1 + avgGrowthRate);
                predictions.push({
                    year: currentYear + y,
                    predictedPrice: Math.round(projectedPrice),
                    predictedPricePerSqft: Math.round(projectedPricePerSqft),
                });
            }

            // Demand distribution
            const demandCounts = {};
            for (const p of properties) {
                const d = p.demand || 'unknown';
                demandCounts[d] = (demandCounts[d] || 0) + 1;
            }

            return {
                area: areaName,
                propertiesAnalyzed: properties.length,
                dataPoints: allGrowthRates.length,
                currentMetrics: {
                    avgPrice: Math.round(avgPrice),
                    avgPricePerSqft: Math.round(avgPricePerSqft),
                    avgCircleRate: Math.round(avgCircleRate),
                    avgMarketRate: Math.round(avgMarketRate),
                    marketPremium: avgCircleRate > 0 ? `${Math.round((avgMarketRate - avgCircleRate) * 100 / avgCircleRate)}%` : 'N/A',
                },
                annualGrowthRate: `${(avgGrowthRate * 100).toFixed(1)}%`,
                predictions,
                demandDistribution: demandCounts,
                confidence: allGrowthRates.length >= 5 ? 'high' : allGrowthRates.length >= 2 ? 'medium' : 'low',
                note: 'Predictions are based on historical price trends in our database. Actual values may vary based on market conditions, policy changes, and economic factors.',
            };
        }
        case 'get_user_saved_properties': {
            if (!userId) return { error: 'User not logged in — cannot retrieve saved properties' };
            const { rows } = await db.query(
                `SELECT p.id, p.plot_id, p.title, p.area, p.category_type, p.status,
                        p.price_per_sqft, p.size, p.unit, p.current_price, p.is_verified,
                        p.rera_number, p.developer_name, p.demand
                 FROM user_saved_properties usp
                 JOIN properties p ON p.id = usp.property_id
                 WHERE usp.user_id = $1
                 ORDER BY usp.saved_at DESC`,
                [userId]
            );
            return { count: rows.length, savedProperties: rows };
        }
        default:
            return { error: `Unknown tool: ${name}` };
    }
}

// ─── System prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a helpful real estate assistant for a property transparency platform focused on India (especially NRI investors). You help users find properties, understand pricing, verify listings, and analyze investment opportunities.

Key domain knowledge:
- **Circle Rate**: Government's official minimum property value (used for stamp duty). Lower than market rate.
- **Market Rate**: Actual transaction price. The premium over circle rate often indicates market dynamics.
- **RERA**: Real Estate Regulatory Authority — legitimate projects must have a RERA number.
- **Transparency Score**: 0-100 score based on verification, RERA, dual rate disclosure, photos, developer info, etc.
- **NRI**: Non-Resident Indian — overseas investors who need extra transparency since they can't visit sites easily.

You have access to the platform's live data through function calls. ALWAYS call the relevant tool FIRST before responding — never say "no data" or ask clarifying questions without searching first. When a user asks about properties, pricing, areas, developers, or investment, immediately call the tool with whatever filters are mentioned (or no filters if none are specified).

IMPORTANT: If the user asks to see properties (e.g. "show me commercial properties"), call search_properties right away with the filters mentioned. Do NOT ask for more details before searching. Return what you find.

When the user asks about "my saved list", "my bookmarks", or "properties I saved", use the get_user_saved_properties tool — this returns ONLY properties saved by the current user, not all properties.

When the user asks about price prediction, future value, expected appreciation, or investment projections, use the predict_price tool. Present the predictions with clear year-by-year projections and mention the confidence level and data points used. Always include the disclaimer that predictions are estimates based on historical trends.

Be concise, friendly, and use Indian rupee formatting (₹ or Rs.). When listing properties, format them cleanly. Flag unverified properties or missing RERA numbers as risks.`;

// ─── Chat endpoint ──────────────────────────────────────────────────────────
router.post('/', optionalAuth, async (req, res) => {
    try {
        const { messages, history } = req.body;
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'messages array is required' });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server' });
        }

        const openai = new OpenAI({ apiKey });

        // Build chat history in OpenAI format
        const chatMessages = [
            { role: 'system', content: SYSTEM_PROMPT },
        ];

        // Add conversation history
        if (history && Array.isArray(history)) {
            for (const m of history) {
                chatMessages.push({
                    role: m.role === 'model' ? 'assistant' : 'user',
                    content: m.text,
                });
            }
        }

        // Add the latest user message
        const lastMsg = messages[messages.length - 1].text;
        chatMessages.push({ role: 'user', content: lastMsg });

        // Initial completion
        let response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: chatMessages,
            tools,
        });

        let choice = response.choices[0];

        // Function calling loop — handle up to 10 sequential tool calls
        let iterations = 0;
        while (choice.finish_reason === 'tool_calls' && iterations < 10) {
            const assistantMessage = choice.message;
            chatMessages.push(assistantMessage);

            // Execute all tool calls
            for (const toolCall of assistantMessage.tool_calls) {
                const { name, arguments: argsStr } = toolCall.function;
                const args = JSON.parse(argsStr);
                console.log(`  🔧 Chat tool call: ${name}(${JSON.stringify(args).slice(0, 100)})`);
                const toolResult = await executeTool(name, args, req.userId);
                chatMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(toolResult),
                });
            }

            // Send tool results back to the model
            response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: chatMessages,
                tools,
            });
            choice = response.choices[0];
            iterations++;
        }

        const responseText = choice.message.content || '';

        // Save to DB if user is authenticated
        if (req.userId) {
            try {
                await db.query(
                    'INSERT INTO chat_history (user_id, role, text) VALUES ($1, $2, $3)',
                    [req.userId, 'user', lastMsg]
                );
                await db.query(
                    'INSERT INTO chat_history (user_id, role, text) VALUES ($1, $2, $3)',
                    [req.userId, 'model', responseText]
                );
            } catch (dbErr) {
                console.error('Failed to save chat history:', dbErr.message);
            }
        }

        res.json({ reply: responseText });
    } catch (err) {
        console.error('POST /chat error:', err);
        res.status(500).json({ error: err.message || 'Chat failed' });
    }
});

// ─── Get chat history for authenticated user ────────────────────────────────
router.get('/history', optionalAuth, async (req, res) => {
    if (!req.userId) return res.json({ messages: [] });
    try {
        const { rows } = await db.query(
            'SELECT role, text FROM chat_history WHERE user_id = $1 ORDER BY created_at ASC LIMIT 100',
            [req.userId]
        );
        res.json({ messages: rows });
    } catch (err) {
        console.error('GET /chat/history error:', err);
        res.status(500).json({ error: 'Failed to load history' });
    }
});

// ─── Clear chat history ─────────────────────────────────────────────────────
router.delete('/history', optionalAuth, async (req, res) => {
    if (!req.userId) return res.json({ cleared: true });
    try {
        await db.query('DELETE FROM chat_history WHERE user_id = $1', [req.userId]);
        res.json({ cleared: true });
    } catch (err) {
        console.error('DELETE /chat/history error:', err);
        res.status(500).json({ error: 'Failed to clear history' });
    }
});

module.exports = router;
