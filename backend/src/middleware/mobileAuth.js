const jwt = require('jsonwebtoken');

/**
 * Mobile auth middleware — verifies JWT issued to mobile_users.
 * Expects: Authorization: Bearer <token>
 * Attaches req.user = { id, email, type: 'mobile' }
 */
module.exports = function mobileAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (payload.type !== 'mobile') {
            return res.status(403).json({ error: 'Mobile user token required' });
        }
        req.user = payload;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
