import React, { useState, useEffect } from 'react';

const ProsseguirPage = ({ onNavigate }) => {
  const [selectedOption, setSelectedOption] = useState('fazerPedido');
  const [cnpjInfo, setCnpjInfo] = useState('');

  useEffect(() => {
    // Recupera informações do sessionStorage
    const cnpj = sessionStorage.getItem('cnpj') || '';
    const empresa = sessionStorage.getItem('empresaInfo') || '';
    setCnpjInfo(`${empresa} - CNPJ: ${cnpj}`);
    
    // Intercepta o botão voltar do navegador
    const handlePopState = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onNavigate('home');
      return false;
    };
    
    // Remove qualquer listener anterior
    window.removeEventListener('popstate', handlePopState);
    window.addEventListener('popstate', handlePopState);
    
    // Adiciona uma entrada no histórico para interceptar o botão voltar
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

  const handlePedidosClick = () => {
    onNavigate('home');
  };

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
        <img 
          style={{ height: '60px' }}
          src="/assets/logo.jpg" 
          alt="Logo Fit In Box"
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <span style={{
            fontWeight: 'bold',
            color: '#009245'
          }}>
            {cnpjInfo}
          </span>
          <button 
            onClick={handlePedidosClick}
            style={{
              padding: '10px 20px',
              borderRadius: '5px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: 'none',
              textDecoration: 'none',
              backgroundColor: '#009245'
            }}
          >
            PEDIDOS
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
          <h2 style={{
            color: '#757248',
            fontSize: '24px',
            marginBottom: '20px'
          }}>
            PROSSEGUIR
          </h2>
          
          <p style={{
            color: '#666',
            marginBottom: '30px'
          }}>
            Você Está para Entrar em uma Área Restrita exclusiva para seu CNPJ. O que Gostaria de Fazer?
          </p>
          
          {/* Options Container */}
          <div style={{
            margin: '20px 0',
            textAlign: 'left'
          }}>
            {/* Option 1 */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '15px'
            }}>
              <input 
                type="radio" 
                id="fazerPedido"
                name="opcao"
                checked={selectedOption === 'fazerPedido'}
                onChange={() => handleOptionChange('fazerPedido')}
                style={{
                  marginRight: '10px',
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
                    cursor: 'pointer'
                  }}
                  onClick={() => handleOptionChange('fazerPedido')}
                >
                  Quero realizar um pedido
                </label>
                <span style={{
                  color: '#666',
                  fontSize: '14px'
                }}>
                  Visualizar o que há de disponível para compras
                </span>
              </div>
            </div>
            
            {/* Option 2 */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '15px'
            }}>
              <input 
                type="radio" 
                id="consultarPedidos"
                name="opcao"
                checked={selectedOption === 'consultarPedidos'}
                onChange={() => handleOptionChange('consultarPedidos')}
                style={{
                  marginRight: '10px',
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
                    cursor: 'pointer'
                  }}
                  onClick={() => handleOptionChange('consultarPedidos')}
                >
                  Consultar Pedidos Realizados
                </label>
                <span style={{
                  color: '#666',
                  fontSize: '14px'
                }}>
                  Visualize seu Histórico Completo de Pedidos
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
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProsseguirPage;