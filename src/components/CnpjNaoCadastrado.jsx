import React from 'react';

const CnpjNaoCadastrado = ({ onNavigate }) => {

  const voltarInicio = () => {
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
        <button 
          onClick={voltarInicio}
          style={{
            padding: '10px 20px',
            borderRadius: '5px',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            border: 'none',
            backgroundColor: '#009245'
          }}
        >
          VOLTAR
        </button>
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
          {/* Ícone de erro */}
          <div style={{
            fontSize: '80px',
            color: '#d80909',
            marginBottom: '20px'
          }}>
            ❌
          </div>
          
          <h2 style={{
            color: '#d80909',
            fontSize: '28px',
            marginBottom: '20px',
            fontWeight: 'bold'
          }}>
            CNPJ INVÁLIDO
          </h2>
          
          <p style={{
            color: '#666',
            fontSize: '16px',
            marginBottom: '30px',
            lineHeight: '1.5'
          }}>
            O CNPJ informado não é válido.
            <br />
            Verifique se os dados estão corretos e tente novamente.
          </p>

          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '5px',
            padding: '15px',
            marginBottom: '30px',
            color: '#856404'
          }}>
            <strong>💡 Dica:</strong> Certifique-se de que o CNPJ está no formato correto: XX.XXX.XXX/XXXX-XX
          </div>
          
          {/* Botões de ação */}
          <div style={{
            display: 'flex',
            gap: '15px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={voltarInicio}
              style={{
                backgroundColor: '#009245',
                color: 'white',
                padding: '15px 30px',
                border: 'none',
                borderRadius: '5px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                minWidth: '200px'
              }}
            >
              Tentar Novamente
            </button>
            
            <button 
              onClick={() => {
                const numeroWhatsApp = '5521964298123';
                const mensagem = '🍽️ Olá! Tenho dúvidas sobre o cadastro do meu CNPJ no sistema Fit In Box.';
                const url = `https://wa.me/55${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
                window.open(url, '_blank');
              }}
              style={{
                backgroundColor: '#25D366',
                color: 'white',
                padding: '15px 30px',
                border: 'none',
                borderRadius: '5px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                minWidth: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              📱 WhatsApp
            </button>
          </div>

          {/* Informações adicionais */}
          <div style={{
            marginTop: '40px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '5px',
            textAlign: 'left'
          }}>
            <h3 style={{
              color: '#009245',
              fontSize: '16px',
              marginBottom: '15px'
            }}>
              📞 Precisa de ajuda?
            </h3>
            <ul style={{
              color: '#666',
              fontSize: '14px',
              paddingLeft: '20px',
              lineHeight: '1.6'
            }}>
              <li>Verifique se o CNPJ está digitado corretamente</li>
              <li>Confirme se todos os dígitos estão presentes</li>
              <li>Use apenas números ou o formato XX.XXX.XXX/XXXX-XX</li>
              <li>Entre em contato via WhatsApp para suporte</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CnpjNaoCadastrado;
