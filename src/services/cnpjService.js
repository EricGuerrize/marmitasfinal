// src/services/cnpjService.js

/**
 * Serviço para consulta de CNPJ usando APIs públicas
 */
export const cnpjService = {
    /**
     * Consulta CNPJ na Receita Federal via API
     * @param {string} cnpj - CNPJ a ser consultado (pode conter máscara)
     * @returns {Promise<Object>} Dados da empresa ou erro
     */
    async consultarCnpj(cnpj) {
        try {
            // Remove caracteres não numéricos
            const cnpjLimpo = cnpj.replace(/\D/g, '');
            
            // Valida se o CNPJ tem 14 dígitos
            if (cnpjLimpo.length !== 14) {
                throw new Error('CNPJ deve conter 14 dígitos');
            }

            // Valida algoritmo do CNPJ
            if (!this.validarCnpj(cnpjLimpo)) {
                throw new Error('CNPJ inválido');
            }

            // Tenta múltiplas APIs (fallback)
            const apis = [
                {
                    url: `https://minhareceita.org/${cnpjLimpo}`,
                    name: 'MinhaReceita'
                },
                {
                    url: `https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`,
                    name: 'ReceitaWS'
                },
                {
                    url: `https://ws.hubdodesenvolvedor.com.br/v2/cnpj/?cnpj=${cnpjLimpo}&token=suaChaveAqui`,
                    name: 'HubDoDesenvolvedor'
                }
            ];

            let ultimoErro = null;

            for (const api of apis) {
                try {
                    console.log(`Tentando API: ${api.name}`);
                    const response = await fetch(api.url, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json'
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const data = await response.json();
                    
                    // Verifica se retornou erro
                    if (data.status === 'ERROR' || data.message || data.erro) {
                        throw new Error(data.message || data.erro || 'CNPJ não encontrado');
                    }

                    // Normaliza resposta baseada na API
                    const empresaData = this.normalizarResposta(data, api.name);
                    
                    return {
                        success: true,
                        data: empresaData
                    };

                } catch (error) {
                    console.warn(`Erro na API ${api.name}:`, error.message);
                    ultimoErro = error;
                    continue;
                }
            }

            // Se chegou aqui, todas as APIs falharam
            throw ultimoErro || new Error('Todas as APIs de consulta falharam');

        } catch (error) {
            console.error('Erro ao consultar CNPJ:', error);
            return {
                success: false,
                error: error.message || 'Erro ao consultar CNPJ'
            };
        }
    },

    /**
     * Normaliza resposta das diferentes APIs
     */
    normalizarResposta(data, apiName) {
        switch (apiName) {
            case 'MinhaReceita':
                return {
                    cnpj: data.cnpj,
                    razaoSocial: data.nome || data.razao_social,
                    nomeFantasia: data.fantasia || data.nome_fantasia,
                    situacao: data.situacao,
                    atividade: data.atividade_principal?.[0]?.text || data.cnae_fiscal_descricao,
                    telefone: data.telefone,
                    email: data.email,
                    cep: data.cep,
                    logradouro: data.logradouro,
                    numero: data.numero,
                    bairro: data.bairro,
                    municipio: data.municipio,
                    uf: data.uf,
                    dataAbertura: data.abertura || data.data_inicio_atividade,
                    tipo: data.tipo,
                    porte: data.porte
                };

            case 'ReceitaWS':
                return {
                    cnpj: data.cnpj,
                    razaoSocial: data.nome,
                    nomeFantasia: data.fantasia,
                    situacao: data.situacao,
                    atividade: data.atividade_principal?.[0]?.text,
                    telefone: data.telefone,
                    email: data.email,
                    cep: data.cep,
                    logradouro: data.logradouro,
                    numero: data.numero,
                    bairro: data.bairro,
                    municipio: data.municipio,
                    uf: data.uf,
                    dataAbertura: data.abertura,
                    tipo: data.tipo,
                    porte: data.porte
                };

            default:
                // Estrutura genérica
                return {
                    cnpj: data.cnpj,
                    razaoSocial: data.nome || data.razao_social || data.company?.name,
                    nomeFantasia: data.fantasia || data.nome_fantasia || data.company?.alias,
                    situacao: data.situacao || data.status,
                    atividade: data.atividade_principal?.[0]?.text || data.main_activity,
                    telefone: data.telefone || data.phone,
                    email: data.email,
                    cep: data.cep || data.zip,
                    logradouro: data.logradouro || data.address,
                    numero: data.numero || data.number,
                    bairro: data.bairro || data.district,
                    municipio: data.municipio || data.city,
                    uf: data.uf || data.state,
                    dataAbertura: data.abertura || data.opening_date,
                    tipo: data.tipo || data.type,
                    porte: data.porte || data.size
                };
        }
    },

    /**
     * Aplica máscara de CNPJ (formato: 00.000.000/0000-00)
     */
    aplicarMascaraCnpj(value) {
        const onlyNumbers = value.replace(/\D/g, '');
        
        return onlyNumbers
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .slice(0, 18);
    },

    /**
     * Valida CNPJ usando algoritmo oficial
     */
    validarCnpj(cnpj) {
        const numeros = cnpj.replace(/\D/g, '');
        
        if (numeros.length !== 14) return false;
        if (/^(\d)\1+$/.test(numeros)) return false;
        
        let soma = 0;
        let peso = 2;
        
        // Primeiro dígito verificador
        for (let i = 11; i >= 0; i--) {
            soma += parseInt(numeros[i]) * peso;
            peso = peso === 9 ? 2 : peso + 1;
        }
        
        let resto = soma % 11;
        let digito1 = resto < 2 ? 0 : 11 - resto;
        
        if (parseInt(numeros[12]) !== digito1) return false;
        
        // Segundo dígito verificador
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
     * Busca offline em base local (para empresas já cadastradas)
     */
    buscarEmpresaLocal(cnpj) {
        try {
            const empresasLocais = JSON.parse(localStorage.getItem('empresasCadastradas') || '{}');
            const cnpjLimpo = cnpj.replace(/\D/g, '');
            
            return empresasLocais[cnpjLimpo] || null;
        } catch (error) {
            console.error('Erro ao buscar empresa local:', error);
            return null;
        }
    },

    /**
     * Salva empresa na base local
     */
    salvarEmpresaLocal(cnpj, dadosEmpresa) {
        try {
            const empresasLocais = JSON.parse(localStorage.getItem('empresasCadastradas') || '{}');
            const cnpjLimpo = cnpj.replace(/\D/g, '');
            
            empresasLocais[cnpjLimpo] = {
                ...dadosEmpresa,
                dataCadastro: new Date().toISOString(),
                dataUltimaConsulta: new Date().toISOString()
            };
            
            localStorage.setItem('empresasCadastradas', JSON.stringify(empresasLocais));
            return true;
        } catch (error) {
            console.error('Erro ao salvar empresa local:', error);
            return false;
        }
    }
};