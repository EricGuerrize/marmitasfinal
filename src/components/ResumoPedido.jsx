import React, { useState, useEffect } from 'react';
import LogoComponent from './LogoComponent';

const ResumoPedido = ({ onNavigate, carrinho, calcularQuantidadeTotal }) => {
  const [cnpj, setCnpj] = useState('');
  const [pedidoAtual, setPedidoAtual] = useState(null);
  const [processandoPedido, setProcessandoPedido] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showWhatsAppFallback, setShowWhatsAppFallback] = useState(false); // ✅ NOVO
  const [mensagemWhatsApp, setMensagemWhatsApp] = useState(''); // ✅ NOVO

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
    const cnpjInfo = sessionStorage.getItem('cnpj') || '';
    setCnpj(cnpjInfo);

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
    window.history.pushState({ page: 'resumo-pedido' }, '', window.location.pathname);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onNavigate]);

  // ✅ FUNÇÃO COMPLETA para WhatsApp
  const abrirWhatsAppCompleto = (mensagem) => {
    const numeroWhatsApp = '5521964298123';
    setMensagemWhatsApp(mensagem);
    
    const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobileDevice) {
      console.log('📱 Tentando abrir WhatsApp no mobile...');
      
      // Tenta app nativo primeiro
      const urlNativo = `whatsapp://send?phone=55${numeroWhatsApp}&text=${encodeURIComponent(mensagem)}`;
      
      try {
        window.location.href = urlNativo;
        
        // Se não abrir em 3 segundos, mostra fallback
        setTimeout(() => {
          setShowWhatsAppFallback(true);
          console.log('📱 Mostrando opções manuais para mobile');
        }, 3000);
        
      } catch (error) {
        console.log('📱 Erro, mostrando fallback:', error);
        setShowWhatsAppFallback(true);
      }
      
    } else {
      console.log('💻 Abrindo WhatsApp no desktop...');
      const urlDesktop = `https://wa.me/55${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
      const novaJanela = window.open(urlDesktop, '_blank');
      
      // Se não abrir, mostra fallback
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
      // Fallback para navegadores antigos
      const textArea = document.createElement('textarea');
      textArea.value = mensagemWhatsApp;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('✅ Mensagem copiada! Cole no WhatsApp.');
    });
  };

  const confirmarPedido = async () => {
    setProcessandoPedido(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const pedidoFinal = {
        ...pedidoAtual,
        status: 'enviado',
        dataEnvio: new Date().toISOString()
      };

      sessionStorage.setItem('pedidoConfirmado', JSON.stringify(pedidoFinal));

      // BUSCAR NOME DA EMPRESA DA SESSÃO
      const sessaoAtiva = JSON.parse(sessionStorage.getItem('sessaoAtiva') || '{}');
      const nomeEmpresa = sessaoAtiva.nomeEmpresa || sessaoAtiva.razaoSocial || '';
      const cnpjFormatado = sessaoAtiva.cnpjFormatado || cnpj;
      
      // Prioriza nomeEmpresa, depois razaoSocial, depois CNPJ como fallback
      const nomeParaExibir = nomeEmpresa || cnpj;

      const pedidosAdmin = JSON.parse(localStorage.getItem('pedidosAdmin') || '[]');
      const novoPedido = {
        id: Date.now(),
        numero: pedidoFinal.numero,
        cliente: nomeParaExibir,
        cnpj: cnpj,
        total: pedidoFinal.total,
        status: 'enviado',
        data: pedidoFinal.dataEnvio,
        itens: pedidoFinal.itens,
        enderecoEntrega: pedidoFinal.enderecoEntrega,
        observacoes: pedidoFinal.observacoes || ''
      };
      
      pedidosAdmin.push(novoPedido);
      localStorage.setItem('pedidosAdmin', JSON.stringify(pedidosAdmin));

      try {
        const { pedidoService } = await import('../services/pedidoService');
        const dadosPedido = {
          cnpj: cnpj.replace(/\D/g, ''),
          empresaNome: nomeParaExibir,
          itens: pedidoFinal.itens,
          subtotal: pedidoFinal.subtotal,
          taxaEntrega: pedidoFinal.taxaEntrega,
          total: pedidoFinal.total,
          enderecoEntrega: pedidoFinal.enderecoEntrega,
          observacoes: pedidoFinal.observacoes || '',
          metodoPagamento: 'whatsapp'
        };
        
        await pedidoService.criarPedido(dadosPedido);
        console.log('✅ Pedido salvo no Supabase para o usuário');
      } catch (error) {
        console.error('❌ Erro ao salvar pedido no Supabase:', error);
      }
      
      // ✅ WHATSAPP CORRIGIDO
      let mensagem = `*NOVO PEDIDO - FIT IN BOX*\n\n`;
      mensagem += `*Pedido:* #${pedidoFinal.numero}\n`;
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
      pedidoFinal.itens.forEach(item => {
        mensagem += `• ${item.quantidade}x ${item.nome} - R$ ${(item.quantidade * item.preco).toFixed(2)}\n`;
      });
      
      mensagem += `\n*RESUMO FINANCEIRO:*\n`;
      mensagem += `• Subtotal: R$ ${pedidoFinal.subtotal.toFixed(2)}\n`;
      mensagem += `• Taxa de entrega: ${pedidoFinal.taxaEntrega === 0 ? 'GRATIS' : `R$ ${pedidoFinal.taxaEntrega.toFixed(2)}`}\n`;
      mensagem += `• *TOTAL: R$ ${pedidoFinal.total.toFixed(2)}*\n\n`;
      
      mensagem += `*ENDERECO DE ENTREGA:*\n${pedidoFinal.enderecoEntrega}\n\n`;
      
      if (pedidoFinal.observacoes) {
        mensagem += `*OBSERVACOES:*\n${pedidoFinal.observacoes}\n\n`;
      }
      
      mensagem += `Aguardo confirmacao!`;

      // ✅ USA A NOVA FUNÇÃO
      abrirWhatsAppCompleto(mensagem);
      
      sessionStorage.removeItem('carrinho');
      sessionStorage.removeItem('pedidoAtual');

      // Só navega se não mostrar fallback
      setTimeout(() => {
        if (!showWhatsAppFallback) {
          onNavigate('pedido-confirmado');
        }
      }, 4000);

    } catch (error) {
      alert('Erro ao enviar pedido. Tente novamente.');
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
        padding: isMobile ? '15px' : '15px 40px',
        borderBottom: '1px solid #ccc',
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        <LogoComponent size={isMobile ? 'small' : 'medium'} showText={true} />
        
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
            onClick={voltarCarrinho}
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
            VOLTAR AO CARRINHO
          </button>
        </div>
      </div>

      {/* Container Principal */}
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: isMobile ? '15px' : '25px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
        gap: isMobile ? '25px' : '30px'
      }}>
        {/* Coluna Esquerda - Resumo do Pedido */}
        <div>
          <h1 style={{ 
            color: '#009245', 
            marginBottom: '25px',
            fontSize: isMobile ? '22px' : '26px'
          }}>
            Resumo do Pedido
          </h1>

          {/* Informações do Pedido */}
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '20px' : '25px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '25px'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '20px',
              marginBottom: '25px'
            }}>
              <div>
                <h3 style={{ color: '#009245', margin: '0 0 10px 0' }}>Dados do Pedido</h3>
                <p style={{ margin: '5px 0', color: '#666' }}>
                  <strong>Número:</strong> #{pedidoAtual.numero}
                </p>
                <p style={{ margin: '5px 0', color: '#666' }}>
                  <strong>CNPJ:</strong> {cnpj}
                </p>
                <p style={{ margin: '5px 0', color: '#666' }}>
                  <strong>Total de itens:</strong> {calcularQuantidadeTotal()} marmitas
                </p>
              </div>

              <div>
                <h3 style={{ color: '#009245', margin: '0 0 10px 0' }}>Resumo Financeiro</h3>
                <p style={{ margin: '5px 0', color: '#666' }}>
                  <strong>Subtotal:</strong> R$ {pedidoAtual.subtotal.toFixed(2)}
                </p>
                <p style={{ margin: '5px 0', color: '#666' }}>
                  <strong>Taxa de entrega:</strong> {pedidoAtual.taxaEntrega === 0 ? 'GRÁTIS' : `R$ ${pedidoAtual.taxaEntrega.toFixed(2)}`}
                </p>
                <p style={{ margin: '5px 0', color: '#009245', fontSize: '18px', fontWeight: 'bold' }}>
                  <strong>TOTAL: R$ {pedidoAtual.total.toFixed(2)}</strong>
                </p>
              </div>
            </div>

            {/* Lista de Itens */}
            <div>
              <h3 style={{ color: '#009245', marginBottom: '15px' }}>Itens do Pedido:</h3>
              {pedidoAtual.itens.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    marginBottom: '10px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: '#009245' }}>{item.nome}</strong>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {item.quantidade} x R$ {item.preco.toFixed(2)}
                    </div>
                  </div>
                  <div style={{
                    fontWeight: 'bold',
                    color: '#009245',
                    fontSize: '16px'
                  }}>
                    R$ {(item.preco * item.quantidade).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Endereço de Entrega */}
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '20px' : '25px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '25px'
          }}>
            <h3 style={{ color: '#009245', marginBottom: '15px' }}>Endereço de Entrega</h3>
            <p style={{ color: '#666', lineHeight: '1.5', margin: 0 }}>
              {pedidoAtual.enderecoEntrega}
            </p>
            {pedidoAtual.observacoes && (
              <div style={{ marginTop: '15px' }}>
                <strong style={{ color: '#009245' }}>Observações:</strong>
                <p style={{ color: '#666', margin: '5px 0 0 0' }}>
                  {pedidoAtual.observacoes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita - Ações */}
        <div>
          <div style={{
            backgroundColor: 'white',
            padding: isMobile ? '25px' : '30px',
            borderRadius: '10px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            position: isMobile ? 'static' : 'sticky',
            top: isMobile ? 'auto' : '25px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '60px',
              marginBottom: '20px'
            }}>
              📱
            </div>
            
            <h2 style={{ 
              color: '#009245', 
              marginBottom: '20px',
              fontSize: isMobile ? '20px' : '22px'
            }}>Confirmar Pedido</h2>
            
            <p style={{
              color: '#666',
              marginBottom: '25px',
              lineHeight: '1.5'
            }}>
              Ao confirmar, seu pedido será enviado automaticamente via WhatsApp com todos os detalhes.
            </p>

            <div style={{
              backgroundColor: '#e7f3ff',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '25px',
              textAlign: 'left'
            }}>
              <h4 style={{ color: '#0066cc', marginBottom: '12px', margin: '0 0 12px 0' }}>
                O que acontece depois:
              </h4>
              <ul style={{ color: '#333', paddingLeft: '20px', margin: 0, lineHeight: '1.6' }}>
                <li>WhatsApp abrirá automaticamente</li>
                <li>Mensagem será preenchida com os dados</li>
                <li>Você confirma e envia</li>
                <li>Nossa equipe responde em breve</li>
              </ul>
            </div>

            <div style={{
              backgroundColor: '#fff3cd',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '25px',
              color: '#856404',
              fontSize: '14px',
              textAlign: 'left'
            }}>
              <strong>Contato:</strong><br />
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                +55 (21) 96429-8123
              </span>
            </div>
            
            <button
              onClick={confirmarPedido}
              disabled={processandoPedido}
              style={{
                backgroundColor: processandoPedido ? '#ccc' : '#25D366',
                color: 'white',
                border: 'none',
                padding: '18px',
                width: '100%',
                borderRadius: '8px',
                fontSize: isMobile ? '16px' : '18px',
                fontWeight: 'bold',
                cursor: processandoPedido ? 'wait' : 'pointer',
                marginBottom: '15px',
                opacity: processandoPedido ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {processandoPedido ? 'Enviando...' : 'Confirmar e Enviar no WhatsApp'}
            </button>
            
            <button
              onClick={voltarCarrinho}
              disabled={processandoPedido}
              style={{
                backgroundColor: 'transparent',
                color: '#009245',
                border: '2px solid #009245',
                padding: '15px',
                width: '100%',
                borderRadius: '8px',
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

export default ResumoPedido;