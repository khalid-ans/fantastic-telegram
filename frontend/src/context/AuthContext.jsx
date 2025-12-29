import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            verifyToken();
        } else {
            setLoading(false);
        }
    }, [token]);

    const verifyToken = async () => {
        try {
            const data = await api.getMe();
            setUser(data.user);
        } catch (err) {
            console.error('Token verification failed', err);
            handleLogout();
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (username, password) => {
        try {
            const data = await api.login(username, password);
            const { token, user } = data;
            localStorage.setItem('token', token);
            setToken(token);
            setUser(user);
            return { success: true };
        } catch (err) {
            return {
                success: false,
                error: err.response?.data?.error || 'Login failed.'
            };
        }
    };

    const handleRegister = async (userData) => {
        try {
            const data = await api.register(userData);
            if (data.token) {
                localStorage.setItem('token', data.token);
                setToken(data.token);
                setUser(data.user);
            }
            return { success: true, message: data.message };
        } catch (err) {
            return {
                success: false,
                error: err.response?.data?.error || 'Registration failed.'
            };
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const data = await api.getMe();
            setUser(data.user);
            return data.user;
        } catch (err) {
            console.error('Failed to refresh user:', err);
        }
    };

    const isAdmin = user?.role === 'admin';
    const isModerator = user?.role === 'moderator' || user?.role === 'admin';
    const isApproved = user?.status === 'approved' || user?.role === 'admin';

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            login: handleLogin,
            register: handleRegister,
            logout: handleLogout,
            refreshUser,
            isAdmin,
            isModerator,
            isApproved
        }}>
            {children}
        </AuthContext.Provider>
    );
};
