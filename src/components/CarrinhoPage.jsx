import React, { useState, useEffect } from 'react';
import { useCep } from '../hooks/useCep';
import { useNotification } from './NotificationSystem';

const CarrinhoPage = ({ onNavigate, carrinho, atualizarQuantidade, removerItem, limparCarrinho, calcularQuantidadeTotal }) => {
  const [cnpjInfo, setCnpjInfo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  
  // Hook personalizado para CEP
  const { 
    endereco, 
    loading: buscandoCep, 
    error: erroCep,
    atualizarCampo,
    validarEndereco,
    formatarEnderecoCompleto
  } = useCep();

  // Hook de notificações
  const { success, error: showError } = useNotification();

  // Detecta se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Recupera informações do sessionStorage
    const cnpj = sessionStorage.getItem('cnpj') || '';
    const empresa = sessionStorage.getItem('empresaInfo') || '';
    setCnpjInfo(`${empresa} - CNPJ: ${cnpj}`);
    
    // Intercepta o botão voltar do navegador
    const handlePopState = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onNavigate('pedido-produtos');
      return false;
    };
    
    window.removeEventListener('popstate', handlePopState);
    window.addEventListener('popstate', handlePopState);
    window.history.pushState({ page: 'carrinho' }, '', window.location.pathname);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onNavigate]);

  // Mostra notificação quando CEP é encontrado
  useEffect(() => {
    if (endereco.cidade && endereco.rua && !buscandoCep) {
      success('Endereço encontrado! Verifique se está correto.', 3000);
    }
  }, [endereco.cidade, endereco.rua, buscandoCep, success]);

  // Mostra erro de CEP
  useEffect(() => {
    if (erroCep) {
      showError(`Erro no CEP: ${erroCep}`);
    }
  }, [erroCep, showError]);

  const calcularSubtotal = () => {
    return carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
  };

  const calcularTaxaEntrega = () => {
    const subtotal = calcularSubtotal();
    return subtotal > 50 ? 0 : 5.00;
  };

  const calcularTotal = () => {
    return calcularSubtotal() + calcularTaxaEntrega();
  };

  const finalizarPedido = () => {
    if (carrinho.length === 0) {
      showError('Carrinho está vazio!');
      return;
    }

    const quantidadeTotal = calcularQuantidadeTotal();
    if (quantidadeTotal < 30) {
      showError(`Pedido mínimo de 30 marmitas. Você tem ${quantidadeTotal} marmita(s). Adicione mais ${30 - quantidadeTotal} marmita(s).`);
      return;
    }

    const validacao = validarEndereco();
    if (!validacao.isValid) {
      showError(validacao.mensagem);
      return;
    }

    // Salva dados do pedido
    const pedido = {
      itens: carrinho,
      subtotal: calcularSubtotal(),
      taxaEntrega: calcularTaxaEntrega(),
      total: calcularTotal(),
      observacoes,
      enderecoEntrega: formatarEnderecoCompleto(),
      data: new Date().toISOString(),
      numero: Math.floor(Math.random() * 10000) + 1000
    };

    sessionStorage.setItem('pedidoAtual', JSON.stringify(pedido));
    success('Pedido preparado! Redirecionando...');
    setTimeout(() => onNavigate('checkout'), 1000);
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
          padding: isMobile ? '10px 15px' : '10px 40px',
          borderBottom: '1px solid #ccc',
          flexWrap: isMobile ? 'wrap' : 'nowrap'
        }}>
          <img 
            style={{ height: isMobile ? '50px' : '60px' }}
            src="/assets/logo.jpg" 
            alt="Logo Fit In Box"
          />
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
              onClick={continuarComprando}
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
            padding: isMobile ? '40px 20px' : '60px',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            textAlign: 'center',
            maxWidth: isMobile ? '100%' : '500px',
            width: '100%'
          }}>
            <div style={{ fontSize: isMobile ? '60px' : '80px', marginBottom: '20px' }}>🛒</div>
            <h2 style={{ 
              color: '#666', 
              marginBottom: '20px',
              fontSize: isMobile ? '20px' : '24px'
            }}>Seu carrinho está vazio</h2>
            <p style={{ 
              color: '#999', 
              marginBottom: '30px',
              fontSize: isMobile ? '14px' : '16px'
            }}>
              Adicione alguns produtos deliciosos para continuar!
            </p>
            <button
              onClick={continuarComprando}
              style={{
                backgroundColor: '#009245',
                color: 'white',
                border: 'none',
                padding: isMobile ? '12px 20px' : '15px 30px',
                borderRadius: '5px',
                fontSize: isMobile ? '14px' : '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                width: isMobile ? '100%' : 'auto'
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
        padding: isMobile ? '10px 15px' : '10px 40px',
        borderBottom: '1px solid #ccc',
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        <img 
          style={{ height: isMobile ? '50px' : '60px' }}
          src="/assets/logo.jpg" 
          alt="Logo Fit In Box"
        />
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
            onClick={continuarComprando}
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
            CONTINUAR COMPRANDO
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
        {/* Coluna Esquerda - Itens do Carrinho */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '10px' : '0'
          }}>
            <h1 style={{ 
              color: '#009245', 
              margin: 0,
              fontSize: isMobile ? '20px' : '24px',
              textAlign: isMobile ? 'center' : 'left'
            }}>
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
                  padding: isMobile ? '15px' : '20px',
                  borderRadius: '10px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  display: 'flex',
                  gap: '15px',
                  alignItems: 'center',
                  flexDirection: isMobile ? 'column' : 'row'
                }}
              >
                <img
                  src={item.imagem}
                  alt={item.nome}
                  style={{
                    width: isMobile ? '100%' : '80px',
                    height: isMobile ? '150px' : '80px',
                    objectFit: 'cover',
                    borderRadius: '5px'
                  }}
                />
                
                <div style={{ 
                  flex: 1,
                  textAlign: isMobile ? 'center' : 'left'
                }}>
                  <h3 style={{ 
                    color: '#009245', 
                    margin: '0 0 5px 0',
                    fontSize: isMobile ? '16px' : '18px'
                  }}>{item.nome}</h3>
                  <p style={{ 
                    color: '#666', 
                    fontSize: '14px', 
                    margin: '0 0 10px 0' 
                  }}>
                    {item.descricao}
                  </p>
                  <div style={{ 
                    fontSize: isMobile ? '16px' : '18px', 
                    fontWeight: 'bold', 
                    color: '#009245' 
                  }}>
                    R$ {item.preco.toFixed(2)}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexDirection: isMobile ? 'row' : 'row'
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
                  fontSize: isMobile ? '18px' : '20px',
                  fontWeight: 'bold',
                  color: '#009245',
                  minWidth: isMobile ? 'auto' : '80px',
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

          {/* Endereço de Entrega - USANDO HOOK DE CEP */}
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '15px' : '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginTop: '20px'
          }}>
            <h3 style={{ 
              color: '#009245', 
              marginBottom: '15px',
              fontSize: isMobile ? '16px' : '18px'
            }}>📍 Endereço de Entrega</h3>
            
            {/* CEP com busca automática */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '5px', 
                fontWeight: 'bold', 
                fontSize: '14px' 
              }}>
                CEP * {buscandoCep && <span style={{ color: '#f38e3c' }}>🔍 Buscando...</span>}
              </label>
              <input
                type="text"
                value={endereco.cep}
                onChange={(e) => atualizarCampo('cep', e.target.value)}
                placeholder="00000-000"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${erroCep ? '#dc3545' : '#ddd'}`,
                  borderRadius: '5px',
                  fontSize: '14px',
                  backgroundColor: buscandoCep ? '#f8f9fa' : 'white'
                }}
                required
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                Digite o CEP para preenchimento automático do endereço
              </small>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
              gap: '15px',
              marginBottom: '15px'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '5px', 
                  fontWeight: 'bold', 
                  fontSize: '14px' 
                }}>
                  Rua/Avenida *
                </label>
                <input
                  type="text"
                  value={endereco.rua}
                  onChange={(e) => atualizarCampo('rua', e.target.value)}
                  placeholder="Ex: Rua das Flores"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '5px', 
                  fontWeight: 'bold', 
                  fontSize: '14px' 
                }}>
                  Número *
                </label>
                <input
                  type="text"
                  value={endereco.numero}
                  onChange={(e) => atualizarCampo('numero', e.target.value)}
                  placeholder="Ex: 123"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '15px',
              marginBottom: '15px'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '5px', 
                  fontWeight: 'bold', 
                  fontSize: '14px' 
                }}>
                  Bairro *
                </label>
                <input
                  type="text"
                  value={endereco.bairro}
                  onChange={(e) => atualizarCampo('bairro', e.target.value)}
                  placeholder="Ex: Centro"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '5px', 
                  fontWeight: 'bold', 
                  fontSize: '14px' 
                }}>
                  Cidade *
                </label>
                <input
                  type="text"
                  value={endereco.cidade}
                  onChange={(e) => atualizarCampo('cidade', e.target.value)}
                  placeholder="Ex: São Paulo"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
              gap: '15px',
              marginBottom: '15px'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '5px', 
                  fontWeight: 'bold', 
                  fontSize: '14px' 
                }}>
                  Referência (opcional)
                </label>
                <input
                  type="text"
                  value={endereco.referencia}
                  onChange={(e) => atualizarCampo('referencia', e.target.value)}
                  placeholder="Ex: Próximo ao shopping, portão azul..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '5px', 
                  fontWeight: 'bold', 
                  fontSize: '14px' 
                }}>
                  Estado *
                </label>
                <select
                  value={endereco.estado}
                  onChange={(e) => atualizarCampo('estado', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '14px'
                  }}
                >
                  <option value="SP">SP</option>
                  <option value="RJ">RJ</option>
                  <option value="MG">MG</option>
                  <option value="SC">SC</option>
                  <option value="PR">PR</option>
                  <option value="RS">RS</option>
                  <option value="GO">GO</option>
                  <option value="MT">MT</option>
                  <option value="MS">MS</option>
                  <option value="DF">DF</option>
                  <option value="ES">ES</option>
                  <option value="BA">BA</option>
                  <option value="SE">SE</option>
                  <option value="AL">AL</option>
                  <option value="PE">PE</option>
                  <option value="PB">PB</option>
                  <option value="RN">RN</option>
                  <option value="CE">CE</option>
                  <option value="PI">PI</option>
                  <option value="MA">MA</option>
                  <option value="PA">PA</option>
                  <option value="AP">AP</option>
                  <option value="AM">AM</option>
                  <option value="RR">RR</option>
                  <option value="AC">AC</option>
                  <option value="RO">RO</option>
                  <option value="TO">TO</option>
                </select>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '15px' : '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginTop: '15px'
          }}>
            <h3 style={{ 
              color: '#009245', 
              marginBottom: '15px',
              fontSize: isMobile ? '16px' : '18px'
            }}>💬 Observações (opcional)</h3>
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
            }}>📊 Resumo do Pedido</h2>
            
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
              fontSize: isMobile ? '18px' : '20px',
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
                fontSize: isMobile ? '16px' : '18px',
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