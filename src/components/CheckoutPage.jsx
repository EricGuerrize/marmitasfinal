import React, { useState, useEffect } from 'react';

const CheckoutPage = ({ onNavigate, carrinho, calcularQuantidadeTotal }) => {
  const [cnpjInfo, setCnpjInfo] = useState('');
  const [pedidoAtual, setPedidoAtual] = useState(null);
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [dadosCartao, setDadosCartao] = useState({
    numero: '',
    nome: '',
    validade: '',
    cvv: ''
  });
  const [enderecoCobranca, setEnderecoCobranca] = useState('');
  const [processandoPedido, setProcessandoPedido] = useState(false);

  useEffect(() => {
    // Recupera informações do sessionStorage
    const cnpj = sessionStorage.getItem('cnpj') || '';
    const empresa = sessionStorage.getItem('empresaInfo') || '';
    setCnpjInfo(`${empresa} - CNPJ: ${cnpj}`);

    // Recupera dados do pedido
    const pedidoSalvo = sessionStorage.getItem('pedidoAtual');
    if (pedidoSalvo) {
      setPedidoAtual(JSON.parse(pedidoSalvo));
    } else {
      // Se não tem pedido, volta para o carrinho
      onNavigate('carrinho');
    }
    
    // Intercepta o botão voltar do navegador
    const handlePopState = (event) => {
      event.preventDefault();
      onNavigate('carrinho');
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Adiciona uma entrada no histórico para interceptar o botão voltar
    window.history.pushState(null, '', window.location.href);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onNavigate]);

  const handleCartaoChange = (campo, valor) => {
    if (campo === 'numero') {
      // Máscara para número do cartão
      valor = valor.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim();
      if (valor.length > 19) valor = valor.substring(0, 19);
    } else if (campo === 'validade') {
      // Máscara para validade MM/AA
      valor = valor.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
      if (valor.length > 5) valor = valor.substring(0, 5);
    } else if (campo === 'cvv') {
      // Apenas números para CVV
      valor = valor.replace(/\D/g, '');
      if (valor.length > 3) valor = valor.substring(0, 3);
    }

    setDadosCartao(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const validarFormulario = () => {
    if (formaPagamento === 'cartao') {
      if (!dadosCartao.numero || dadosCartao.numero.length < 19) {
        alert('Número do cartão inválido!');
        return false;
      }
      if (!dadosCartao.nome.trim()) {
        alert('Nome no cartão é obrigatório!');
        return false;
      }
      if (!dadosCartao.validade || dadosCartao.validade.length < 5) {
        alert('Validade do cartão inválida!');
        return false;
      }
      if (!dadosCartao.cvv || dadosCartao.cvv.length < 3) {
        alert('CVV inválido!');
        return false;
      }
      if (!enderecoCobranca.trim()) {
        alert('Endereço de cobrança é obrigatório para cartão!');
        return false;
      }
    }
    return true;
  };

  const finalizarPedido = async () => {
    if (!validarFormulario()) return;

    setProcessandoPedido(true);

    try {
      // Simula processamento do pagamento
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Cria dados do pedido final
      const pedidoFinal = {
        ...pedidoAtual,
        formaPagamento,
        dadosPagamento: formaPagamento === 'cartao' ? {
          numeroMascarado: dadosCartao.numero.replace(/\d(?=\d{4})/g, '*'),
          nome: dadosCartao.nome,
          enderecoCobranca
        } : null,
        status: 'confirmado',
        dataConfirmacao: new Date().toISOString(),
        previsaoEntrega: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 dias
      };

      // Salva pedido confirmado
      sessionStorage.setItem('pedidoConfirmado', JSON.stringify(pedidoFinal));
      
      // Limpa carrinho
      sessionStorage.removeItem('carrinho');
      sessionStorage.removeItem('pedidoAtual');

      // Vai para página de confirmação
      onNavigate('pedido-confirmado');

    } catch (error) {
      alert('Erro ao processar pagamento. Tente novamente.');
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
            color: '#009245',
            fontSize: '14px'
          }}>
            {cnpjInfo}
          </span>
          <button 
            onClick={voltarCarrinho}
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
            VOLTAR AO CARRINHO
          </button>
        </div>
      </div>

      {/* Container Principal */}
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '20px',
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '30px'
      }}>
        {/* Coluna Esquerda - Dados do Pagamento */}
        <div>
          <h1 style={{ color: '#009245', marginBottom: '20px' }}>
            💳 Finalizar Pedido
          </h1>

          {/* Forma de Pagamento */}
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h2 style={{ color: '#009245', marginBottom: '20px' }}>💰 Forma de Pagamento</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                padding: '15px',
                border: `2px solid ${formaPagamento === 'pix' ? '#009245' : '#ddd'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '10px',
                backgroundColor: formaPagamento === 'pix' ? '#f0f9f0' : 'white'
              }}>
                <input
                  type="radio"
                  name="pagamento"
                  value="pix"
                  checked={formaPagamento === 'pix'}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  style={{ marginRight: '10px' }}
                />
                <div>
                  <strong>PIX - Desconto de 5%</strong>
                  <br />
                  <small style={{ color: '#666' }}>Pagamento instantâneo via QR Code</small>
                </div>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                padding: '15px',
                border: `2px solid ${formaPagamento === 'cartao' ? '#009245' : '#ddd'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: formaPagamento === 'cartao' ? '#f0f9f0' : 'white'
              }}>
                <input
                  type="radio"
                  name="pagamento"
                  value="cartao"
                  checked={formaPagamento === 'cartao'}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  style={{ marginRight: '10px' }}
                />
                <div>
                  <strong>Cartão de Crédito</strong>
                  <br />
                  <small style={{ color: '#666' }}>Visa, Mastercard, Elo</small>
                </div>
              </label>
            </div>
          </div>

          {/* Dados do Cartão (se cartão selecionado) */}
          {formaPagamento === 'cartao' && (
            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: '#009245', marginBottom: '20px' }}>💳 Dados do Cartão</h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '15px',
                marginBottom: '15px'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Número do Cartão
                  </label>
                  <input
                    type="text"
                    value={dadosCartao.numero}
                    onChange={(e) => handleCartaoChange('numero', e.target.value)}
                    placeholder="0000 0000 0000 0000"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    CVV
                  </label>
                  <input
                    type="text"
                    value={dadosCartao.cvv}
                    onChange={(e) => handleCartaoChange('cvv', e.target.value)}
                    placeholder="123"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '15px',
                marginBottom: '15px'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Nome no Cartão
                  </label>
                  <input
                    type="text"
                    value={dadosCartao.nome}
                    onChange={(e) => handleCartaoChange('nome', e.target.value)}
                    placeholder="Nome completo"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Validade
                  </label>
                  <input
                    type="text"
                    value={dadosCartao.validade}
                    onChange={(e) => handleCartaoChange('validade', e.target.value)}
                    placeholder="MM/AA"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Endereço de Cobrança
                </label>
                <textarea
                  value={enderecoCobranca}
                  onChange={(e) => setEnderecoCobranca(e.target.value)}
                  placeholder="Endereço completo para cobrança..."
                  style={{
                    width: '100%',
                    height: '80px',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          )}

          {/* PIX (se PIX selecionado) */}
          {formaPagamento === 'pix' && (
            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <h3 style={{ color: '#009245', marginBottom: '20px' }}>📱 Pagamento PIX</h3>
              
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '15px'
              }}>
                <div style={{
                  width: '150px',
                  height: '150px',
                  backgroundColor: '#fff',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 15px auto',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  QR CODE PIX
                  <br />
                  (Simulação)
                </div>
                
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                  Escaneie o QR Code com seu banco ou copie o código PIX
                </p>
              </div>
              
              <div style={{
                backgroundColor: '#fff3cd',
                padding: '15px',
                borderRadius: '5px',
                fontSize: '14px',
                color: '#856404'
              }}>
                💡 <strong>Desconto de 5%</strong> aplicado automaticamente no PIX!
              </div>
            </div>
          )}
        </div>

        {/* Coluna Direita - Resumo do Pedido */}
        <div>
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            position: 'sticky',
            top: '20px'
          }}>
            <h2 style={{ color: '#009245', marginBottom: '20px' }}>📊 Resumo Final</h2>
            
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

            {formaPagamento === 'pix' && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '10px',
                fontSize: '16px',
                color: '#28a745'
              }}>
                <span>Desconto PIX (5%):</span>
                <span>- R$ {(pedidoAtual.total * 0.05).toFixed(2)}</span>
              </div>
            )}
            
            <hr style={{ margin: '15px 0', border: '1px solid #eee' }} />
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#009245',
              marginBottom: '25px'
            }}>
              <span>Total:</span>
              <span>
                R$ {formaPagamento === 'pix' 
                  ? (pedidoAtual.total * 0.95).toFixed(2) 
                  : pedidoAtual.total.toFixed(2)
                }
              </span>
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
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: processandoPedido ? 'wait' : 'pointer',
                marginBottom: '10px',
                opacity: processandoPedido ? 0.6 : 1
              }}
            >
              {processandoPedido ? '⏳ Processando...' : '🚀 Confirmar Pedido'}
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

export default CheckoutPage;