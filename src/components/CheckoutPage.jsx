import React, { useState, useEffect } from 'react';
import { useWindowSize } from '../hooks/useWindowSize';
import { NotificationProvider, useNotification } from './NotificationSystem';
import LogoComponent from './LogoComponent';

// ─── Spinner CSS ──────────────────────────────────────────────────────────────
const spinnerStyle = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const Spinner = () => (
  <span style={{
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.4)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    verticalAlign: 'middle',
    marginRight: '8px'
  }} />
);

// ─── Inner component ──────────────────────────────────────────────────────────
const CheckoutPageInner = ({ onNavigate, carrinho, calcularQuantidadeTotal }) => {
  const { error } = useNotification();
  const [cnpjInfo, setCnpjInfo] = useState('');
  const [pedidoAtual, setPedidoAtual] = useState(null);
  const [processandoPedido, setProcessandoPedido] = useState(false);
  const { isMobile } = useWindowSize();

  useEffect(() => {
    const cnpj = sessionStorage.getItem('cnpj') || '';
    const empresa = sessionStorage.getItem('empresaInfo') || '';
    setCnpjInfo(`${empresa} - CNPJ: ${cnpj}`);

    const pedidoSalvo = sessionStorage.getItem('pedidoAtual');
    if (pedidoSalvo) {
      setPedidoAtual(JSON.parse(pedidoSalvo));
    } else {
      onNavigate('carrinho');
    }

    const handlePopState = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onNavigate('carrinho');
      return false;
    };

    window.removeEventListener('popstate', handlePopState);
    window.addEventListener('popstate', handlePopState);
    window.history.pushState({ page: 'checkout' }, '', window.location.pathname);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onNavigate]);

  const finalizarPedido = async () => {
    setProcessandoPedido(true);

    try {
      const pedidoFinal = {
        ...pedidoAtual,
        formaPagamento: 'pix',
        dadosPagamento: null,
        status: 'confirmado',
        dataConfirmacao: new Date().toISOString(),
        previsaoEntrega: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      };

      sessionStorage.setItem('pedidoConfirmado', JSON.stringify(pedidoFinal));
      sessionStorage.removeItem('carrinho');
      sessionStorage.removeItem('pedidoAtual');

      onNavigate('pedido-confirmado');

    } catch (err) {
      error('Erro ao processar o pedido. Tente novamente.');
    } finally {
      setProcessandoPedido(false);
    }
  };

  const voltarCarrinho = () => {
    onNavigate('carrinho');
  };

  if (!pedidoAtual) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        Carregando...
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
      <style>{spinnerStyle}</style>

      {/* Header */}
      <div style={{
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '10px 15px' : '10px 40px',
        borderBottom: '1px solid #ccc',
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        <LogoComponent size={isMobile ? 'small' : 'medium'} showText={true} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '10px' : '20px',
          flexDirection: isMobile ? 'column' : 'row',
          marginTop: isMobile ? '10px' : '0',
          width: isMobile ? '100%' : 'auto'
        }}>
          <span style={{
            fontWeight: 'bold',
            color: '#009245',
            fontSize: isMobile ? '12px' : '14px',
            textAlign: 'center'
          }}>
            {cnpjInfo}
          </span>
          <button
            onClick={voltarCarrinho}
            style={{
              padding: isMobile ? '8px 15px' : '10px 20px',
              borderRadius: '5px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: '#009245',
              fontSize: isMobile ? '14px' : '16px',
              width: isMobile ? '100%' : 'auto'
            }}
          >
            VOLTAR AO CARRINHO
          </button>
        </div>
      </div>

      {/* Container Principal */}
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: isMobile ? '10px' : '20px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
        gap: isMobile ? '20px' : '30px'
      }}>
        {/* Coluna Esquerda */}
        <div>
          <h1 style={{
            color: '#009245',
            marginBottom: '20px',
            fontSize: isMobile ? '20px' : '24px'
          }}>
            💳 Finalizar Pedido
          </h1>

          {/* Card PIX informativo */}
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '20px' : '25px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📱</div>
            <h3 style={{ color: '#009245', marginBottom: '8px', fontSize: isMobile ? '16px' : '18px' }}>
              Pagamento via PIX
            </h3>
            <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
              Ao confirmar, você receberá as instruções de pagamento via WhatsApp.
            </p>
          </div>
        </div>

        {/* Coluna Direita - Resumo */}
        <div>
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '20px' : '25px',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            position: isMobile ? 'static' : 'sticky',
            top: isMobile ? 'auto' : '20px'
          }}>
            <h2 style={{
              color: '#009245',
              marginBottom: '20px',
              fontSize: isMobile ? '18px' : '20px'
            }}>
              📊 Resumo Final
            </h2>

            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '5px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                <strong>Pedido #{pedidoAtual.numero}</strong>
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                {calcularQuantidadeTotal()} marmitas
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '10px',
              fontSize: '16px'
            }}>
              <span>Subtotal:</span>
              <span>R$ {pedidoAtual.subtotal.toFixed(2)}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '10px',
              fontSize: '16px'
            }}>
              <span>Taxa de entrega:</span>
              <span style={{ color: pedidoAtual.taxaEntrega === 0 ? '#28a745' : '#000' }}>
                {pedidoAtual.taxaEntrega === 0 ? 'GRÁTIS' : `R$ ${pedidoAtual.taxaEntrega.toFixed(2)}`}
              </span>
            </div>

            <hr style={{ margin: '15px 0', border: '1px solid #eee' }} />

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: 'bold',
              color: '#009245',
              marginBottom: '25px'
            }}>
              <span>Total:</span>
              <span>R$ {pedidoAtual.total.toFixed(2)}</span>
            </div>

            <button
              onClick={finalizarPedido}
              disabled={processandoPedido}
              style={{
                backgroundColor: processandoPedido ? '#ccc' : '#f38e3c',
                color: 'white',
                border: 'none',
                padding: '15px',
                width: '100%',
                borderRadius: '5px',
                fontSize: isMobile ? '16px' : '18px',
                fontWeight: 'bold',
                cursor: processandoPedido ? 'wait' : 'pointer',
                marginBottom: '10px',
                opacity: processandoPedido ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {processandoPedido ? (
                <>
                  <Spinner />
                  Processando...
                </>
              ) : (
                '🚀 Confirmar Pedido'
              )}
            </button>

            <button
              onClick={voltarCarrinho}
              disabled={processandoPedido}
              style={{
                backgroundColor: 'transparent',
                color: '#009245',
                border: '2px solid #009245',
                padding: '12px',
                width: '100%',
                borderRadius: '5px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: processandoPedido ? 'not-allowed' : 'pointer',
                opacity: processandoPedido ? 0.5 : 1
              }}
            >
              Voltar ao Carrinho
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Wrapper com NotificationProvider ────────────────────────────────────────
const CheckoutPage = ({ onNavigate, carrinho, calcularQuantidadeTotal }) => (
  <NotificationProvider>
    <CheckoutPageInner
      onNavigate={onNavigate}
      carrinho={carrinho}
      calcularQuantidadeTotal={calcularQuantidadeTotal}
    />
  </NotificationProvider>
);

export default CheckoutPage;
