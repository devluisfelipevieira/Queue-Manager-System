import React, { ReactNode } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export function Layout({ children, user }: { children: ReactNode, user?: { username: string, role: string } }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    localStorage.removeItem("guiche_token");
    // Clear ALL cached query data so LoginPage doesn't see stale authenticated user
    queryClient.clear();
    setLocation("/");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gray-50 text-gray-900 font-sans">
      <header className="bg-[#00315a] text-white py-4 px-6 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white/10 p-2.5 rounded-lg border border-white/5 shadow-inner hidden sm:block">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-100">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight leading-tight">Gerenciador de Guichê</h1>
            <p className="text-xs text-blue-200 uppercase tracking-widest font-bold">Prefeitura Municipal de Paraíba do Sul</p>
          </div>
        </div>
        
        {user && (
          <div className="flex items-center gap-5">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold tracking-wide">{user.username}</p>
              <p className="text-xs text-blue-200 uppercase tracking-wider font-semibold">
                {user.role === 'recepcao' ? 'Recepção' : 'Mesa'}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="text-sm bg-white/10 hover:bg-red-500/80 hover:text-white transition-all duration-200 px-4 py-2 rounded-md font-bold tracking-wide border border-white/10 shadow-sm"
            >
              SAIR
            </button>
          </div>
        )}
      </header>
      
      <main className="flex-1 p-6 sm:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
