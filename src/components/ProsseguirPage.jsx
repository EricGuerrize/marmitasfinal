import React, { useState, useEffect } from 'react';
import { authSupabaseService } from '../services/authSupabaseService';

const ProsseguirPage = ({ onNavigate }) => {
  const [selectedOption, setSelectedOption] = useState('fazerPedido');
  const [sessaoAtiva, setSessaoAtiva] = useState(null);

  useEffect(() => {
    // Verifica se tem sessão ativa
    const sessao = authSupabaseService.verificarSessao();
    if (!sessao) {
      // Não está logado, volta para home
      alert('Sessão expirada. Faça login novamente.');
      onNavigate('home');
      return;
    }
    
    setSessaoAtiva(sessao);
    
    // Intercepta o botão voltar do navegador
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
    } else {
      onNavigate('consultar-pedido');
    }
  };

  const handleLogout = () => {
    if (window.confirm('Tem certeza que deseja sair?')) {
      authSupabaseService.logout();
      onNavigate('home');
    }
  };

  if (!sessaoAtiva) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        Verificando sessão...
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
      {/* Header */}
      <div style={{
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 40px',
        borderBottom: '1px solid #ccc'
      }}>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#009245' }}>
          🍽️ Fit In Box
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontWeight: 'bold',
              color: '#009245',
              fontSize: '14px'
            }}>
              Área Restrita
            </div>
            <div style={{
              fontSize: '12px',
              color: '#666'
            }}>
              Acesso autorizado
            </div>
          </div>
          <button 
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              borderRadius: '5px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: '#dc3545',
              fontSize: '14px'
            }}
          >
            🚪 SAIR
          </button>
        </div>
      </div>

      {/* Container */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 80px)',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <h3 style={{
            color: '#757248',
            fontSize: '20px',
            marginBottom: '20px'
          }}>
            O que gostaria de fazer?
          </h3>
          
          {/* Options Container */}
          <div style={{
            margin: '20px 0',
            textAlign: 'left'
          }}>
            {/* Option 1 */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '20px',
              padding: '15px',
              border: selectedOption === 'fazerPedido' ? '2px solid #009245' : '2px solid #eee',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: selectedOption === 'fazerPedido' ? '#f0f9f0' : 'white'
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
                  marginTop: '3px'
                }}
              />
              <div style={{
                display: 'flex',
                flexDirection: 'column'
              }}>
                <label 
                  htmlFor="fazerPedido"
                  style={{
                    fontWeight: 'bold',
                    color: '#333',
                    cursor: 'pointer',
                    fontSize: '16px',
                    marginBottom: '5px'
                  }}
                >
                  🛒 Quero realizar um pedido
                </label>
                <span style={{
                  color: '#666',
                  fontSize: '14px'
                }}>
                  Visualizar produtos disponíveis e fazer pedidos
                </span>
              </div>
            </div>
            
            {/* Option 2 */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '20px',
              padding: '15px',
              border: selectedOption === 'consultarPedidos' ? '2px solid #009245' : '2px solid #eee',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: selectedOption === 'consultarPedidos' ? '#f0f9f0' : 'white'
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
                  marginTop: '3px'
                }}
              />
              <div style={{
                display: 'flex',
                flexDirection: 'column'
              }}>
                <label 
                  htmlFor="consultarPedidos"
                  style={{
                    fontWeight: 'bold',
                    color: '#333',
                    cursor: 'pointer',
                    fontSize: '16px',
                    marginBottom: '5px'
                  }}
                >
                  📋 Consultar Pedidos Realizados
                </label>
                <span style={{
                  color: '#666',
                  fontSize: '14px'
                }}>
                  Visualize seu histórico completo de pedidos
                </span>
              </div>
            </div>
          </div>
          
          {/* Continue Button */}
          <button 
            onClick={prosseguir}
            style={{
              backgroundColor: '#d80909',
              color: 'white',
              padding: '15px',
              width: '100%',
              border: 'none',
              borderRadius: '5px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Continuar
          </button>

          {/* Informações da Sessão - versão simplificada */}
          <div style={{
            marginTop: '30px',
            padding: '10px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#666',
            textAlign: 'center'
          }}>
            <div>
              Sessão ativa
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProsseguirPage;