// src/components/ForgotPasswordPage.jsx
import React, { useState, useEffect } from 'react';
import { authSupabaseService } from '../services/authSupabaseService';
import { cnpjService } from '../services/cnpjService';

const ForgotPasswordPage = ({ onNavigate }) => {
  const [etapa, setEtapa] = useState('metodo'); // metodo, email, perguntas, sucesso
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [perguntas, setPerguntas] = useState([]);
  const [respostas, setRespostas] = useState({});
  const [empresaId, setEmpresaId] = useState(null);
  const [metodoEscolhido, setMetodoEscolhido] = useState('');
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

  const handleCnpjChange = (e) => {
    setCnpj(cnpjService.aplicarMascaraCnpj(e.target.value));
    setError('');
  };

  const iniciarResetEmail = async () => {
    if (!email.trim()) { setError('Por favor, informe o email'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email inválido'); return; }
    
    setLoading(true); setError('');
    try {
      const res = await authSupabaseService.enviarCodigoRecuperacao(email);
      if (res.success) {
        setMetodoEscolhido('email');
        setEtapa('email');
        // EM DESENVOLVIMENTO - mostra o código
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

  const iniciarResetPerguntas = async () => {
    if (!cnpj.trim()) { setError('Por favor, informe o CNPJ'); return; }
    setLoading(true); setError('');
    try {
      // Simulação de perguntas baseadas no CNPJ
      const cnpjLimpo = cnpj.replace(/\D/g, '');
      if (!authSupabaseService.validarCnpj(cnpjLimpo)) {
        throw new Error('CNPJ inválido');
      }

      // Perguntas genéricas baseadas no CNPJ
      const perguntasGenericas = [
        {
          id: 1,
          pergunta: 'Quais são os primeiros 2 dígitos do seu CNPJ?',
          resposta_correta: cnpjLimpo.substring(0, 2),
          dica: 'Ex: se CNPJ é 12.345.678/0001-90, resposta é 12'
        },
        {
          id: 2,
          pergunta: 'Qual o dígito verificador final do seu CNPJ?',
          resposta_correta: cnpjLimpo.substring(13, 14),
          dica: 'Ex: se CNPJ é 12.345.678/0001-90, resposta é 0'
        },
        {
          id: 3,
          pergunta: 'Quantos dígitos tem um CNPJ completo (apenas números)?',
          resposta_correta: '14',
          dica: 'Conte apenas os números, sem pontos, barras ou traços'
        }
      ];

      setPerguntas(perguntasGenericas);
      setMetodoEscolhido('perguntas');
      setEtapa('perguntas');
      
      // Prepara respostas vazias
      const iniciais = {};
      perguntasGenericas.forEach(p => { iniciais[p.id] = ''; });
      setRespostas(iniciais);

    } catch (error) {
      setError(error.message);
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

  const confirmarPerguntas = async () => {
    // Verifica respostas
    let acertos = 0;
    for (const pergunta of perguntas) {
      const resposta = respostas[pergunta.id]?.trim().toLowerCase();
      const correta = pergunta.resposta_correta?.toLowerCase();
      if (resposta === correta) {
        acertos++;
      }
    }

    if (acertos < 2) { 
      setError('Pelo menos 2 respostas devem estar corretas. Tente novamente.'); 
      return; 
    }

    if (!novaSenha || novaSenha.length < 6) { setError('Nova senha deve ter pelo menos 6 caracteres'); return; }
    if (novaSenha !== confirmarSenha) { setError('Senhas não conferem'); return; }
    
    setLoading(true); setError('');
    try {
      // Simula alteração de senha - em produção, validaria no backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      setEtapa('sucesso');
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const voltarEtapa = () => {
    setError('');
    setCodigoExibido('');
    if (etapa === 'email' || etapa === 'perguntas') {
      setEtapa('metodo');
      setMetodoEscolhido('');
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
      {/* Header */}
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

      {/* Main */}
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

          {/* Escolha do método */}
          {etapa === 'metodo' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔐</div>
                <h2 style={{ color: '#009245', marginBottom: '10px' }}>
                  Esqueceu sua senha?
                </h2>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Escolha como você gostaria de redefinir sua senha
                </p>
              </div>

              <div style={{
                border: '2px solid #e9ecef', borderRadius: '8px',
                padding: '20px', marginBottom: '20px',
                backgroundColor: '#f8f9fa'
              }}>
                <h3 style={{ color: '#009245', margin: '0 0 15px 0' }}>
                  📧 Recuperação por Email
                </h3>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                  Receba um código no email cadastrado da empresa
                </p>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    display: 'block', marginBottom: '5px',
                    fontWeight: 'bold', fontSize: '14px'
                  }}>Email da Empresa</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="empresa@exemplo.com"
                    style={{
                      width: '100%', padding: '10px',
                      border: '1px solid #ddd', borderRadius: '5px',
                      fontSize: '14px', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <button
                  onClick={iniciarResetEmail}
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#ccc' : '#007bff',
                    color: 'white', border: 'none',
                    padding: '12px 20px', borderRadius: '5px',
                    fontWeight: 'bold',
                    cursor: loading ? 'wait' : 'pointer',
                    width: '100%', fontSize: '14px'
                  }}
                >
                  {loading ? 'Enviando...' : 'Enviar Código por Email'}
                </button>
              </div>

              <div style={{
                border: '2px solid #e9ecef', borderRadius: '8px',
                padding: '20px', marginBottom: '20px',
                backgroundColor: '#f8f9fa'
              }}>
                <h3 style={{ color: '#009245', margin: '0 0 15px 0' }}>
                  ❓ Perguntas de Segurança
                </h3>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                  Responda perguntas baseadas no seu CNPJ
                </p>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    display: 'block', marginBottom: '5px',
                    fontWeight: 'bold', fontSize: '14px'
                  }}>CNPJ da Empresa</label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={handleCnpjChange}
                    placeholder="00.000.000/0000-00"
                    maxLength="18"
                    style={{
                      width: '100%', padding: '10px',
                      border: '1px solid #ddd', borderRadius: '5px',
                      fontSize: '14px', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <button
                  onClick={iniciarResetPerguntas}
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#ccc' : '#28a745',
                    color: 'white', border: 'none',
                    padding: '12px 20px', borderRadius: '5px',
                    fontWeight: 'bold',
                    cursor: loading ? 'wait' : 'pointer',
                    width: '100%', fontSize: '14px'
                  }}
                >
                  {loading ? 'Carregando...' : 'Usar Perguntas de Segurança'}
                </button>
              </div>

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

          {/* Verificação por Email */}
          {etapa === 'email' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>📧</div>
                <h2 style={{ color: '#009245', marginBottom: '10px' }}>
                  Código Enviado!
                </h2>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Um código de verificação foi enviado para<br />
                  <strong>{authSupabaseService.mascarEmail(email)}</strong>
                </p>
              </div>

              {/* DESENVOLVIMENTO - Mostra código */}
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
                  placeholder="Digite sua nova senha"
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

          {/* Perguntas de Segurança */}
          {etapa === 'perguntas' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>❓</div>
                <h2 style={{ color: '#009245', marginBottom: '10px' }}>
                  Perguntas de Segurança
                </h2>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Responda as perguntas baseadas no seu CNPJ<br />
                  <strong>Necessário acertar pelo menos 2 para continuar</strong>
                </p>
              </div>

              {perguntas.map((p, idx) => (
                <div key={p.id} style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block', marginBottom: '8px',
                    fontWeight: 'bold', color: '#009245'
                  }}>
                    {idx + 1}. {p.pergunta}
                  </label>
                  <input
                    type="text"
                    value={respostas[p.id] || ''}
                    onChange={e => setRespostas({
                      ...respostas,
                      [p.id]: e.target.value
                    })}
                    placeholder="Digite sua resposta"
                    style={{
                      width: '100%', padding: '12px',
                      border: '1px solid #ddd', borderRadius: '5px',
                      fontSize: '16px', boxSizing: 'border-box'
                    }}
                  />
                  {p.dica && (
                    <small style={{ color: '#666', fontSize: '12px' }}>
                      💡 {p.dica}
                    </small>
                  )}
                </div>
              ))}

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block', marginBottom: '8px',
                  fontWeight: 'bold'
                }}>Nova Senha</label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Digite sua nova senha"
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
                }}>Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={e => setConfirmarSenha(e.target.value)}
                  placeholder="Digite novamente sua nova senha"
                  style={{
                    width: '100%', padding: '12px',
                    border: '1px solid #ddd', borderRadius: '5px',
                    fontSize: '16px', boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                onClick={confirmarPerguntas}
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
                {loading ? 'Verificando...' : 'Alterar Senha'}
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

          {/* Sucesso */}
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