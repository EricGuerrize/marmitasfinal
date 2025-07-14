// src/components/ForgotPasswordPage.jsx
import React, { useState, useEffect } from 'react';
import { authSupabaseService } from '../services/authSupabaseService';

const ForgotPasswordPage = ({ onNavigate }) => {
  const [etapa, setEtapa] = useState('email'); // email, sucesso
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [codigoExibido, setCodigoExibido] = useState(''); // Para mostrar o código em desenvolvimento

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const iniciarResetEmail = async () => {
    if (!email.trim()) { setError('Por favor, informe o email'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email inválido'); return; }
    
    setLoading(true); setError('');
    try {
      const res = await authSupabaseService.enviarCodigoRecuperacao(email);
      if (res.success) {
        setEtapa('codigo');
        if (res.codigo) {
          setCodigoExibido(res.codigo);
        }
      } else {
        setError(res.error);
      }
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const confirmarCodigoEmail = async () => {
    if (!codigo.trim()) { setError('Por favor, informe o código recebido'); return; }
    if (!novaSenha || novaSenha.length < 6) { setError('Nova senha deve ter pelo menos 6 caracteres'); return; }
    if (novaSenha !== confirmarSenha) { setError('Senhas não conferem'); return; }
    
    setLoading(true); setError('');
    try {
      const res = await authSupabaseService.confirmarCodigoEAlterarSenha(email, codigo, novaSenha);
      if (res.success) {
        setEtapa('sucesso');
      } else {
        setError(res.error);
      }
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const voltarEtapa = () => {
    setError('');
    setCodigoExibido('');
    if (etapa === 'codigo') {
      setEtapa('email');
    } else {
      onNavigate('home');
    }
  };

  const irParaLogin = () => onNavigate('home');

  return (
    <div style={{
      margin: 0, fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5', minHeight: '100vh'
    }}>
      <div style={{
        background: 'white', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        padding: isMobile ? '15px' : '15px 40px',
        borderBottom: '1px solid #ccc'
      }}>
        <div style={{
          fontSize: isMobile ? '24px' : '32px',
          fontWeight: 'bold', color: '#009245'
        }}>🍽️ Fit In Box</div>
        <button
          onClick={() => onNavigate('home')}
          style={{
            backgroundColor: '#009245', color: 'white',
            border: 'none',
            padding: isMobile ? '8px 15px' : '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: isMobile ? '14px' : '16px'
          }}
        >Voltar ao Login</button>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: 'calc(100vh - 80px)',
        padding: isMobile ? '15px' : '20px'
      }}>
        <div style={{
          backgroundColor: 'white', padding: isMobile ? '30px 20px' : '40px',
          borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          width: '100%', maxWidth: '500px'
        }}>
          {etapa === 'email' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔐</div>
                <h2 style={{ color: '#009245', marginBottom: '10px' }}>
                  Esqueceu sua senha?
                </h2>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Digite seu email para receber um código de recuperação
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block', marginBottom: '8px',
                  fontWeight: 'bold', fontSize: '14px'
                }}>Email da Empresa</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="empresa@exemplo.com"
                  style={{
                    width: '100%', padding: '12px',
                    border: '1px solid #ddd', borderRadius: '5px',
                    fontSize: '16px', boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                onClick={iniciarResetEmail}
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#ccc' : '#007bff',
                  color: 'white', border: 'none',
                  padding: '15px', borderRadius: '5px',
                  fontWeight: 'bold',
                  cursor: loading ? 'wait' : 'pointer',
                  width: '100%', fontSize: '16px',
                  marginBottom: '15px'
                }}
              >
                {loading ? 'Enviando...' : 'Enviar Código de Recuperação'}
              </button>

              <button
                onClick={() => onNavigate('home')}
                style={{
                  backgroundColor: 'transparent',
                  color: '#6c757d',
                  border: '1px solid #6c757d',
                  padding: '12px',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '14px'
                }}
              >
                Voltar ao Login
              </button>

              {error && (
                <div style={{
                  backgroundColor: '#f8d7da', color: '#721c24',
                  padding: '12px', borderRadius: '5px',
                  fontSize: '14px', marginTop: '15px',
                  border: '1px solid #f5c6cb'
                }}>
                  {error}
                </div>
              )}
            </>
          )}

          {etapa === 'codigo' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>📧</div>
                <h2 style={{ color: '#009245', marginBottom: '10px' }}>
                  Código Enviado!
                </h2>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Um código de verificação foi enviado para<br />
                  <strong>{authSupabaseService.mascarEmail ? authSupabaseService.mascarEmail(email) : email}</strong>
                </p>
              </div>

              {codigoExibido && (
                <div style={{
                  backgroundColor: '#fff3cd', color: '#856404',
                  padding: '12px', borderRadius: '5px',
                  fontSize: '14px', marginBottom: '20px',
                  border: '1px solid #ffeaa7',
                  textAlign: 'center'
                }}>
                  <strong>🔧 MODO DESENVOLVIMENTO</strong><br />
                  Código para teste: <strong>{codigoExibido}</strong>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block', marginBottom: '8px',
                  fontWeight: 'bold'
                }}>
                  Código de Verificação
                </label>
                <input
                  type="text"
                  value={codigo}
                  onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength="6"
                  style={{
                    width: '100%', padding: '12px',
                    border: '1px solid #ddd', borderRadius: '5px',
                    fontSize: '18px', textAlign: 'center',
                    letterSpacing: '3px', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block', marginBottom: '8px',
                  fontWeight: 'bold'
                }}>
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Digite sua nova senha (mín. 6 caracteres)"
                  autoComplete="new-password"
                  style={{
                    width: '100%', padding: '12px',
                    border: '1px solid #ddd', borderRadius: '5px',
                    fontSize: '16px', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block', marginBottom: '8px',
                  fontWeight: 'bold'
                }}>
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={e => setConfirmarSenha(e.target.value)}
                  placeholder="Digite novamente sua nova senha"
                  autoComplete="new-password"
                  style={{
                    width: '100%', padding: '12px',
                    border: '1px solid #ddd', borderRadius: '5px',
                    fontSize: '16px', boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                onClick={confirmarCodigoEmail}
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#ccc' : '#28a745',
                  color: 'white', border: 'none',
                  padding: '15px', borderRadius: '5px',
                  fontWeight: 'bold',
                  cursor: loading ? 'wait' : 'pointer',
                  width: '100%', fontSize: '16px', marginBottom: '10px'
                }}
              >
                {loading ? 'Alterando senha...' : 'Alterar Senha'}
              </button>

              <button
                onClick={voltarEtapa}
                style={{
                  backgroundColor: 'transparent',
                  color: '#6c757d',
                  border: '1px solid #6c757d',
                  padding: '12px',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '14px'
                }}
              >
                Voltar
              </button>

              {error && (
                <div style={{
                  backgroundColor: '#f8d7da', color: '#721c24',
                  padding: '12px', borderRadius: '5px',
                  fontSize: '14px', marginTop: '15px',
                  border: '1px solid #f5c6cb'
                }}>
                  {error}
                </div>
              )}
            </>
          )}

          {etapa === 'sucesso' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
              <h2 style={{ color: '#28a745', marginBottom: '15px' }}>
                Senha Alterada com Sucesso!
              </h2>
              <p style={{ color: '#666', fontSize: '16px', marginBottom: '30px' }}>
                Sua senha foi redefinida com segurança.<br />
                Agora você pode fazer login com a nova senha.
              </p>
              <button
                onClick={irParaLogin}
                style={{
                  backgroundColor: '#009245', color: 'white',
                  border: 'none', padding: '15px 30px',
                  borderRadius: '5px', fontWeight: 'bold',
                  cursor: 'pointer', fontSize: '16px',
                  width: '100%'
                }}
              >
                Ir para Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;