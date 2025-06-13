import React, { useState } from 'react';

const HomePage = ({ onNavigate }) => {
  const [cnpj, setCnpj] = useState('');

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

  const validarCnpj = () => {
    const cnpjsValidos = ["05.336.475/0001-77", "11.111.111/0001-11", "22.222.222/0001-22"];
    
    if (!cnpj.trim()) {
      alert('Por favor, informe o CNPJ');
      return;
    }
    
    if (cnpjsValidos.includes(cnpj)) {
      // Salva CNPJ para usar nas outras páginas
      sessionStorage.setItem('cnpj', cnpj);
      sessionStorage.setItem('empresaInfo', 'H Azevedo de Abreu refeições saudáveis');
      onNavigate('prosseguir');
    } else {
      onNavigate('cnpj-nao-cadastrado');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      validarCnpj();
    }
  };

  const handleMeusPedidos = () => {
    validarCnpj();
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
        padding: '10px 20px',
        backgroundColor: 'white'
      }}>
        <img 
          style={{ 
            height: '60px',
            cursor: 'pointer'
          }}
          src="/assets/logo.jpg" 
          alt="Logo Fit In Box"
          onClick={handleLogoClick}
          title="Clique 3 vezes para acessar o admin"
        />
        <button 
          onClick={handleMeusPedidos}
          style={{
            backgroundColor: '#f38e3c',
            border: 'none',
            padding: '10px 20px',
            color: 'white',
            fontWeight: 'bold',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          MEUS PEDIDOS
        </button>
      </header>

      {/* Hero Section */}
      <section style={{
        textAlign: 'center',
        padding: '40px 20px'
      }}>
        <h1 style={{
          fontSize: '2.5em',
          fontWeight: 'normal',
          margin: 0
        }}>
          Sua <strong>Alimentação</strong> <br /> 
          <strong>Nosso</strong> Compromisso
        </h1>
        <p style={{
          marginTop: '20px',
          fontSize: '1.2em'
        }}>
          ÁREA DO FORNECEDOR
        </p>
        <p style={{
          fontSize: '1.2em'
        }}>
          Informe seu CNPJ para ter acesso à sua área exclusiva
        </p>

        <div style={{
          margin: '30px auto',
          display: 'flex',
          width: '80%',
          maxWidth: '700px',
          backgroundColor: 'white',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <input 
            type="text"
            value={cnpj}
            onChange={handleCnpjChange}
            onKeyPress={handleKeyPress}
            placeholder="INFORME O CNPJ"
            maxLength="18"
            style={{
              flex: 1,
              border: 'none',
              padding: '15px',
              fontSize: '1em',
              outline: 'none',
              color: '#000'
            }}
          />
          <button 
            onClick={validarCnpj}
            style={{
              backgroundColor: '#f38e3c',
              border: 'none',
              padding: '15px 30px',
              color: 'white',
              fontSize: '1em',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ACESSAR
          </button>
        </div>
      </section>

      {/* Info Section */}
      <section style={{
        padding: '40px 20px',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '1.8em',
          marginBottom: '30px'
        }}>
          Informações
        </h2>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{
            width: '250px',
            backgroundColor: '#2f6e4a',
            borderRadius: '15px',
            padding: '15px',
            textAlign: 'left',
            color: 'white'
          }}>
            <img 
              src="https://cdn-icons-png.freepik.com/256/7891/7891770.png?semt=ais_hybrid" 
              alt="Individual"
              style={{
                width: '100%',
                borderRadius: '10px'
              }}
            />
            <h3 style={{
              marginTop: '10px',
              fontSize: '1.1em'
            }}>
              Cadastre-se
            </h3>
            <p style={{
              fontSize: '0.9em'
            }}>
              para realizar pedidos
            </p>
          </div>

          <div style={{
            width: '250px',
            backgroundColor: '#2f6e4a',
            borderRadius: '15px',
            padding: '15px',
            textAlign: 'left',
            color: 'white'
          }}>
            <img 
              src="https://png.pngtree.com/png-vector/20200417/ourmid/pngtree-shopping-on-mobile-png-image_2189444.jpg" 
              alt="Empresarial"
              style={{
                width: '100%',
                borderRadius: '10px'
              }}
            />
            <h3 style={{
              marginTop: '10px',
              fontSize: '1.1em'
            }}>
              Consulte seu CNPJ
            </h3>
            <p style={{
              fontSize: '0.9em'
            }}>
              Visualize Produtos Disponiveis para sua Empresa
            </p>
          </div>

          <div style={{
            width: '250px',
            backgroundColor: '#2f6e4a',
            borderRadius: '15px',
            padding: '15px',
            textAlign: 'left',
            color: 'white'
          }}>
            <img 
              src="https://img.lovepik.com/png/20231112/cheap-clipart-man-with-glasses-is-holding-a-grocery-shopping_566111_wh1200.png" 
              alt="Fornecedores"
              style={{
                width: '100%',
                borderRadius: '10px'
              }}
            />
            <h3 style={{
              marginTop: '10px',
              fontSize: '1.1em'
            }}>
              Faça seu Pedido
            </h3>
            <p style={{
              fontSize: '0.9em'
            }}>
              E Prático e Seguro
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;