import React, { createContext, useState, useEffect, useContext } from 'react';
import { authSupabaseService } from '../services/authSupabaseService';

// 1. Cria o Contexto
const AuthContext = createContext();

// 2. Cria o Provedor (um componente que vai envolver seu App)
export const AuthProvider = ({ children }) => {
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // 3. Verifica a sessão quando o App carrega
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Usa a função corrigida que verifica a sessão REAL no Supabase
        const currentSession = await authSupabaseService.verificarSessao();
        if (currentSession && currentSession.success) {
          setSessionInfo(currentSession);
        } else {
          setSessionInfo(null);
        }
      } catch (e) {
        console.error("Falha ao verificar sessão no AuthProvider:", e);
        setSessionInfo(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // 4. Funções que os componentes poderão chamar
  const login = (newSessionInfo) => {
    setSessionInfo(newSessionInfo);
  };

  const logout = async () => {
    await authSupabaseService.logout();
    setSessionInfo(null);
  };

  // 5. O valor que será compartilhado com todos os componentes filhos
  const value = {
    sessionInfo,
    isAuthenticated: !!sessionInfo,
    isAdmin: sessionInfo?.isAdmin || false,
    loading,
    login,
    logout,
  };

  // Renderiza os filhos apenas quando o carregamento inicial da sessão terminar
  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : <div>Carregando sessão...</div>}
    </AuthContext.Provider>
  );
};

// 6. Hook customizado para facilitar o uso do contexto nos componentes
export const useAuth = () => {
  return useContext(AuthContext);
};
