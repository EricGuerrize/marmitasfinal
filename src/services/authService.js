import { supabase } from '../lib/supabase';
import { cnpjService } from './cnpjService';
import bcrypt from 'bcryptjs'; // Assumindo que bcryptjs está configurado no frontend

export const authService = {
  login: async (cnpj, senha) => {
    try {
      console.log('🔐 Tentando login com CNPJ:', cnpj);
      
      const cnpjLimpo = cnpjService.removerMascaraCnpj(cnpj);

      const { data: empresa, error } = await supabase
        .from('empresas')
        .select('id, cnpj, senha_salt, email, nome_empresa, ativo')
        .eq('cnpj', cnpjLimpo)
        .eq('ativo', true)
        .single();

      if (error || !empresa) {
        console.error('❌ Empresa não encontrada:', error?.message);
        return { success: false, error: 'CNPJ ou senha inválidos' };
      }

      const senhaValida = await bcrypt.compare(senha, empresa.senha_salt);
      if (!senhaValida) {
        console.error('❌ Senha inválida');
        return { success: false, error: 'CNPJ ou senha inválidos' };
      }

      // Gera sessão (exemplo, ajuste conforme seu frontend)
      const sessao = {
        cnpj: empresa.cnpj,
        email: empresa.email,
        nome_empresa: empresa.nome_empresa,
        empresa_id: empresa.id
      };
      sessionStorage.setItem('sessaoAtiva', JSON.stringify(sessao));

      console.log('✅ Login bem-sucedido');
      return { success: true, message: 'Login bem-sucedido!', empresa: sessao };
    } catch (error) {
      console.error('❌ Erro ao fazer login:', error);
      return { success: false, error: 'Erro ao fazer login. Tente novamente.' };
    }
  },

  cadastrar: async (dadosCadastro) => {
    try {
      console.log('📝 Cadastrando empresa:', dadosCadastro);
      
      const cnpjLimpo = cnpjService.removerMascaraCnpj(dadosCadastro.cnpj);
      const senhaHash = await bcrypt.hash(dadosCadastro.senha, 10);

      const novaEmpresa = {
        cnpj: cnpjLimpo,
        cnpj_formatado: dadosCadastro.cnpj,
        email: dadosCadastro.email,
        nome_empresa: dadosCadastro.nome_empresa,
        razao_social: dadosCadastro.razao_social,
        nome_fantasia: dadosCadastro.nome_fantasia,
        telefone: dadosCadastro.telefone,
        senha_salt: senhaHash,
        tipo_usuario: 'cliente',
        ativo: true,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('empresas')
        .insert(novaEmpresa)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao cadastrar empresa:', error.message);
        return { success: false, error: 'Erro ao cadastrar empresa. Tente novamente.' };
      }

      console.log('✅ Empresa cadastrada:', data.cnpj);
      return { success: true, empresa: data, message: 'Empresa cadastrada com sucesso!' };
    } catch (error) {
      console.error('❌ Erro ao cadastrar empresa:', error);
      return { success: false, error: 'Erro ao cadastrar empresa. Tente novamente.' };
    }
  },

  logout: () => {
    sessionStorage.removeItem('sessaoAtiva');
    return { success: true, message: 'Logout bem-sucedido!' };
  }
};