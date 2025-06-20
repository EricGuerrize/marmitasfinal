// src/services/authSupabaseService.js
import { supabase } from '../lib/supabase';

/**
 * Serviço de autenticação usando Supabase (RECOMENDADO PARA PRODUÇÃO)
 * Armazena senhas com hash seguro no banco de dados
 */
export const authSupabaseService = {
    
    /**
     * Registra nova empresa com CNPJ e senha
     * @param {string} cnpj - CNPJ da empresa
     * @param {string} senha - Senha escolhida
     * @param {Object} dadosEmpresa - Dados opcionais da empresa
     * @returns {Object} Resultado da operação
     */
    async registrarEmpresa(cnpj, senha, dadosEmpresa = {}) {
        try {
            const cnpjLimpo = cnpj.replace(/\D/g, '');
            
            // Valida CNPJ
            if (!this.validarCnpj(cnpjLimpo)) {
                throw new Error('CNPJ inválido');
            }
            
            // Valida senha
            if (!senha || senha.length < 6) {
                throw new Error('Senha deve ter pelo menos 6 caracteres');
            }
            
            // Verifica se CNPJ já está cadastrado
            const { data: empresaExistente } = await supabase
                .from('empresas')
                .select('id')
                .eq('cnpj', cnpjLimpo)
                .single();
                
            if (empresaExistente) {
                throw new Error('CNPJ já cadastrado no sistema');
            }
            
            // Cria registro da empresa
            const { data, error } = await supabase
                .from('empresas')
                .insert([{
                    cnpj: cnpjLimpo,
                    cnpj_formatado: this.formatarCnpj(cnpjLimpo),
                    senha_hash: await this.hashSenha(senha),
                    razao_social: dadosEmpresa.razaoSocial || `Empresa ${this.formatarCnpj(cnpjLimpo)}`,
                    nome_fantasia: dadosEmpresa.nomeFantasia,
                    situacao: dadosEmpresa.situacao || 'ATIVA',
                    atividade: dadosEmpresa.atividade,
                    municipio: dadosEmpresa.municipio,
                    uf: dadosEmpresa.uf,
                    telefone: dadosEmpresa.telefone,
                    email: dadosEmpresa.email,
                    ativo: true,
                    tentativas_login: 0,
                    data_cadastro: new Date().toISOString()
                }])
                .select()
                .single();
                
            if (error) throw error;
            
            return {
                success: true,
                message: 'Empresa cadastrada com sucesso!',
                empresa: data
            };
            
        } catch (error) {
            console.error('Erro ao registrar empresa:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Autentica empresa com CNPJ e senha usando função segura
     * @param {string} cnpj - CNPJ da empresa
     * @param {string} senha - Senha informada
     * @returns {Object} Resultado da autenticação
     */
    async autenticar(cnpj, senha) {
        try {
            const cnpjLimpo = cnpj.replace(/\D/g, '');
            
            // Valida entrada
            if (!this.validarCnpj(cnpjLimpo)) {
                throw new Error('CNPJ inválido');
            }
            
            if (!senha || senha.length < 6) {
                throw new Error('Senha deve ter pelo menos 6 caracteres');
            }
            
            // Busca empresa no banco (sem senha)
            const { data: empresa, error } = await supabase
                .from('empresas')
                .select('id, cnpj, cnpj_formatado, razao_social, nome_fantasia, senha_hash, ativo, tentativas_login')
                .eq('cnpj', cnpjLimpo)
                .single();
                
            if (error || !empresa) {
                // Log da tentativa falhada
                await supabase.rpc('log_tentativa_login', {
                    p_cnpj: cnpjLimpo,
                    p_ip_address: '0.0.0.0', // Cliente não tem acesso ao IP real
                    p_sucesso: false,
                    p_motivo_falha: 'CNPJ não encontrado'
                });
                
                throw new Error('CNPJ não cadastrado no sistema');
            }
            
            if (!empresa.ativo) {
                throw new Error('Empresa desativada. Entre em contato com o suporte');
            }
            
            // Verifica tentativas de login
            if (empresa.tentativas_login >= 5) {
                throw new Error('Muitas tentativas inválidas. Empresa bloqueada temporariamente');
            }
            
            // Verifica senha
            const senhaValida = await this.verificarSenha(senha, empresa.senha_hash);
            
            if (!senhaValida) {
                // Incrementa tentativas no banco
                await supabase
                    .from('empresas')
                    .update({ 
                        tentativas_login: empresa.tentativas_login + 1 
                    })
                    .eq('id', empresa.id);
                
                // Log da tentativa falhada
                await supabase.rpc('log_tentativa_login', {
                    p_cnpj: cnpjLimpo,
                    p_ip_address: '0.0.0.0',
                    p_sucesso: false,
                    p_motivo_falha: 'Senha incorreta'
                });
                
                throw new Error(`Senha incorreta. Tentativas restantes: ${5 - empresa.tentativas_login - 1}`);
            }
            
            // Login bem-sucedido - reset tentativas e atualiza último acesso
            await supabase
                .from('empresas')
                .update({ 
                    tentativas_login: 0,
                    ultimo_acesso: new Date().toISOString()
                })
                .eq('id', empresa.id);
            
            // Registra sessão no banco
            await supabase
                .from('sessoes_login')
                .insert({
                    empresa_id: empresa.id,
                    ip_address: '0.0.0.0', // Cliente não tem acesso ao IP real
                    login_time: new Date().toISOString(),
                    status: 'ativo'
                });
            
            // Log de sucesso
            await supabase.rpc('log_tentativa_login', {
                p_cnpj: cnpjLimpo,
                p_ip_address: '0.0.0.0',
                p_sucesso: true,
                p_motivo_falha: null
            });
            
            // Gera token JWT personalizado
            const token = this.gerarToken(empresa);
            
            // Salva sessão local
            this.salvarSessao({
                id: empresa.id,
                cnpj: empresa.cnpj_formatado,
                razaoSocial: empresa.razao_social,
                nomeFantasia: empresa.nome_fantasia,
                token
            });
            
            return {
                success: true,
                empresa: {
                    id: empresa.id,
                    cnpj: empresa.cnpj_formatado,
                    razaoSocial: empresa.razao_social,
                    nomeFantasia: empresa.nome_fantasia,
                    ultimoAcesso: empresa.ultimo_acesso
                },
                token
            };
            
        } catch (error) {
            console.error('Erro na autenticação:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Verifica se existe sessão ativa válida
     * @returns {Object|null} Dados da sessão ou null
     */
    verificarSessao() {
        try {
            const sessao = JSON.parse(sessionStorage.getItem('sessaoEmpresa') || 'null');
            
            if (!sessao) return null;
            
            // Verifica se token não expirou (24 horas)
            if (sessao.token && this.verificarToken(sessao.token)) {
                return sessao;
            }
            
            // Token expirado
            this.logout();
            return null;
            
        } catch (error) {
            console.error('Erro ao verificar sessão:', error);
            return null;
        }
    },
    
    /**
     * Faz logout e limpa sessão
     */
    logout() {
        sessionStorage.removeItem('sessaoEmpresa');
        sessionStorage.removeItem('cnpj');
        sessionStorage.removeItem('empresaInfo');
        sessionStorage.removeItem('dadosEmpresa');
    },
    
    /**
     * Altera senha da empresa
     * @param {string} cnpj - CNPJ da empresa
     * @param {string} senhaAtual - Senha atual
     * @param {string} novaSenha - Nova senha
     * @returns {Object} Resultado da operação
     */
    async alterarSenha(cnpj, senhaAtual, novaSenha) {
        try {
            const cnpjLimpo = cnpj.replace(/\D/g, '');
            
            // Busca empresa
            const { data: empresa, error } = await supabase
                .from('empresas')
                .select('*')
                .eq('cnpj', cnpjLimpo)
                .single();
                
            if (error || !empresa) {
                throw new Error('Empresa não encontrada');
            }
            
            // Verifica senha atual
            const senhaAtualValida = await this.verificarSenha(senhaAtual, empresa.senha_hash);
            if (!senhaAtualValida) {
                throw new Error('Senha atual incorreta');
            }
            
            // Valida nova senha
            if (novaSenha.length < 6) {
                throw new Error('Nova senha deve ter pelo menos 6 caracteres');
            }
            
            // Atualiza senha
            const novoHash = await this.hashSenha(novaSenha);
            const { error: updateError } = await supabase
                .from('empresas')
                .update({ 
                    senha_hash: novoHash,
                    data_alteracao_senha: new Date().toISOString()
                })
                .eq('id', empresa.id);
                
            if (updateError) throw updateError;
            
            return {
                success: true,
                message: 'Senha alterada com sucesso!'
            };
            
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Lista empresas cadastradas (para admin)
     * @returns {Array} Lista de empresas
     */
    async listarEmpresas() {
        try {
            const { data, error } = await supabase
                .from('empresas')
                .select(`
                    id,
                    cnpj_formatado,
                    razao_social,
                    nome_fantasia,
                    ativo,
                    tentativas_login,
                    data_cadastro,
                    ultimo_acesso,
                    situacao,
                    municipio,
                    uf
                `)
                .order('data_cadastro', { ascending: false });
                
            if (error) throw error;
            
            return data || [];
            
        } catch (error) {
            console.error('Erro ao listar empresas:', error);
            return [];
        }
    },
    
    /**
     * Ativa/Desativa empresa (para admin)
     * @param {number} empresaId - ID da empresa
     * @param {boolean} ativo - Status ativo/inativo
     * @returns {Object} Resultado da operação
     */
    async toggleEmpresaAtiva(empresaId, ativo) {
        try {
            const { error } = await supabase
                .from('empresas')
                .update({ ativo })
                .eq('id', empresaId);
                
            if (error) throw error;
            
            return {
                success: true,
                message: `Empresa ${ativo ? 'ativada' : 'desativada'} com sucesso!`
            };
            
        } catch (error) {
            console.error('Erro ao alterar status da empresa:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // === MÉTODOS AUXILIARES ===
    
    /**
     * Cria hash seguro da senha usando Web Crypto API
     */
    async hashSenha(senha) {
        const encoder = new TextEncoder();
        const data = encoder.encode(senha + 'fitinbox_salt_2025');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },
    
    /**
     * Verifica se senha confere com hash
     */
    async verificarSenha(senha, hash) {
        const senhaHash = await this.hashSenha(senha);
        return senhaHash === hash;
    },
    
    /**
     * Gera token JWT simples (em produção, use biblioteca como jose)
     */
    gerarToken(empresa) {
        const payload = {
            empresaId: empresa.id,
            cnpj: empresa.cnpj,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
        };
        
        // Em produção, use uma biblioteca JWT real
        return btoa(JSON.stringify(payload));
    },
    
    /**
     * Verifica se token é válido
     */
    verificarToken(token) {
        try {
            const payload = JSON.parse(atob(token));
            const agora = Math.floor(Date.now() / 1000);
            return payload.exp > agora;
        } catch {
            return false;
        }
    },
    
    /**
     * Salva sessão no sessionStorage
     */
    salvarSessao(dadosEmpresa) {
        const sessao = {
            ...dadosEmpresa,
            loginTime: new Date().toISOString()
        };
        
        sessionStorage.setItem('sessaoEmpresa', JSON.stringify(sessao));
        sessionStorage.setItem('cnpj', dadosEmpresa.cnpj);
        sessionStorage.setItem('empresaInfo', dadosEmpresa.razaoSocial);
    },
    
    /**
     * Valida CNPJ
     */
    validarCnpj(cnpj) {
        const numeros = cnpj.replace(/\D/g, '');
        if (numeros.length !== 14) return false;
        if (/^(\d)\1+$/.test(numeros)) return false;
        
        let soma = 0;
        let peso = 2;
        
        for (let i = 11; i >= 0; i--) {
            soma += parseInt(numeros[i]) * peso;
            peso = peso === 9 ? 2 : peso + 1;
        }
        
        let resto = soma % 11;
        let digito1 = resto < 2 ? 0 : 11 - resto;
        
        if (parseInt(numeros[12]) !== digito1) return false;
        
        soma = 0;
        peso = 2;
        
        for (let i = 12; i >= 0; i--) {
            soma += parseInt(numeros[i]) * peso;
            peso = peso === 9 ? 2 : peso + 1;
        }
        
        resto = soma % 11;
        let digito2 = resto < 2 ? 0 : 11 - resto;
        
        return parseInt(numeros[13]) === digito2;
    },
    
    /**
     * Formata CNPJ
     */
    formatarCnpj(cnpj) {
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
};