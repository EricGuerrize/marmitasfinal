// COMMIT: fix-carrinho-page-supabase-integration

import React, { useState, useEffect } from 'react';
import { useCep } from '../hooks/useCep';
import { useNotification } from './NotificationSystem';
import LogoComponent from './LogoComponent';
// ✅ ADICIONADO: Importações dos serviços
import { pedidoService } from '../services/pedidoService';
import { firebaseAuthService } from '../services/firebaseAuthService';

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

const obterNumeroPedido = (pedido) => {
  return pedido.numero ||
    pedido.numeroPedido ||
    pedido.id?.substring(0, 8) ||
    'S/N';
};


const CarrinhoPage = ({ onNavigate, carrinho, atualizarQuantidade, removerItem, limparCarrinho, calcularQuantidadeTotal }) => {
  // ✅ REMOVIDO: const [cnpj, setCnpj] = useState('');

  const [observacoes, setObservacoes] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [processandoPedido, setProcessandoPedido] = useState(false);
  const [showWhatsAppFallback, setShowWhatsAppFallback] = useState(false);
  const [mensagemWhatsApp, setMensagemWhatsApp] = useState('');

  // ✅ NOVO: Estado para dados da empresa
  const [dadosEmpresa, setDadosEmpresa] = useState(null);

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




  // ✅ NOVO: useEffect para buscar dados da sessão
  useEffect(() => {
    let cancelado = false;

    const buscarDadosSessao = async () => {
      try {
        console.log('🔍 Buscando dados da sessão...');

        // Tenta buscar da sessão atual
        const sessao = await firebaseAuthService.verificarSessao();
        const sessaoAutenticadaSemEmpresa = Boolean(
          sessao?.hasAuthButNoCompanyData ||
          (sessao?.isAuthenticated && !sessao?.cnpj && !sessao?.empresa?.cnpj)
        );

        console.log('📦 Sessão recebida:', sessao);

        if (sessao && sessao.isAuthenticated) {
          // ✅ CORREÇÃO: Verifica se é admin
          /* if (sessao.isAdmin) {
            console.log('🚫 Admin detectado tentando usar carrinho');
            showError("Administradores não podem fazer pedidos. Use uma conta de empresa para testar o carrinho.");
            setTimeout(() => onNavigate('admin'), 2000);
            return;
          }*/

          // ✅ CORREÇÃO: Busca dados da empresa corretamente
          let dadosEmpresaEncontrados = null;

          // Opção 1: Dados diretos na sessão
          if (sessao.cnpj) {
            dadosEmpresaEncontrados = {
              cnpj: sessao.cnpj,
              cnpjFormatado: sessao.cnpjFormatado || sessao.cnpj,
              nomeEmpresa: sessao.nomeEmpresa || sessao.nome_empresa || sessao.nomeFantasia || sessao.nome_fantasia || sessao.razaoSocial || sessao.razao_social || sessao.empresa?.nomeEmpresa || sessao.empresa?.nome_empresa || sessao.empresa?.nomeFantasia || sessao.empresa?.nome_fantasia || sessao.empresa?.razaoSocial || sessao.empresa?.razao_social || '',
              razaoSocial: sessao.razaoSocial || sessao.razao_social || sessao.nomeEmpresa || sessao.nome_empresa || sessao.nomeFantasia || sessao.nome_fantasia || sessao.empresa?.razaoSocial || sessao.empresa?.razao_social || sessao.empresa?.nomeEmpresa || sessao.empresa?.nome_empresa || sessao.empresa?.nomeFantasia || sessao.empresa?.nome_fantasia || '',
              email: sessao.email,
              telefone: sessao.telefone,
              endereco: sessao.endereco
            };
          }
          // Opção 2: Dados dentro de empresa
          else if (sessao.empresa && sessao.empresa.cnpj) {
            dadosEmpresaEncontrados = {
              cnpj: sessao.empresa.cnpj,
              cnpjFormatado: sessao.empresa.cnpjFormatado || sessao.empresa.cnpj,
              nomeEmpresa: sessao.empresa.nomeEmpresa || sessao.empresa.nome_empresa || sessao.empresa.nomeFantasia || sessao.empresa.nome_fantasia || sessao.empresa.razaoSocial || sessao.empresa.razao_social || '',
              razaoSocial: sessao.empresa.razaoSocial || sessao.empresa.razao_social || '',
              email: sessao.empresa.email,
              telefone: sessao.empresa.telefone,
              endereco: sessao.empresa.endereco
            };
          }

          if (dadosEmpresaEncontrados) {
            console.log('✅ Dados da empresa encontrados:', dadosEmpresaEncontrados);
            setDadosEmpresa(dadosEmpresaEncontrados);

            // Salva no sessionStorage para compatibilidade
            sessionStorage.setItem('cnpj', dadosEmpresaEncontrados.cnpj);
            sessionStorage.setItem('nomeFantasia', dadosEmpresaEncontrados.nomeEmpresa);

            return;
          }
        }

        // ✅ FALLBACK 1: empresaLogada (chave canônica atual)
        console.log('🔄 Tentando fallback do sessionStorage...');
        const empresaLogadaRaw = sessionStorage.getItem('empresaLogada');
        if (empresaLogadaRaw) {
          try {
            const empresaLogada = JSON.parse(empresaLogadaRaw);
            const cnpjEmpresaLogada = empresaLogada.cnpj || empresaLogada.cnpj_formatado || '';
            if (cnpjEmpresaLogada) {
              const dadosEmpresaStorage = {
                cnpj: cnpjEmpresaLogada,
                cnpjFormatado: empresaLogada.cnpj_formatado || cnpjEmpresaLogada,
                nomeEmpresa: empresaLogada.nomeEmpresa || empresaLogada.nome_empresa || empresaLogada.nomeFantasia || empresaLogada.nome_fantasia || empresaLogada.razaoSocial || empresaLogada.razao_social || 'Empresa',
                razaoSocial: empresaLogada.razaoSocial || empresaLogada.razao_social || empresaLogada.nomeEmpresa || empresaLogada.nome_empresa || empresaLogada.nomeFantasia || empresaLogada.nome_fantasia || 'Empresa',
                email: empresaLogada.email || ''
              };

              console.log('✅ Usando empresaLogada do sessionStorage:', dadosEmpresaStorage);
              setDadosEmpresa(dadosEmpresaStorage);
              sessionStorage.setItem('cnpj', dadosEmpresaStorage.cnpj);
              sessionStorage.setItem('nomeFantasia', dadosEmpresaStorage.nomeEmpresa);
              return;
            }
          } catch (error) {
            console.error('Erro ao parse empresaLogada:', error);
          }
        }

        // ✅ FALLBACK 2: chaves legadas
        const cnpjInfo = sessionStorage.getItem('cnpj');
        const nomeFantasia = sessionStorage.getItem('nomeFantasia');
        const sessaoAtiva = sessionStorage.getItem('sessaoAtiva');

        if (cnpjInfo) {
          const dadosFallback = {
            cnpj: cnpjInfo,
            cnpjFormatado: cnpjInfo,
            nomeEmpresa: nomeFantasia || 'Empresa',
            razaoSocial: nomeFantasia || 'Empresa'
          };

          if (sessaoAtiva) {
            try {
              const sessaoData = JSON.parse(sessaoAtiva);
              Object.assign(dadosFallback, sessaoData);
            } catch (error) {
              console.error('Erro ao parse sessaoAtiva:', error);
            }
          }

          console.log('✅ Usando dados de fallback:', dadosFallback);
          setDadosEmpresa(dadosFallback);
          return;
        }

        // ✅ ÚLTIMO RECURSO: Erro
        if (cancelado) return;
        if (sessaoAutenticadaSemEmpresa) {
          console.error('❌ Usuário autenticado sem dados de empresa');
          showError("Dados da empresa ausentes. Faça login novamente ou contate o suporte.");
        } else {
          console.error('❌ Nenhuma sessão encontrada');
          showError("Sessão inválida. Por favor, faça o login novamente.");
        }
        setTimeout(() => onNavigate('home'), 2000);

      } catch (error) {
        if (cancelado) return;
        console.error('❌ Erro ao buscar sessão:', error);
        showError("Erro ao carregar dados da sessão.");
        setTimeout(() => onNavigate('home'), 2000);
      }
    };

    buscarDadosSessao();

    return () => { cancelado = true; };
  }, [onNavigate, showError]);

  useEffect(() => {
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
      const enderecoJaPreenchido = Boolean(
        endereco.rua?.trim() &&
        endereco.bairro?.trim() &&
        endereco.cidade?.trim()
      );

      if (enderecoJaPreenchido) {
        return;
      }

      showError(`Erro no CEP: ${erroCep}`);
    }
  }, [erroCep, endereco.rua, endereco.bairro, endereco.cidade, showError]);

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

  // ✅ FUNÇÃO PRINCIPAL CORRIGIDA - Confirmar e Enviar
  const confirmarEEnviarPedido = async () => {
    console.log('🚀 Iniciando confirmação do pedido...');

    // 1. Validações iniciais
    if (carrinho.length === 0 || calcularQuantidadeTotal() < 30 || !validarEndereco().isValid || !dadosEmpresa) {
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

    if (!dadosEmpresa || !dadosEmpresa.cnpj) {
      showError("Erro: Dados da empresa não encontrados. Faça o login novamente.");
      return;
    }

    setProcessandoPedido(true);

    try {
      console.log('📝 Montando dados do pedido...');

      // 2. Monta o objeto de dados para o serviço
      const dadosParaSalvar = {
        cnpj: dadosEmpresa.cnpj.replace(/\D/g, ''), // Remove máscara
        empresaNome: dadosEmpresa.nomeEmpresa || dadosEmpresa.razaoSocial || 'Empresa',
        itens: carrinho.map(item => ({
          id: item.id,
          nome: item.nome,
          quantidade: item.quantidade,
          preco: item.preco
        })),
        subtotal: calcularSubtotal(),
        taxaEntrega: calcularTaxaEntrega(),
        total: calcularSubtotal(),
        enderecoEntrega: formatarEnderecoCompleto(),
        observacoes: observacoes || '',
        metodoPagamento: 'whatsapp'
      };

      console.log('🔍 Dados que serão enviados para o Supabase:', {
        cnpj: dadosParaSalvar.cnpj,
        empresaNome: dadosParaSalvar.empresaNome,
        total: dadosParaSalvar.total,
        itens_count: dadosParaSalvar.itens.length
      });

      // 3. Tenta salvar o pedido no Supabase
      console.log('💾 Salvando pedido no Supabase...');
      const resultado = await pedidoService.criarPedido(dadosParaSalvar);

      console.log('📥 Resultado do Supabase:', resultado);

      // 4. Verifica o resultado
      if (!resultado.success) {
        console.error('❌ Erro ao salvar no Supabase:', resultado.error);
        showError(`Erro ao salvar pedido: ${resultado.error}`);
        setProcessandoPedido(false);
        return;
      }

      console.log('✅ PEDIDO SALVO COM SUCESSO NO SUPABASE!', resultado.pedido);
      success('Pedido salvo com sucesso! Redirecionando para o WhatsApp...');

      // 5. Salva backup no localStorage para admin
      try {
        const pedidosAdmin = JSON.parse(localStorage.getItem('pedidosAdmin') || '[]');
        const novoPedido = {
          id: resultado.pedido.id,
          numero: obterNumeroPedido(resultado.pedido),
          cliente: dadosParaSalvar.empresaNome,
          cnpj: dadosEmpresa.cnpjFormatado || dadosEmpresa.cnpj,
          total: dadosParaSalvar.total,
          status: 'enviado',
          data: new Date().toISOString(),
          itens: dadosParaSalvar.itens,
          enderecoEntrega: dadosParaSalvar.enderecoEntrega,
          observacoes: dadosParaSalvar.observacoes
        };

        pedidosAdmin.push(novoPedido);
        localStorage.setItem('pedidosAdmin', JSON.stringify(pedidosAdmin));
      } catch (error) {
        console.error('Erro ao salvar backup no localStorage:', error);
      }

      // 6. Formata a mensagem para o WhatsApp
      let mensagem = `*NOVO PEDIDO - FIT IN BOX*\n\n`;
      mensagem += `*Pedido:* #${obterNumeroPedido(resultado.pedido)}\n`;
      mensagem += `*Empresa:* ${dadosParaSalvar.empresaNome}\n`;
      mensagem += `*CNPJ:* ${dadosEmpresa.cnpjFormatado || dadosEmpresa.cnpj}\n`;
      mensagem += `*Data:* ${new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}\n\n`;

      mensagem += `*ITENS DO PEDIDO:*\n`;
      dadosParaSalvar.itens.forEach(item => {
        mensagem += `• ${item.quantidade}x ${item.nome} - R$ ${(item.quantidade * item.preco).toFixed(2)}\n`;
      });

      mensagem += `\n*RESUMO FINANCEIRO:*\n`;
      mensagem += `• Subtotal: R$ ${dadosParaSalvar.subtotal.toFixed(2)}\n`;
      mensagem += `• Taxa de entrega: ${dadosParaSalvar.taxaEntrega === 0 ? 'GRATIS' : `R$ ${dadosParaSalvar.taxaEntrega.toFixed(2)}`}\n`;
      mensagem += `• *TOTAL: R$ ${dadosParaSalvar.total.toFixed(2)}*\n\n`;

      mensagem += `*ENDEREÇO DE ENTREGA:*\n${dadosParaSalvar.enderecoEntrega}\n\n`;

      if (dadosParaSalvar.observacoes) {
        mensagem += `*OBSERVAÇÕES:*\n${dadosParaSalvar.observacoes}\n\n`;
      }

      mensagem += `Aguardo confirmação!`;

      // 7. Abre o WhatsApp
      abrirWhatsAppCompleto(mensagem);

      // 8. Limpa carrinho e navega
      setTimeout(() => {
        sessionStorage.removeItem('carrinho');
        limparCarrinho();

        if (!showWhatsAppFallback) {
          success('Pedido enviado com sucesso!');
          onNavigate('pedido-confirmado');
        }
      }, 4000);

    } catch (error) {
      console.error('❌ Erro crítico em confirmarEEnviarPedido:', error);
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

  // ✅ NOVO: Loading state enquanto busca dados da empresa
  if (!dadosEmpresa) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#f5f5f5',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '48px' }}>🔄</div>
        <div style={{ fontSize: '18px', color: '#666' }}>Carregando dados da sessão...</div>
      </div>
    );
  }

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
              CNPJ: {dadosEmpresa.cnpjFormatado || dadosEmpresa.cnpj}
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
            CNPJ: {dadosEmpresa.cnpjFormatado || dadosEmpresa.cnpj}
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
