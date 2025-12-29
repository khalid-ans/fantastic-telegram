import React from 'react';
import { motion } from 'framer-motion';
import { Clock, ShieldCheck, Mail, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PendingApproval = () => {
    const { logout, user } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-white rounded-[32px] p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100 text-center"
            >
                <div className="flex justify-center mb-8">
                    <div className="w-20 h-20 rounded-3xl bg-amber-50 flex items-center justify-center relative">
                        <Clock className="w-10 h-10 text-amber-500" />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white border-4 border-amber-50 flex items-center justify-center">
                            <ShieldCheck className="w-4 h-4 text-amber-500" />
                        </div>
                    </div>
                </div>

                <h1 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">
                    Approval Pending
                </h1>

                <p className="text-slate-500 mb-8 leading-relaxed">
                    Hello <span className="font-bold text-slate-700">{user?.username}</span>! Your moderator account has been created successfully. Our administrators are currently reviewing your request.
                </p>

                <div className="space-y-4 mb-10">
                    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl text-left">
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Mail className="w-4 h-4 text-primary-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">Check your email</p>
                            <p className="text-xs text-slate-500">We'll notify you once your account is active.</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-primary-500/20 active:scale-[0.98]"
                    >
                        Check Status
                    </button>
                    <button
                        onClick={logout}
                        className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default PendingApproval;
