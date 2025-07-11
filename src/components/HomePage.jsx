import React, { useState, useEffect } from 'react';
import { authSupabaseService } from '../services/authSupabaseService';
import { securityUtils } from '../utils/securityUtils';
import LogoComponent from './LogoComponent';

const HomePage = ({ onNavigate }) => {
  const [cnpj, setCnpj] = useState('');
  const [senha, setSenha] = useState('');
  const [email, setEmail] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [fazendoLogin, setFazendoLogin] = useState(false);
  const [modo, setModo] = useState('login');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0);
  const [checkingSession, setCheckingSession] = useState(true);

  // Detecta se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ CORRIGIDO: Verifica se já tem sessão ativa (async)
  useEffect(() => {
    const verificarSessaoExistente = async () => {
      try {
        setCheckingSession(true);
        const sessaoAtiva = await authSupabaseService.verificarSessao();
        if (sessaoAtiva) {
          console.log('✅ Sessão existente encontrada, redirecionando...');
          onNavigate('prosseguir');
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar sessão existente:', error);
      } finally {
        setCheckingSession(false);
      }
    };

    verificarSessaoExistente();
    checkBlockStatus();
  }, [onNavigate]);

  // Verifica status de bloqueio
  const checkBlockStatus = () => {
    const blockData = localStorage.getItem('loginBlock');
    if (blockData) {
      try {
        const { blockedUntil, attempts } = JSON.parse(blockData);
        const now = Date.now();
        
        if (now < blockedUntil) {
          const remaining = Math.ceil((blockedUntil - now) / 1000 / 60);
          setIsBlocked(true);
          setBlockTimeRemaining(remaining);
          setLoginAttempts(attempts);
          
          const timer = setInterval(() => {
            const newRemaining = Math.ceil((blockedUntil - Date.now()) / 1000 / 60);
            if (newRemaining <= 0) {
              setIsBlocked(false);
              setBlockTimeRemaining(0);
              setLoginAttempts(0);
              localStorage.removeItem('loginBlock');
              clearInterval(timer);
            } else {
              setBlockTimeRemaining(newRemaining);
            }
          }, 60000);
          
          return () => clearInterval(timer);
        } else {
          localStorage.removeItem('loginBlock');
          setLoginAttempts(0);
        }
      } catch {
        localStorage.removeItem('loginBlock');
      }
    }
  };

  // Função para aplicar máscara de CNPJ
  const applyCnpjMask = (value) => {
    const onlyNumbers = value.replace(/\D/g, '');
    const limited = onlyNumbers.slice(0, 14);

    return limited
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const handleCnpjChange = (e) => {
    const maskedValue = applyCnpjMask(e.target.value);
    setCnpj(maskedValue);
  };

  // Bloqueia tentativas de login
  const blockLogin = (attempts) => {
    const blockTime = 30 * 60 * 1000; // 30 minutos
    const blockedUntil = Date.now() + blockTime;
    
    localStorage.setItem('loginBlock', JSON.stringify({
      blockedUntil,
      attempts
    }));
    
    setIsBlocked(true);
    setBlockTimeRemaining(30);
    
    securityUtils.safeLog('Login bloqueado por tentativas excessivas', { attempts });
  };

  // ✅ CORRIGIDO: FUNÇÃO DE LOGIN PARA CNPJ
  const handleLogin = async (cnpj, senha) => {
    try {
      if (!cnpj || !senha) {
        console.error('❌ Erro de conexão no login: CNPJ ou senha não informados');
        return;
      }
      console.log('Tentando login com CNPJ:', cnpj);
      const result = await authSupabaseService.autenticarCnpj(cnpj, senha);
      if (!result.success) throw new Error(result.error);
      console.log('Login bem-sucedido:', result);
      onNavigate('prosseguir'); // Redireciona após sucesso
    } catch (error) {
      console.error('❌ Erro de conexão no login:', error.message);
      alert(`Erro ao fazer login: ${error.message}`);
      if (loginAttempts + 1 >= 5) {
        blockLogin(loginAttempts + 1);
      } else {
        setLoginAttempts(loginAttempts + 1);
      }
    }
  };

  // FUNÇÃO DE CADASTRO MELHORADA
  const handleCadastro = async () => {
    // Validações básicas
    if (!cnpj.trim()) {
      alert('Por favor, informe o CNPJ');
      return;
    }

    if (!senha.trim()) {
      alert('Por favor, informe a senha');
      return;
    }

    if (senha.length < 6) {
      alert('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (senha !== confirmarSenha) {
      alert('Senhas não conferem');
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Email inválido');
      return;
    }

    if (!securityUtils.validateOrigin()) {
      alert('Origem não autorizada');
      return;
    }

    const dadosEmpresa = {
      cnpj: cnpj,
      email: email ? securityUtils.sanitizeInput(email.trim(), { maxLength: 100 }) : null,
      nomeEmpresa: nomeEmpresa ? securityUtils.sanitizeInput(nomeEmpresa.trim(), { maxLength: 100 }) : null,
      razaoSocial: nomeEmpresa ? securityUtils.sanitizeInput(nomeEmpresa.trim(), { maxLength: 100 }) : null,
      nomeFantasia: nomeEmpresa ? securityUtils.sanitizeInput(nomeEmpresa.trim(), { maxLength: 100 }) : null
    };

    if ((dadosEmpresa.email && securityUtils.detectInjectionAttempt(dadosEmpresa.email)) ||
        (dadosEmpresa.nomeEmpresa && securityUtils.detectInjectionAttempt(dadosEmpresa.nomeEmpresa))) {
      alert('Dados inválidos detectados');
      return;
    }

    setFazendoLogin(true);

    try {
      console.log('📝 Tentando cadastro para CNPJ:', cnpj);
      
      const resultado = await authSupabaseService.registrarEmpresa(email || '', senha, dadosEmpresa);

      if (resultado.success) {
        alert('Cadastro realizado com sucesso! Agora você pode fazer login.');
        setModo('login');
        setSenha('');
        setConfirmarSenha('');
        setEmail('');
        setNomeEmpresa('');
        securityUtils.safeLog('Cadastro realizado com sucesso');
      } else {
        alert(`Erro no cadastro: ${resultado.error}`);
        securityUtils.safeLog('Erro no cadastro', { error: resultado.error });
      }
    } catch (error) {
      console.error('❌ Erro inesperado no cadastro:', error);
      alert('Erro inesperado. Tente novamente.');
      securityUtils.safeLog('Erro inesperado no cadastro', { error: error.message });
    } finally {
      setFazendoLogin(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !fazendoLogin && !isBlocked) {
      if (modo === 'login') {
        handleLogin(cnpj, senha);
      } else {
        handleCadastro();
      }
    }
  };

  // ✅ CORRIGIDO: handleMeusPedidos async
  const handleMeusPedidos = async () => {
    try {
      const sessaoAtiva = await authSupabaseService.verificarSessao();
      if (!sessaoAtiva) {
        alert('Faça login para acessar seus pedidos');
        return;
      }
      onNavigate('prosseguir');
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
      alert('Faça login para acessar seus pedidos');
    }
  };

  // ✅ ADICIONAR: Loading state para verificação de sessão
  if (checkingSession) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#009245',
        color: 'white',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '48px' }}>🔄</div>
        <div style={{ fontSize: '18px' }}>Verificando sessão...</div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      margin: 0,
      padding: 0,
      backgroundColor: '#009245',
      color: 'white',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '10px 15px' : '10px 20px',
        backgroundColor: 'white'
      }}>
        <LogoComponent
          size={isMobile ? 'small' : 'medium'}
          showText={true}
        />
        <button
          onClick={handleMeusPedidos}
          style={{
            backgroundColor: '#f38e3c',
            border: 'none',
            padding: isMobile ? '8px 12px' : '10px 20px',
            color: 'white',
            fontWeight: 'bold',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: isMobile ? '14px' : '16px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#e67e22'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#f38e3c'}
        >
          MEUS PEDIDOS
        </button>
      </header>

      {/* Hero Section */}
      <section style={{
        textAlign: 'center',
        padding: isMobile ? '30px 15px' : '40px 20px'
      }}>
        <h1 style={{
          fontSize: isMobile ? '2em' : '2.5em',
          fontWeight: 'normal',
          margin: 0,
          lineHeight: '1.2',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          Sua <strong>Alimentação</strong> <br />
          <strong>Nosso</strong> Compromisso
        </h1>
        <p style={{
          marginTop: '20px',
          fontSize: isMobile ? '1.1em' : '1.2em'
        }}>
          ÁREA DO FORNECEDOR
        </p>
        <p style={{
          fontSize: isMobile ? '1.1em' : '1.2em',
          margin: isMobile ? '10px 10px 0 10px' : '0'
        }}>
          {modo === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}
        </p>

        {/* Form de Login/Cadastro */}
        <div style={{
          margin: '30px auto',
          width: isMobile ? '95%' : '80%',
          maxWidth: '450px',
          backgroundColor: 'white',
          borderRadius: '15px',
          padding: '30px',
          color: '#333',
          boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
        }}>
          {/* Aviso de bloqueio */}
          {isBlocked && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #f5c6cb',
              textAlign: 'center'
            }}>
              <strong>🔒 Acesso Temporariamente Bloqueado</strong>
              <br />
              Muitas tentativas incorretas. Tente novamente em {blockTimeRemaining} minutos.
            </div>
          )}

          {/* Toggle Login/Cadastro */}
          <div style={{
            display: 'flex',
            marginBottom: '25px',
            backgroundColor: '#f8f9fa',
            borderRadius: '25px',
            padding: '5px'
          }}>
            <button
              onClick={() => setModo('login')}
              disabled={isBlocked}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '20px',
                backgroundColor: modo === 'login' ? '#009245' : 'transparent',
                color: modo === 'login' ? 'white' : '#666',
                fontWeight: 'bold',
                cursor: isBlocked ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: isBlocked ? 0.5 : 1
              }}
            >
              ENTRAR
            </button>
            <button
              onClick={() => setModo('cadastro')}
              disabled={isBlocked}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '20px',
                backgroundColor: modo === 'cadastro' ? '#009245' : 'transparent',
                color: modo === 'cadastro' ? 'white' : '#666',
                fontWeight: 'bold',
                cursor: isBlocked ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: isBlocked ? 0.5 : 1
              }}
            >
              CADASTRAR
            </button>
          </div>

          {/* Início do Formulário de Login */}
          {modo === 'login' && (
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(cnpj, senha); }} onKeyPress={handleKeyPress}>
              {/* Campo CNPJ */}
              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  color: '#009245'
                }}>
                  CNPJ
                </label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  placeholder="00.000.000/0000-00"
                  maxLength="18"
                  disabled={fazendoLogin || isBlocked}
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: (fazendoLogin || isBlocked) ? 0.6 : 1,
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#009245'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>

              {/* Campo Senha */}
              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  color: '#009245'
                }}>
                  Senha
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  disabled={fazendoLogin || isBlocked}
                  maxLength="50"
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: (fazendoLogin || isBlocked) ? 0.6 : 1,
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#009245'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>

              {/* Indicador de tentativas (apenas no modo login) */}
              {loginAttempts > 0 && !isBlocked && (
                <div style={{
                  backgroundColor: '#fff3cd',
                  color: '#856404',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '14px',
                  textAlign: 'center'
                }}>
                  ⚠️ Tentativas restantes: {5 - loginAttempts}
                </div>
              )}

              {/* Botão de Ação */}
              <button
                type="submit"
                disabled={fazendoLogin || isBlocked}
                style={{
                  backgroundColor: (fazendoLogin || isBlocked) ? '#ccc' : '#f38e3c',
                  color: 'white',
                  border: 'none',
                  padding: '16px',
                  width: '100%',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: (fazendoLogin || isBlocked) ? 'not-allowed' : 'pointer',
                  marginBottom: '20px',
                  opacity: (fazendoLogin || isBlocked) ? 0.7 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(243,142,60,0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!fazendoLogin && !isBlocked) {
                    e.target.style.backgroundColor = '#e67e22';
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!fazendoLogin && !isBlocked) {
                    e.target.style.backgroundColor = '#f38e3c';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {isBlocked ? 'ACESSO BLOQUEADO' :
                 fazendoLogin ? 'ENTRANDO...' : 'ENTRAR'}
              </button>
            </form>
          )}

          {/* Início do Formulário de Cadastro */}
          {modo === 'cadastro' && (
            <form onSubmit={(e) => { e.preventDefault(); handleCadastro(); }} onKeyPress={handleKeyPress}>
              {/* Campo CNPJ */}
              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  color: '#009245'
                }}>
                  CNPJ
                </label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  placeholder="00.000.000/0000-00"
                  maxLength="18"
                  disabled={fazendoLogin || isBlocked}
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: (fazendoLogin || isBlocked) ? 0.6 : 1,
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#009245'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>

              {/* Campo Email (APENAS NO CADASTRO - OPCIONAL) */}
              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  color: '#009245'
                }}>
                  Email (opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="empresa@exemplo.com"
                  disabled={fazendoLogin || isBlocked}
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: (fazendoLogin || isBlocked) ? 0.6 : 1,
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#009245'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  Email para recuperação de senha e comunicações importantes
                </small>
              </div>

              {/* CAMPO NOME DA EMPRESA */}
              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  color: '#009245'
                }}>
                  Nome da Empresa (recomendado)
                </label>
                <input
                  type="text"
                  value={nomeEmpresa}
                  onChange={(e) => setNomeEmpresa(e.target.value)}
                  placeholder="Ex: Minha Empresa Ltda"
                  disabled={fazendoLogin || isBlocked}
                  maxLength="100"
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: (fazendoLogin || isBlocked) ? 0.6 : 1,
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#009245'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  Nome fantasia ou razão social para identificação nos pedidos
                </small>
              </div>

              {/* Campo Senha */}
              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  color: '#009245'
                }}>
                  Senha (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  disabled={fazendoLogin || isBlocked}
                  maxLength="50"
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: (fazendoLogin || isBlocked) ? 0.6 : 1,
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#009245'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>

              {/* Campo Confirmar Senha (só no cadastro) */}
              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                  color: '#009245'
                }}>
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Confirme sua senha"
                  disabled={fazendoLogin || isBlocked}
                  maxLength="50"
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: (fazendoLogin || isBlocked) ? 0.6 : 1,
                    transition: 'border-color 0.3s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#009245'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
              </div>

              {/* Botão de Ação */}
              <button
                type="submit"
                disabled={fazendoLogin || isBlocked}
                style={{
                  backgroundColor: (fazendoLogin || isBlocked) ? '#ccc' : '#f38e3c',
                  color: 'white',
                  border: 'none',
                  padding: '16px',
                  width: '100%',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: (fazendoLogin || isBlocked) ? 'not-allowed' : 'pointer',
                  marginBottom: '20px',
                  opacity: (fazendoLogin || isBlocked) ? 0.7 : 1,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(243,142,60,0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!fazendoLogin && !isBlocked) {
                    e.target.style.backgroundColor = '#e67e22';
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!fazendoLogin && !isBlocked) {
                    e.target.style.backgroundColor = '#f38e3c';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {isBlocked ? 'ACESSO BLOQUEADO' :
                 fazendoLogin ? 'CADASTRANDO...' : 'CADASTRAR'}
              </button>
            </form>
          )}

          {/* Links para alternar modo e esqueci senha */}
          <div style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '14px',
            color: '#666'
          }}>
            {modo === 'login' && !isBlocked && (
              <>
                <button
                  onClick={() => onNavigate('forgot-password')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#009245',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginBottom: '10px'
                  }}
                >
                  Esqueci minha senha
                </button>
                <br />
              </>
            )}

            {!isBlocked && (
              <>
                {modo === 'login' ? (
                  <>
                    Não tem conta?
                    <button
                      onClick={() => setModo('cadastro')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#009245',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        marginLeft: '5px'
                      }}
                    >
                      Cadastre-se
                    </button>
                  </>
                ) : (
                  <>
                    Já tem conta?
                    <button
                      onClick={() => setModo('login')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#009245',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        marginLeft: '5px'
                      }}
                    >
                      Entrar
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Aviso sobre email (só no cadastro) */}
          {modo === 'cadastro' && (
            <div style={{
              backgroundColor: '#e7f3ff',
              padding: '15px',
              borderRadius: '8px',
              marginTop: '20px',
              fontSize: '13px',
              color: '#0066cc',
              border: '1px solid #b3d9ff'
            }}>
              <strong>📧 Por que o email é útil?</strong>
              <br />
              • Para recuperação de senha
              <br />
              • Para receber atualizações de pedidos
              <br />
              • Para comunicações importantes
              <br />
              <em>(Campo opcional - você pode cadastrar sem email)</em>
            </div>
          )}
        </div>
      </section>

      {/* Info Section */}
      <section style={{
        padding: isMobile ? '30px 15px' : '40px 20px',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: isMobile ? '1.6em' : '1.8em',
          marginBottom: '30px'
        }}>
          Como Funciona
        </h2>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'stretch'
        }}>
          <div style={{
            width: isMobile ? '100%' : '250px',
            maxWidth: isMobile ? '300px' : '250px',
            backgroundColor: '#2f6e4a',
            borderRadius: '15px',
            padding: '20px',
            textAlign: 'center',
            color: 'white',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
            e.currentTarget.style.backgroundColor = '#1e5233';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            e.currentTarget.style.backgroundColor = '#2f6e4a';
          }}
          >
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔐</div>
            <h3 style={{
              marginTop: '10px',
              fontSize: '1.1em'
            }}>
              1. Acesso Seguro
            </h3>
            <p style={{
              fontSize: '0.9em'
            }}>
              Faça login com segurança usando seu CNPJ
            </p>
          </div>

          <div style={{
            width: isMobile ? '100%' : '250px',
            maxWidth: isMobile ? '300px' : '250px',
            backgroundColor: '#2f6e4a',
            borderRadius: '15px',
            padding: '20px',
            textAlign: 'center',
            color: 'white',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
            e.currentTarget.style.backgroundColor = '#1e5233';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            e.currentTarget.style.backgroundColor = '#2f6e4a';
          }}
          >
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🍽️</div>
            <h3 style={{
              marginTop: '10px',
              fontSize: '1.1em'
            }}>
              2. Escolha Produtos
            </h3>
            <p style={{
              fontSize: '0.9em'
            }}>
              Veja produtos disponíveis para sua empresa
            </p>
          </div>

          <div style={{
            width: isMobile ? '100%' : '250px',
            maxWidth: isMobile ? '300px' : '250px',
            backgroundColor: '#2f6e4a',
            borderRadius: '15px',
            padding: '20px',
            textAlign: 'center',
            color: 'white',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
            e.currentTarget.style.backgroundColor = '#1e5233';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            e.currentTarget.style.backgroundColor = '#2f6e4a';
          }}
          >
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🚚</div>
            <h3 style={{
              marginTop: '10px',
              fontSize: '1.1em'
            }}>
              3. Receba em Casa
            </h3>
            <p style={{
              fontSize: '0.9em'
            }}>
              Entrega rápida e segura no seu endereço
            </p>
          </div>
        </div>
      </section>

      {/* Footer com Informações da Empresa */}
      <footer style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: isMobile ? '40px 20px' : '50px 40px',
        marginTop: '40px'
      }}>
        <div style={{
          maxWidth: '1000px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '30px',
          textAlign: isMobile ? 'center' : 'left'
        }}>
          {/* Coluna 1: Logo e Descrição */}
          <div>
            <LogoComponent 
              size="small"
              showText={true}
              style={{ color: 'white' }}
            />
            <p style={{
              marginTop: '15px',
              color: '#bdc3c7',
              lineHeight: '1.6',
              fontSize: '14px'
            }}>
              Alimentação saudável e nutritiva para empresas que se preocupam com o bem-estar de seus colaboradores.
            </p>
          </div>

          {/* Coluna 2: Contato */}
          <div>
            <h4 style={{
              color: '#f38e3c',
              marginBottom: '15px',
              fontSize: '18px'
            }}>
              📞 Contato
            </h4>
            <div style={{ color: '#bdc3c7', lineHeight: '1.8', fontSize: '14px' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>📱 WhatsApp:</strong><br />
                (21) 2196429-8123
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>📧 Email:</strong><br />
                Fitinboxcg@hotmail.com
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>🕒 Horário:</strong><br />
                Segunda a Sexta: 8h às 18h
              </div>
              <div>
                <strong>📍 Localização:</strong><br />
                Rio de Janeiro/RJ
              </div>
            </div>
          </div>

          {/* Coluna 3: Informações Legais */}
          <div>
            <h4 style={{
              color: '#f38e3c',
              marginBottom: '15px',
              fontSize: '18px'
            }}>
              📋 Informações
            </h4>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '14px'
            }}>
              <div style={{ color: '#bdc3c7' }}>
                <strong>🏢 Razão Social:</strong><br />
                Fit In Box Alimentação Ltda
              </div>
              <div style={{ color: '#bdc3c7' }}>
                <strong>⭐ Qualidade:</strong><br />
                Ingredientes frescos e selecionados
              </div>
              <div style={{ color: '#bdc3c7' }}>
                <strong>🚀 Atendimento:</strong><br />
                Rápido e personalizado
              </div>
            </div>
          </div>
        </div>

        {/* Divisor */}
        <div style={{
          borderTop: '1px solid #34495e',
          marginTop: '30px',
          paddingTop: '20px'
        }}>
          {/* Links Úteis */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '20px',
            marginBottom: '20px'
          }}>
            <button
              onClick={handleMeusPedidos}
              style={{
                background: 'none',
                border: 'none',
                color: '#bdc3c7',
                cursor: 'pointer',
                fontSize: '14px',
                textDecoration: 'underline',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = 'white'}
              onMouseLeave={(e) => e.target.style.color = '#bdc3c7'}
            >
              Área da Empresa
            </button>
            <span style={{ color: '#7f8c8d' }}>•</span>
            <button
              onClick={() => onNavigate('forgot-password')}
              style={{
                background: 'none',
                border: 'none',
                color: '#bdc3c7',
                cursor: 'pointer',
                fontSize: '14px',
                textDecoration: 'underline',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = 'white'}
              onMouseLeave={(e) => e.target.style.color = '#bdc3c7'}
            >
              Esqueci minha senha
            </button>
            <span style={{ color: '#7f8c8d' }}>•</span>
            <button
              onClick={() => {
                const numeroWhatsApp = '5521964298123';
                const mensagem = '🍽️ Olá! Gostaria de saber mais sobre os serviços da Fit In Box.';
                const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
                window.open(url, '_blank');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#bdc3c7',
                cursor: 'pointer',
                fontSize: '14px',
                textDecoration: 'underline',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#25D366'}
              onMouseLeave={(e) => e.target.style.color = '#bdc3c7'}
            >
              Fale Conosco
            </button>
          </div>

          {/* Copyright */}
          <div style={{
            textAlign: 'center',
            color: '#7f8c8d',
            fontSize: '12px'
          }}>
            © 2025 Fit In Box Alimentação Ltda. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;