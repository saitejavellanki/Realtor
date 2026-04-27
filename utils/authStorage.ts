import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'mobile_auth_token';
const USER_KEY = 'mobile_auth_user';

export async function saveToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function saveUser(user: { id: number; name: string; email: string }): Promise<void> {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getUser(): Promise<{ id: number; name: string; email: string } | null> {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

export async function clearUser(): Promise<void> {
    await SecureStore.deleteItemAsync(USER_KEY);
}

export async function clearSession(): Promise<void> {
    await Promise.all([clearToken(), clearUser()]);
}
