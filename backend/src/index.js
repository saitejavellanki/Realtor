require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const analyticsRoutes = require('./routes/analytics');
const savedRoutes = require('./routes/saved');
const visitRoutes = require('./routes/visits');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
// In production, CORS is permissive — auth is JWT-based so cookies aren't relied on.
// Mobile APKs send no Origin header (allowed by default); browsers get full access.
app.use(cors({
    origin: true,
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/chat', chatRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Real Estate API running on http://0.0.0.0:${PORT}`);
    console.log(`  Health: http://0.0.0.0:${PORT}/api/health`);
    console.log(`  Properties: http://0.0.0.0:${PORT}/api/properties`);
    console.log(`  Accessible from LAN at: http://192.168.0.13:${PORT}`);
});

module.exports = app;
