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
      <header className="bg-[#012c61] text-white py-3 px-6 shadow-md flex items-center justify-between border-b-4 border-[#b2d233]">
        <div className="flex items-center gap-4">
          <div className="bg-white p-1 rounded-lg shadow-sm hidden sm:block">
            <img src="/brand/prefeitura-logo.png" alt="Prefeitura de Paraíba do Sul" className="h-12 w-12 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight leading-tight">Gerenciador de Guichê</h1>
            <p className="text-xs text-[#b2d233] uppercase tracking-widest font-bold">Prefeitura Municipal de Paraíba do Sul</p>
          </div>
        </div>
        
        {user && (
          <div className="flex items-center gap-5">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold tracking-wide">{user.username}</p>
              <p className="text-xs text-[#b2d233] uppercase tracking-wider font-semibold">
                {user.role === 'admin' ? 'Administrador' : user.role === 'recepcao' ? 'Recepção' : 'Mesa'}
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
