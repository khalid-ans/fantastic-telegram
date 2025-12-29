import React, { useState, useEffect } from 'react';
import * as api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, UserCheck, UserX, Trash2, Mail, Calendar, Search, Filter } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch (err) {
            console.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleApproval = async (userId, currentStatus) => {
        const isCurrentlyApproved = currentStatus === 'approved';
        const newApprovedState = !isCurrentlyApproved;

        try {
            await api.updateApproval(userId, newApprovedState);
            setUsers(users.map(u => u._id === userId ? { ...u, status: newApprovedState ? 'approved' : 'rejected' } : u));
            setMessage({ type: 'success', text: `User ${newApprovedState ? 'approved' : 'restricted'} successfully` });
        } catch (err) {
            console.error('Update status failed:', err);
            setMessage({ type: 'error', text: 'Failed to update user status' });
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            await api.deleteUser(userId);
            setUsers(users.filter(u => u._id !== userId));
            setMessage({ type: 'success', text: 'User deleted' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete user' });
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(filter.toLowerCase()) ||
        u.email.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
                    <p className="text-slate-500">Manage platform access, roles, and approvals</p>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 w-full md:w-64 transition-all"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </header>

            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border flex items-center justify-between ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                        }`}
                >
                    <span className="font-bold text-sm">{message.text}</span>
                    <button onClick={() => setMessage(null)} className="text-current opacity-50 hover:opacity-100">&times;</button>
                </motion.div>
            )}

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-6 py-6 h-16 bg-slate-50/20" />
                                    </tr>
                                ))
                            ) : filteredUsers.map((user) => (
                                <tr key={user._id} className="hover:bg-slate-50/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                                                {user.username[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{user.username}</div>
                                                <div className="text-xs text-slate-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {user.role === 'admin' ? (
                                                <Shield className="w-4 h-4 text-purple-500" />
                                            ) : (
                                                <Users className="w-4 h-4 text-slate-400" />
                                            )}
                                            <span className={`text-sm font-medium capitalize ${user.role === 'admin' ? 'text-purple-600' : 'text-slate-600'}`}>
                                                {user.role}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.status === 'approved' ? (
                                            <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-extrabold rounded-full uppercase tracking-wider">Active</span>
                                        ) : user.status === 'pending' ? (
                                            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-extrabold rounded-full uppercase tracking-wider">Pending Approval</span>
                                        ) : (
                                            <span className="px-3 py-1 bg-red-100 text-red-700 text-[10px] font-extrabold rounded-full uppercase tracking-wider">Restricted</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleToggleApproval(user._id, user.status)}
                                                className={`p-2 rounded-lg transition-all ${user.status === 'approved' ? 'text-amber-500 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'}`}
                                                title={user.status === 'approved' ? 'Deactivate' : 'Approve'}
                                            >
                                                {user.status === 'approved' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                            </button>
                                            {user.role !== 'admin' && (
                                                <button
                                                    onClick={() => handleDelete(user._id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {!loading && filteredUsers.length === 0 && (
                    <div className="py-20 text-center">
                        <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-500">No users found matching your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagement;
