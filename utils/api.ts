// ─── Mobile App API Service ───────────────────────────────────────────────────
// Dev: localhost backend on port 3011
// Prod (eas build): hosted Render API

import { Platform } from 'react-native';

const PROD_URL = 'https://realtor-ldp0.onrender.com/api';

// Web + iOS simulator can use localhost; Android emulator needs 10.0.2.2;
// physical devices need the host machine's LAN IP.
const DEV_HOST =
    Platform.OS === 'web' ? 'localhost'
    : Platform.OS === 'android' ? '10.0.2.2'
    : '192.168.0.13';
const DEV_URL = `http://${DEV_HOST}:3011/api`;

const BASE_URL = __DEV__ ? DEV_URL : PROD_URL;

export type PropertyStatus = 'Available' | 'Sold' | 'Pending' | 'Reserved' | 'Draft';
export type PropertyDemand = 'High demand' | 'Medium' | 'Low';

export type SiteStatus = 'vacant' | 'under_construction' | 'developed';

export type Property = {
    id: string;
    plot: string;
    title: string;
    area: string;
    location: string;
    type: 'residential' | 'commercial';
    status: PropertyStatus;
    demand: PropertyDemand;
    pricePerSqft: number;
    size: string;
    zoning: string;
    description: string;
    beds: number;
    baths: number;
    garage: number;
    yearBuilt: number;
    agentName: string;
    agentRole: string;
    agentPhone: string;
    currentPrice: number;
    pastYearGain: number;
    priceChange: string;
    priceHistory: { year: number; price: number }[];
    lat: number;
    lng: number;
    isPublic: boolean;
    // ─── POC Transparency ───
    circleRate?: number;
    marketRate?: number;
    rateVariance?: number;        // % premium of market over circle
    rateSource?: string | null;
    rateLastUpdated?: string | null;
    isVerified?: boolean;
    verifiedAt?: string | null;
    verifiedBy?: string | null;
    verificationNotes?: string | null;
    reraNumber?: string | null;
    siteStatus?: SiteStatus;
    developerName?: string | null;
    developerId?: number | null;
    floodRisk?: 'low' | 'medium' | 'high';
    pollutionIndex?: number | null;
    safetyIndex?: number | null;
    nearbyInfra?: { type: string; name: string; distance_km: number }[];
    localUpdates?: { date: string; headline: string }[];
    sitePhotos?: { url: string; taken_at?: string }[];
    sourceAttribution?: string | null;
    transparencyScore?: number;
};

export type PropertyFilters = {
    category?: string;
    status?: string;
    area?: string;
    verified?: boolean;
    developer?: string;
    minPrice?: number;
    maxPrice?: number;
    siteStatus?: SiteStatus;
};

export type NriDashboard = {
    topZones: { area: string; listings: number; avg_rate: number; avg_market_rate: number; avg_circle_rate: number; avg_premium_pct: number; avg_yoy_pct: number }[];
    topRoi: { id: number; plot_id: string; title: string; area: string; current_price: number; past_year_gain: number; roi_pct: number; is_verified: boolean }[];
    transparency: { total: number; verified: number; with_rera: number; with_dual_rate: number; avg_market_premium: number };
    typeBreakdown: { category_type: string; count: number }[];
};

async function get<T>(path: string, token?: string): Promise<T> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const fullUrl = `${BASE_URL}${path}`;
    console.log("🌐 GET request:", fullUrl);
    const res = await fetch(fullUrl, { headers });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error || `Request failed: ${res.status}`);
    }
    return res.json();
}

async function post<T>(path: string, body: object, token?: string): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any).error || `Request failed: ${res.status}`);
    return data;
}

async function put<T>(path: string, body: object, token?: string): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any).error || `Request failed: ${res.status}`);
    return data;
}

async function del<T>(path: string, token?: string): Promise<T> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any).error || `Request failed: ${res.status}`);
    return data;
}

// GET /api/properties — public listings (only is_public=true)
export async function getProperties(filters: PropertyFilters = {}): Promise<Property[]> {
    const entries = Object.entries(filters)
        .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false)
        .map(([k, v]) => [k, String(v)]);
    const qs = new URLSearchParams(Object.fromEntries(entries)).toString();
    const path = `/properties${qs ? `?${qs}` : ''}`;
    console.log("🔍 getProperties called with:", filters, "-> path:", path);
    try {
        const result = await get<Property[]>(path);
        console.log("✅ getProperties result:", result.length, "properties");
        return result;
    } catch (error) {
        console.error("❌ getProperties error:", error);
        throw error;
    }
}

// GET /api/analytics/nri-dashboard — public NRI dashboard data
export async function getNriDashboard(): Promise<NriDashboard> {
    return get<NriDashboard>('/analytics/nri-dashboard');
}

// GET /api/properties/:id/fraud-check
export async function getFraudCheck(id: string): Promise<{ plotId: string; duplicates: any[]; risk: 'low'|'medium'|'high'|'unknown' }> {
    return get(`/properties/${id}/fraud-check`);
}

// GET /api/properties/:id/comparables
export async function getComparables(id: string): Promise<{ comparables: any[] }> {
    return get(`/properties/${id}/comparables`);
}

// GET /api/properties/developers/list
export async function getDevelopers(): Promise<any[]> {
    return get('/properties/developers/list');
}

// GET /api/properties/:id — single property detail
export async function getProperty(id: string): Promise<Property> {
    return get<Property>(`/properties/${id}`);
}

// POST /api/auth/mobile/register
export async function registerUser(name: string, email: string, password: string): Promise<{ token: string; user: { id: number; name: string; email: string } }> {
    return post<{ token: string; user: { id: number; name: string; email: string } }>('/auth/mobile/register', { name, email, password });
}

// POST /api/auth/mobile/login
export async function loginUser(email: string, password: string): Promise<{ token: string; user: { id: number; name: string; email: string } }> {
    return post<{ token: string; user: { id: number; name: string; email: string } }>('/auth/mobile/login', { email, password });
}

// ─── Saved Properties ─────────────────────────────────────────────────────────

// GET /api/saved — fetch all saved property IDs for the current user
export async function getSavedIds(token: string): Promise<string[]> {
    const data = await get<{ savedIds: string[] }>('/saved', token);
    return data.savedIds;
}

// POST /api/saved — save a property
export async function saveProperty(token: string, propertyId: string): Promise<void> {
    await post('/saved', { property_id: propertyId }, token);
}

// DELETE /api/saved/:propertyId — unsave a property
export async function unsaveProperty(token: string, propertyId: string): Promise<void> {
    await del(`/saved/${propertyId}`, token);
}

// ─── Visit Requests ───────────────────────────────────────────────────────────

export type VisitRequestPayload = {
    property_id: string;
    visit_date: string;   // ISO date string e.g. "2025-03-15"
    visit_time: string;   // e.g. "10:00 AM"
    visitor_name: string;
    message?: string;
};

// POST /api/visits — schedule a visit
export async function scheduleVisit(token: string, data: VisitRequestPayload): Promise<void> {
    await post('/visits', data, token);
}

// ─── AI Chat ─────────────────────────────────────────────────────────────────

export type ChatMessage = { role: 'user' | 'model'; text: string };

export async function sendChatMessage(
    messages: ChatMessage[],
    history: ChatMessage[],
    token?: string | null
): Promise<string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages, history }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Chat failed');
    return data.reply;
}

export async function getChatHistory(token: string): Promise<ChatMessage[]> {
    const data = await get<{ messages: ChatMessage[] }>('/chat/history', token);
    return data.messages;
}

export async function clearChatHistory(token: string): Promise<void> {
    await del('/chat/history', token);
}

// ─── Profile ────────────────────────────────────────────────────────────────

export type UserProfile = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    gender: string | null;
};

export async function getProfile(token: string): Promise<UserProfile> {
    return get<UserProfile>('/auth/mobile/profile', token);
}

export async function updateProfile(token: string, data: { name: string; phone: string; gender: string }): Promise<UserProfile> {
    return put<UserProfile>('/auth/mobile/profile', data, token);
}

export default { getProperties, getProperty, registerUser, loginUser, getSavedIds, saveProperty, unsaveProperty, scheduleVisit, sendChatMessage };
