const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3011/api';

function getToken() {
    return localStorage.getItem('re_admin_token');
}

export function saveToken(token) {
    localStorage.setItem('re_admin_token', token);
}

export function clearToken() {
    localStorage.removeItem('re_admin_token');
}

export function isLoggedIn() {
    return !!getToken();
}

async function request(path, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
        if (getToken()) {
            // Existing session expired — clear and redirect to login
            clearToken();
            window.location.href = '/';
        }
        // No token means this is a login attempt — throw so the form shows the error
        throw new Error(data.error || 'Invalid credentials');
    }

    if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
    return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const api = {
    login: (email, password) =>
        request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

    // ─── Properties ─────────────────────────────────────────────────────────────
    getAllProperties: () => request('/properties/admin/all'),
    getPublicProperties: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/properties${qs ? `?${qs}` : ''}`);
    },
    getProperty: (id) => request(`/properties/${id}`),
    createProperty: (data) =>
        request('/properties', { method: 'POST', body: JSON.stringify(data) }),
    updateProperty: (id, data) =>
        request(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProperty: (id) =>
        request(`/properties/${id}`, { method: 'DELETE' }),
    uploadCSV: async (file) => {
        const token = getToken();
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${BASE_URL}/properties/csv-upload`, {
            method: 'POST',
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        return data;
    },
    publishProperty: (id, is_public) =>
        request(`/properties/${id}/publish`, {
            method: 'PATCH',
            body: JSON.stringify({ is_public }),
        }),

    // ─── Visit Requests ──────────────────────────────────────────────────────────
    getVisitRequests: () => request('/visits'),
    updateVisitStatus: (id, status) =>
        request(`/visits/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

    // ─── Analytics ──────────────────────────────────────────────────────────────
    getDashboard: () => request('/analytics/dashboard'),

    // ─── Developers ──────────────────────────────────────────────────────────────
    getDevelopers: () => request('/properties/developers/list'),
    createDeveloper: (data) =>
        request('/properties/developers', { method: 'POST', body: JSON.stringify(data) }),
    updateDeveloper: (id, data) =>
        request(`/properties/developers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteDeveloper: (id) =>
        request(`/properties/developers/${id}`, { method: 'DELETE' }),

    // ─── Verification Reports ────────────────────────────────────────────────────
    getVerificationReports: (propertyId) =>
        request(`/properties/${propertyId}/verification-reports`),
    createVerificationReport: (propertyId, data) =>
        request(`/properties/${propertyId}/verification-reports`, { method: 'POST', body: JSON.stringify(data) }),
    deleteVerificationReport: (reportId) =>
        request(`/properties/verification-reports/${reportId}`, { method: 'DELETE' }),

    // ─── Comparables / Fraud ─────────────────────────────────────────────────────
    getComparables: (propertyId) => request(`/properties/${propertyId}/comparables`),
    getFraudCheck: (propertyId) => request(`/properties/${propertyId}/fraud-check`),
};

export default api;
