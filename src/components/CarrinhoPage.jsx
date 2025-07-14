import React, { useState, useEffect } from 'react';
import { useCep } from '../hooks/useCep';
import { useNotification } from './NotificationSystem';
import LogoComponent from './LogoComponent';

// ✅ COMPONENTE SIMPLES PARA IMAGEM DO CARRINHO
const ImagemProdutoCarrinho = ({ produto, isMobile }) => {
  const [imagemError, setImagemError] = useState(false);
  
  // ✅ Usa diretamente imagem_url como no admin e produtos
  const imagemUrl = produto.imagem_url;
  
  if (!imagemUrl || imagemError) {
    return (
      <div style={{
        width: isMobile ? '100%' : '85px',
        height: isMobile ? '160px' : '85px',
        backgroundColor: '#f0f9f0',
        borderRadius: '5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isMobile ? '60px' : '40px',
        border: '2px solid #e0e0e0',
        color: '#009245'
      }}>
        🍽️
      </div>
    );
  }
  
  return (
    <img
      src={imagemUrl}
      alt={produto.nome}
      style={{
        width: isMobile ? '100%' : '85px',
        height: isMobile ? '160px' : '85px',
        objectFit: 'cover',
        borderRadius: '5px',
        border: '1px solid #ddd'
      }}
      onError={() => setImagemError(true)}
    />
  );
};

const CarrinhoPage = ({ onNavigate, carrinho, atualizarQuantidade, removerItem, limparCarrinho, calcularQuantidadeTotal }) => {
  const [cnpj, setCnpj] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [processandoPedido, setProcessandoPedido] = useState(false);
  const [showWhatsAppFallback, setShowWhatsAppFallback] = useState(false);
  const [mensagemWhatsApp, setMensagemWhatsApp] = useState('');
  
  const { 
    endereco, 
    loading: buscandoCep, 
    error: erroCep,
    atualizarCampo,
    validarEndereco,
    formatarEnderecoCompleto
  } = useCep();

  const { success, error: showError } = useNotification();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const cnpjInfo = sessionStorage.getItem('cnpj') || '';
    setCnpj(cnpjInfo);
    
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

  useEffect(() => {
    if (endereco.cidade && endereco.rua && !buscandoCep) {
      success('Endereço encontrado! Verifique se está correto.', 3000);
    }
  }, [endereco.cidade, endereco.rua, buscandoCep, success]);

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

  // ✅ FUNÇÃO para WhatsApp
  const abrirWhatsAppCompleto = (mensagem) => {
    const numeroWhatsApp = '5521964298123';
    setMensagemWhatsApp(mensagem);
    
    const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobileDevice) {
      const urlNativo = `whatsapp://send?phone=55${numeroWhatsApp}&text=${encodeURIComponent(mensagem)}`;
      
      try {
        window.location.href = urlNativo;
        setTimeout(() => {
          setShowWhatsAppFallback(true);
        }, 3000);
      } catch (error) {
        setShowWhatsAppFallback(true);
      }
    } else {
      const urlDesktop = `https://wa.me/55${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
      const novaJanela = window.open(urlDesktop, '_blank');
      
      setTimeout(() => {
        if (!novaJanela || novaJanela.closed) {
          setShowWhatsAppFallback(true);
        }
      }, 2000);
    }
  };

  // ✅ FUNÇÃO para copiar mensagem
  const copiarMensagem = () => {
    navigator.clipboard.writeText(mensagemWhatsApp).then(() => {
      alert('✅ Mensagem copiada! Cole no WhatsApp.');
    }).catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = mensagemWhatsApp;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('✅ Mensagem copiada! Cole no WhatsApp.');
    });
  };

  // ✅ FUNÇÃO PRINCIPAL - Confirmar e Enviar
  const confirmarEEnviarPedido = async () => {
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

    setProcessandoPedido(true);

    try {
      // Cria o pedido
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

      // Salva no sessionStorage
      sessionStorage.setItem('pedidoAtual', JSON.stringify(pedido));

      // Busca nome da empresa
      const sessaoAtiva = JSON.parse(sessionStorage.getItem('sessaoAtiva') || '{}');
      const nomeEmpresa = sessaoAtiva.nomeEmpresa || sessaoAtiva.razaoSocial || '';
      const cnpjFormatado = sessaoAtiva.cnpjFormatado || cnpj;
      const nomeParaExibir = nomeEmpresa || cnpj;

      // Salva no localStorage para admin
      const pedidosAdmin = JSON.parse(localStorage.getItem('pedidosAdmin') || '[]');
      const novoPedido = {
        id: Date.now(),
        numero: pedido.numero,
        cliente: nomeParaExibir,
        cnpj: cnpj,
        total: pedido.total,
        status: 'enviado',
        data: pedido.data,
        itens: pedido.itens,
        enderecoEntrega: pedido.enderecoEntrega,
        observacoes: pedido.observacoes || ''
      };
      
      pedidosAdmin.push(novoPedido);
      localStorage.setItem('pedidosAdmin', JSON.stringify(pedidosAdmin));

      // Tenta salvar no Supabase
      try {
        const { pedidoService } = await import('../services/pedidoService');
        const dadosPedido = {
          cnpj: cnpj.replace(/\D/g, ''),
          empresaNome: nomeParaExibir,
          itens: pedido.itens,
          subtotal: pedido.subtotal,
          taxaEntrega: pedido.taxaEntrega,
          total: pedido.total,
          enderecoEntrega: pedido.enderecoEntrega,
          observacoes: pedido.observacoes || '',
          metodoPagamento: 'whatsapp'
        };
        
        await pedidoService.criarPedido(dadosPedido);
      } catch (error) {
        console.error('❌ Erro ao salvar pedido no Supabase:', error);
      }
      
      // Formata mensagem do WhatsApp
      let mensagem = `*NOVO PEDIDO - FIT IN BOX*\n\n`;
      mensagem += `*Pedido:* #${pedido.numero}\n`;
      mensagem += `*Empresa:* ${nomeParaExibir}\n`;
      mensagem += `*CNPJ:* ${cnpjFormatado}\n`;
      mensagem += `*Data:* ${new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}\n\n`;
      
      mensagem += `*ITENS DO PEDIDO:*\n`;
      pedido.itens.forEach(item => {
        mensagem += `• ${item.quantidade}x ${item.nome} - R$ ${(item.quantidade * item.preco).toFixed(2)}\n`;
      });
      
      mensagem += `\n*RESUMO FINANCEIRO:*\n`;
      mensagem += `• Subtotal: R$ ${pedido.subtotal.toFixed(2)}\n`;
      mensagem += `• Taxa de entrega: ${pedido.taxaEntrega === 0 ? 'GRATIS' : `R$ ${pedido.taxaEntrega.toFixed(2)}`}\n`;
      mensagem += `• *TOTAL: R$ ${pedido.total.toFixed(2)}*\n\n`;
      
      mensagem += `*ENDERECO DE ENTREGA:*\n${pedido.enderecoEntrega}\n\n`;
      
      if (pedido.observacoes) {
        mensagem += `*OBSERVACOES:*\n${pedido.observacoes}\n\n`;
      }
      
      mensagem += `Aguardo confirmacao!`;

      // Abre WhatsApp
      abrirWhatsAppCompleto(mensagem);
      
      // Limpa carrinho
      setTimeout(() => {
        sessionStorage.removeItem('carrinho');
        sessionStorage.removeItem('pedidoAtual');
        limparCarrinho();
        
        if (!showWhatsAppFallback) {
          success('Pedido enviado com sucesso!');
          onNavigate('pedido-confirmado');
        }
      }, 4000);

    } catch (error) {
      showError('Erro ao enviar pedido. Tente novamente.');
    } finally {
      setProcessandoPedido(false);
    }
  };

  const continuarComprando = () => {
    onNavigate('pedido-produtos');
  };

  const confirmarLimparCarrinho = () => {
    if (window.confirm('Tem certeza que deseja limpar o carrinho?')) {
      limparCarrinho();
    }
  };

  const handleQuantidadeInput = (itemId, valor) => {
    const novaQuantidade = parseInt(valor) || 0;
    if (novaQuantidade >= 0 && novaQuantidade <= 999) {
      atualizarQuantidade(itemId, novaQuantidade);
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
        <div style={{
          background: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '15px' : '15px 40px',
          borderBottom: '1px solid #ccc',
          flexWrap: isMobile ? 'wrap' : 'nowrap'
        }}>
          <LogoComponent 
            size={isMobile ? 'small' : 'medium'}
            showText={true}
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '15px' : '20px',
            flexDirection: isMobile ? 'column' : 'row',
            marginTop: isMobile ? '15px' : '0',
            width: isMobile ? '100%' : 'auto'
          }}>
            <span style={{
              fontWeight: 'bold',
              color: '#009245',
              fontSize: isMobile ? '14px' : '14px',
              textAlign: 'center'
            }}>
              CNPJ: {cnpj}
            </span>
            <button 
              onClick={continuarComprando}
              style={{
                padding: isMobile ? '12px 20px' : '12px 20px',
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

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 80px)',
          padding: '25px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '40px 25px' : '60px',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            textAlign: 'center',
            maxWidth: isMobile ? '100%' : '500px',
            width: '100%'
          }}>
            <div style={{ fontSize: isMobile ? '60px' : '80px', marginBottom: '25px' }}>🛒</div>
            <h2 style={{ 
              color: '#666', 
              marginBottom: '25px',
              fontSize: isMobile ? '22px' : '26px'
            }}>Seu carrinho está vazio</h2>
            <p style={{ 
              color: '#999', 
              marginBottom: '30px',
              fontSize: isMobile ? '16px' : '18px'
            }}>
              Adicione alguns produtos deliciosos para continuar!
            </p>
            <button
              onClick={continuarComprando}
              style={{
                backgroundColor: '#009245',
                color: 'white',
                border: 'none',
                padding: isMobile ? '15px 25px' : '18px 35px',
                borderRadius: '5px',
                fontSize: isMobile ? '16px' : '18px',
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
      <div style={{
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '15px' : '15px 40px',
        borderBottom: '1px solid #ccc',
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        <LogoComponent 
          size={isMobile ? 'small' : 'medium'}
          showText={true}
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '15px' : '20px',
          flexDirection: isMobile ? 'column' : 'row',
          marginTop: isMobile ? '15px' : '0',
          width: isMobile ? '100%' : 'auto'
        }}>
          <span style={{
            fontWeight: 'bold',
            color: '#009245',
            fontSize: isMobile ? '14px' : '14px',
            textAlign: 'center'
          }}>
            CNPJ: {cnpj}
          </span>
          <button 
            onClick={continuarComprando}
            style={{
              padding: isMobile ? '12px 20px' : '12px 20px',
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

      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: isMobile ? '15px' : '25px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
        gap: isMobile ? '25px' : '30px'
      }}>
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '25px',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '15px' : '0'
          }}>
            <h1 style={{ 
              color: '#009245', 
              margin: 0,
              fontSize: isMobile ? '22px' : '26px',
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
                padding: '10px 18px',
                borderRadius: '5px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Limpar Carrinho
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {carrinho.map(item => (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'white',
                  padding: isMobile ? '18px' : '22px',
                  borderRadius: '10px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  display: 'flex',
                  gap: '18px',
                  alignItems: 'center',
                  flexDirection: isMobile ? 'column' : 'row'
                }}
              >
                <ImagemProdutoCarrinho produto={item} isMobile={isMobile} />
                
                <div style={{ 
                  flex: 1,
                  textAlign: isMobile ? 'center' : 'left'
                }}>
                  <h3 style={{ 
                    color: '#009245', 
                    margin: '0 0 8px 0',
                    fontSize: isMobile ? '18px' : '20px'
                  }}>{item.nome}</h3>
                  <p style={{ 
                    color: '#666', 
                    fontSize: '14px', 
                    margin: '0 0 12px 0'
                  }}>
                    {item.descricao}
                  </p>
                  <div style={{ 
                    fontSize: isMobile ? '18px' : '20px',
                    fontWeight: 'bold', 
                    color: '#009245' 
                  }}>
                    R$ {item.preco.toFixed(2)}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexDirection: isMobile ? 'row' : 'row'
                }}>
                  <button
                    onClick={() => atualizarQuantidade(item.id, item.quantidade - 1)}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      width: '35px',
                      height: '35px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}
                  >
                    -
                  </button>
                  
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={item.quantidade}
                    onChange={(e) => handleQuantidadeInput(item.id, e.target.value)}
                    style={{
                      width: '70px',
                      height: '35px',
                      border: '2px solid #009245',
                      borderRadius: '5px',
                      textAlign: 'center',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#009245',
                      backgroundColor: 'white',
                      boxSizing: 'border-box'
                    }}
                  />
                  
                  <button
                    onClick={() => atualizarQuantidade(item.id, item.quantidade + 1)}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      width: '35px',
                      height: '35px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}
                  >
                    +
                  </button>
                </div>

                <div style={{
                  fontSize: isMobile ? '20px' : '22px',
                  fontWeight: 'bold',
                  color: '#009245',
                  minWidth: isMobile ? 'auto' : '90px',
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
                    fontSize: '22px',
                    cursor: 'pointer',
                    padding: '8px'
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '18px' : '22px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginTop: '25px'
          }}>
            <h3 style={{ 
              color: '#009245', 
              marginBottom: '18px',
              fontSize: isMobile ? '18px' : '20px'
            }}>📍 Endereço de Entrega</h3>
            
            <div style={{ marginBottom: '18px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
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
                  padding: '12px',
                  border: `1px solid ${erroCep ? '#dc3545' : '#ddd'}`,
                  borderRadius: '5px',
                  fontSize: '14px',
                  backgroundColor: buscandoCep ? '#f8f9fa' : 'white',
                  boxSizing: 'border-box'
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
              gap: '18px',
              marginBottom: '18px'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px',
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
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px',
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
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '18px',
              marginBottom: '18px'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px',
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
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px',
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
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
              gap: '18px',
              marginBottom: '18px'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px',
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
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px',
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
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
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

          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '18px' : '22px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginTop: '18px'
          }}>
            <h3 style={{ 
              color: '#009245', 
              marginBottom: '18px',
              fontSize: isMobile ? '18px' : '20px'
            }}>💬 Observações (opcional)</h3>
            <textarea
              value={observacoes}
              onChange={(e) => {
                if (e.target.value.length <= 200) {
                  setObservacoes(e.target.value);
                }
              }}
              placeholder="Digite suas observações aqui..."
              style={{
                width: '100%',
                height: '90px',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px',
                resize: 'vertical',
                maxHeight: '130px',
                boxSizing: 'border-box'
              }}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              {observacoes.length}/200 caracteres
            </small>
          </div>
        </div>

        <div>
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '25px' : '30px',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            position: isMobile ? 'static' : 'sticky',
            top: isMobile ? 'auto' : '25px'
          }}>
            <h2 style={{ 
              color: '#009245', 
              marginBottom: '25px',
              fontSize: isMobile ? '20px' : '22px'
            }}>📊 Resumo do Pedido</h2>
            
            <div style={{
              backgroundColor: calcularQuantidadeTotal() < 30 ? '#fff3cd' : '#d4edda',
              padding: '18px',
              borderRadius: '5px',
              fontSize: '14px',
              color: calcularQuantidadeTotal() < 30 ? '#856404' : '#155724',
              marginBottom: '25px',
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
              marginBottom: '12px',
              fontSize: '16px'
            }}>
              <span>Subtotal:</span>
              <span>R$ {calcularSubtotal().toFixed(2)}</span>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '18px',
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
                padding: '12px',
                borderRadius: '5px',
                fontSize: '14px',
                color: '#856404',
                marginBottom: '18px'
              }}>
                💡 Frete grátis em pedidos acima de R$ 50,00
              </div>
            )}
            
            <hr style={{ margin: '18px 0', border: '1px solid #eee' }} />
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: isMobile ? '20px' : '22px',
              fontWeight: 'bold',
              color: '#009245',
              marginBottom: '30px'
            }}>
              <span>Total:</span>
              <span>R$ {calcularTotal().toFixed(2)}</span>
            </div>

            {/* ✅ BOTÃO WHATSAPP DIRETO */}
            <button
              onClick={confirmarEEnviarPedido}
              disabled={calcularQuantidadeTotal() < 30 || processandoPedido}
              style={{
                backgroundColor: calcularQuantidadeTotal() < 30 ? '#ccc' : processandoPedido ? '#ccc' : '#25D366',
                color: 'white',
                border: 'none',
                padding: '18px',
                width: '100%',
                borderRadius: '5px',
                fontSize: isMobile ? '16px' : '18px',
                fontWeight: 'bold',
                cursor: calcularQuantidadeTotal() < 30 || processandoPedido ? 'not-allowed' : 'pointer',
                marginBottom: '15px',
                opacity: calcularQuantidadeTotal() < 30 || processandoPedido ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {processandoPedido ? 
                'Enviando...' : 
                calcularQuantidadeTotal() < 30 ? 
                  'Pedido Mínimo: 30 Marmitas' : 
                  <>📱 Confirmar e Enviar no WhatsApp</>
              }
            </button>
            
            <button
              onClick={continuarComprando}
              disabled={processandoPedido}
              style={{
                backgroundColor: 'transparent',
                color: '#009245',
                border: '2px solid #009245',
                padding: '15px',
                width: '100%',
                borderRadius: '5px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: processandoPedido ? 'not-allowed' : 'pointer',
                opacity: processandoPedido ? 0.5 : 1
              }}
            >
              Continuar Comprando
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Modal WhatsApp Fallback */}
      {showWhatsAppFallback && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#25D366', marginBottom: '20px' }}>
              📱 WhatsApp não abriu?
            </h2>
            
            <p style={{ color: '#666', marginBottom: '25px' }}>
              Não se preocupe! Use uma das opções abaixo:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button
                onClick={() => {
                  const numeroWhatsApp = '5521964298123';
                  const urlWeb = `https://wa.me/55${numeroWhatsApp}?text=${encodeURIComponent(mensagemWhatsApp)}`;
                  window.open(urlWeb, '_blank');
                }}
                style={{
                  backgroundColor: '#25D366',
                  color: 'white',
                  border: 'none',
                  padding: '15px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                🌐 Abrir WhatsApp Web
              </button>
              
              <button
                onClick={copiarMensagem}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '15px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                📋 Copiar Mensagem
              </button>
              
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderRadius: '8px',
                textAlign: 'left'
              }}>
                <strong>📞 Ou ligue/mande mensagem:</strong>
                <br />
                <span style={{ fontSize: '18px', color: '#25D366', fontWeight: 'bold' }}>
                  (21) 96429-8123
                </span>
              </div>
              
              <button
                onClick={() => {
                  setShowWhatsAppFallback(false);
                  onNavigate('pedido-confirmado');
                }}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Continuar sem WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarrinhoPage;