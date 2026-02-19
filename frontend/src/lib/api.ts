// ============================================================
// API Client — Wrapper fetch para comunicar com o backend
// Base URL: http://localhost:3001/api
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Recupera o access token do localStorage.
 */
function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
}

/**
 * Salva tokens de autenticação no localStorage.
 */
export function setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
}

/**
 * Remove tokens (logout).
 */
export function clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
}

/**
 * Fetch wrapper com auth token automático, error handling e tipagem.
 */
async function apiFetch<T>(
    endpoint: string,
    options?: RequestInit,
): Promise<T> {
    const token = getToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
    };

    if (options?.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    // Se 401, tentar refresh
    if (response.status === 401) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            // Retry com novo token
            headers['Authorization'] = `Bearer ${getToken()}`;
            const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers,
            });
            if (!retryResponse.ok) {
                throw new ApiError(retryResponse.status, await retryResponse.text());
            }
            return retryResponse.json();
        }
        // Refresh falhou — redirect para login
        clearTokens();
        window.location.href = '/login';
        throw new ApiError(401, 'Sessão expirada');
    }

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new ApiError(response.status, errorBody.message || 'Erro na requisição');
    }

    // Algumas respostas podem ser sem body (204)
    if (response.status === 204) return {} as T;

    return response.json();
}

/**
 * Tenta renovar o access token usando o refresh token.
 */
async function tryRefreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });

        if (response.ok) {
            const data = await response.json();
            setTokens(data.accessToken, data.refreshToken);
            return true;
        }
    } catch {
        // Silenciar erro
    }

    return false;
}

/**
 * Classe de erro customizada para erros da API.
 */
export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

// ── Métodos de conveniência ──────────────────────────────────

export const api = {
    get: <T>(url: string) => apiFetch<T>(url),
    post: <T>(url: string, body?: unknown) =>
        apiFetch<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
    put: <T>(url: string, body: unknown) =>
        apiFetch<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
    patch: <T>(url: string, body: unknown) =>
        apiFetch<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(url: string) => apiFetch<T>(url, { method: 'DELETE' }),
};

// ── AUTH ─────────────────────────────────────────────────────

export const authApi = {
    login: (email: string, password: string) =>
        api.post<{ user: any; accessToken: string; refreshToken: string }>('/auth/login', { email, password }),
    register: (data: { name: string; email: string; password: string }) =>
        api.post<{ user: any; accessToken: string; refreshToken: string }>('/auth/register', data),
    me: () => api.get<any>('/auth/me'),
};

// ── CONVERSATIONS ────────────────────────────────────────────

export const conversationsApi = {
    list: (filters?: Record<string, string>) => {
        const params = new URLSearchParams(filters).toString();
        return api.get<any[]>(`/conversations${params ? `?${params}` : ''}`);
    },
    getById: (id: string) => api.get<any>(`/conversations/${id}`),
    assign: (id: string, assigneeId: string) =>
        api.post(`/conversations/${id}/assign`, { assigneeId }),
    updateStatus: (id: string, status: string) =>
        api.patch(`/conversations/${id}/status`, { status }),
    markAsRead: (id: string) => api.post(`/conversations/${id}/read`),
};

// ── MESSAGES ─────────────────────────────────────────────────

export const messagesApi = {
    list: (conversationId: string, cursor?: string) =>
        api.get<any[]>(`/messages/${conversationId}${cursor ? `?cursor=${cursor}` : ''}`),
};

// ── WHATSAPP ─────────────────────────────────────────────────

export const whatsappApi = {
    listSessions: () => api.get<any[]>('/whatsapp/sessions'),
    createSession: (name: string) => api.post('/whatsapp/sessions', { name }),
    connectSession: (id: string) => api.post(`/whatsapp/sessions/${id}/connect`),
    disconnectSession: (id: string) => api.post(`/whatsapp/sessions/${id}/disconnect`),
    getSessionStatus: (id: string) => api.get<any>(`/whatsapp/sessions/${id}`),
    deleteSession: (id: string) => api.delete(`/whatsapp/sessions/${id}`),
    sendMessage: (sessionId: string, jid: string, content: { text?: string; caption?: string; mediaUrl?: string }) =>
        api.post(`/whatsapp/sessions/${sessionId}/send`, content),
    sendReadReceipt: (sessionId: string, conversationId: string) =>
        api.post(`/whatsapp/sessions/${sessionId}/read-receipt`, { conversationId }),
    syncContacts: (sessionId: string) => api.post(`/whatsapp/sessions/${sessionId}/sync-contacts`),
};

// ── MEDIA ────────────────────────────────────────────────────

export const mediaApi = {
    upload: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post<{ url: string; mimetype: string; filename: string; size: number }>('/media/upload', formData); // FormData é tratado automaticamente pelo browser, mas wrapper pode precisar de ajuste se usar Content-Type manual JSON. 
        // apiFetch usa Content-Type: application/json por padrão. Precisamos remover para FormData.
    },
};

// ── CONTACTS ─────────────────────────────────────────────────

export const contactsApi = {
    list: (search?: string) => api.get<any[]>(`/contacts${search ? `?search=${search}` : ''}`),
    getById: (id: string) => api.get<any>(`/contacts/${id}`),
    create: (data: any) => api.post('/contacts', data),
    update: (id: string, data: any) => api.put(`/contacts/${id}`, data),
    delete: (id: string) => api.delete(`/contacts/${id}`),
};

// ── TAGS ─────────────────────────────────────────────────────

export const tagsApi = {
    list: () => api.get<any[]>('/tags'),
    create: (data: { name: string; color?: string }) => api.post('/tags', data),
    delete: (id: string) => api.delete(`/tags/${id}`),
};

// ── DEPARTMENTS ──────────────────────────────────────────────

export const departmentsApi = {
    list: () => api.get<any[]>('/departments'),
    create: (data: { name: string; description?: string }) => api.post('/departments', data),
};

// ── TRANSFERS ────────────────────────────────────────────────

export const transfersApi = {
    create: (data: { conversationId: string; toUserId?: string; toDepartmentId?: string; reason?: string }) =>
        api.post('/transfers', data),
    pending: () => api.get<any[]>('/transfers/pending'),
    accept: (id: string) => api.post(`/transfers/${id}/accept`),
    reject: (id: string) => api.post(`/transfers/${id}/reject`),
};

// ── BOT ──────────────────────────────────────────────────────

export const botApi = {
    listFlows: () => api.get<any[]>('/bot/flows'),
    getFlow: (id: string) => api.get<any>(`/bot/flows/${id}`),
    createFlow: (data: { name: string; description?: string; trigger?: string }) => api.post('/bot/flows', data),
    updateFlow: (id: string, data: any) => api.put(`/bot/flows/${id}`, data),
    toggleFlow: (id: string) => api.patch(`/bot/flows/${id}/toggle`, {}),
    deleteFlow: (id: string) => api.delete(`/bot/flows/${id}`),
};

// ── USERS ────────────────────────────────────────────────────

export const usersApi = {
    list: () => api.get<any[]>('/users'),
    getById: (id: string) => api.get<any>(`/users/${id}`),
};
