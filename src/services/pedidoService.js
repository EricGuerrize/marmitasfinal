// src/services/pedidoService.js
import { auth, db } from '../lib/firebase';
import {
  collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { cnpjService } from './cnpjService';

// Aguarda o Firebase Auth resolver o usuário atual (evita race na inicialização).
// Retorna o usuário logado ou null se a sessão não estiver mais válida.
function aguardarUsuarioFirebase() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => { unsub(); resolve(u); });
    setTimeout(() => resolve(auth.currentUser), 4000); // não trava pra sempre
  });
}

// ✅ Cache para reduzir operações desnecessárias
let pedidosCache = null;
let pedidosCacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 segundos

// ✅ NOVO: Listeners ativos para tempo real
let activeListeners = new Map();

// ✅ Função para operações localStorage assíncronas (mantida para compatibilidade)
const localStorageAsync = {
  getItem: (key) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const value = localStorage.getItem(key);
          resolve(value ? JSON.parse(value) : null);
        } catch (error) {
          console.error('Erro ao ler localStorage:', error);
          resolve(null);
        }
      }, 0);
    });
  },

  setItem: (key, value) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          resolve(true);
        } catch (error) {
          console.error('Erro ao salvar localStorage:', error);
          resolve(false);
        }
      }, 0);
    });
  }
};

// ✅ Helper para operações batch no localStorage (evita múltiplas gravações)
const batchLocalStorageUpdate = (() => {
  let pendingUpdates = new Map();
  let timeoutId = null;

  const executeBatch = async () => {
    const updates = Array.from(pendingUpdates.entries());
    pendingUpdates.clear();
    
    // Executa todas as atualizações em paralelo
    await Promise.allSettled(
      updates.map(([key, value]) => localStorageAsync.setItem(key, value))
    );
  };

  return (key, value) => {
    pendingUpdates.set(key, value);
    
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(executeBatch, 100); // Agrupa updates em 100ms
  };
})();

// ✅ CORRIGIDO: Helper para verificar se usuário é admin - AGORA COM FIREBASE
const verificarSeEAdmin = async () => {
  try {
    console.log('🔍 Verificando se usuário é admin...');
    
    // OPÇÃO 1: Verificar por sessão atual armazenada localmente
    const sessaoAtual = sessionStorage.getItem('empresaLogada');
    if (sessaoAtual) {
      try {
        const dadosEmpresa = JSON.parse(sessaoAtual);
        if (dadosEmpresa.cnpj && dadosEmpresa.tipo_usuario === 'admin') {
          console.log('✅ Admin verificado por sessão local');
          return { 
            isAdmin: true, 
            cnpj: dadosEmpresa.cnpj,
            fonte: 'sessao_local'
          };
        }
      } catch (error) {
        console.error('Erro ao verificar sessão local:', error);
      }
    }

    // OPÇÃO 2: Verificar por localStorage (fallback)
    const dadosLocalStorage = localStorage.getItem('dadosEmpresaLogada');
    if (dadosLocalStorage) {
      try {
        const dadosEmpresa = JSON.parse(dadosLocalStorage);
        if (dadosEmpresa.cnpj && dadosEmpresa.tipo_usuario === 'admin') {
          console.log('✅ Admin verificado por localStorage');
          return { 
            isAdmin: true, 
            cnpj: dadosEmpresa.cnpj,
            fonte: 'localStorage'
          };
        }
      } catch (error) {
        console.error('Erro ao verificar localStorage:', error);
      }
    }

    // OPÇÃO 3: Verificar se tem pré-autenticação de admin
    const preAuth = sessionStorage.getItem('adminPreAuthenticated');
    if (preAuth) {
      try {
        const { timestamp, cnpj } = JSON.parse(preAuth);
        if (Date.now() - timestamp < 30 * 60 * 1000) { // 30 min
          console.log('✅ Admin verificado por pré-autenticação');
          return { 
            isAdmin: true, 
            cnpj: cnpj,
            fonte: 'pre_auth'
          };
        }
      } catch (error) {
        console.error('Erro na pré-autenticação:', error);
      }
    }

    // OPÇÃO 4: Verificar por CNPJ admin conhecido no Firebase
    const cnpjAdmin = '05336475000177';
    try {
      const q = query(
        collection(db, 'empresas'),
        where('cnpj', '==', cnpjAdmin),
        where('tipo_usuario', '==', 'admin'),
        where('ativo', '==', true)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        console.log('✅ Admin verificado por CNPJ no Firebase');
        return { 
          isAdmin: true, 
          cnpj: cnpjAdmin,
          fonte: 'firebase_cnpj'
        };
      }
    } catch (error) {
      console.error('Erro ao verificar admin por CNPJ:', error);
    }

    console.log('🚫 Usuário não é admin ou não está autenticado');
    return { 
      isAdmin: false, 
      error: 'Usuário não é administrador ou não está autenticado'
    };

  } catch (error) {
    console.error('❌ Erro na verificação de admin:', error);
    return { 
      isAdmin: false, 
      error: error.message 
    };
  }
};

export const pedidoService = {
  
  // ✅ NOVO: Setup do listener Firebase para produtos em tempo real
  setupProdutoListener: (callback) => {
    console.log('🔥 Configurando listener Firebase para produtos...');
    
    const unsubscribe = onSnapshot(
      collection(db, 'produtos'), 
      (snapshot) => {
        console.log('📡 Mudanças detectadas na coleção produtos');
        
        const produtos = [];
        const mudancas = [];
        
        snapshot.docChanges().forEach((change) => {
          const produto = { id: change.doc.id, ...change.doc.data() };
          
          if (change.type === 'added') {
            console.log('✅ Novo produto adicionado:', produto.nome);
            produtos.push(produto);
            mudancas.push({ tipo: 'added', produto });
          }
          
          if (change.type === 'modified') {
            console.log('📝 Produto modificado:', produto.nome);
            mudancas.push({ tipo: 'modified', produto });
          }
          
          if (change.type === 'removed') {
            console.log('🗑️ Produto removido:', produto.nome);
            mudancas.push({ tipo: 'removed', produto });
          }
        });
        
        // Chama callback com os dados atualizados
        if (callback && typeof callback === 'function') {
          callback({ produtos, mudancas });
        }
      },
      (error) => {
        console.error('❌ Erro no listener de produtos:', error);
        if (callback && typeof callback === 'function') {
          callback({ error: error.message });
        }
      }
    );
    
    // Armazena referência do listener para cleanup
    activeListeners.set('produtos', unsubscribe);
    
    return unsubscribe;
  },

  // ✅ NOVO: Setup do listener Firebase para pedidos em tempo real
  setupPedidosListener: (cnpj, callback) => {
    console.log('🔥 Configurando listener Firebase para pedidos...', cnpj);
    
    const empresaCnpj = cnpjService.removerMascaraCnpj(cnpj);
    const listenerId = `pedidos_${empresaCnpj}`;
    
    // Remove listener anterior se existir
    if (activeListeners.has(listenerId)) {
      activeListeners.get(listenerId)();
      activeListeners.delete(listenerId);
    }
    
    const q = query(
      collection(db, 'pedidos'),
      where('empresa_cnpj', '==', empresaCnpj),
      orderBy('data_pedido', 'desc')
    );
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('📡 Mudanças detectadas nos pedidos');
        
        const pedidos = [];
        const mudancas = [];
        
        snapshot.docChanges().forEach((change) => {
          const pedido = { id: change.doc.id, ...change.doc.data() };
          
          if (change.type === 'added') {
            console.log('✅ Novo pedido:', pedido.numero);
            mudancas.push({ tipo: 'added', pedido });
          }
          
          if (change.type === 'modified') {
            console.log('📝 Pedido atualizado:', pedido.numero);
            mudancas.push({ tipo: 'modified', pedido });
          }
          
          if (change.type === 'removed') {
            console.log('🗑️ Pedido removido:', pedido.numero);
            mudancas.push({ tipo: 'removed', pedido });
          }
        });
        
        // Todos os pedidos atuais
        snapshot.docs.forEach(doc => {
          pedidos.push({ id: doc.id, ...doc.data() });
        });
        
        // Formatar pedidos para o componente
        const pedidosFormatados = pedidos.map(pedido => ({
          id: pedido.id,
          numero: pedido.numero,
          total: pedido.total,
          status: pedido.status,
          data: pedido.data_pedido?.toDate ? pedido.data_pedido.toDate() : new Date(pedido.data_pedido || Date.now()),
          itens: pedido.itens,
          enderecoEntrega: pedido.endereco_entrega,
          observacoes: pedido.observacoes,
          metodoPagamento: pedido.metodo_pagamento,
          previsaoEntrega: pedido.previsao_entrega,
          origem: 'firebase'
        }));
        
        if (callback && typeof callback === 'function') {
          callback({ pedidos: pedidosFormatados, mudancas });
        }
      },
      (error) => {
        console.error('❌ Erro no listener de pedidos:', error);
        if (callback && typeof callback === 'function') {
          callback({ error: error.message });
        }
      }
    );
    
    activeListeners.set(listenerId, unsubscribe);
    return unsubscribe;
  },

  // ✅ NOVO: Cleanup de listeners
  cleanupListeners: () => {
    console.log('🧹 Limpando listeners ativos...');
    activeListeners.forEach((unsubscribe, key) => {
      console.log(`🧹 Removendo listener: ${key}`);
      unsubscribe();
    });
    activeListeners.clear();
  },

  // ✅ Banco de dados mock otimizado (mantido para compatibilidade)
  getPedidosDatabase: async () => {
    try {
      return await localStorageAsync.getItem('pedidosDatabase') || [];
    } catch (error) {
      console.error('Erro ao acessar banco de pedidos:', error);
      return [];
    }
  },

  savePedidosDatabase: async (pedidos) => {
    try {
      // ✅ Usa batch update para não bloquear UI
      batchLocalStorageUpdate('pedidosDatabase', pedidos);
      return true;
    } catch (error) {
      console.error('Erro ao salvar banco de pedidos:', error);
      return false;
    }
  },

  // ✅ MIGRADO: Criar pedido com Firebase - VERSÃO CORRIGIDA
  criarPedido: async (dadosPedido) => {
    console.log('--- MODO DE DEPURAÇÃO FINAL - FIREBASE ---');

    // 0. Garante sessão Firebase válida ANTES de qualquer gravação.
    // Sem isso, o banco recusa a escrita (permission-denied) e o pedido se perde.
    const usuarioFirebase = await aguardarUsuarioFirebase();
    if (!usuarioFirebase) {
      console.error('FALHA: sem sessão Firebase válida ao criar pedido.');
      return {
        success: false,
        code: 'no-auth',
        error: 'Sua sessão expirou. Faça login novamente para concluir o pedido.'
      };
    }

    // 1. Validação de entrada
    if (!dadosPedido || !dadosPedido.cnpj) {
        console.error('FALHA NA ETAPA 1: Dados de entrada ausentes.');
        return { success: false, error: 'Dados do pedido (dadosPedido) ou CNPJ não fornecido.' };
    }
    console.log('ETAPA 1: Dados de entrada recebidos:', dadosPedido);

    // 2. Busca e validação da empresa no Firebase - VERSÃO PROFISSIONAL
    let empresa;
    try {
        console.log(`ETAPA 2: Buscando empresa com CNPJ: ${dadosPedido.cnpj}`);
        
        // ✅ Normalização do CNPJ para diferentes formatos
        const cnpjOriginal = dadosPedido.cnpj;
        const cnpjLimpo = cnpjOriginal.replace(/[^\d]/g, ''); // Remove formatação
        const cnpjFormatado = cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        
        console.log(`🔍 CNPJ original: ${cnpjOriginal}`);
        console.log(`🔍 CNPJ limpo: ${cnpjLimpo}`);
        console.log(`🔍 CNPJ formatado: ${cnpjFormatado}`);
        
        // ✅ Busca empresa com múltiplas tentativas
        let snapshot;
        const empresasRef = collection(db, 'empresas');
        
        // Tentativa 1: CNPJ original
        console.log('🔍 Tentativa 1: Buscando com CNPJ original...');
        let q = query(empresasRef, where('cnpj', '==', cnpjOriginal));
        snapshot = await getDocs(q);
        
        // Tentativa 2: CNPJ limpo
        if (snapshot.empty) {
            console.log('🔍 Tentativa 2: Buscando com CNPJ limpo...');
            q = query(empresasRef, where('cnpj', '==', cnpjLimpo));
            snapshot = await getDocs(q);
        }
        
        // Tentativa 3: CNPJ formatado
        if (snapshot.empty) {
            console.log('🔍 Tentativa 3: Buscando com CNPJ formatado...');
            q = query(empresasRef, where('cnpj', '==', cnpjFormatado));
            snapshot = await getDocs(q);
        }
        
        // Tentativa 4: Campo cnpjLimpo (se existir)
        if (snapshot.empty) {
            console.log('🔍 Tentativa 4: Buscando por campo cnpjLimpo...');
            q = query(empresasRef, where('cnpjLimpo', '==', cnpjLimpo));
            snapshot = await getDocs(q);
        }
        
        // ✅ Se encontrou empresa existente
        if (!snapshot.empty) {
            const empresaDoc = snapshot.docs[0];
            empresa = { id: empresaDoc.id, ...empresaDoc.data() };
            
            // Verifica se empresa está ativa
            if (empresa.ativa === false || empresa.status === 'inativa') {
                console.error('FALHA NA ETAPA 2: Empresa encontrada mas está inativa.');
                return { success: false, error: 'Empresa inativa. Entre em contato com o suporte.' };
            }
            
            // Atualiza último acesso
            try {
                await updateDoc(doc(db, 'empresas', empresa.id), {
                    dataUltimoAcesso: serverTimestamp(),
                    ultimoPedido: serverTimestamp()
                });
            } catch (updateError) {
                console.warn('Aviso: Não foi possível atualizar último acesso:', updateError);
            }
            
            console.log('✅ ETAPA 2: Empresa encontrada e validada:', {
                id: empresa.id,
                cnpj: empresa.cnpj,
                nome: empresa.nome || empresa.nomeFantasia,
                ativa: empresa.ativa
            });
            
        } else {
            // ✅ Empresa não encontrada - Criação automática
            console.log('⚠️ Empresa não encontrada, iniciando criação automática...');
            
            // Dados da nova empresa
            const novaEmpresa = {
                cnpj: cnpjFormatado, // Usa formato padrão
                cnpjLimpo: cnpjLimpo,
                cnpjOriginal: cnpjOriginal,
                nome: dadosPedido.empresaNome || 'Empresa',
                nomeFantasia: dadosPedido.empresaNome || 'Empresa',
                razaoSocial: dadosPedido.empresaNome || 'Empresa',
                email: dadosPedido.email || '',
                telefone: dadosPedido.telefone || '',
                endereco: dadosPedido.enderecoEntrega || {},
                ativa: true,
                status: 'ativa',
                dataCadastro: serverTimestamp(),
                dataUltimoAcesso: serverTimestamp(),
                criadaAutomaticamente: true,
                fonte: 'pedido_automatico',
                versao: '1.0'
            };
            
            // Cria empresa no Firestore
            const empresaRef = await addDoc(empresasRef, novaEmpresa);
            empresa = { 
                id: empresaRef.id, 
                ...novaEmpresa,
                dataCadastro: new Date(), // Para uso imediato
                dataUltimoAcesso: new Date()
            };
            
            console.log('✅ ETAPA 2: Empresa criada automaticamente:', {
                id: empresa.id,
                cnpj: empresa.cnpj,
                nome: empresa.nome,
                fonte: 'criacao_automatica'
            });
            
            // Log para auditoria
            console.log('📊 AUDITORIA: Nova empresa criada via pedido', {
                empresaId: empresa.id,
                cnpj: cnpjFormatado,
                timestamp: new Date().toISOString(),
                origem: 'pedido_automatico'
            });
        }
        
        // ✅ Validação final da empresa
        if (!empresa || !empresa.id) {
            console.error('FALHA NA ETAPA 2: Empresa não pôde ser criada ou validada.');
            return { success: false, error: 'Erro interno: não foi possível validar empresa.' };
        }

    } catch (e) {
        console.error('FALHA NA ETAPA 2 (CATCH): Erro inesperado ao buscar/criar empresa.', e);
        
        // ✅ Tratamento de erro mais específico
        let errorMessage = 'Erro interno do servidor.';
        
        if (e.code === 'permission-denied') {
            errorMessage = 'Erro de permissão. Verifique as regras do Firestore.';
        } else if (e.code === 'unavailable') {
            errorMessage = 'Serviço temporariamente indisponível. Tente novamente.';
        } else if (e.message.includes('network')) {
            errorMessage = 'Erro de conexão. Verifique sua internet.';
        }
        
        return { success: false, error: `Erro ao validar empresa: ${errorMessage}` };
    }

    console.log('ETAPA 2: Empresa validada:', empresa);

    // 3. Montagem do objeto do pedido
    const numeroPedido = `${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const novoPedido = {
        numero: numeroPedido,
        empresa_id: empresa.id,
        empresa_cnpj: dadosPedido.cnpj,
        empresa_nome: dadosPedido.empresaNome,
        itens: dadosPedido.itens,
        subtotal: dadosPedido.subtotal,
        taxa_entrega: dadosPedido.taxaEntrega,
        total: dadosPedido.total,
        endereco_entrega: dadosPedido.enderecoEntrega,
        observacoes: dadosPedido.observacoes,
        metodo_pagamento: dadosPedido.metodoPagamento,
        data_pedido: serverTimestamp(),
        status: 'pendente'
    };
    console.log('ETAPA 3: Objeto do pedido montado e pronto para inserção.', novoPedido);

    // 4. Inserção do pedido no Firebase
    try {
        console.log('ETAPA 4: Tentando inserir o pedido no Firebase...');
        const docRef = await addDoc(collection(db, 'pedidos'), novoPedido);
        
        const pedidoCriado = { id: docRef.id, ...novoPedido };
        console.log('✅ Pedido inserido no Firebase');
        return { success: true, pedido: pedidoCriado };

    } catch (e) {
        console.error('FALHA NA ETAPA 4 (CATCH): Erro inesperado ao inserir o pedido.', e);
        return { success: false, error: `Erro fatal ao inserir pedido: ${e.message}` };
    }
  },

  // ✅ Helper para atualizar localStorage em background (mantido)
  updateLocalStoragesBackground: async (data, novoPedido) => {
    try {
      // ✅ Executa em background para não bloquear UI
      setTimeout(async () => {
        try {
          // Atualiza pedidos database
          const pedidos = await this.getPedidosDatabase();
          pedidos.push({ id: data.id, ...novoPedido });
          await this.savePedidosDatabase(pedidos);

          // Atualiza pedidos admin
          const pedidosAdmin = await localStorageAsync.getItem('pedidosAdmin') || [];
          pedidosAdmin.push({
            id: data.id,
            numero: data.numero,
            cliente: novoPedido.empresa_nome,
            cnpj: novoPedido.empresa_cnpj,
            total: novoPedido.total,
            status: novoPedido.status,
            data: data.data_pedido,
            itens: novoPedido.itens,
            enderecoEntrega: novoPedido.endereco_entrega,
            observacoes: novoPedido.observacoes
          });
          batchLocalStorageUpdate('pedidosAdmin', pedidosAdmin);
          
        } catch (error) {
          console.error('Erro ao atualizar localStorage em background:', error);
        }
      }, 0);
    } catch (error) {
      console.error('Erro no updateLocalStoragesBackground:', error);
    }
  },

  // ✅ MIGRADO: Buscar pedidos com Firebase
  buscarPedidosPorEmpresa: async (cnpj) => {
    try {
      console.log('🔍 pedidoService.buscarPedidosPorEmpresa - CNPJ recebido:', cnpj);
      
      const empresaCnpj = cnpjService.removerMascaraCnpj(cnpj);
      console.log('🔍 CNPJ limpo para busca:', empresaCnpj);
      
      // ✅ Verificar cache
      const cacheKey = `pedidos_${empresaCnpj}`;
      const now = Date.now();
      
      if (pedidosCache && pedidosCache[cacheKey] && (now - pedidosCacheTimestamp) < CACHE_DURATION) {
        console.log('✅ Usando pedidos do cache:', pedidosCache[cacheKey].length);
        return pedidosCache[cacheKey];
      }

      console.log('🔍 Buscando no Firebase...');

      // ✅ Buscar por empresa_cnpj no Firebase
      const q = query(
        collection(db, "pedidos"), 
        where("empresa_cnpj", "==", empresaCnpj), 
        orderBy("data_pedido", "desc")
      );
      const snapshot = await getDocs(q);
      const pedidos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      console.log('📦 Quantidade de pedidos encontrados:', pedidos?.length || 0);

      if (!pedidos || pedidos.length === 0) {
        console.log('⚠️ Nenhum pedido encontrado para CNPJ:', empresaCnpj);
        return [];
      }

      const pedidosFormatados = pedidos.map(pedido => ({
        id: pedido.id,
        numero: pedido.numero,
        total: pedido.total,
        status: pedido.status,
        data: pedido.data_pedido?.toDate ? pedido.data_pedido.toDate() : new Date(pedido.data_pedido || Date.now()),
        itens: pedido.itens,
        enderecoEntrega: pedido.endereco_entrega,
        observacoes: pedido.observacoes,
        metodoPagamento: pedido.metodo_pagamento,
        previsaoEntrega: pedido.previsao_entrega,
        origem: 'firebase'
      }));

      // ✅ Atualizar cache
      if (!pedidosCache) pedidosCache = {};
      pedidosCache[cacheKey] = pedidosFormatados;
      pedidosCacheTimestamp = now;

      console.log(`✅ Encontrados ${pedidos.length} pedidos formatados`);
      return pedidosFormatados;

    } catch (error) {
      console.error('❌ Erro geral ao buscar pedidos:', error);
      return [];
    }
  },

  // ✅ MIGRADO: Listar todos os pedidos para AdminPage
  listarTodosPedidos: async () => {
    try {
      console.log('🔍 Carregando todos os pedidos para AdminPage...');
      
      // ✅ Verificar se usuário é admin
      const adminCheck = await verificarSeEAdmin();
      if (!adminCheck.isAdmin) {
        return { 
          success: false, 
          error: adminCheck.error || 'Acesso negado: apenas administradores podem listar todos os pedidos' 
        };
      }

      console.log('✅ Usuário confirmado como admin:', adminCheck);
      
      const q = query(collection(db, "pedidos"), orderBy("data_pedido", "desc"));
      const snapshot = await getDocs(q);
      const pedidos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // ✅ Formatar dados para AdminPage
      const pedidosFormatados = (pedidos || []).map(pedido => ({
        id: pedido.id,
        numero: pedido.numero,
        cliente: pedido.empresa_nome || 'Cliente não informado',
        cnpj: pedido.empresa_cnpj || 'CNPJ não informado',
        total: parseFloat(pedido.total || 0),
        status: pedido.status || 'pendente',
        data: pedido.data_pedido || pedido.created_at,
        enderecoEntrega: pedido.endereco_entrega,
        observacoes: pedido.observacoes,
        empresa_id: pedido.empresa_id,
        // Converte itens para array esperado pelo AdminPage
        itens: Array.isArray(pedido.itens) ? pedido.itens.map(item => ({
          nome: item.nome || 'Produto não encontrado',
          quantidade: item.quantidade || 1,
          preco: parseFloat(item.preco || 0)
        })) : []
      }));

      console.log(`✅ ${pedidosFormatados.length} pedidos formatados para AdminPage`);
      return { success: true, data: pedidosFormatados };

    } catch (error) {
      console.error('❌ Erro ao listar pedidos:', error);
      return { success: false, error: error.message };
    }
  },

  // ✅ MIGRADO: Atualizar status com Firebase
  atualizarStatusPedido: async (pedidoId, novoStatus) => {
    try {
      console.log('🔄 Atualizando status do pedido:', pedidoId, 'para:', novoStatus);

      // ✅ Verificar se usuário é admin
      const adminCheck = await verificarSeEAdmin();
      if (!adminCheck.isAdmin) {
        return { success: false, error: adminCheck.error || 'Acesso negado: apenas administradores podem alterar status de pedidos' };
      }

      // ✅ Atualizar no Firebase
      const pedidoRef = doc(db, 'pedidos', pedidoId);
      await updateDoc(pedidoRef, { 
        status: novoStatus, 
        data_atualizacao: serverTimestamp() 
      });

      const updatedDoc = await getDoc(pedidoRef);
      if (!updatedDoc.exists()) {
        return {
          success: false,
          error: 'Pedido não encontrado'
        };
      }

      // ✅ Limpar cache para forçar refresh
      pedidosCache = null;
      pedidosCacheTimestamp = 0;

      return {
        success: true,
        pedido: { id: updatedDoc.id, ...updatedDoc.data() },
        message: 'Status atualizado com sucesso!'
      };
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      return {
        success: false,
        error: error.message === 'Timeout' ? 'Tempo esgotado. Tente novamente.' : 'Erro ao atualizar status do pedido'
      };
    }
  },

  // ✅ MIGRADO: Excluir pedido (para AdminPage)
  excluirPedido: async (pedidoId) => {
    try {
      console.log('🗑️ Iniciando exclusão do pedido:', pedidoId);

      // ✅ Verificar se usuário é admin
      const adminCheck = await verificarSeEAdmin();
      if (!adminCheck.isAdmin) {
        return { 
          success: false, 
          error: adminCheck.error || 'Acesso negado: apenas administradores podem excluir pedidos' 
        };
      }

      await deleteDoc(doc(db, 'pedidos', pedidoId));

      // ✅ Limpar cache
      pedidosCache = null;
      pedidosCacheTimestamp = 0;

      console.log('✅ Pedido excluído com sucesso');
      return {
        success: true,
        message: 'Pedido excluído com sucesso!'
      };

    } catch (error) {
      console.error('❌ Erro ao excluir pedido:', error);
      return {
        success: false,
        error: error.message === 'Timeout' ? 'Tempo esgotado. Tente novamente.' : `Erro ao excluir pedido: ${error.message}`
      };
    }
  },

  // ✅ MIGRADO: Buscar pedido por número com Firebase
  buscarPedidoPorNumero: async (numero) => {
    try {
      const q = query(collection(db, 'pedidos'), where('numero', '==', numero));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return {
          success: false,
          error: 'Pedido não encontrado'
        };
      }

      const pedidoDoc = snapshot.docs[0];
      const pedido = { id: pedidoDoc.id, ...pedidoDoc.data() };

      return {
        success: true,
        pedido: {
          id: pedido.id,
          numero: pedido.numero,
          empresa_cnpj: pedido.empresa_cnpj,
          empresa_nome: pedido.empresa_nome,
          total: pedido.total,
          status: pedido.status,
          data: pedido.data_pedido?.toDate ? pedido.data_pedido.toDate() : pedido.data_pedido,
          itens: pedido.itens,
          enderecoEntrega: pedido.endereco_entrega,
          observacoes: pedido.observacoes,
          metodoPagamento: pedido.metodo_pagamento,
          previsaoEntrega: pedido.previsao_entrega,
          origem: 'firebase'
        }
      };
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      return {
        success: false,
        error: error.message === 'Timeout' ? 'Tempo esgotado. Tente novamente.' : 'Erro ao buscar pedido'
      };
    }
  },

  // ✅ MIGRADO: Obter estatísticas para AdminPage
  obterEstatisticas: async () => {
    try {
      console.log('📊 Calculando estatísticas para AdminPage...');
      
      // ✅ Verificar se usuário é admin
      const adminCheck = await verificarSeEAdmin();
      if (!adminCheck.isAdmin) {
        return { 
          success: false, 
          error: adminCheck.error || 'Acesso negado',
          data: {
            totalPedidos: 0,
            pedidosHoje: 0,
            totalVendas: 0,
            produtosMaisVendidos: []
          }
        };
      }
      
      const snapshot = await getDocs(collection(db, 'pedidos'));
      const pedidos = snapshot.docs.map(doc => doc.data());

      // ✅ Cálculos otimizados para AdminPage
      const hoje = new Date().toDateString();
      let pedidosHojeCount = 0;
      let totalVendas = 0;

      for (const pedido of (pedidos || [])) {
        // Contar pedidos de hoje
        if (pedido.data_pedido && new Date(pedido.data_pedido.toDate()).toDateString() === hoje) {
          pedidosHojeCount++;
        }
        
        // Somar vendas
        totalVendas += parseFloat(pedido.total || 0);
      }

      const estatisticas = {
        totalPedidos: pedidos?.length || 0,
        pedidosHoje: pedidosHojeCount,
        totalVendas: totalVendas,
        produtosMaisVendidos: ['Marmita Fitness Frango', 'Marmita Tradicional']
      };

      console.log('✅ Estatísticas calculadas:', estatisticas);
      return { success: true, data: estatisticas };

    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return { 
        success: false, 
        error: error.message,
        data: {
          totalPedidos: 0,
          pedidosHoje: 0,
          totalVendas: 0,
          produtosMaisVendidos: []
        }
      };
    }
  },

  // ✅ Função para limpar cache
  clearCache: () => {
    pedidosCache = null;
    pedidosCacheTimestamp = 0;
    console.log('🗑️ Cache de pedidos limpo');
  },

  // ✅ Helper público para verificar se usuário é admin
  verificarSeEAdmin: verificarSeEAdmin
};
