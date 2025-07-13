import React, { useState, useEffect } from 'react';
import { authSupabaseService } from '../services/authSupabaseService';
import { produtoService } from '../services/produtoService'; // Importar produtoService

const PedidoProdutosPage = ({ onNavigate }) => {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [dadosEmpresa, setDadosEmpresa] = useState(null);
  const [enderecoEntrega, setEnderecoEntrega] = useState({
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    cep: '',
    referencia: ''
  });
  const [mostrarFinalizacao, setMostrarFinalizacao] = useState(false);
  const [finalizandoPedido, setFinalizandoPedido] = useState(false);
  const [loadingProdutos, setLoadingProdutos] = useState(true); // Novo estado de carregamento

  useEffect(() => {
    const sessao = authSupabaseService.verificarSessao();
    if (!sessao) {
      alert('Sessão expirada. Faça login novamente.');
      onNavigate('home');
      return;
    }

    buscarDadosEmpresa(sessao);
    carregarProdutos();
  }, [onNavigate]);

  const buscarDadosEmpresa = async (sessao) => {
    try {
      setDadosEmpresa({
        cnpj: sessao.cnpj,
        razaoSocial: sessao.razaoSocial,
        nomeFantasia: sessao.nomeFantasia,
        endereco: 'Rua da Empresa, 123',
        cidade: 'São Paulo',
        telefone: '(11) 9999-9999'
      });
    } catch (error) {
      console.error('Erro ao buscar dados da empresa:', error);
    }
  };

  const carregarProdutos = async () => {
    setLoadingProdutos(true); // Inicia o carregamento
    try {
      const produtosSupabase = await produtoService.listarProdutos();
      setProdutos(produtosSupabase.filter(p => p.disponivel));
    } catch (error) {
      console.error('Erro ao carregar produtos do Supabase:', error);
      setProdutos([]); // Em caso de erro, define como array vazio
    } finally {
      setLoadingProdutos(false); // Finaliza o carregamento
    }
  };

  const adicionarAoCarrinho = (produto) => {
    setCarrinho(prev => {
      const itemExistente = prev.find(item => item.id === produto.id);
      if (itemExistente) {
        return prev.map(item =>
          item.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, { ...produto, quantidade: 1 }];
    });
  };

  const removerDoCarrinho = (produtoId) => {
    setCarrinho(prev => prev.filter(item => item.id !== produtoId));
  };

  const alterarQuantidade = (produtoId, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      removerDoCarrinho(produtoId);
      return;
    }
    setCarrinho(prev =>
      prev.map(item =>
        item.id === produtoId
          ? { ...item, quantidade: novaQuantidade }
          : item
      )
    );
  };

  const calcularTotal = () => {
    return carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
  };

  const handleFinalizarPedido = async () => {
    if (carrinho.length === 0) {
      alert('Adicione pelo menos um produto ao carrinho');
      return;
    }

    if (!enderecoEntrega.logradouro || !enderecoEntrega.numero || !enderecoEntrega.bairro) {
      alert('Preencha o endereço de entrega completo');
      return;
    }

    setFinalizandoPedido(true);

    try {
      const pedido = {
        numero: Math.floor(Math.random() * 10000) + 1000,
        itens: carrinho,
        total: calcularTotal(),
        enderecoEntrega: `${enderecoEntrega.logradouro}, ${enderecoEntrega.numero}${enderecoEntrega.complemento ? ', ' + enderecoEntrega.complemento : ''} - ${enderecoEntrega.bairro}, ${enderecoEntrega.cidade} - CEP: ${enderecoEntrega.cep}${enderecoEntrega.referencia ? ' (Ref: ' + enderecoEntrega.referencia + ')' : ''}`,
        dadosEmpresa: dadosEmpresa,
        data: new Date().toISOString(),
        status: 'enviado'
      };

      // Removido o salvamento no localStorage para o admin ver

      const numeroWhatsApp = '5565992556938';
      let mensagem = `🍽️ *NOVO PEDIDO - FIT IN BOX*\n\n`;
      mensagem += `📋 *Pedido:* #${pedido.numero}\n`;
      mensagem += `🏢 *Empresa:* ${dadosEmpresa.razaoSocial}\n`;
      mensagem += `📄 *CNPJ:* ${dadosEmpresa.cnpj}\n`;
      if (dadosEmpresa.nomeFantasia) {
        mensagem += `🏪 *Nome Fantasia:* ${dadosEmpresa.nomeFantasia}\n`;
      }
      mensagem += `📅 *Data:* ${new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}\n\n`;
      
      mensagem += `*📦 ITENS DO PEDIDO:*\n`;
      pedido.itens.forEach(item => {
        mensagem += `• ${item.quantidade}x ${item.nome} - R$ ${(item.quantidade * item.preco).toFixed(2)}\n`;
      });
      
      mensagem += `\n*💰 TOTAL: R$ ${pedido.total.toFixed(2)}*\n\n`;
      
      mensagem += `*📍 ENDEREÇO DE ENTREGA:*\n${pedido.enderecoEntrega}\n\n`;
      
      mensagem += `Aguardo confirmação! 🙏`;

      const url = `https://wa.me/55${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
      window.open(url, '_blank');

      setCarrinho([]);
      alert('Pedido enviado com sucesso via WhatsApp!');
      
      onNavigate('prosseguir');

    } catch (error) {
      alert('Erro ao enviar pedido. Tente novamente.');
      console.error('Erro:', error);
    } finally {
      setFinalizandoPedido(false);
    }
  };

  const logout = () => {
    if (window.confirm('Tem certeza que deseja sair?')) {
      authSupabaseService.logout();
      onNavigate('home');
    }
  };

  if (!dadosEmpresa || loadingProdutos) { // Adicionado loadingProdutos aqui
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        {loadingProdutos ? 'Carregando produtos...' : 'Carregando dados da empresa...'}
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
      <div style={{
        background: 'white',
        padding: '15px 40px',
        borderBottom: '1px solid #ccc'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#009245' }}>
            🍽️ Fit In Box
          </div>
          
          <div style={{
            backgroundColor: '#e7f3ff',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #b3d9ff',
            flex: 1,
            maxWidth: '500px',
            margin: '0 20px'
          }}>
            <h3 style={{ 
              margin: '0 0 10px 0', 
              color: '#0066cc',
              fontSize: '16px'
            }}>
              📋 Dados para Entrega
            </h3>
            <div style={{ fontSize: '14px', color: '#333' }}>
              <div><strong>Empresa:</strong> {dadosEmpresa.razaoSocial}</div>
              {dadosEmpresa.nomeFantasia && (
                <div><strong>Nome Fantasia:</strong> {dadosEmpresa.nomeFantasia}</div>
              )}
              <div><strong>CNPJ:</strong> {dadosEmpresa.cnpj}</div>
              {dadosEmpresa.telefone && (
                <div><strong>Telefone:</strong> {dadosEmpresa.telefone}</div>
              )}
            </div>
          </div>

          <button 
            onClick={logout}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🚪 SAIR
          </button>
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
        display: 'grid',
        gridTemplateColumns: mostrarFinalizacao ? '1fr 1fr' : '2fr 1fr',
        gap: '30px'
      }}>
        <div>
          {!mostrarFinalizacao ? (
            <div>
              <h1 style={{ color: '#009245', marginBottom: '30px' }}>
                🍽️ Nossos Produtos
              </h1>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px'
              }}>
                {produtos.map(produto => (
                  <div
                    key={produto.id}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '10px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      overflow: 'hidden'
                    }}
                  >
                    <img
                      src={produto.imagem_url}
                      alt={produto.nome}
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover'
                      }}
                    />
                    
                    <div style={{ padding: '15px' }}>
                      <h3 style={{
                        color: '#009245',
                        fontSize: '16px',
                        marginBottom: '8px'
                      }}>
                        {produto.nome}
                      </h3>
                      
                      <p style={{
                        color: '#666',
                        fontSize: '13px',
                        marginBottom: '12px'
                      }}>
                        {produto.descricao}
                      </p>
                      
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: '#009245'
                        }}>
                          R$ {produto.preco.toFixed(2)}
                        </span>
                        
                        <button
                          onClick={() => adicionarAoCarrinho(produto)}
                          style={{
                            backgroundColor: '#f38e3c',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '5px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h2 style={{ color: '#009245', marginBottom: '25px' }}>
                📍 Endereço de Entrega
              </h2>
              
              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr',
                  gap: '15px',
                  marginBottom: '15px'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Logradouro (Rua/Av) *
                    </label>
                    <input
                      type="text"
                      value={enderecoEntrega.logradouro}
                      onChange={(e) => setEnderecoEntrega({...enderecoEntrega, logradouro: e.target.value})}
                      placeholder="Ex: Rua das Flores"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                      }}
                      required
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Número *
                    </label>
                    <input
                      type="text"
                      value={enderecoEntrega.numero}
                      onChange={(e) => setEnderecoEntrega({...enderecoEntrega, numero: e.target.value})}
                      placeholder="123"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                      }}
                      required
                    />
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '15px',
                  marginBottom: '15px'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={enderecoEntrega.complemento}
                      onChange={(e) => setEnderecoEntrega({...enderecoEntrega, complemento: e.target.value})}
                      placeholder="Apto, Sala, etc"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Bairro *
                    </label>
                    <input
                      type="text"
                      value={enderecoEntrega.bairro}
                      onChange={(e) => setEnderecoEntrega({...enderecoEntrega, bairro: e.target.value})}
                      placeholder="Centro"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                      }}
                      required
                    />
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '15px',
                  marginBottom: '15px'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Cidade *
                    </label>
                    <input
                      type="text"
                      value={enderecoEntrega.cidade}
                      onChange={(e) => setEnderecoEntrega({...enderecoEntrega, cidade: e.target.value})}
                      placeholder="São Paulo"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                      }}
                      required
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      CEP
                    </label>
                    <input
                      type="text"
                      value={enderecoEntrega.cep}
                      onChange={(e) => setEnderecoEntrega({...enderecoEntrega, cep: e.target.value})}
                      placeholder="00000-000"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '5px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Ponto de Referência
                  </label>
                  <input
                    type="text"
                    value={enderecoEntrega.referencia}
                    onChange={(e) => setEnderecoEntrega({...enderecoEntrega, referencia: e.target.value})}
                    placeholder="Próximo ao shopping, portão azul, etc"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '5px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleFinalizarPedido}
                    disabled={finalizandoPedido}
                    style={{
                      backgroundColor: finalizandoPedido ? '#ccc' : '#25D366',
                      color: 'white',
                      border: 'none',
                      padding: '15px 25px',
                      borderRadius: '5px',
                      fontWeight: 'bold',
                      cursor: finalizandoPedido ? 'wait' : 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    {finalizandoPedido ? '📱 Enviando...' : '📱 Enviar via WhatsApp'}
                  </button>
                  
                  <button
                    onClick={() => setMostrarFinalizacao(false)}
                    style={{
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '15px 25px',
                      borderRadius: '5px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            position: 'sticky',
            top: '20px'
          }}>
            <h2 style={{ color: '#009245', marginBottom: '20px' }}>
              🛒 Carrinho ({carrinho.reduce((total, item) => total + item.quantidade, 0)})
            </h2>
            
            {carrinho.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                Carrinho vazio
              </p>
            ) : (
              <div>
                {carrinho.map(item => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid #eee'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {item.nome}
                      </div>
                      <div style={{ color: '#666', fontSize: '12px' }}>
                        R$ {item.preco.toFixed(2)}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => alterarQuantidade(item.id, item.quantidade - 1)}
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          width: '25px',
                          height: '25px',
                          borderRadius: '50%',
                          cursor: 'pointer'
                        }}
                      >
                        -
                      </button>
                      
                      <span style={{ fontWeight: 'bold', minWidth: '30px', textAlign: 'center' }}>
                        {item.quantidade}
                      </span>
                      
                      <button
                        onClick={() => alterarQuantidade(item.id, item.quantidade + 1)}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          width: '25px',
                          height: '25px',
                          borderRadius: '50%',
                          cursor: 'pointer'
                        }}
                      >
                        +
                      </button>
                    </div>
                    
                    <div style={{ 
                      fontWeight: 'bold', 
                      minWidth: '80px', 
                      textAlign: 'right',
                      color: '#009245'
                    }}>
                      R$ {(item.preco * item.quantidade).toFixed(2)}
                    </div>
                  </div>
                ))}
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '15px',
                  paddingTop: '15px',
                  borderTop: '2px solid #009245',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#009245'
                }}>
                  <span>Total:</span>
                  <span>R$ {calcularTotal().toFixed(2)}</span>
                </div>
                
                <button
                  onClick={() => setMostrarFinalizacao(true)}
                  disabled={carrinho.length === 0}
                  style={{
                    backgroundColor: carrinho.length === 0 ? '#ccc' : '#f38e3c',
                    color: 'white',
                    border: 'none',
                    padding: '15px',
                    width: '100%',
                    borderRadius: '5px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: carrinho.length === 0 ? 'not-allowed' : 'pointer',
                    marginTop: '15px'
                  }}
                >
                  Finalizar Pedido
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PedidoProdutosPage;


