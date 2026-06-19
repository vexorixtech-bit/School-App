import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Header({ onMenuClick }) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10 animate-fade-in-down">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
          <span className="text-gray-400">/</span>
          <span className="capitalize text-gray-900 font-medium">{user?.role?.replace('_', ' ') || 'Dashboard'}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-gray-800">{user?.full_name}</p>
          <p className="text-[11px] text-gray-500 capitalize font-medium tracking-wide">{user?.role?.replace('_', ' ')}</p>
        </div>
        <div className="relative group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-primary-500/20 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary-500/30 group-hover:scale-105">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
        </div>

      </div>
    </header>
  );
}
