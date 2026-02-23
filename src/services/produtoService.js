import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query,
  where
} from 'firebase/firestore';
import { db } from './firebaseConfig.js';
const COLLECTION_NAME = 'produtos';

// Listar produtos (sem índice complexo)
export const listarProdutos = async () => {
  try {
    console.log('📦 Carregando produtos do Firestore...');
    
    // Consulta simples sem índice complexo
    const produtosRef = collection(db, COLLECTION_NAME);
    const querySnapshot = await getDocs(produtosRef);
    
    const produtos = [];
    querySnapshot.forEach((doc) => {
      produtos.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Ordenar no cliente (evita índice)
    produtos.sort((a, b) => a.nome.localeCompare(b.nome));

    console.log('✅ Produtos carregados:', produtos.length);
    return produtos;
    
  } catch (error) {
    console.error('❌ Erro ao listar produtos:', error);
    throw error;
  }
};

// Listar produtos por categoria (consulta simples)
export const listarProdutosPorCategoria = async (categoria) => {
  try {
    console.log('📦 Carregando produtos da categoria:', categoria);
    
    const produtosRef = collection(db, COLLECTION_NAME);
    const q = query(
      produtosRef,
      where('categoria', '==', categoria)
    );
    
    const querySnapshot = await getDocs(q);
    const produtos = [];
    
    querySnapshot.forEach((doc) => {
      produtos.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Ordenar no cliente
    produtos.sort((a, b) => a.nome.localeCompare(b.nome));

    console.log(`✅ Produtos da categoria ${categoria}:`, produtos.length);
    return produtos;
    
  } catch (error) {
    console.error('❌ Erro ao listar produtos por categoria:', error);
    throw error;
  }
};

// Buscar produto por ID
export const buscarProdutoPorId = async (id) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      throw new Error('Produto não encontrado');
    }
  } catch (error) {
    console.error('❌ Erro ao buscar produto:', error);
    throw error;
  }
};

// ✅ FUNÇÃO CORRIGIDA - Adicionar produto
export const adicionarProduto = async (produto) => {
  try {
    console.log('➕ Adicionando produto:', produto.nome);
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...produto,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Produto adicionado com ID:', docRef.id);
    
    // ✅ CORREÇÃO: Retorna objeto com success
    return { success: true, id: docRef.id };
    
  } catch (error) {
    console.error('❌ Erro ao adicionar produto:', error);
    
    // ✅ CORREÇÃO: Retorna erro estruturado em vez de throw
    return { success: false, error: error.message };
  }
};

// ✅ FUNÇÃO CORRIGIDA - Atualizar produto
export const atualizarProduto = async (id, dadosAtualizados) => {
  try {
    console.log('📝 Atualizando produto:', id);
    
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...dadosAtualizados,
      updatedAt: new Date()
    });
    
    console.log('✅ Produto atualizado');
    
    // ✅ CORREÇÃO: Retorna objeto com success
    return { success: true };
    
  } catch (error) {
    console.error('❌ Erro ao atualizar produto:', error);
    
    // ✅ CORREÇÃO: Retorna erro estruturado em vez de throw
    return { success: false, error: error.message };
  }
};

// ✅ FUNÇÃO CORRIGIDA - Deletar produto
export const deletarProduto = async (id) => {
  try {
    console.log('🗑️ Deletando produto:', id);
    
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    
    console.log('✅ Produto deletado');
    
    // ✅ CORREÇÃO: Retorna objeto com success
    return { success: true };
    
  } catch (error) {
    console.error('❌ Erro ao deletar produto:', error);
    
    // ✅ CORREÇÃO: Retorna erro estruturado em vez de throw
    return { success: false, error: error.message };
  }
};

// Buscar produtos (sem ordenação complexa)
export const buscarProdutos = async (termo) => {
  try {
    console.log('🔍 Buscando produtos:', termo);
    
    // Busca simples - pega todos e filtra no cliente
    const produtos = await listarProdutos();
    
    const produtosFiltrados = produtos.filter(produto =>
      produto.nome.toLowerCase().includes(termo.toLowerCase()) ||
      produto.descricao.toLowerCase().includes(termo.toLowerCase())
    );
    
    console.log('✅ Produtos encontrados:', produtosFiltrados.length);
    return produtosFiltrados;
    
  } catch (error) {
    console.error('❌ Erro ao buscar produtos:', error);
    throw error;
  }
};

// Calcular estatísticas
export const calcularEstatisticas = async () => {
  try {
    const produtos = await listarProdutos();
    
    const estatisticas = {
      totalProdutos: produtos.length,
      produtosAtivos: produtos.filter(p => p.disponivel || p.ativo).length,
      produtosInativos: produtos.filter(p => !p.disponivel && !p.ativo).length,
      categorias: {
        tradicional: produtos.filter(p => p.categoria === 'tradicional').length,
        fitness: produtos.filter(p => p.categoria === 'fitness').length,
        vegana: produtos.filter(p => p.categoria === 'vegana').length,
        gourmet: produtos.filter(p => p.categoria === 'gourmet').length
      },
      precoMedio: produtos.length > 0 
        ? produtos.reduce((acc, p) => acc + p.preco, 0) / produtos.length 
        : 0
    };
    
    console.log('✅ Estatísticas calculadas:', estatisticas);
    return estatisticas;
    
  } catch (error) {
    console.error('❌ Erro ao calcular estatísticas:', error);
    throw error;
  }
};

// ✅ CORREÇÃO: Objeto que agrupa todas as funções para manter compatibilidade
export const produtoService = {
  listarProdutos,
  listarProdutosPorCategoria,
  buscarProdutoPorId,
  adicionarProduto,
  atualizarProduto,
  deletarProduto,
  buscarProdutos,
  calcularEstatisticas
};

// ✅ CORREÇÃO: Exportação padrão (opcional, mas recomendada)
export default produtoService;

