import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
    saveTelegramConfig,
    sendAuthCode,
    signInTelegram,
    getAuthStatus,
    logoutTelegram
} from '../services/api';
import { motion } from 'framer-motion';
import { Shield, Key, Bot, Save, CheckCircle, ExternalLink, RefreshCw, Send, Lock } from 'lucide-react';

const Settings = () => {
    const { user, refreshUser } = useAuth();
    const [formData, setFormData] = useState({
        apiId: '',
        apiHash: '',
        botToken: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    // Telegram Auth State
    const [authStep, setAuthStep] = useState(0); // 0: Idle, 1: Phone, 2: OTP
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [hash, setHash] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [telegramStatus, setTelegramStatus] = useState(null);

    useEffect(() => {
        if (user) {
            // Check both nested and root for compatibility
            const config = user.telegramConfig || {};
            setFormData({
                apiId: config.apiId || user.telegramApiId || '',
                apiHash: config.apiHash || user.telegramApiHash || '',
                botToken: config.botToken || user.telegramBotToken || ''
            });
        }
        checkTelegramStatus();
    }, [user]);

    const checkTelegramStatus = async () => {
        try {
            const data = await getAuthStatus();
            setTelegramStatus(data);
        } catch (e) {
            console.error("Failed to check bridge status:", e);
        }
    };

    const saveMutation = useMutation({
        mutationFn: (data) => saveTelegramConfig(data),
        onSuccess: async () => {
            setMessage({ type: 'success', text: 'Telegram keys saved successfully!' });
            // FORCE a refresh of user data and bridge status
            await refreshUser();
            await checkTelegramStatus();
            // Automatically move to phone input step
            setAuthStep(1);
        },
        onError: (error) => {
            setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save keys' });
        }
    });

    const handleSaveKeys = async (e) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    const startAuth = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        try {
            const res = await sendAuthCode(phone);
            // The backend returns the full response data
            setHash(res.phone_code_hash);
            setAuthStep(2);
        } catch (e) {
            setMessage({ type: 'error', text: e.response?.data?.error || 'Failed to send code' });
        } finally {
            setAuthLoading(false);
        }
    };

    const verifyAuth = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        try {
            await signInTelegram(phone, code, hash);
            setMessage({ type: 'success', text: 'Telegram connected successfully!' });
            setAuthStep(0);
            checkTelegramStatus();
        } catch (e) {
            setMessage({ type: 'error', text: e.response?.data?.error || 'Invalid code' });
        } finally {
            setAuthLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <header>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Account Settings</h1>
                <p className="text-slate-500">Configure your platform experience and Telegram bridge</p>
                <div className="mt-4 p-4 bg-primary-50 rounded-2xl border border-primary-100 flex items-center gap-3">
                    <div className="px-3 py-1 bg-primary-500 text-white text-[10px] font-bold rounded-full uppercase">Step-by-Step</div>
                    <p className="text-sm text-primary-700">First save your **API Credentials**, then use the **Bridge Status** card to link your phone via OTP.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Credentials Card */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                            <Key className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Telegram API Keys</h2>
                    </div>

                    <form onSubmit={handleSaveKeys} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">App API ID</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                value={formData.apiId}
                                onChange={(e) => setFormData({ ...formData, apiId: e.target.value })}
                                placeholder="123456"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">App API Hash</label>
                            <input
                                type="password"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                value={formData.apiHash}
                                onChange={(e) => setFormData({ ...formData, apiHash: e.target.value })}
                                placeholder="a1b2c3d4..."
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Bot Token</label>
                            <input
                                type="password"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                value={formData.botToken}
                                onChange={(e) => setFormData({ ...formData, botToken: e.target.value })}
                                placeholder="12345:ABC..."
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saveMutation.isPending}
                            className="w-full mt-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                            {saveMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Credentials
                        </button>
                    </form>
                </motion.div>

                {/* Connection Status Card */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-8"
                >
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-primary-600" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800">Bridge Status</h2>
                            </div>
                            {telegramStatus === null ? (
                                <span className="px-3 py-1 bg-slate-100 text-slate-400 text-xs font-bold rounded-full animate-pulse">Checking...</span>
                            ) : telegramStatus?.connected ? (
                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Connected</span>
                            ) : (
                                <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">Offline</span>
                            )}
                        </div>

                        {!telegramStatus?.configured ? (
                            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 mb-6">
                                <p className="text-amber-800 text-sm font-medium">Please save your API keys first to enable the bridge.</p>
                            </div>
                        ) : !telegramStatus?.connected ? (
                            <div className="space-y-6">
                                <div className="p-4 bg-primary-50 rounded-xl border border-primary-100 mb-2">
                                    <p className="text-xs text-primary-700 font-medium">Tip: Use international format starting with **+** (e.g. +91...)</p>
                                </div>
                                {authStep === 0 && (
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => setAuthStep(1)}
                                            className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-bold shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Bot className="w-5 h-5" />
                                            Connect Telegram Account
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setAuthLoading(true);
                                                try {
                                                    await saveTelegramConfig(formData);
                                                    setMessage({ type: 'success', text: 'Bridge session restarted' });
                                                    checkTelegramStatus();
                                                } catch (e) {
                                                    setMessage({ type: 'error', text: 'Failed to restart bridge' });
                                                }
                                                setAuthLoading(false);
                                            }}
                                            className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-bold transition-all"
                                        >
                                            Restart Bridge Session
                                        </button>
                                    </div>
                                )}

                                {authStep === 1 && (
                                    <form onSubmit={startAuth} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Phone Number</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                                placeholder="+1234567..."
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold" disabled={authLoading}>
                                            {authLoading ? 'Sending...' : 'Send OTP'}
                                        </button>
                                    </form>
                                )}

                                {authStep === 2 && (
                                    <form onSubmit={verifyAuth} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Verification Code</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-center tracking-[0.5em] font-bold"
                                                placeholder="00000"
                                                value={code}
                                                onChange={(e) => setCode(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <button className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold" disabled={authLoading}>
                                            {authLoading ? 'Connecting...' : 'Verify & Connect'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        ) : (
                            <div className="p-8 bg-green-50 rounded-2xl border border-green-100 flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-500" />
                                </div>
                                <h3 className="text-lg font-bold text-green-900 mb-1">Bridge Active</h3>
                                <p className="text-green-700 text-sm mb-6 pb-6 border-b border-green-100 w-full">Your account is successfully linked to the analytics microservice.</p>
                                <button
                                    onClick={async () => {
                                        await logoutTelegram();
                                        checkTelegramStatus();
                                    }}
                                    className="text-sm font-bold text-green-700 hover:text-green-800"
                                >
                                    Disconnect Session
                                </button>
                            </div>
                        )}
                    </div>

                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-4 rounded-2xl border font-bold text-sm text-center ${message.type === 'success'
                                ? 'bg-green-50 text-green-600 border-green-100'
                                : 'bg-red-50 text-red-600 border-red-100'
                                }`}
                        >
                            {message.text}
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default Settings;
