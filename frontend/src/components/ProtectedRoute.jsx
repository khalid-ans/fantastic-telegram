import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ requiredRole }) => {
    const { user, loading, isAdmin, isModerator, isApproved } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!isApproved && user.role === 'moderator' && window.location.pathname !== '/pending-approval') {
        return <Navigate to="/pending-approval" replace />;
    }

    if (isApproved && window.location.pathname === '/pending-approval') {
        return <Navigate to="/" replace />;
    }

    if (requiredRole === 'admin' && !isAdmin) {
        return <Navigate to="/" replace />;
    }

    if (requiredRole === 'moderator' && !isModerator) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
