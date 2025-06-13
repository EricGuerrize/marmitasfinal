import React, { useState, useEffect } from 'react';

const CarrinhoPage = ({ onNavigate, carrinho, atualizarQuantidade, removerItem, limparCarrinho, calcularQuantidadeTotal }) => {
  const [cnpjInfo, setCnpjInfo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [enderecoEntrega, setEnderecoEntrega] = useState('');

  useEffect(() => {
    // Recupera informações do sessionStorage
    const cnpj = sessionStorage.getItem('cnpj') || '';
    const empresa = sessionStorage.getItem('empresaInfo') || '';
    setCnpjInfo(`${empresa} - CNPJ: ${cnpj}`);
  }, []);

  const calcularSubtotal = () => {
    return carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
  };

  const calcularTaxaEntrega = () => {
    const subtotal = calcularSubtotal();
    return subtotal > 50 ? 0 : 5.00; // Frete grátis acima de R$ 50
  };

  const calcularTotal = () => {
    return calcularSubtotal() + calcularTaxaEntrega();
  };

  const finalizarPedido = () => {
    if (carrinho.length === 0) {
      alert('Carrinho está vazio!');
      return;
    }

    const quantidadeTotal = calcularQuantidadeTotal();
    if (quantidadeTotal < 30) {
      alert(`Pedido mínimo de 30 marmitas. Você tem ${quantidadeTotal} marmita(s). Adicione mais ${30 - quantidadeTotal} marmita(s).`);
      return;
    }

    if (!enderecoEntrega.trim()) {
      alert('Por favor, informe o endereço de entrega!');
      return;
    }

    // Salva dados do pedido
    const pedido = {
      itens: carrinho,
      subtotal: calcularSubtotal(),
      taxaEntrega: calcularTaxaEntrega(),
      total: calcularTotal(),
      observacoes,
      enderecoEntrega,
      data: new Date().toISOString(),
      numero: Math.floor(Math.random() * 10000) + 1000
    };

    sessionStorage.setItem('pedidoAtual', JSON.stringify(pedido));
    onNavigate('checkout');
  };

  const continuarComprando = () => {
    onNavigate('pedido-produtos');
  };

  const confirmarLimparCarrinho = () => {
    if (window.confirm('Tem certeza que deseja limpar o carrinho?')) {
      limparCarrinho();
    }
  };

  if (carrinho.length === 0) {
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
              onClick={continuarComprando}
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
              VOLTAR AOS PRODUTOS
            </button>
          </div>
        </div>

        {/* Carrinho Vazio */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 80px)',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '60px',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>🛒</div>
            <h2 style={{ color: '#666', marginBottom: '20px' }}>Seu carrinho está vazio</h2>
            <p style={{ color: '#999', marginBottom: '30px' }}>
              Adicione alguns produtos deliciosos para continuar!
            </p>
            <button
              onClick={continuarComprando}
              style={{
                backgroundColor: '#009245',
                color: 'white',
                border: 'none',
                padding: '15px 30px',
                borderRadius: '5px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Ver Produtos
            </button>
          </div>
        </div>
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
            onClick={continuarComprando}
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
            CONTINUAR COMPRANDO
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
        {/* Coluna Esquerda - Itens do Carrinho */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h1 style={{ color: '#009245', margin: 0 }}>
              🛒 Meu Carrinho ({calcularQuantidadeTotal()} marmitas)
            </h1>
            <button
              onClick={confirmarLimparCarrinho}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '8px 15px',
                borderRadius: '5px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Limpar Carrinho
            </button>
          </div>

          {/* Lista de Itens */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {carrinho.map(item => (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '10px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  display: 'flex',
                  gap: '15px',
                  alignItems: 'center'
                }}
              >
                <img
                  src={item.imagem}
                  alt={item.nome}
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'cover',
                    borderRadius: '5px'
                  }}
                />
                
                <div style={{ flex: 1 }}>
                  <h3 style={{ color: '#009245', margin: '0 0 5px 0' }}>{item.nome}</h3>
                  <p style={{ color: '#666', fontSize: '14px', margin: '0 0 10px 0' }}>
                    {item.descricao}
                  </p>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#009245' }}>
                    R$ {item.preco.toFixed(2)}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <button
                    onClick={() => atualizarQuantidade(item.id, item.quantidade - 1)}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    -
                  </button>
                  
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    minWidth: '30px',
                    textAlign: 'center'
                  }}>
                    {item.quantidade}
                  </span>
                  
                  <button
                    onClick={() => atualizarQuantidade(item.id, item.quantidade + 1)}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    +
                  </button>
                </div>

                <div style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#009245',
                  minWidth: '80px',
                  textAlign: 'right'
                }}>
                  R$ {(item.preco * item.quantidade).toFixed(2)}
                </div>

                <button
                  onClick={() => removerItem(item.id)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#dc3545',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '5px'
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {/* Endereço de Entrega */}
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginTop: '20px'
          }}>
            <h3 style={{ color: '#009245', marginBottom: '15px' }}>📍 Endereço de Entrega</h3>
            <textarea
              value={enderecoEntrega}
              onChange={(e) => setEnderecoEntrega(e.target.value)}
              placeholder="Digite o endereço completo para entrega..."
              style={{
                width: '100%',
                height: '80px',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px',
                resize: 'vertical'
              }}
              required
            />
          </div>

          {/* Observações */}
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginTop: '15px'
          }}>
            <h3 style={{ color: '#009245', marginBottom: '15px' }}>💬 Observações (opcional)</h3>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Alguma observação especial para seu pedido?"
              style={{
                width: '100%',
                height: '60px',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>
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
            <h2 style={{ color: '#009245', marginBottom: '20px' }}>📊 Resumo do Pedido</h2>
            
            {/* Aviso pedido mínimo */}
            <div style={{
              backgroundColor: calcularQuantidadeTotal() < 30 ? '#fff3cd' : '#d4edda',
              padding: '15px',
              borderRadius: '5px',
              fontSize: '14px',
              color: calcularQuantidadeTotal() < 30 ? '#856404' : '#155724',
              marginBottom: '20px',
              border: `1px solid ${calcularQuantidadeTotal() < 30 ? '#ffeaa7' : '#c3e6cb'}`
            }}>
              <strong>
                {calcularQuantidadeTotal() < 30 ? '⚠️' : '✅'} Pedido mínimo: 30 marmitas
              </strong>
              <br />
              Você tem: {calcularQuantidadeTotal()} marmita(s)
              {calcularQuantidadeTotal() < 30 && (
                <>
                  <br />
                  <strong>Faltam: {30 - calcularQuantidadeTotal()} marmita(s)</strong>
                </>
              )}
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '10px',
              fontSize: '16px'
            }}>
              <span>Subtotal:</span>
              <span>R$ {calcularSubtotal().toFixed(2)}</span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '15px',
              fontSize: '16px'
            }}>
              <span>Taxa de entrega:</span>
              <span style={{ color: calcularTaxaEntrega() === 0 ? '#28a745' : '#000' }}>
                {calcularTaxaEntrega() === 0 ? 'GRÁTIS' : `R$ ${calcularTaxaEntrega().toFixed(2)}`}
              </span>
            </div>

            {calcularSubtotal() < 50 && (
              <div style={{
                backgroundColor: '#fff3cd',
                padding: '10px',
                borderRadius: '5px',
                fontSize: '14px',
                color: '#856404',
                marginBottom: '15px'
              }}>
                💡 Frete grátis em pedidos acima de R$ 50,00
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
              <span>R$ {calcularTotal().toFixed(2)}</span>
            </div>
            
            <button
              onClick={finalizarPedido}
              disabled={calcularQuantidadeTotal() < 30}
              style={{
                backgroundColor: calcularQuantidadeTotal() < 30 ? '#ccc' : '#f38e3c',
                color: 'white',
                border: 'none',
                padding: '15px',
                width: '100%',
                borderRadius: '5px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: calcularQuantidadeTotal() < 30 ? 'not-allowed' : 'pointer',
                marginBottom: '10px',
                opacity: calcularQuantidadeTotal() < 30 ? 0.6 : 1
              }}
            >
              {calcularQuantidadeTotal() < 30 ? 'Pedido Mínimo: 30 Marmitas' : 'Finalizar Pedido'}
            </button>
            
            <button
              onClick={continuarComprando}
              style={{
                backgroundColor: 'transparent',
                color: '#009245',
                border: '2px solid #009245',
                padding: '12px',
                width: '100%',
                borderRadius: '5px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Continuar Comprando
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarrinhoPage;