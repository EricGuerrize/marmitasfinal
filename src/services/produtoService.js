// src/services/produtoService.js

export const produtoService = {
  
  // Banco de dados mock para produtos
  getProdutosDatabase: () => {
    try {
      const produtos = localStorage.getItem('produtosDatabase');
      return produtos ? JSON.parse(produtos) : [];
    } catch (error) {
      console.error('Erro ao acessar banco de produtos:', error);
      return [];
    }
  },

  saveProdutosDatabase: (produtos) => {
    try {
      localStorage.setItem('produtosDatabase', JSON.stringify(produtos));
      return true;
    } catch (error) {
      console.error('Erro ao salvar banco de produtos:', error);
      return false;
    }
  },

  // Inicializar produtos padrão se não existirem
  inicializarProdutosPadrao: () => {
    const produtosExistentes = this.getProdutosDatabase();
    
    if (produtosExistentes.length === 0) {
      const produtosPadrao = [
        {
          id: 1,
          nome: 'Marmita Fitness Frango',
          descricao: 'Peito de frango grelhado, arroz integral, brócolis e cenoura',
          preco: 18.90,
          categoria: 'fitness',
          imagem: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop',
          disponivel: true,
          estoque: 100,
          data_criacao: new Date().toISOString(),
          data_atualizacao: new Date().toISOString()
        },
        {
          id: 2,
          nome: 'Marmita Vegana',
          descricao: 'Quinoa, grão-de-bico, abobrinha refogada e salada verde',
          preco: 16.90,
          categoria: 'vegana',
          imagem: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop',
          disponivel: true,
          estoque: 100,
          data_criacao: new Date().toISOString(),
          data_atualizacao: new Date().toISOString()
        },
        {
          id: 3,
          nome: 'Marmita Tradicional',
          descricao: 'Bife acebolado, arroz, feijão, farofa e salada',
          preco: 15.90,
          categoria: 'tradicional',
          imagem: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop',
          disponivel: true,
          estoque: 100,
          data_criacao: new Date().toISOString(),
          data_atualizacao: new Date().toISOString()
        },
        {
          id: 4,
          nome: 'Marmita Low Carb',
          descricao: 'Salmão grelhado, couve-flor gratinada e aspargos',
          preco: 22.90,
          categoria: 'fitness',
          imagem: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=300&h=200&fit=crop',
          disponivel: true,
          estoque: 100,
          data_criacao: new Date().toISOString(),
          data_atualizacao: new Date().toISOString()
        },
        {
          id: 5,
          nome: 'Marmita do Chef',
          descricao: 'Risotto de camarão com legumes e ervas finas',
          preco: 28.90,
          categoria: 'gourmet',
          imagem: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=300&h=200&fit=crop',
          disponivel: true,
          estoque: 100,
          data_criacao: new Date().toISOString(),
          data_atualizacao: new Date().toISOString()
        },
        {
          id: 6,
          nome: 'Marmita Vegetariana',
          descricao: 'Lasanha de berinjela, salada de rúcula e tomate seco',
          preco: 17.90,
          categoria: 'vegana',
          imagem: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop',
          disponivel: true,
          estoque: 100,
          data_criacao: new Date().toISOString(),
          data_atualizacao: new Date().toISOString()
        },
        {
          id: 7,
          nome: 'Marmita Proteica',
          descricao: 'Carne vermelha magra, batata doce e mix de vegetais',
          preco: 21.90,
          categoria: 'fitness',
          imagem: 'https://images.unsplash.com/photo-1551782450-17144efb9c50?w=300&h=200&fit=crop',
          disponivel: true,
          estoque: 100,
          data_criacao: new Date().toISOString(),
          data_atualizacao: new Date().toISOString()
        },
        {
          id: 8,
          nome: 'Marmita Detox',
          descricao: 'Salada completa com grãos, frutas e molho especial',
          preco: 19.90,
          categoria: 'vegana',
          imagem: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop',
          disponivel: true,
          estoque: 100,
          data_criacao: new Date().toISOString(),
          data_atualizacao: new Date().toISOString()
        },
        {
          id: 9,
          nome: 'Marmita Executiva',
          descricao: 'Peixe grelhado, arroz de brócolis e legumes sauteados',
          preco: 25.90,
          categoria: 'gourmet',
          imagem: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=300&h=200&fit=crop',
          disponivel: true,
          estoque: 100,
          data_criacao: new Date().toISOString(),
          data_atualizacao: new Date().toISOString()
        },
        {
          id: 10,
          nome: 'Marmita Caseira',
          descricao: 'Frango desfiado, purê de batata e salada mista',
          preco: 16.90,
          categoria: 'tradicional',
          imagem: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop',
          disponivel: true,
          estoque: 100,
          data_criacao: new Date().toISOString(),
          data_atualizacao: new Date().toISOString()
        }
      ];
      
      this.saveProdutosDatabase(produtosPadrao);
      
      // Também salva no formato do admin para compatibilidade
      localStorage.setItem('adminProdutos', JSON.stringify(produtosPadrao));
      
      console.log('✅ Produtos padrão inicializados');
      return produtosPadrao;
    }
    
    return produtosExistentes;
  },

  // Listar produtos disponíveis
  listarProdutos: async () => {
    try {
      console.log('📋 Carregando produtos...');
      
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Inicializa produtos padrão se necessário
      const produtos = this.inicializarProdutosPadrao();
      
      // Retorna apenas produtos disponíveis
      const produtosDisponiveis = produtos
        .filter(produto => produto.disponivel)
        .sort((a, b) => a.nome.localeCompare(b.nome));
      
      console.log(`✅ ${produtosDisponiveis.length} produtos carregados`);
      
      return produtosDisponiveis;
      
    } catch (error) {
      console.error('❌ Erro ao carregar produtos:', error);
      return [];
    }
  },

  // Buscar produto por ID
  buscarProdutoPorId: async (id) => {
    try {
      const produtos = this.getProdutosDatabase();
      const produto = produtos.find(p => p.id === id);
      
      if (!produto) {
        return {
          success: false,
          error: 'Produto não encontrado'
        };
      }
      
      return {
        success: true,
        produto: produto
      };
      
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      return {
        success: false,
        error: 'Erro ao buscar produto'
      };
    }
  },

  // Criar novo produto (admin)
  criarProduto: async (dadosProduto) => {
    try {
      console.log('➕ Criando novo produto:', dadosProduto.nome);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const produtos = this.getProdutosDatabase();
      const novoId = produtos.length > 0 ? Math.max(...produtos.map(p => p.id)) + 1 : 1;
      
      const novoProduto = {
        id: novoId,
        nome: dadosProduto.nome,
        descricao: dadosProduto.descricao,
        preco: parseFloat(dadosProduto.preco),
        categoria: dadosProduto.categoria,
        imagem: dadosProduto.imagem,
        disponivel: dadosProduto.disponivel !== false,
        estoque: parseInt(dadosProduto.estoque) || 100,
        data_criacao: new Date().toISOString(),
        data_atualizacao: new Date().toISOString()
      };
      
      produtos.push(novoProduto);
      this.saveProdutosDatabase(produtos);
      
      // Atualiza também o formato admin
      localStorage.setItem('adminProdutos', JSON.stringify(produtos));
      
      console.log('✅ Produto criado com sucesso:', novoProduto.nome);
      
      return {
        success: true,
        produto: novoProduto,
        message: 'Produto criado com sucesso!'
      };
      
    } catch (error) {
      console.error('❌ Erro ao criar produto:', error);
      return {
        success: false,
        error: 'Erro ao criar produto'
      };
    }
  },

  // Atualizar produto (admin)
  atualizarProduto: async (id, dadosProduto) => {
    try {
      console.log('✏️ Atualizando produto:', id);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const produtos = this.getProdutosDatabase();
      const produtoIndex = produtos.findIndex(p => p.id === id);
      
      if (produtoIndex === -1) {
        return {
          success: false,
          error: 'Produto não encontrado'
        };
      }
      
      const produtoAtualizado = {
        ...produtos[produtoIndex],
        nome: dadosProduto.nome,
        descricao: dadosProduto.descricao,
        preco: parseFloat(dadosProduto.preco),
        categoria: dadosProduto.categoria,
        imagem: dadosProduto.imagem,
        disponivel: dadosProduto.disponivel,
        estoque: parseInt(dadosProduto.estoque),
        data_atualizacao: new Date().toISOString()
      };
      
      produtos[produtoIndex] = produtoAtualizado;
      this.saveProdutosDatabase(produtos);
      
      // Atualiza também o formato admin
      localStorage.setItem('adminProdutos', JSON.stringify(produtos));
      
      console.log('✅ Produto atualizado com sucesso');
      
      return {
        success: true,
        produto: produtoAtualizado,
        message: 'Produto atualizado com sucesso!'
      };
      
    } catch (error) {
      console.error('❌ Erro ao atualizar produto:', error);
      return {
        success: false,
        error: 'Erro ao atualizar produto'
      };
    }
  },

  // Deletar produto (admin)
  deletarProduto: async (id) => {
    try {
      console.log('🗑️ Deletando produto:', id);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const produtos = this.getProdutosDatabase();
      const produtoIndex = produtos.findIndex(p => p.id === id);
      
      if (produtoIndex === -1) {
        return {
          success: false,
          error: 'Produto não encontrado'
        };
      }
      
      const produtoRemovido = produtos[produtoIndex];
      produtos.splice(produtoIndex, 1);
      
      this.saveProdutosDatabase(produtos);
      
      // Atualiza também o formato admin
      localStorage.setItem('adminProdutos', JSON.stringify(produtos));
      
      console.log('✅ Produto deletado:', produtoRemovido.nome);
      
      return {
        success: true,
        message: 'Produto deletado com sucesso!'
      };
      
    } catch (error) {
      console.error('❌ Erro ao deletar produto:', error);
      return {
        success: false,
        error: 'Erro ao deletar produto'
      };
    }
  },

  // Ativar/desativar produto (admin)
  toggleDisponibilidade: async (id) => {
    try {
      console.log('🔄 Alterando disponibilidade do produto:', id);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const produtos = this.getProdutosDatabase();
      const produtoIndex = produtos.findIndex(p => p.id === id);
      
      if (produtoIndex === -1) {
        return {
          success: false,
          error: 'Produto não encontrado'
        };
      }
      
      produtos[produtoIndex].disponivel = !produtos[produtoIndex].disponivel;
      produtos[produtoIndex].data_atualizacao = new Date().toISOString();
      
      this.saveProdutosDatabase(produtos);
      
      // Atualiza também o formato admin
      localStorage.setItem('adminProdutos', JSON.stringify(produtos));
      
      const status = produtos[produtoIndex].disponivel ? 'ativado' : 'desativado';
      console.log(`✅ Produto ${status}`);
      
      return {
        success: true,
        produto: produtos[produtoIndex],
        message: `Produto ${status} com sucesso!`
      };
      
    } catch (error) {
      console.error('❌ Erro ao alterar disponibilidade:', error);
      return {
        success: false,
        error: 'Erro ao alterar disponibilidade do produto'
      };
    }
  },

  // Listar produtos por categoria
  listarPorCategoria: async (categoria) => {
    try {
      const produtos = await this.listarProdutos();
      
      if (categoria === 'todos') {
        return produtos;
      }
      
      return produtos.filter(produto => produto.categoria === categoria);
      
    } catch (error) {
      console.error('Erro ao filtrar produtos por categoria:', error);
      return [];
    }
  },

  // Buscar produtos (por nome ou descrição)
  buscarProdutos: async (termo) => {
    try {
      const produtos = await this.listarProdutos();
      
      if (!termo || termo.trim() === '') {
        return produtos;
      }
      
      const termoBusca = termo.toLowerCase().trim();
      
      return produtos.filter(produto => 
        produto.nome.toLowerCase().includes(termoBusca) ||
        produto.descricao.toLowerCase().includes(termoBusca)
      );
      
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      return [];
    }
  },

  // Atualizar estoque (quando um pedido é feito)
  atualizarEstoque: async (itensPedido) => {
    try {
      console.log('📦 Atualizando estoque após pedido');
      
      const produtos = this.getProdutosDatabase();
      let produtosAtualizados = false;
      
      itensPedido.forEach(item => {
        const produtoIndex = produtos.findIndex(p => p.id === item.id);
        if (produtoIndex >= 0) {
          produtos[produtoIndex].estoque = Math.max(0, produtos[produtoIndex].estoque - item.quantidade);
          produtos[produtoIndex].data_atualizacao = new Date().toISOString();
          produtosAtualizados = true;
        }
      });
      
      if (produtosAtualizados) {
        this.saveProdutosDatabase(produtos);
        localStorage.setItem('adminProdutos', JSON.stringify(produtos));
        console.log('✅ Estoque atualizado');
      }
      
      return {
        success: true,
        message: 'Estoque atualizado com sucesso!'
      };
      
    } catch (error) {
      console.error('❌ Erro ao atualizar estoque:', error);
      return {
        success: false,
        error: 'Erro ao atualizar estoque'
      };
    }
  },

  // Obter estatísticas de produtos
  obterEstatisticas: async () => {
    try {
      const produtos = this.getProdutosDatabase();
      
      const totalProdutos = produtos.length;
      const produtosAtivos = produtos.filter(p => p.disponivel).length;
      const produtosInativos = totalProdutos - produtosAtivos;
      
      const categorias = produtos.reduce((acc, produto) => {
        acc[produto.categoria] = (acc[produto.categoria] || 0) + 1;
        return acc;
      }, {});
      
      const precoMedio = produtos.length > 0 
        ? produtos.reduce((sum, p) => sum + p.preco, 0) / produtos.length 
        : 0;
      
      const estoqueTotal = produtos.reduce((sum, p) => sum + (p.estoque || 0), 0);
      
      return {
        totalProdutos,
        produtosAtivos,
        produtosInativos,
        categorias,
        precoMedio,
        estoqueTotal
      };
      
    } catch (error) {
      console.error('Erro ao obter estatísticas de produtos:', error);
      return {
        totalProdutos: 0,
        produtosAtivos: 0,
        produtosInativos: 0,
        categorias: {},
        precoMedio: 0,
        estoqueTotal: 0
      };
    }
  }
};