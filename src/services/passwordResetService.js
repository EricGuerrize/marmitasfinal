// src/services/passwordResetService.js
import { supabase } from '../lib/supabase';

/**
 * Serviço para reset de senha sem uso de email
 * Implementa múltiplas alternativas seguras baseadas em dados empresariais brasileiros
 */
export const passwordResetService = {
    
    /**
     * Inicia processo de reset de senha por SMS
     * @param {string} cnpj - CNPJ da empresa
     * @param {string} telefone - Telefone informado
     * @returns {Object} Resultado da operação
     */
    async iniciarResetPorSMS(cnpj, telefone) {
        try {
            const cnpjLimpo = cnpj.replace(/\D/g, '');
            const telefoneLimpo = telefone.replace(/\D/g, '');
            
            // Busca empresa e verifica telefone
            const { data: empresa, error } = await supabase
                .from('empresas')
                .select('id, cnpj_formatado, razao_social, telefone, ativo')
                .eq('cnpj', cnpjLimpo)
                .single();
                
            if (error || !empresa) {
                throw new Error('CNPJ não encontrado no sistema');
            }
            
            if (!empresa.ativo) {
                throw new Error('Empresa desativada. Entre em contato com o suporte');
            }
            
            // Verifica se telefone confere (remove formatação para comparar)
            const telefoneEmpresa = (empresa.telefone || '').replace(/\D/g, '');
            if (!telefoneEmpresa || telefoneEmpresa !== telefoneLimpo) {
                throw new Error('Telefone não confere com o cadastrado na empresa');
            }
            
            // Gera código de 6 dígitos
            const codigoReset = Math.floor(100000 + Math.random() * 900000);
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
            
            // Salva código no banco
            const { error: saveError } = await supabase
                .from('password_reset_tokens')
                .insert({
                    empresa_id: empresa.id,
                    token: codigoReset.toString(),
                    metodo: 'sms',
                    telefone: telefone,
                    expires_at: expiresAt.toISOString(),
                    usado: false
                });
                
            if (saveError) throw saveError;
            
            // Em produção, integraria com um provedor de SMS (Twilio, AWS SNS, etc)
            // Por enquanto, simula o envio
            console.log(`Código SMS enviado para ${telefone}: ${codigoReset}`);
            
            return {
                success: true,
                message: `Código de verificação enviado para ${telefone}. Válido por 10 minutos.`,
                maskedPhone: this.maskPhone(telefone)
            };
            
        } catch (error) {
            console.error('Erro ao iniciar reset por SMS:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Inicia processo de reset por perguntas de segurança empresarial
     * @param {string} cnpj - CNPJ da empresa
     * @returns {Object} Perguntas específicas da empresa
     */
    async iniciarResetPorPerguntas(cnpj) {
        try {
            const cnpjLimpo = cnpj.replace(/\D/g, '');
            
            const { data: empresa, error } = await supabase
                .from('empresas')
                .select('id, cnpj_formatado, razao_social, municipio, uf, data_cadastro, ativo')
                .eq('cnpj', cnpjLimpo)
                .single();
                
            if (error || !empresa) {
                throw new Error('CNPJ não encontrado no sistema');
            }
            
            if (!empresa.ativo) {
                throw new Error('Empresa desativada. Entre em contato com o suporte');
            }
            
            // Gera perguntas baseadas nos dados da empresa
            const perguntas = this.gerarPerguntasEmpresa(empresa);
            
            // Salva tentativa
            const { error: saveError } = await supabase
                .from('password_reset_tokens')
                .insert({
                    empresa_id: empresa.id,
                    token: `questions_${Date.now()}`,
                    metodo: 'perguntas',
                    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutos
                    usado: false,
                    dados_verificacao: JSON.stringify(perguntas)
                });
                
            if (saveError) throw saveError;
            
            return {
                success: true,
                perguntas: perguntas.map(p => ({ 
                    id: p.id, 
                    pergunta: p.pergunta,
                    tipo: p.tipo 
                })),
                empresaId: empresa.id
            };
            
        } catch (error) {
            console.error('Erro ao iniciar reset por perguntas:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Verifica código SMS e permite redefinir senha
     * @param {string} cnpj - CNPJ da empresa
     * @param {string} codigo - Código recebido por SMS
     * @param {string} novaSenha - Nova senha
     * @returns {Object} Resultado da operação
     */
    async confirmarResetPorSMS(cnpj, codigo, novaSenha) {
        try {
            const cnpjLimpo = cnpj.replace(/\D/g, '');
            
            // Busca empresa
            const { data: empresa, error: empresaError } = await supabase
                .from('empresas')
                .select('id')
                .eq('cnpj', cnpjLimpo)
                .single();
                
            if (empresaError || !empresa) {
                throw new Error('CNPJ não encontrado');
            }
            
            // Busca token válido
            const { data: token, error: tokenError } = await supabase
                .from('password_reset_tokens')
                .select('*')
                .eq('empresa_id', empresa.id)
                .eq('token', codigo)
                .eq('metodo', 'sms')
                .eq('usado', false)
                .gte('expires_at', new Date().toISOString())
                .single();
                
            if (tokenError || !token) {
                throw new Error('Código inválido ou expirado');
            }
            
            // Valida nova senha
            if (!novaSenha || novaSenha.length < 6) {
                throw new Error('Nova senha deve ter pelo menos 6 caracteres');
            }
            
            // Atualiza senha na empresa
            const novoHash = await this.hashSenha(novaSenha);
            const { error: updateError } = await supabase
                .from('empresas')
                .update({ 
                    senha_hash: novoHash,
                    tentativas_login: 0, // Reset tentativas
                    data_alteracao_senha: new Date().toISOString()
                })
                .eq('id', empresa.id);
                
            if (updateError) throw updateError;
            
            // Marca token como usado
            await supabase
                .from('password_reset_tokens')
                .update({ usado: true })
                .eq('id', token.id);
            
            return {
                success: true,
                message: 'Senha alterada com sucesso!'
            };
            
        } catch (error) {
            console.error('Erro ao confirmar reset por SMS:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Verifica respostas das perguntas de segurança
     * @param {number} empresaId - ID da empresa
     * @param {Array} respostas - Respostas às perguntas
     * @param {string} novaSenha - Nova senha
     * @returns {Object} Resultado da operação
     */
    async confirmarResetPorPerguntas(empresaId, respostas, novaSenha) {
        try {
            // Busca token das perguntas
            const { data: token, error: tokenError } = await supabase
                .from('password_reset_tokens')
                .select('*')
                .eq('empresa_id', empresaId)
                .eq('metodo', 'perguntas')
                .eq('usado', false)
                .gte('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
                
            if (tokenError || !token) {
                throw new Error('Sessão de reset expirada. Tente novamente');
            }
            
            const perguntasOriginais = JSON.parse(token.dados_verificacao);
            
            // Verifica respostas
            let acertos = 0;
            for (const resposta of respostas) {
                const pergunta = perguntasOriginais.find(p => p.id === resposta.id);
                if (pergunta && this.verificarResposta(pergunta, resposta.resposta)) {
                    acertos++;
                }
            }
            
            // Requer pelo menos 2 acertos de 3 perguntas
            if (acertos < 2) {
                throw new Error('Respostas incorretas. Tente novamente ou use outro método');
            }
            
            // Valida nova senha
            if (!novaSenha || novaSenha.length < 6) {
                throw new Error('Nova senha deve ter pelo menos 6 caracteres');
            }
            
            // Atualiza senha
            const novoHash = await this.hashSenha(novaSenha);
            const { error: updateError } = await supabase
                .from('empresas')
                .update({ 
                    senha_hash: novoHash,
                    tentativas_login: 0,
                    data_alteracao_senha: new Date().toISOString()
                })
                .eq('id', empresaId);
                
            if (updateError) throw updateError;
            
            // Marca token como usado
            await supabase
                .from('password_reset_tokens')
                .update({ usado: true })
                .eq('id', token.id);
            
            return {
                success: true,
                message: 'Senha alterada com sucesso!'
            };
            
        } catch (error) {
            console.error('Erro ao confirmar reset por perguntas:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // === MÉTODOS AUXILIARES ===
    
    /**
     * Gera perguntas de segurança específicas para empresas brasileiras
     */
    gerarPerguntasEmpresa(empresa) {
        const perguntas = [
            {
                id: 1,
                pergunta: `Qual o município onde a empresa ${empresa.razao_social} está registrada?`,
                tipo: 'municipio',
                resposta_correta: empresa.municipio?.toLowerCase().trim(),
                dica: 'Digite apenas o nome da cidade'
            },
            {
                id: 2,
                pergunta: `Qual o estado (UF) onde a empresa está registrada?`,
                tipo: 'uf',
                resposta_correta: empresa.uf?.toUpperCase().trim(),
                dica: 'Digite a sigla do estado (ex: SP, RJ, MG)'
            },
            {
                id: 3,
                pergunta: `Em que ano a empresa foi cadastrada no sistema?`,
                tipo: 'ano_cadastro',
                resposta_correta: new Date(empresa.data_cadastro).getFullYear().toString(),
                dica: 'Digite apenas o ano (ex: 2023)'
            }
        ];
        
        return perguntas.filter(p => p.resposta_correta); // Remove perguntas sem resposta
    },
    
    /**
     * Verifica se resposta está correta
     */
    verificarResposta(pergunta, resposta) {
        const respostaNormalizada = resposta?.toLowerCase().trim();
        const corretaNormalizada = pergunta.resposta_correta?.toLowerCase().trim();
        
        switch (pergunta.tipo) {
            case 'municipio':
                // Remove acentos e permite variações
                return this.normalizarTexto(respostaNormalizada) === 
                       this.normalizarTexto(corretaNormalizada);
                       
            case 'uf':
                return resposta?.toUpperCase().trim() === 
                       pergunta.resposta_correta?.toUpperCase().trim();
                       
            case 'ano_cadastro':
                return resposta?.trim() === pergunta.resposta_correta?.trim();
                
            default:
                return respostaNormalizada === corretaNormalizada;
        }
    },
    
    /**
     * Normaliza texto removendo acentos
     */
    normalizarTexto(texto) {
        return texto?.normalize('NFD')
                   .replace(/[\u0300-\u036f]/g, '')
                   .toLowerCase()
                   .trim() || '';
    },
    
    /**
     * Mascara telefone para exibição
     */
    maskPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,7)}-****`;
        }
        return phone.slice(0, -4) + '****';
    },
    
    /**
     * Hash de senha
     */
    async hashSenha(senha) {
        const encoder = new TextEncoder();
        const data = encoder.encode(senha + 'fitinbox_salt_2025');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
};