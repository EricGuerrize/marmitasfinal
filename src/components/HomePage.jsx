import React, { useState, useEffect } from 'react';
import { cnpjService } from '../services/cnpjService';

const HomePage = ({ onNavigate }) => {
  const [cnpj, setCnpj] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [consultandoCnpj, setConsultandoCnpj] = useState(false);
  const [dadosEmpresa, setDadosEmpresa] = useState(null);
  const [erroConsulta, setErroConsulta] = useState('');

  // Detecta se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCnpjChange = (e) => {
    const maskedValue = cnpjService.aplicarMascaraCnpj(e.target.value);
    setCnpj(maskedValue);
    
    // Limpa dados da empresa quando o CNPJ é alterado
    if (dadosEmpresa) {
      setDadosEmpresa(null);
      setErroConsulta('');
    }
  };

  // Consulta CNPJ automaticamente quando completo
  useEffect(() => {
    const consultarCnpjAutomatico = async () => {
      const cnpjLimpo = cnpj.replace(/\D/g, '');
      
      // Se o CNPJ está completo (14 dígitos)
      if (cnpjLimpo.length === 14) {
        // Primeiro verifica se é válido
        if (!cnpjService.validarCnpj(cnpjLimpo)) {
          setErroConsulta('CNPJ inválido');
          setDadosEmpresa(null);
          return;
        }

        // Verifica se já tem na base local
        const empresaLocal = cnpjService.buscarEmpresaLocal(cnpjLimpo);
        if (empresaLocal) {
          setDadosEmpresa(empresaLocal);
          setErroConsulta('');
          return;
        }

        // Consulta na API
        setConsultandoCnpj(true);
        setErroConsulta('');
        
        try {
          const resultado = await cnpjService.consultarCnpj(cnpjLimpo);
          
          if (resultado.success) {
            setDadosEmpresa(resultado.data);
            setErroConsulta('');
            
            // Salva na base local para próximas consultas
            cnpjService.salvarEmpresaLocal(cnpjLimpo, resultado.data);
          } else {
            setErroConsulta(resultado.error);
            setDadosEmpresa(null);
          }
        } catch (error) {
          setErroConsulta('Erro ao consultar CNPJ. Tente novamente.');
          setDadosEmpresa(null);
        } finally {
          setConsultandoCnpj(false);
        }
      }
    };

    // Delay para evitar muitas consultas durante a digitação
    const timeoutId = setTimeout(consultarCnpjAutomatico, 500);
    
    return () => clearTimeout(timeoutId);
  }, [cnpj]);

  const validarCnpj = () => {
    if (!cnpj.trim()) {
      alert('Por favor, informe o CNPJ');
      return;
    }
    
    if (!cnpjService.validarCnpj(cnpj)) {
      alert('CNPJ inválido! Verifique os dados e tente novamente.');
      return;
    }

    if (erroConsulta) {
      // Se houve erro na consulta, pergunta se quer continuar mesmo assim
      const continuar = window.confirm(
        `Erro ao consultar CNPJ: ${erroConsulta}\n\n` +
        'Deseja continuar mesmo assim? O sistema funcionará normalmente, mas sem os dados da empresa.'
      );
      
      if (!continuar) return;
    }
    
    // Salva CNPJ e dados da empresa (se encontrados)
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    const nomeEmpresa = dadosEmpresa ? 
      (dadosEmpresa.nomeFantasia || dadosEmpresa.razaoSocial || `Empresa ${cnpj.substring(0, 8)}`) :
      `Empresa ${cnpj.substring(0, 8)}`;
    
    sessionStorage.setItem('cnpj', cnpj);
    sessionStorage.setItem('empresaInfo', nomeEmpresa);
    
    if (dadosEmpresa) {
      sessionStorage.setItem('dadosEmpresa', JSON.stringify(dadosEmpresa));
    }
    
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
            disabled={consultandoCnpj}
            style={{
              backgroundColor: consultandoCnpj ? '#ccc' : '#f38e3c',
              border: 'none',
              padding: isMobile ? '15px' : '15px 30px',
              color: 'white',
              fontSize: '1em',
              fontWeight: 'bold',
              cursor: consultandoCnpj ? 'wait' : 'pointer',
              opacity: consultandoCnpj ? 0.7 : 1
            }}
          >
            {consultandoCnpj ? 'CONSULTANDO...' : 'ACESSAR'}
          </button>
        </div>

        {/* Status da Consulta CNPJ */}
        {consultandoCnpj && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            padding: '15px',
            borderRadius: '8px',
            margin: '20px auto',
            maxWidth: '600px',
            fontSize: '14px'
          }}>
            🔍 <strong>Consultando CNPJ...</strong> Aguarde um momento.
          </div>
        )}

        {/* Dados da Empresa Encontrados */}
        {dadosEmpresa && !consultandoCnpj && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: '#333',
            padding: '20px',
            borderRadius: '8px',
            margin: '20px auto',
            maxWidth: '600px',
            textAlign: 'left',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '15px',
              color: '#28a745'
            }}>
              <span style={{ fontSize: '24px', marginRight: '10px' }}>✅</span>
              <strong style={{ fontSize: '16px' }}>Empresa encontrada!</strong>
            </div>
            
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Razão Social:</strong> {dadosEmpresa.razaoSocial}
              </div>
              
              {dadosEmpresa.nomeFantasia && dadosEmpresa.nomeFantasia !== dadosEmpresa.razaoSocial && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>Nome Fantasia:</strong> {dadosEmpresa.nomeFantasia}
                </div>
              )}
              
              <div style={{ marginBottom: '8px' }}>
                <strong>CNPJ:</strong> {dadosEmpresa.cnpj || cnpj}
              </div>
              
              {dadosEmpresa.situacao && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>Situação:</strong> {dadosEmpresa.situacao}
                </div>
              )}
              
              {dadosEmpresa.atividade && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>Atividade:</strong> {dadosEmpresa.atividade}
                </div>
              )}
              
              {dadosEmpresa.municipio && dadosEmpresa.uf && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>Localização:</strong> {dadosEmpresa.municipio}/{dadosEmpresa.uf}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Erro na Consulta */}
        {erroConsulta && !consultandoCnpj && (
          <div style={{
            backgroundColor: 'rgba(220, 53, 69, 0.9)',
            padding: '15px',
            borderRadius: '8px',
            margin: '20px auto',
            maxWidth: '600px',
            fontSize: '14px'
          }}>
            ⚠️ <strong>Atenção:</strong> {erroConsulta}
            <br />
            <small style={{ opacity: 0.9 }}>
              Você pode continuar mesmo assim. O sistema funcionará normalmente.
            </small>
          </div>
        )}

        {/* Dica para teste */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          padding: '15px',
          borderRadius: '8px',
          margin: '20px auto',
          maxWidth: '600px',
          fontSize: '14px'
        }}>
          💡 <strong>Para teste:</strong> Use CNPJs reais (ex: 11.222.333/0001-81) ou qualquer CNPJ válido
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
              Consulta Automática
            </h3>
            <p style={{
              fontSize: '0.9em'
            }}>
              Seus dados são consultados automaticamente via CNPJ
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
              Acesso Personalizado
            </h3>
            <p style={{
              fontSize: '0.9em'
            }}>
              Visualize produtos disponíveis para sua empresa
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