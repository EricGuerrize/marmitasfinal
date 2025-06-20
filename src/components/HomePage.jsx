import React, { useState, useEffect } from 'react';
import { authSupabaseService } from '../services/authSupabaseService';

const HomePage = ({ onNavigate }) => {
  const [cnpj, setCnpj] = useState('');
  const [senha, setSenha] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [fazendoLogin, setFazendoLogin] = useState(false);
  const [modo, setModo] = useState('login'); // 'login' ou 'cadastro'
  const [confirmarSenha, setConfirmarSenha] = useState('');

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
      // Já está logado, vai direto para a área restrita (SEM POPUP)
      onNavigate('prosseguir');
    }
  }, [onNavigate]);

  // Função para aplicar máscara de CNPJ
  const applyCnpjMask = (value) => {
    const onlyNumbers = value.replace(/\D/g, '');
    
    return onlyNumbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const handleCnpjChange = (e) => {
    const maskedValue = applyCnpjMask(e.target.value);
    setCnpj(maskedValue);
  };

  const handleLogin = async () => {
    if (!cnpj.trim()) {
      alert('Por favor, informe o CNPJ');
      return;
    }
    
    if (!senha.trim()) {
      alert('Por favor, informe a senha');
      return;
    }
    
    setFazendoLogin(true);
    
    try {
      const resultado = await authSupabaseService.autenticar(cnpj, senha);
      
      if (resultado.success) {
        // Login sem popup - vai direto para área restrita
        onNavigate('prosseguir');
      } else {
        alert(`Erro no login: ${resultado.error}`);
      }
    } catch (error) {
      alert('Erro inesperado. Tente novamente.');
    } finally {
      setFazendoLogin(false);
    }
  };

  const handleCadastro = async () => {
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
    
    setFazendoLogin(true);
    
    try {
      const resultado = await authSupabaseService.registrarEmpresa(cnpj, senha);
      
      if (resultado.success) {
        alert('Cadastro realizado com sucesso! Agora você pode fazer login.');
        setModo('login');
        setSenha('');
        setConfirmarSenha('');
      } else {
        alert(`Erro no cadastro: ${resultado.error}`);
      }
    } catch (error) {
      alert('Erro inesperado. Tente novamente.');
    } finally {
      setFazendoLogin(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (modo === 'login') {
        handleLogin();
      } else {
        handleCadastro();
      }
    }
  };

  const handleMeusPedidos = () => {
    // Se não está logado, pede para logar primeiro
    const sessaoAtiva = authSupabaseService.verificarSessao();
    if (!sessaoAtiva) {
      alert('Faça login para acessar seus pedidos');
      return;
    }
    onNavigate('prosseguir');
  };

  // Função para acessar admin (removido clique triplo secreto)
  const handleAdminAccess = () => {
    const senha = prompt('Digite a senha do administrador:');
    if (senha === 'admin123') {
      onNavigate('admin');
    } else if (senha !== null) {
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
        <div 
          style={{ 
            height: isMobile ? '50px' : '60px',
            display: 'flex',
            alignItems: 'center',
            fontSize: isMobile ? '24px' : '32px',
            fontWeight: 'bold',
            color: '#009245'
          }}
        >
          🍽️ Fit In Box
        </div>
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
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderRadius: '20px',
                backgroundColor: modo === 'login' ? '#009245' : 'transparent',
                color: modo === 'login' ? 'white' : '#666',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              ENTRAR
            </button>
            <button
              onClick={() => setModo('cadastro')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderRadius: '20px',
                backgroundColor: modo === 'cadastro' ? '#009245' : 'transparent',
                color: modo === 'cadastro' ? 'white' : '#666',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
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
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '5px',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
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
              Senha {modo === 'cadastro' && '(mínimo 6 caracteres)'}
            </label>
            <input 
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua senha"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '5px',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box'
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
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* Botão de Ação */}
          <button 
            onClick={modo === 'login' ? handleLogin : handleCadastro}
            disabled={fazendoLogin}
            style={{
              backgroundColor: fazendoLogin ? '#ccc' : '#f38e3c',
              color: 'white',
              border: 'none',
              padding: '15px',
              width: '100%',
              borderRadius: '5px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: fazendoLogin ? 'wait' : 'pointer',
              opacity: fazendoLogin ? 0.7 : 1
            }}
          >
            {fazendoLogin ? 
              (modo === 'login' ? 'ENTRANDO...' : 'CADASTRANDO...') : 
              (modo === 'login' ? 'ENTRAR' : 'CADASTRAR')
            }
          </button>

          {/* Link para alternar modo */}
          <div style={{ 
            marginTop: '20px', 
            textAlign: 'center',
            fontSize: '14px',
            color: '#666'
          }}>
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

        {/* Botão Admin discreto */}
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