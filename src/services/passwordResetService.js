// src/services/passwordResetService.js
import { supabase } from '../lib/supabase';

export const passwordResetService = {
    
    async iniciarResetPorSMS(cnpj, telefone) {
        try {
            const cnpjLimpo = cnpj.replace(/\D/g, '');
            const telefoneInformado = telefone.trim();
            
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

            if (!empresa.telefone || empresa.telefone.trim() === '') {
                throw new Error('Esta empresa não possui telefone cadastrado. Entre em contato com o suporte');
            }
            
            const telefoneEmpresa = empresa.telefone.replace(/\D/g, '');
            const telefoneInformadoNumeros = telefoneInformado.replace(/\D/g, '');
            
            if (telefoneEmpresa !== telefoneInformadoNumeros) {
                throw new Error('Telefone informado não confere com o telefone cadastrado da empresa');
            }
            
            const codigoReset = Math.floor(100000 + Math.random() * 900000);
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
            
            await supabase
                .from('password_reset_tokens')
                .delete()
                .eq('empresa_id', empresa.id)
                .eq('metodo', 'sms');
            
            const { error: saveError } = await supabase
                .from('password_reset_tokens')
                .insert({
                    empresa_id: empresa.id,
                    token: codigoReset.toString(),
                    metodo: 'sms',
                    telefone: empresa.telefone,
                    expires_at: expiresAt.toISOString(),
                    usado: false
                });
                
            if (saveError) throw saveError;
            
            return {
                success: true,
                message: `Código de verificação gerado para ${this.maskPhone(empresa.telefone)}. Válido por 10 minutos.`,
                maskedPhone: this.maskPhone(empresa.telefone),
                codigo: codigoReset
            };
            
        } catch (error) {
            console.error('Erro ao iniciar reset por SMS:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    async confirmarResetPorSMS(cnpj, codigo, novaSenha) {
        try {
            const cnpjLimpo = cnpj.replace(/\D/g, '');
            
            const { data: empresa, error: empresaError } = await supabase
                .from('empresas')
                .select('id')
                .eq('cnpj', cnpjLimpo)
                .single();
                
            if (empresaError || !empresa) {
                throw new Error('CNPJ não encontrado');
            }
            
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
            
            if (!novaSenha || novaSenha.length < 6) {
                throw new Error('Nova senha deve ter pelo menos 6 caracteres');
            }
            
            const novoHash = await this.hashSenha(novaSenha);
            const { error: updateError } = await supabase
                .from('empresas')
                .update({ 
                    senha_hash: novoHash,
                    tentativas_login: 0,
                    data_alteracao_senha: new Date().toISOString()
                })
                .eq('id', empresa.id);
                
            if (updateError) throw updateError;
            
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

    async iniciarResetPorPerguntas(cnpj) {
        try {
            const cnpjLimpo = cnpj.replace(/\D/g, '');
            
            const { data: empresa, error } = await supabase
                .from('empresas')
                .select('id, cnpj_formatado, razao_social, municipio, uf, data_cadastro, telefone, ativo')
                .eq('cnpj', cnpjLimpo)
                .single();
                
            if (error || !empresa) {
                throw new Error('CNPJ não encontrado no sistema');
            }
            
            if (!empresa.ativo) {
                throw new Error('Empresa desativada. Entre em contato com o suporte');
            }
            
            const perguntas = this.gerarPerguntasEmpresa(empresa);
            
            await supabase
                .from('password_reset_tokens')
                .delete()
                .eq('empresa_id', empresa.id)
                .eq('metodo', 'perguntas');
            
            const { error: saveError } = await supabase
                .from('password_reset_tokens')
                .insert({
                    empresa_id: empresa.id,
                    token: `questions_${Date.now()}`,
                    metodo: 'perguntas',
                    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                    usado: false,
                    dados_verificacao: JSON.stringify(perguntas)
                });
                
            if (saveError) throw saveError;
            
            return {
                success: true,
                perguntas: perguntas.map(p => ({ 
                    id: p.id, 
                    pergunta: p.pergunta,
                    tipo: p.tipo,
                    dica: p.dica
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

    async confirmarResetPorPerguntas(empresaId, respostas, novaSenha) {
        try {
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
            
            let acertos = 0;
            for (const resposta of respostas) {
                const pergunta = perguntasOriginais.find(p => p.id === resposta.id);
                if (pergunta && this.verificarResposta(pergunta, resposta.resposta)) {
                    acertos++;
                }
            }
            
            if (acertos < 2) {
                throw new Error('Respostas incorretas. Tente novamente ou use outro método');
            }
            
            if (!novaSenha || novaSenha.length < 6) {
                throw new Error('Nova senha deve ter pelo menos 6 caracteres');
            }
            
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

        if (empresa.telefone && empresa.telefone.trim() !== '') {
            const telefoneNumeros = empresa.telefone.replace(/\D/g, '');
            const ultimosDigitos = telefoneNumeros.slice(-4);
            
            perguntas.push({
                id: 4,
                pergunta: `Quais são os 4 últimos dígitos do telefone cadastrado da empresa?`,
                tipo: 'telefone_final',
                resposta_correta: ultimosDigitos,
                dica: 'Digite apenas os números (ex: 1234)'
            });
        }
        
        return perguntas.filter(p => p.resposta_correta);
    },
    
    verificarResposta(pergunta, resposta) {
        const respostaNormalizada = resposta?.toLowerCase().trim();
        const corretaNormalizada = pergunta.resposta_correta?.toLowerCase().trim();
        
        switch (pergunta.tipo) {
            case 'municipio':
                return this.normalizarTexto(respostaNormalizada) === 
                       this.normalizarTexto(corretaNormalizada);
                       
            case 'uf':
                return resposta?.toUpperCase().trim() === 
                       pergunta.resposta_correta?.toUpperCase().trim();
                       
            case 'ano_cadastro':
                return resposta?.trim() === pergunta.resposta_correta?.trim();

            case 'telefone_final':
                const respostaNumerica = resposta?.replace(/\D/g, '');
                return respostaNumerica === pergunta.resposta_correta;
                
            default:
                return respostaNormalizada === corretaNormalizada;
        }
    },
    
    normalizarTexto(texto) {
        return texto?.normalize('NFD')
                   .replace(/[\u0300-\u036f]/g, '')
                   .toLowerCase()
                   .trim() || '';
    },
    
    maskPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,7)}-****`;
        } else if (cleaned.length === 10) {
            return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,6)}-****`;
        }
        return phone.slice(0, -4) + '****';
    },
    
    async hashSenha(senha) {
        const encoder = new TextEncoder();
        const data = encoder.encode(senha + 'fitinbox_salt_2025');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
};