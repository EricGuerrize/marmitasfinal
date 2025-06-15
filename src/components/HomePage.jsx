import React, { useState, useEffect } from 'react';

const HomePage = ({ onNavigate }) => {
  const [cnpj, setCnpj] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Detecta se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Função para validar formato do CNPJ
  const validarFormatoCnpj = (cnpj) => {
    // Remove caracteres especiais
    const numeros = cnpj.replace(/\D/g, '');
    
    // Verifica se tem 14 dígitos
    if (numeros.length !== 14) {
      return false;
    }
    
    // Verifica se não são todos números iguais
    if (/^(\d)\1+$/.test(numeros)) {
      return false;
    }
    
    // Validação básica do algoritmo do CNPJ
    let soma = 0;
    let peso = 2;
    
    // Primeiro dígito verificador
    for (let i = 11; i >= 0; i--) {
      soma += parseInt(numeros[i]) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    
    let resto = soma % 11;
    let digito1 = resto < 2 ? 0 : 11 - resto;
    
    if (parseInt(numeros[12]) !== digito1) {
      return false;
    }
    
    // Segundo dígito verificador
    soma = 0;
    peso = 2;
    
    for (let i = 12; i >= 0; i--) {
      soma += parseInt(numeros[i]) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    
    resto = soma % 11;
    let digito2 = resto < 2 ? 0 : 11 - resto;
    
    return parseInt(numeros[13]) === digito2;
  };

  const handleCnpjChange = (e) => {
    const maskedValue = applyCnpjMask(e.target.value);
    setCnpj(maskedValue);
  };

  const validarCnpj = () => {
    if (!cnpj.trim()) {
      alert('Por favor, informe o CNPJ');
      return;
    }
    
    if (!validarFormatoCnpj(cnpj)) {
      alert('CNPJ inválido! Verifique os dados e tente novamente.');
      return;
    }
    
    // Gera um nome de empresa baseado no CNPJ para demonstração
    const empresaNome = `Empresa ${cnpj.substring(0, 8)}`;
    
    // Salva CNPJ para usar nas outras páginas
    sessionStorage.setItem('cnpj', cnpj);
    sessionStorage.setItem('empresaInfo', empresaNome);
    onNavigate('prosseguir');
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
        padding: isMobile ? '10px 15px' : '10px 20px',
        backgroundColor: 'white'
      }}>
        <img 
          style={{ 
            height: isMobile ? '50px' : '60px',
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
          Informe seu CNPJ para ter acesso à sua área exclusiva
        </p>

        <div style={{
          margin: '30px auto',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          width: isMobile ? '95%' : '80%',
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
              color: '#000',
              borderBottom: isMobile ? '1px solid #eee' : 'none'
            }}
          />
          <button 
            onClick={validarCnpj}
            style={{
              backgroundColor: '#f38e3c',
              border: 'none',
              padding: isMobile ? '15px' : '15px 30px',
              color: 'white',
              fontSize: '1em',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ACESSAR
          </button>
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
          💡 <strong>Para teste:</strong> Use qualquer CNPJ válido (ex: 11.222.333/0001-81)
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
          Informações
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
            width: isMobile ? '100%' : '250px',
            maxWidth: isMobile ? '300px' : '250px',
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
            width: isMobile ? '100%' : '250px',
            maxWidth: isMobile ? '300px' : '250px',
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
              É Prático e Seguro
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