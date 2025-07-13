import React, { useState, useEffect } from 'react';
import { authSupabaseService } from '../services/authSupabaseService';

const ProsseguirPage = ({ onNavigate }) => {
  const [selectedOption, setSelectedOption] = useState('fazerPedido');
  const [sessaoAtiva, setSessaoAtiva] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const verificarSessaoAtiva = async () => {
      try {
        setLoading(true);
        console.log('🔍 Verificando sessão do usuário...');
        
        const sessao = await authSupabaseService.verificarSessao();
        console.log('📦 Dados da sessão recebidos:', sessao);
        
        // Verifica se tem sessão válida - o authSupabaseService retorna null se não tiver
        if (!sessao) {
          console.warn('⚠️ Sessão inválida ou expirada. Redirecionando para home.');
          onNavigate('home');
          return;
        }
        
        // O authSupabaseService já retorna os dados estruturados
        const userIsAdmin = sessao.isAdmin || sessao.tipoUsuario === 'admin';
        
        const sessaoData = {
          cnpj: sessao.cnpj,
          cnpjFormatado: sessao.cnpjFormatado,
          nomeEmpresa: sessao.nomeEmpresa || sessao.razaoSocial,
          razaoSocial: sessao.razaoSocial || sessao.nomeEmpresa,
          email: sessao.email,
          tipoUsuario: sessao.tipoUsuario,
          isAdmin: userIsAdmin,
          empresa: sessao.empresa
        };
        
        setSessaoAtiva(sessaoData);
        setIsAdmin(userIsAdmin);
        
        console.log('✅ Sessão verificada com sucesso:', {
          cnpj: sessaoData.cnpjFormatado,
          empresa: sessaoData.nomeEmpresa,
          isAdmin: userIsAdmin,
          email: sessaoData.email
        });
        
      } catch (error) {
        console.error('❌ Erro crítico ao verificar sessão:', error);
        console.error('Stack trace:', error.stack);
        
        onNavigate('home');
      } finally {
        setLoading(false);
      }
    };

    verificarSessaoAtiva();
    
    const handlePopState = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onNavigate('home');
      return false;
    };
    
    window.removeEventListener('popstate', handlePopState);
    window.addEventListener('popstate', handlePopState);
    window.history.pushState({ page: 'prosseguir' }, '', window.location.pathname);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onNavigate]);

  const handleOptionChange = (option) => {
    setSelectedOption(option);
  };

  const prosseguir = () => {
    if (selectedOption === 'fazerPedido') {
      onNavigate('pedido-produtos');
    } else if (selectedOption === 'consultarPedidos') {
      onNavigate('consultar-pedido');
    } else if (selectedOption === 'painelAdmin') {
      handleAdminAccess();
    }
  };

  const handleAdminAccess = () => {
    if (!isAdmin || !sessaoAtiva?.isAdmin) {
      console.warn('🚫 Tentativa de acesso administrativo negada:', {
        cnpj: sessaoAtiva?.cnpjFormatado || sessaoAtiva?.cnpj,
        isAdmin: isAdmin,
        sessaoIsAdmin: sessaoAtiva?.isAdmin
      });
      return;
    }

    console.log('✅ Acesso admin autorizado:', {
      cnpj: sessaoAtiva.cnpjFormatado || sessaoAtiva.cnpj,
      empresa: sessaoAtiva.nomeEmpresa || sessaoAtiva.razaoSocial,
      tipoUsuario: sessaoAtiva.tipoUsuario
    });
  
    sessionStorage.setItem('adminPreAuthenticated', JSON.stringify({
      cnpj: sessaoAtiva.cnpjFormatado || sessaoAtiva.cnpj,
      timestamp: Date.now(),
      empresa: sessaoAtiva.nomeEmpresa || sessaoAtiva.razaoSocial,
      tipoUsuario: sessaoAtiva.tipoUsuario
    }));
  
    onNavigate('admin');
  };

  const handleLogout = async () => {
    if (window.confirm('Tem certeza que deseja sair?')) {
      try {
        setLoading(true);
        const success = await authSupabaseService.logout();
        
        if (success) {
          console.log('✅ Logout realizado com sucesso');
        } else {
          console.warn('⚠️ Logout com problemas, mas prosseguindo...');
        }
        
        onNavigate('home');
      } catch (error) {
        console.error('❌ Erro no logout:', error);
        // Mesmo com erro, redireciona para home
        onNavigate('home');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '48px' }}>🔄</div>
        <div style={{ fontSize: '18px', color: '#666' }}>Verificando sessão...</div>
      </div>
    );
  }

  if (!sessaoAtiva) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '48px' }}>❌</div>
        <div style={{ fontSize: '18px', color: '#666' }}>Sessão não encontrada</div>
      </div>
    );
  }

  return (
    <div style={{
      margin: 0,
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '15px 20px' : '15px 40px',
        borderBottom: '1px solid #ccc',
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        <div style={{ 
          fontSize: isMobile ? '24px' : '32px', 
          fontWeight: 'bold', 
          color: '#009245' 
        }}>
          🍽️ Fit In Box
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '15px' : '20px',
          flexDirection: isMobile ? 'column' : 'row',
          marginTop: isMobile ? '15px' : '0',
          width: isMobile ? '100%' : 'auto'
        }}>
          <div style={{ 
            textAlign: isMobile ? 'center' : 'right',
            width: isMobile ? '100%' : 'auto'
          }}>
            <div style={{
              fontWeight: 'bold',
              color: '#009245',
              fontSize: isMobile ? '14px' : '16px'
            }}>
              {sessaoAtiva.nomeEmpresa || sessaoAtiva.razaoSocial}
              {isAdmin && (
                <span style={{
                  backgroundColor: '#f38e3c',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  marginLeft: '8px',
                  fontWeight: 'bold'
                }}>
                  ADMIN
                </span>
              )}
            </div>
            <div style={{
              fontSize: isMobile ? '12px' : '14px',
              color: '#666'
            }}>
              CNPJ: {sessaoAtiva.cnpjFormatado || sessaoAtiva.cnpj}
            </div>
          </div>
          <button 
            onClick={handleLogout}
            disabled={loading}
            style={{
              padding: isMobile ? '8px 16px' : '10px 20px',
              borderRadius: '5px',
              color: 'white',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              border: 'none',
              backgroundColor: loading ? '#ccc' : '#dc3545',
              fontSize: isMobile ? '14px' : '16px',
              width: isMobile ? '100%' : 'auto',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '⏳ SAINDO...' : '🚪 SAIR'}
          </button>
        </div>
      </div>

      {/* Resto do componente permanece igual */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 100px)',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: isMobile ? '30px 25px' : '40px',
          borderRadius: '15px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '650px',
          textAlign: 'center'
        }}>
          <div style={{
            marginBottom: '30px'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px'
            }}>
              🎯
            </div>
            <h2 style={{
              color: '#009245',
              fontSize: isMobile ? '24px' : '28px',
              marginBottom: '10px',
              fontWeight: 'bold'
            }}>
              O que gostaria de fazer?
            </h2>
            <p style={{
              color: '#666',
              fontSize: isMobile ? '16px' : '18px',
              margin: 0
            }}>
              Escolha uma das opções abaixo para continuar
            </p>
          </div>
          
          {/* Resto das opções permanece igual... */}
          <div style={{
            margin: '30px 0',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            {/* Opção Fazer Pedido */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              padding: '20px',
              border: selectedOption === 'fazerPedido' ? '3px solid #009245' : '2px solid #eee',
              borderRadius: '12px',
              cursor: 'pointer',
              backgroundColor: selectedOption === 'fazerPedido' ? '#f0f9f0' : 'white',
              transition: 'all 0.3s ease',
              boxShadow: selectedOption === 'fazerPedido' ? '0 4px 12px rgba(0,146,69,0.2)' : '0 2px 4px rgba(0,0,0,0.05)'
            }}
            onClick={() => handleOptionChange('fazerPedido')}
            >
              <input 
                type="radio" 
                id="fazerPedido"
                name="opcao"
                checked={selectedOption === 'fazerPedido'}
                onChange={() => handleOptionChange('fazerPedido')}
                style={{
                  marginRight: '15px',
                  marginTop: '3px',
                  transform: 'scale(1.2)'
                }}
              />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                flex: 1
              }}>
                <div style={{
                  fontSize: '32px',
                  width: '50px',
                  textAlign: 'center'
                }}>
                  🛒
                </div>
                <div>
                  <label 
                    htmlFor="fazerPedido"
                    style={{
                      fontWeight: 'bold',
                      color: '#333',
                      cursor: 'pointer',
                      fontSize: isMobile ? '18px' : '20px',
                      marginBottom: '5px',
                      display: 'block'
                    }}
                  >
                    Quero realizar um pedido
                  </label>
                  <span style={{
                    color: '#666',
                    fontSize: isMobile ? '14px' : '16px',
                    lineHeight: '1.4'
                  }}>
                    Visualizar produtos disponíveis e fazer novos pedidos
                  </span>
                </div>
              </div>
            </div>
            
            {/* Opção Consultar Pedidos */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              padding: '20px',
              border: selectedOption === 'consultarPedidos' ? '3px solid #009245' : '2px solid #eee',
              borderRadius: '12px',
              cursor: 'pointer',
              backgroundColor: selectedOption === 'consultarPedidos' ? '#f0f9f0' : 'white',
              transition: 'all 0.3s ease',
              boxShadow: selectedOption === 'consultarPedidos' ? '0 4px 12px rgba(0,146,69,0.2)' : '0 2px 4px rgba(0,0,0,0.05)'
            }}
            onClick={() => handleOptionChange('consultarPedidos')}
            >
              <input 
                type="radio" 
                id="consultarPedidos"
                name="opcao"
                checked={selectedOption === 'consultarPedidos'}
                onChange={() => handleOptionChange('consultarPedidos')}
                style={{
                  marginRight: '15px',
                  marginTop: '3px',
                  transform: 'scale(1.2)'
                }}
              />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                flex: 1
              }}>
                <div style={{
                  fontSize: '32px',
                  width: '50px',
                  textAlign: 'center'
                }}>
                  📋
                </div>
                <div>
                  <label 
                    htmlFor="consultarPedidos"
                    style={{
                      fontWeight: 'bold',
                      color: '#333',
                      cursor: 'pointer',
                      fontSize: isMobile ? '18px' : '20px',
                      marginBottom: '5px',
                      display: 'block'
                    }}
                  >
                    Consultar Pedidos Realizados
                  </label>
                  <span style={{
                    color: '#666',
                    fontSize: isMobile ? '14px' : '16px',
                    lineHeight: '1.4'
                  }}>
                    Visualize seu histórico completo de pedidos e status
                  </span>
                </div>
              </div>
            </div>

            {/* Opção Admin (se aplicável) */}
            {isAdmin && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                padding: '20px',
                border: selectedOption === 'painelAdmin' ? '3px solid #f38e3c' : '2px solid #ffe4d6',
                borderRadius: '12px',
                cursor: 'pointer',
                backgroundColor: selectedOption === 'painelAdmin' ? '#fff4f0' : '#fef9f7',
                transition: 'all 0.3s ease',
                boxShadow: selectedOption === 'painelAdmin' ? '0 4px 12px rgba(243,142,60,0.3)' : '0 2px 4px rgba(243,142,60,0.1)',
                position: 'relative'
              }}
              onClick={() => handleOptionChange('painelAdmin')}
              >
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '15px',
                  backgroundColor: '#f38e3c',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  EXCLUSIVO
                </div>
                <input 
                  type="radio" 
                  id="painelAdmin"
                  name="opcao"
                  checked={selectedOption === 'painelAdmin'}
                  onChange={() => handleOptionChange('painelAdmin')}
                  style={{
                    marginRight: '15px',
                    marginTop: '3px',
                    transform: 'scale(1.2)'
                  }}
                />
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  flex: 1
                }}>
                  <div style={{
                    fontSize: '32px',
                    width: '50px',
                    textAlign: 'center'
                  }}>
                    ⚙️
                  </div>
                  <div>
                    <label 
                      htmlFor="painelAdmin"
                      style={{
                        fontWeight: 'bold',
                        color: '#333',
                        cursor: 'pointer',
                        fontSize: isMobile ? '18px' : '20px',
                        marginBottom: '5px',
                        display: 'block'
                      }}
                    >
                      Painel Administrativo
                    </label>
                    <span style={{
                      color: '#666',
                      fontSize: isMobile ? '14px' : '16px',
                      lineHeight: '1.4'
                    }}>
                      Gerenciar produtos, pedidos e empresas cadastradas
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <button 
            onClick={prosseguir}
            style={{
              backgroundColor: selectedOption === 'painelAdmin' ? '#f38e3c' : '#009245',
              color: 'white',
              padding: isMobile ? '16px 30px' : '18px 40px',
              width: '100%',
              border: 'none',
              borderRadius: '10px',
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '30px',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
          >
            {selectedOption === 'painelAdmin' ? '🔐 Acessar Painel Admin' : 'Continuar'}
          </button>

          <div style={{
            marginTop: '30px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '10px',
            fontSize: '14px',
            color: '#666',
            textAlign: 'center',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ marginBottom: '5px' }}>
              <strong>Sessão ativa para:</strong>
            </div>
            <div style={{ color: '#009245', fontWeight: 'bold' }}>
              {sessaoAtiva.nomeEmpresa || sessaoAtiva.razaoSocial}
            </div>
            {isAdmin && (
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: '#f38e3c',
                fontWeight: 'bold'
              }}>
                ⚙️ Conta com privilégios administrativos
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProsseguirPage;  