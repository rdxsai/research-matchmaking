import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-rose-200 to-pink-300 flex flex-col items-center justify-center p-5">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-10 shadow-lg max-w-md w-full border border-white/30">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">m</span>
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Loading...</h2>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
