import supabase from "../lib/supabase";

export const produtoService = {
  // Lista apenas produtos disponíveis, ordenados por nome
  listarProdutos: async () => {
    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .eq("disponivel", true)
      .order("nome", { ascending: true });

    if (error) {
      console.error("❌ Erro ao listar produtos:", error);
      return [];
    }
    return data;
  },

  // Busca um produto específico pelo UUID
  buscarProdutoPorId: async (id) => {
    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(`❌ Erro ao buscar produto ${id}:`, error);
      return { success: false, error: error.message };
    }
    return { success: true, produto: data };
  },

  // Adicionar novo produto
  adicionarProduto: async (produto) => {
    const { data, error } = await supabase.from("produtos").insert([produto]).select();

    if (error) {
      console.error("❌ Erro ao adicionar produto:", error);
      return { success: false, error: error.message };
    }
    return { success: true, produto: data[0] };
  },

  // Atualizar produto existente
  atualizarProduto: async (id, updates) => {
    const { data, error } = await supabase
      .from("produtos")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) {
      console.error(`❌ Erro ao atualizar produto ${id}:`, error);
      return { success: false, error: error.message };
    }
    return { success: true, produto: data[0] };
  },

  // Deletar produto
  deletarProduto: async (id) => {
    const { error } = await supabase.from("produtos").delete().eq("id", id);

    if (error) {
      console.error(`❌ Erro ao deletar produto ${id}:`, error);
      return { success: false, error: error.message };
    }
    return { success: true, message: "Produto deletado com sucesso!" };
  },

  // Listar todos os produtos (para o admin, incluindo indisponíveis)
  listarTodosProdutos: async () => {
    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      console.error("❌ Erro ao listar todos os produtos:", error);
      return [];
    }
    return data;
  },

  // Atualizar estoque (quando um pedido é feito)
  atualizarEstoque: async (itensPedido) => {
    try {
      for (const item of itensPedido) {
        const { data: produtoAtual, error: fetchError } = await supabase
          .from("produtos")
          .select("estoque")
          .eq("id", item.id)
          .single();

        if (fetchError) {
          console.error(`Erro ao buscar estoque do produto ${item.id}:`, fetchError);
          continue;
        }

        const novoEstoque = Math.max(0, produtoAtual.estoque - item.quantidade);
        const { error: updateError } = await supabase
          .from("produtos")
          .update({ estoque: novoEstoque, updated_at: new Date().toISOString() })
          .eq("id", item.id);

        if (updateError) {
          console.error(`Erro ao atualizar estoque do produto ${item.id}:`, updateError);
        }
      }
      return { success: true, message: "Estoque atualizado com sucesso!" };
    } catch (error) {
      console.error("❌ Erro geral ao atualizar estoque:", error);
      return { success: false, error: error.message };
    }
  },

  // Obter estatísticas de produtos
  obterEstatisticas: async () => {
    try {
      const { data: produtos, error } = await supabase.from("produtos").select("id, disponivel, preco, categoria, estoque");

      if (error) {
        console.error("Erro ao obter estatísticas de produtos:", error);
        return {
          totalProdutos: 0,
          produtosAtivos: 0,
          produtosInativos: 0,
          categorias: {},
          precoMedio: 0,
          estoqueTotal: 0,
        };
      }

      const totalProdutos = produtos.length;
      const produtosAtivos = produtos.filter((p) => p.disponivel).length;
      const produtosInativos = totalProdutos - produtosAtivos;

      const categorias = produtos.reduce((acc, produto) => {
        acc[produto.categoria] = (acc[produto.categoria] || 0) + 1;
        return acc;
      }, {});

      const precoMedio = totalProdutos > 0
        ? produtos.reduce((sum, p) => sum + p.preco, 0) / totalProdutos
        : 0;

      const estoqueTotal = produtos.reduce((sum, p) => sum + (p.estoque || 0), 0);

      return {
        totalProdutos,
        produtosAtivos,
        produtosInativos,
        categorias,
        precoMedio,
        estoqueTotal,
      };
    } catch (error) {
      console.error("❌ Erro ao obter estatísticas de produtos:", error);
      return {
        totalProdutos: 0,
        produtosAtivos: 0,
        produtosInativos: 0,
        categorias: {},
        precoMedio: 0,
        estoqueTotal: 0,
      };
    }
  },
};


