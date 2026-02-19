'use client';

// ============================================================
// AuthContext — Contexto global de autenticação
// Gerencia: login, logout, registro, estado do user
// ============================================================

import { authApi, clearTokens, setTokens } from '@/lib/api';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'USER' | 'MANAGER' | 'ADMIN';
    avatar?: string;
    isActive: boolean;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Verificar autenticação ao carregar a página
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    setIsLoading(false);
                    return;
                }
                const data = await authApi.me();
                setUser(data);
            } catch {
                clearTokens();
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        setError(null);
        try {
            const data = await authApi.login(email, password);
            setTokens(data.accessToken, data.refreshToken);
            setUser(data.user);
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer login');
            throw err;
        }
    }, []);

    const register = useCallback(async (name: string, email: string, password: string) => {
        setError(null);
        try {
            const data = await authApi.register({ name, email, password });
            setTokens(data.accessToken, data.refreshToken);
            setUser(data.user);
        } catch (err: any) {
            setError(err.message || 'Erro ao registrar');
            throw err;
        }
    }, []);

    const logout = useCallback(() => {
        clearTokens();
        setUser(null);
        window.location.href = '/login';
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
                error,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
