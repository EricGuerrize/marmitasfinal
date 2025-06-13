import { supabase } from '../lib/supabase'

export const produtoService = {
  // Listar produtos disponíveis (para clientes)
  async listarProdutos() {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('disponivel', true)
      .order('nome')
    
    if (error) {
      console.error('Erro ao carregar produtos:', error)
      return []
    }
    return data
  },

  // Listar todos os produtos (para admin)
  async listarTodosProdutos() {
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('nome')
    
    if (error) {
      console.error('Erro ao carregar produtos:', error)
      return []
    }
    return data
  },

  // Criar produto (admin)
  async criarProduto(produto) {
    const { data, error } = await supabase
      .from('produtos')
      .insert([produto])
      .select()
    
    if (error) {
      console.error('Erro ao criar produto:', error)
      throw error
    }
    return data[0]
  },

  // Atualizar produto (admin)
  async atualizarProduto(id, produto) {
    const { data, error } = await supabase
      .from('produtos')
      .update(produto)
      .eq('id', id)
      .select()
    
    if (error) {
      console.error('Erro ao atualizar produto:', error)
      throw error
    }
    return data[0]
  },

  // Excluir produto (admin)
  async excluirProduto(id) {
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Erro ao excluir produto:', error)
      throw error
    }
  },

  // Toggle disponibilidade (admin)
  async toggleDisponibilidade(id, disponivel) {
    const { data, error } = await supabase
      .from('produtos')
      .update({ disponivel: !disponivel })
      .eq('id', id)
      .select()
    
    if (error) {
      console.error('Erro ao alterar disponibilidade:', error)
      throw error
    }
    return data[0]
  }
}