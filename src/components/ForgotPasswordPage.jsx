// src/components/ForgotPasswordPage.jsx
import React, { useState, useEffect } from 'react';
import { passwordResetService } from '../services/passwordResetService';
import { cnpjService } from '../services/cnpjService';

const ForgotPasswordPage = ({ onNavigate }) => {
  const [etapa, setEtapa] = useState('metodo'); // metodo, sms, perguntas, sucesso
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [telefoneMascarado, setTelefoneMascarado] = useState('');
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

  const handleTelefoneChange = (e) => {
    const onlyNums = e.target.value.replace(/\D/g, '');
    const formatted = onlyNums
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
    setTelefone(formatted);
  };

  const iniciarResetSMS = async () => {
    if (!cnpj.trim()) { setError('Por favor, informe o CNPJ'); return; }
    if (!telefone.trim()) { setError('Por favor, informe o telefone'); return; }
    setLoading(true); setError('');
    try {
      const res = await passwordResetService.iniciarResetPorSMS(cnpj, telefone);
      if (res.success) {
        setTelefoneMascarado(res.maskedPhone);
        setMetodoEscolhido('sms');
        setEtapa('sms');
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
      const res = await passwordResetService.iniciarResetPorPerguntas(cnpj);
      if (res.success) {
        setPerguntas(res.perguntas);
        setEmpresaId(res.empresaId);
        setMetodoEscolhido('perguntas');
        setEtapa('perguntas');
        // prepara respostas vazias
        const iniciais = {};
        res.perguntas.forEach(p => { iniciais[p.id] = ''; });
        setRespostas(iniciais);
      } else {
        setError(res.error);
      }
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const confirmarCodigoSMS = async () => {
    if (!codigo.trim()) { setError('Por favor, informe o código recebido'); return; }
    if (!novaSenha || novaSenha.length < 6) { setError('Nova senha deve ter pelo menos 6 caracteres'); return; }
    if (novaSenha !== confirmarSenha) { setError('Senhas não conferem'); return; }
    setLoading(true); setError('');
    try {
      const res = await passwordResetService.confirmarResetPorSMS(cnpj, codigo, novaSenha);
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
    const arr = perguntas.map(p => ({ id: p.id, resposta: respostas[p.id]?.trim() }));
    if (arr.some(r => !r.resposta)) { setError('Por favor, responda todas as perguntas'); return; }
    if (!novaSenha || novaSenha.length < 6) { setError('Nova senha deve ter pelo menos 6 caracteres'); return; }
    if (novaSenha !== confirmarSenha) { setError('Senhas não conferem'); return; }
    setLoading(true); setError('');
    try {
      const res = await passwordResetService.confirmarResetPorPerguntas(empresaId, arr, novaSenha);
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
    if (etapa === 'sms' || etapa === 'perguntas') {
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

          {/* método */}
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

              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block', marginBottom: '8px', fontWeight: 'bold'
                }}>CNPJ da Empresa</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  placeholder="00.000.000/0000-00"
                  maxLength="18"
                  style={{
                    width: '100%', padding: '12px',
                    border: '1px solid #ddd', borderRadius: '5px',
                    fontSize: '16px', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{
                border: '2px solid #e9ecef', borderRadius: '8px',
                padding: '20px', marginBottom: '20px',
                backgroundColor: '#f8f9fa'
              }}>
                <h3 style={{ color: '#009245', margin: '0 0 15px 0' }}>
                  📱 Verificação por SMS
                </h3>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                  Receba um código no telefone cadastrado da empresa
                </p>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    display: 'block', marginBottom: '5px',
                    fontWeight: 'bold', fontSize: '14px'
                  }}>Telefone da Empresa</label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={handleTelefoneChange}
                    placeholder="(11) 99999-9999"
                    style={{
                      width: '100%', padding: '10px',
                      border: '1px solid #ddd', borderRadius: '5px',
                      fontSize: '14px', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <button
                  onClick={iniciarResetSMS}
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#ccc' : '#25D366',
                    color: 'white', border: 'none',
                    padding: '12px 20px', borderRadius: '5px',
                    fontWeight: 'bold',
                    cursor: loading ? 'wait' : 'pointer',
                    width: '100%', fontSize: '14px'
                  }}
                >
                  {loading ? 'Enviando...' : 'Enviar Código SMS'}
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
                  Responda perguntas baseadas nos dados da sua empresa
                </p>
                <button
                  onClick={iniciarResetPerguntas}
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

          {/* SMS */}
          {etapa === 'sms' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>📱</div>
                <h2 style={{ color: '#009245', marginBottom: '10px' }}>
                  Código Enviado!
                </h2>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Um código de verificação foi enviado para<br />
                  <strong>{telefoneMascarado}</strong>
                </p>
              </div>

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
                onClick={confirmarCodigoSMS}
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

          {/* Perguntas */}
          {etapa === 'perguntas' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>❓</div>
                <h2 style={{ color: '#009245', marginBottom: '10px' }}>
                  Perguntas de Segurança
                </h2>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Responda as perguntas baseadas nos dados da sua empresa<br />
                  <strong>Necessário acertar todas para continuar</strong>
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