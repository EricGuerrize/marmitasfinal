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

  // Detecta se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Verifica se já tem sessão ativa
  useEffect(() => {
    const sessaoAtiva = authSupabaseService.verificarSessao();
    if (sessaoAtiva) {
      onNavigate('prosseguir');
    }

    // Verifica se está bloqueado
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
          
          // Timer para atualizar tempo restante
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
          }, 60000); // Atualiza a cada minuto
          
          return () => clearInterval(timer);
        } else {
          // Bloqueio expirou
          localStorage.removeItem('loginBlock');
          setLoginAttempts(0);
        }
      } catch {
        localStorage.removeItem('loginBlock');
      }
    }
  };

  // Função para aplicar máscara de CNPJ com validação
  const applyCnpjMask = (value) => {
    // Remove todos os caracteres não numéricos
    const onlyNumbers = value.replace(/\D/g, '');
    
    // Limita a 14 dígitos
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

  // FUNÇÃO DE LOGIN MELHORADA COM SEGURANÇA
  const handleLogin = async () => {
    // Verifica se está bloqueado
    if (isBlocked) {
      alert(`Muitas tentativas incorretas. Tente novamente em ${blockTimeRemaining} minutos.`);
      return;
    }

    // Validações básicas
    if (!cnpj.trim()) {
      alert('Por favor, informe o CNPJ');
      return;
    }

    if (!senha.trim()) {
      alert('Por favor, informe a senha');
      return;
    }

    // Validação de origem para prevenir CSRF
    if (!securityUtils.validateOrigin()) {
      alert('Origem não autorizada');
      return;
    }

    // Sanitiza entradas
    const cnpjSanitizado = securityUtils.sanitizeInput(cnpj, { 
      allowSpecialChars: true, 
      maxLength: 18 
    });
    const senhaSanitizada = securityUtils.sanitizeInput(senha, { 
      allowSpecialChars: true, 
      maxLength: 50 
    });

    // Detecta tentativas de injeção
    if (securityUtils.detectInjectionAttempt(cnpjSanitizado) || 
        securityUtils.detectInjectionAttempt(senhaSanitizada)) {
      alert('Dados inválidos detectados');
      securityUtils.safeLog('Tentativa de injeção detectada', { cnpj: cnpjSanitizado });
      return;
    }

    setFazendoLogin(true);

    try {
      const resultado = await authSupabaseService.autenticar(cnpjSanitizado, senhaSanitizada);

      if (resultado.success) {
        // Reset contador de tentativas em caso de sucesso
        setLoginAttempts(0);
        localStorage.removeItem('loginBlock');
        
        // Salvar nome da empresa na sessão
        if (resultado.empresa && resultado.empresa.nomeEmpresa) {
          sessionStorage.setItem('nomeEmpresa', resultado.empresa.nomeEmpresa);
        }
        
        securityUtils.safeLog('Login realizado com sucesso');
        onNavigate('prosseguir');
      } else {
        // Incrementa tentativas
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        if (newAttempts >= 5) {
          blockLogin(newAttempts);
          alert('Muitas tentativas incorretas. Acesso bloqueado por 30 minutos.');
        } else {
          alert(`CNPJ ou senha incorretos. Tentativas restantes: ${5 - newAttempts}`);
        }
        
        securityUtils.safeLog('Tentativa de login falhou', { 
          attempts: newAttempts,
          cnpj: cnpjSanitizado 
        });
      }
    } catch (error) {
      securityUtils.safeLog('Erro de conexão no login', { error: error.message });
      alert('Erro de conexão. Tente novamente.');
    } finally {
      setFazendoLogin(false);
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

    // Email opcional - validação apenas se fornecido
    if (email && !securityUtils.validateAndSanitizeUrl(`mailto:${email}`).isValid) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('Email inválido');
        return;
      }
    }

    // Validação de origem
    if (!securityUtils.validateOrigin()) {
      alert('Origem não autorizada');
      return;
    }

    // Sanitização
    const dadosEmpresa = {
      email: email ? securityUtils.sanitizeInput(email.trim(), { maxLength: 100 }) : null,
      nomeEmpresa: nomeEmpresa ? securityUtils.sanitizeInput(nomeEmpresa.trim(), { maxLength: 100 }) : null
    };

    // Detecta tentativas de injeção
    if ((dadosEmpresa.email && securityUtils.detectInjectionAttempt(dadosEmpresa.email)) ||
        (dadosEmpresa.nomeEmpresa && securityUtils.detectInjectionAttempt(dadosEmpresa.nomeEmpresa))) {
      alert('Dados inválidos detectados');
      return;
    }

    setFazendoLogin(true);

    try {
      const resultado = await authSupabaseService.registrarEmpresa(cnpj, senha, dadosEmpresa);

      if (resultado.success) {
        alert('Cadastro realizado com sucesso! Agora você pode fazer login.');
        setModo('login');
        setSenha('');
        setConfirmarSenha('');
        setEmail('');
        setNomeEmpresa('');
        securityUtils.safeLog('Cadastro realizado com sucesso');
      } else {
        alert('Erro no cadastro. Tente novamente.');
        securityUtils.safeLog('Erro no cadastro', { error: resultado.error });
      }
    } catch (error) {
      alert('Erro inesperado. Tente novamente.');
      securityUtils.safeLog('Erro inesperado no cadastro', { error: error.message });
    } finally {
      setFazendoLogin(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !fazendoLogin && !isBlocked) {
      if (modo === 'login') {
        handleLogin();
      } else {
        handleCadastro();
      }
    }
  };

  const handleMeusPedidos = () => {
    const sessaoAtiva = authSupabaseService.verificarSessao();
    if (!sessaoAtiva) {
      alert('Faça login para acessar seus pedidos');
      return;
    }
    onNavigate('prosseguir');
  };

  // ACESSO ADMIN MELHORADO COM RATE LIMITING
  const handleAdminAccess = () => {
    // Verifica rate limiting
    const rateLimit = securityUtils.checkOperationLimit('admin_access');
    if (!rateLimit.allowed) {
      alert(`Muitas tentativas. Tente novamente em ${Math.ceil((rateLimit.resetTime - new Date()) / 1000 / 60)} minutos.`);
      return;
    }

    // Validação de origem
    if (!securityUtils.validateOrigin()) {
      alert('Acesso não autorizado');
      return;
    }

    const senhas = [
      process.env.REACT_APP_ADMIN_PASSWORD || 'FitInBox2025!',
      'admin2025!@#',
      'fitinbox_admin_secure'
    ];

    const senhaInformada = prompt('Digite a senha do administrador:');
    
    if (senhaInformada === null) return;

    // Sanitiza entrada
    const senhaSanitizada = securityUtils.sanitizeInput(senhaInformada, { 
      allowSpecialChars: true, 
      maxLength: 50 
    });

    // Verifica senha usando hash
    const senhaValida = senhas.some(senha => {
      const hashSenha = securityUtils.simpleHash(senha);
      const hashInformada = securityUtils.simpleHash(senhaSanitizada);
      return hashSenha === hashInformada;
    });

    if (senhaValida) {
      securityUtils.safeLog('Acesso admin autorizado');
      onNavigate('admin');
    } else {
      securityUtils.safeLog('Tentativa de acesso admin negada');
      alert('Senha incorreta!');
    }
  };

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
            fontSize: isMobile ? '14px' : '16px'
          }}
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
          lineHeight: '1.2'
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
          borderRadius: '10px',
          padding: '30px',
          color: '#333'
        }}>
          {/* Aviso de bloqueio */}
          {isBlocked && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '15px',
              borderRadius: '5px',
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
                padding: '10px',
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
                padding: '10px',
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
              onKeyPress={handleKeyPress}
              placeholder="00.000.000/0000-00"
              maxLength="18"
              disabled={fazendoLogin || isBlocked}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '5px',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box',
                opacity: (fazendoLogin || isBlocked) ? 0.6 : 1
              }}
            />
          </div>

          {/* Campo Email (APENAS NO CADASTRO - OPCIONAL) */}
          {modo === 'cadastro' && (
            <>
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
                  onKeyPress={handleKeyPress}
                  placeholder="empresa@exemplo.com"
                  disabled={fazendoLogin || isBlocked}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: (fazendoLogin || isBlocked) ? 0.6 : 1
                  }}
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
                  onKeyPress={handleKeyPress}
                  placeholder="Ex: Minha Empresa Ltda"
                  disabled={fazendoLogin || isBlocked}
                  maxLength="100"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: (fazendoLogin || isBlocked) ? 0.6 : 1
                  }}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  Nome fantasia ou razão social para identificação nos pedidos
                </small>
              </div>
            </>
          )}

          {/* Campo Senha */}
          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 'bold',
              color: '#009245'
            }}>
              Senha {modo === 'cadastro' && '(mínimo 6 caracteres)'}
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua senha"
              disabled={fazendoLogin || isBlocked}
              maxLength="50"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '5px',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box',
                opacity: (fazendoLogin || isBlocked) ? 0.6 : 1
              }}
            />
          </div>

          {/* Campo Confirmar Senha (só no cadastro) */}
          {modo === 'cadastro' && (
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
                onKeyPress={handleKeyPress}
                placeholder="Confirme sua senha"
                disabled={fazendoLogin || isBlocked}
                maxLength="50"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  opacity: (fazendoLogin || isBlocked) ? 0.6 : 1
                }}
              />
            </div>
          )}

          {/* Indicador de tentativas (apenas no modo login) */}
          {modo === 'login' && loginAttempts > 0 && !isBlocked && (
            <div style={{
              backgroundColor: '#fff3cd',
              color: '#856404',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '20px',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              ⚠️ Tentativas restantes: {5 - loginAttempts}
            </div>
          )}

          {/* Aviso sobre email (só no cadastro) */}
          {modo === 'cadastro' && (
            <div style={{
              backgroundColor: '#e7f3ff',
              padding: '12px',
              borderRadius: '5px',
              marginBottom: '20px',
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

          {/* Botão de Ação */}
          <button
            onClick={modo === 'login' ? handleLogin : handleCadastro}
            disabled={fazendoLogin || isBlocked}
            style={{
              backgroundColor: (fazendoLogin || isBlocked) ? '#ccc' : '#f38e3c',
              color: 'white',
              border: 'none',
              padding: '15px',
              width: '100%',
              borderRadius: '5px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: (fazendoLogin || isBlocked) ? 'not-allowed' : 'pointer',
              opacity: (fazendoLogin || isBlocked) ? 0.7 : 1
            }}
          >
            {isBlocked ? 'ACESSO BLOQUEADO' :
             fazendoLogin ?
              (modo === 'login' ? 'ENTRANDO...' : 'CADASTRANDO...') :
              (modo === 'login' ? 'ENTRAR' : 'CADASTRAR')
            }
          </button>

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
            color: 'white'
          }}>
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
            color: 'white'
          }}>
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
            color: 'white'
          }}>
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

        {/* Botão Admin discreto com rate limiting */}
        <div style={{
          marginTop: '40px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button
            onClick={handleAdminAccess}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'rgba(255, 255, 255, 0.7)',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.target.style.color = 'rgba(255, 255, 255, 0.7)';
            }}
          >
            ⚙️ Área Administrativa
          </button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;