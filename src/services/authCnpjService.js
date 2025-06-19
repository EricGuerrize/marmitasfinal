// src/services/authCnpjService.js

/**
 * Serviço de autenticação por CNPJ
 * Gerencia login/senha para cada CNPJ cadastrado
 */
export const authCnpjService = {
    
    /**
     * Registra um novo CNPJ com senha
     * @param {string} cnpj - CNPJ da empresa
     * @param {string} senha - Senha escolhida
     * @param {Object} dadosEmpresa - Dados opcionais da empresa
     * @returns {Object} Resultado da operação
     */
    registrarCnpj(cnpj, senha, dadosEmpresa = {}) {
        try {
            const cnpjLimpo = cnpj.replace(/\D/g, '');
            
            // Valida CNPJ
            if (!this.validarCnpj(cnpjLimpo)) {
                throw new Error('CNPJ inválido');
            }
            
            // Valida senha
            if (!senha || senha.length < 4) {
                throw new Error('Senha deve ter pelo menos 4 caracteres');
            }
            
            const empresasCadastradas = this.getEmpresasCadastradas();
            
            // Verifica se CNPJ já está cadastrado
            if (empresasCadastradas[cnpjLimpo]) {
                throw new Error('CNPJ já cadastrado no sistema');
            }
            
            // Registra nova empresa
            empresasCadastradas[cnpjLimpo] = {
                cnpj: cnpjLimpo,
                cnpjFormatado: this.formatarCnpj(cnpjLimpo),
                senha: this.criptografarSenha(senha),
                dataCadastro: new Date().toISOString(),
                ultimoAcesso: null,
                ativo: true,
                tentativasLogin: 0,
                ...dadosEmpresa
            };
            
            this.salvarEmpresasCadastradas(empresasCadastradas);
            
            return {
                success: true,
                message: 'CNPJ cadastrado com sucesso!'
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Autentica CNPJ e senha
     * @param {string} cnpj - CNPJ da empresa
     * @param {string} senha - Senha informada
     * @returns {Object} Resultado da autenticação
     */
    autenticar(cnpj, senha) {
        try {
            const cnpjLimpo = cnpj.replace(/\D/g, '');
            const empresasCadastradas = this.getEmpresasCadastradas();
            const empresa = empresasCadastradas[cnpjLimpo];
            
            if (!empresa) {
                throw new Error('CNPJ não cadastrado no sistema');
            }
            
            if (!empresa.ativo) {
                throw new Error('CNPJ desativado. Entre em contato com o suporte');
            }
            
            // Verifica tentativas de login
            if (empresa.tentativasLogin >= 5) {
                throw new Error('Muitas tentativas inválidas. CNPJ bloqueado temporariamente');
            }
            
            // Verifica senha
            if (!this.verificarSenha(senha, empresa.senha)) {
                // Incrementa tentativas
                empresa.tentativasLogin = (empresa.tentativasLogin || 0) + 1;
                empresasCadastradas[cnpjLimpo] = empresa;
                this.salvarEmpresasCadastradas(empresasCadastradas);
                
                throw new Error(`Senha incorreta. Tentativas restantes: ${5 - empresa.tentativasLogin}`);
            }
            
            // Login bem-sucedido - reset tentativas e atualiza último acesso
            empresa.tentativasLogin = 0;
            empresa.ultimoAcesso = new Date().toISOString();
            empresasCadastradas[cnpjLimpo] = empresa;
            this.salvarEmpresasCadastradas(empresasCadastradas);
            
            // Salva sessão
            this.salvarSessao(empresa);
            
            return {
                success: true,
                empresa: {
                    cnpj: empresa.cnpjFormatado,
                    razaoSocial: empresa.razaoSocial || `Empresa ${empresa.cnpjFormatado}`,
                    nomeFantasia: empresa.nomeFantasia,
                    ultimoAcesso: empresa.ultimoAcesso
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * Verifica se existe sessão ativa
     * @returns {Object|null} Dados da sessão ou null
     */
    verificarSessao() {
        try {
            const sessao = JSON.parse(sessionStorage.getItem('sessaoCnpj') || 'null');
            
            if (!sessao) return null;
            
            // Verifica se sessão não expirou (24 horas)
            const agora = new Date().getTime();
            const loginTime = new Date(sessao.loginTime).getTime();
            const horasDecorridas = (agora - loginTime) / (1000 * 60 * 60);
            
            if (horasDecorridas > 24) {
                this.logout();
                return null;
            }
            
            return sessao;
            
        } catch (error) {
            return null;
        }
    },
    
    /**
     * Faz logout e limpa sessão
     */
    logout() {
        sessionStorage.removeItem('sessaoCnpj');
        sessionStorage.removeItem('cnpj');
        sessionStorage.removeItem('empresaInfo');
        sessionStorage.removeItem('dadosEmpresa');
    },
    
    /**
     * Altera senha de um CNPJ
     * @param {string} cnpj - CNPJ da empresa
     * @param {string} senhaAtual - Senha atual
     * @param {string} novaSenha - Nova senha
     * @returns {Object} Resultado da operação
     */
    alterarSenha(cnpj, senhaAtual, novaSenha) {
        try {
            const cnpjLimpo = cnpj.replace(/\D/g, '');
            const empresasCadastradas = this.getEmpresasCadastradas();
            const empresa = empresasCadastradas[cnpjLimpo];
            
            if (!empresa) {
                throw new Error('CNPJ não encontrado');
            }
            
            if (!this.verificarSenha(senhaAtual, empresa.senha)) {
                throw new Error('Senha atual incorreta');
            }
            
            if (novaSenha.length < 4) {
                throw new Error('Nova senha deve ter pelo menos 4 caracteres');
            }
            
            empresa.senha = this.criptografarSenha(novaSenha);
            empresasCadastradas[cnpjLimpo] = empresa;
            this.salvarEmpresasCadastradas(empresasCadastradas);
            
            return {
                success: true,
                message: 'Senha alterada com sucesso!'
            };
            
        } catch (error) {
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
    listarEmpresasCadastradas() {
        const empresas = this.getEmpresasCadastradas();
        return Object.values(empresas).map(empresa => ({
            cnpj: empresa.cnpjFormatado,
            razaoSocial: empresa.razaoSocial || `Empresa ${empresa.cnpjFormatado}`,
            nomeFantasia: empresa.nomeFantasia,
            dataCadastro: empresa.dataCadastro,
            ultimoAcesso: empresa.ultimoAcesso,
            ativo: empresa.ativo,
            tentativasLogin: empresa.tentativasLogin || 0
        }));
    },
    
    /**
     * Desativa/Ativa CNPJ (para admin)
     * @param {string} cnpj - CNPJ da empresa
     * @param {boolean} ativo - Status ativo/inativo
     * @returns {Object} Resultado da operação
     */
    toggleAtivoCnpj(cnpj, ativo) {
        try {
            const cnpjLimpo = cnpj.replace(/\D/g, '');
            const empresasCadastradas = this.getEmpresasCadastradas();
            const empresa = empresasCadastradas[cnpjLimpo];
            
            if (!empresa) {
                throw new Error('CNPJ não encontrado');
            }
            
            empresa.ativo = ativo;
            empresasCadastradas[cnpjLimpo] = empresa;
            this.salvarEmpresasCadastradas(empresasCadastradas);
            
            return {
                success: true,
                message: `CNPJ ${ativo ? 'ativado' : 'desativado'} com sucesso!`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Métodos auxiliares
    getEmpresasCadastradas() {
        try {
            return JSON.parse(localStorage.getItem('empresasCnpjCadastradas') || '{}');
        } catch {
            return {};
        }
    },
    
    salvarEmpresasCadastradas(empresas) {
        localStorage.setItem('empresasCnpjCadastradas', JSON.stringify(empresas));
    },
    
    salvarSessao(empresa) {
        const sessao = {
            cnpj: empresa.cnpjFormatado,
            razaoSocial: empresa.razaoSocial || `Empresa ${empresa.cnpjFormatado}`,
            nomeFantasia: empresa.nomeFantasia,
            loginTime: new Date().toISOString()
        };
        
        sessionStorage.setItem('sessaoCnpj', JSON.stringify(sessao));
        sessionStorage.setItem('cnpj', empresa.cnpjFormatado);
        sessionStorage.setItem('empresaInfo', sessao.razaoSocial);
    },
    
    // Criptografia simples (para demo - em produção use algo mais robusto)
    criptografarSenha(senha) {
        return btoa(senha + 'salt123'); // Base64 simples
    },
    
    verificarSenha(senha, senhaHash) {
        return this.criptografarSenha(senha) === senhaHash;
    },
    
    formatarCnpj(cnpj) {
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    },
    
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
    }
};