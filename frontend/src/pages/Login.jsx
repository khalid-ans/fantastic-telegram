import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Check, 2: Phone, 3: Code
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [phoneCodeHash, setPhoneCodeHash] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/auth/status');
            if (res.data.connected) {
                navigate('/');
            } else if (!res.data.configured) {
                navigate('/settings');
            } else {
                setStep(2); // Ready for phone login
            }
        } catch (err) {
            setError('System not ready. Is backend running?');
        }
    };

    const handleSendCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('http://localhost:5000/api/auth/send-code', { phoneNumber: phone });
            setPhoneCodeHash(res.data.phone_code_hash);
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to send code');
        } finally {
            setLoading(false);
        }
    };

    const handleSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await axios.post('http://localhost:5000/api/auth/sign-in', {
                phone,
                code,
                phone_code_hash: phoneCodeHash
            });
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-white">
            <div className="w-full max-w-md p-8 bg-gray-900/50 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/30 rounded-full blur-3xl"></div>

                <h2 className="text-3xl font-bold mb-2 text-center">Welcome Back</h2>
                <p className="text-gray-400 mb-8 text-center text-sm">
                    {step === 2 ? 'Sign in to access analytics' : 'Enter the code sent to your Telegram'}
                </p>

                {step === 1 && <div className="text-center animate-pulse">Checking system status...</div>}

                {step === 2 && (
                    <form onSubmit={handleSendCode} className="space-y-6 relative z-10">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-500"
                                placeholder="+1234567890"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-2">Include country code (e.g. +91...)</p>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold shadow-lg transition-all"
                        >
                            {loading ? 'Sending Code...' : 'Continue'}
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleSignIn} className="space-y-6 relative z-10">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Verification Code</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all text-center tracking-widest text-xl"
                                placeholder="1 2 3 4 5"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold shadow-lg transition-all"
                        >
                            {loading ? 'Verifying...' : 'Sign In'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="w-full text-sm text-gray-400 hover:text-white mt-4"
                        >
                            Wrong number?
                        </button>
                    </form>
                )}

                {error && (
                    <div className="mt-6 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-center text-sm">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
