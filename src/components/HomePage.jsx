import React, { useState, useEffect } from 'react';
import { authCnpjService } from '../services/authCnpjService';

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
    const sessaoAtiva = authCnpjService.verificarSessao();
    if (sessaoAtiva) {
      // Já está logado, vai direto para a área restrita
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
      const resultado = await new Promise(resolve => {
        setTimeout(() => {
          resolve(authCnpjService.autenticar(cnpj, senha));
        }, 1000); // Simula delay de rede
      });
      
      if (resultado.success) {
        alert(`Bem-vindo, ${resultado.empresa.razaoSocial}!`);
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
    
    if (senha.length < 4) {
      alert('Senha deve ter pelo menos 4 caracteres');
      return;
    }
    
    if (senha !== confirmarSenha) {
      alert('Senhas não conferem');
      return;
    }
    
    setFazendoLogin(true);
    
    try {
      const resultado = await new Promise(resolve => {
        setTimeout(() => {
          resolve(authCnpjService.registrarCnpj(cnpj, senha, {
            razaoSocial: `Empresa ${cnpj.substring(0, 8)}` // Nome temporário
          }));
        }, 1000); // Simula delay de rede
      });
      
      if (resultado.success) {
        alert('CNPJ cadastrado com sucesso! Agora você pode fazer login.');
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
    const sessaoAtiva = authCnpjService.verificarSessao();
    if (!sessaoAtiva) {
      alert('Faça login para acessar seus pedidos');
      return;
    }
    onNavigate('prosseguir');
  };

  // Função secreta para acessar admin (clique triplo no logo)
  const [clickCount, setClickCount] = useState(0);
  
  const handleLogoClick = () => {
    setClickCount(prev => prev + 1);
    
    // Reset após 2 segundos
    setTimeout(() => setClickCount(0), 2000);
    
    // Se clicou 3 vezes, vai para admin
    if (clickCount === 2) {
      const senha = prompt('Digite a senha do administrador:');
      if (senha === 'admin123') {
        onNavigate('admin');
      } else if (senha !== null) {
        alert('Senha incorreta!');
      }
      setClickCount(0);
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
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            fontSize: isMobile ? '24px' : '32px',
            fontWeight: 'bold',
            color: '#009245'
          }}
          onClick={handleLogoClick}
          title="Clique 3 vezes para acessar o admin"
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
          {modo === 'login' ? 'Faça login para acessar sua área exclusiva' : 'Cadastre-se para ter acesso completo'}
        </p>

        {/* Form de Login/Cadastro */}
        <div style={{
          margin: '30px auto',
          width: isMobile ? '95%' : '80%',
          maxWidth: '500px',
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
              LOGIN
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
              CADASTRO
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
              CNPJ da Empresa
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
              Senha {modo === 'cadastro' && '(mínimo 4 caracteres)'}
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
                Não tem cadastro? 
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
                  Cadastre-se aqui
                </button>
              </>
            ) : (
              <>
                Já tem cadastro? 
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
                  Faça login
                </button>
              </>
            )}
          </div>
        </div>

        {/* Dica para teste */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          padding: '15px',
          borderRadius: '8px',
          margin: '20px auto',
          maxWidth: '600px',
          fontSize: '14px'
        }}>
          💡 <strong>Para teste:</strong> Use qualquer CNPJ válido (ex: 11.222.333/0001-81) e cadastre uma senha
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
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🏢</div>
            <h3 style={{
              marginTop: '10px',
              fontSize: '1.1em'
            }}>
              1. Cadastre seu CNPJ
            </h3>
            <p style={{
              fontSize: '0.9em'
            }}>
              Registre seu CNPJ e crie uma senha de acesso
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
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔐</div>
            <h3 style={{
              marginTop: '10px',
              fontSize: '1.1em'
            }}>
              2. Faça Login
            </h3>
            <p style={{
              fontSize: '0.9em'
            }}>
              Use seu CNPJ e senha para acessar sua área exclusiva
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
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🛒</div>
            <h3 style={{
              marginTop: '10px',
              fontSize: '1.1em'
            }}>
              3. Faça seus Pedidos
            </h3>
            <p style={{
              fontSize: '0.9em'
            }}>
              Acesse produtos exclusivos e faça pedidos facilmente
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
            onClick={() => {
              const senha = prompt('Digite a senha do administrador:');
              if (senha === 'admin123') {
                onNavigate('admin');
              } else if (senha !== null) {
                alert('Senha incorreta!');
              }
            }}
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