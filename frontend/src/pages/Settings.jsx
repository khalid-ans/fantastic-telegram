import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        apiId: '',
        apiHash: '',
        botToken: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/settings');
            setFormData(res.data);
        } catch (error) {
            console.error('Failed to fetch settings');
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            await axios.post('http://localhost:5000/api/settings', formData);
            setMessage('✅ Settings saved! Redirecting to Login...');
            setTimeout(() => navigate('/login'), 1500);
        } catch (error) {
            setMessage('❌ Failed to save settings: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <div className="w-full max-w-md p-8 bg-white border border-gray-200 rounded-2xl card-shadow">
                <h2 className="text-3xl font-extrabold mb-6 text-center text-gray-900">
                    System Setup
                </h2>
                <p className="text-gray-500 mb-6 text-center text-sm">
                    Enter your Telegram API credentials to configure the system.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">API ID</label>
                        <input
                            type="text"
                            name="apiId"
                            value={formData.apiId}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all placeholder:text-gray-400"
                            placeholder="e.g. 123456"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">API Hash</label>
                        <input
                            type="text"
                            name="apiHash"
                            value={formData.apiHash}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all placeholder:text-gray-400"
                            placeholder="e.g. a1b2c3d4..."
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Bot Token</label>
                        <input
                            type="text"
                            name="botToken"
                            value={formData.botToken}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-100 focus:border-primary-500 outline-none transition-all placeholder:text-gray-400"
                            placeholder="e.g. 12345:ABC-..."
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 rounded-lg font-bold text-white shadow-lg shadow-primary-500/20 transform transition-all active:scale-95 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Saving...' : 'Save Configuration'}
                    </button>

                    {message && (
                        <div className={`mt-4 p-3 rounded-lg text-center text-sm font-bold ${message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {message}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default Settings;
