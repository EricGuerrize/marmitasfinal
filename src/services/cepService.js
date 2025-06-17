// src/services/cepService.js

/**
 * Serviço para busca de endereço por CEP usando a API ViaCEP
 */
export const cepService = {
    /**
     * Busca endereço por CEP
     * @param {string} cep - CEP a ser buscado (pode conter máscara)
     * @returns {Promise<Object>} Dados do endereço ou erro
     */
    async buscarCep(cep) {
      try {
        // Remove caracteres não numéricos
        const cepLimpo = cep.replace(/\D/g, '');
        
        // Valida se o CEP tem 8 dígitos
        if (cepLimpo.length !== 8) {
          throw new Error('CEP deve conter 8 dígitos');
        }
  
        // Faz a requisição para a API ViaCEP
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        
        if (!response.ok) {
          throw new Error('Erro na consulta do CEP');
        }
  
        const data = await response.json();
        
        // Verifica se o CEP foi encontrado
        if (data.erro) {
          throw new Error('CEP não encontrado');
        }
  
        // Retorna os dados formatados
        return {
          success: true,
          data: {
            cep: data.cep,
            rua: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || '',
            complemento: data.complemento || '',
            ddd: data.ddd || ''
          }
        };
  
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        return {
          success: false,
          error: error.message || 'Erro desconhecido'
        };
      }
    },
  
    /**
     * Aplica máscara de CEP (formato: 00000-000)
     * @param {string} value - Valor a ser formatado
     * @returns {string} CEP formatado
     */
    aplicarMascaraCep(value) {
      const onlyNumbers = value.replace(/\D/g, '');
      return onlyNumbers
        .replace(/(\d{5})(\d)/, '$1-$2')
        .slice(0, 9);
    },
  
    /**
     * Valida formato de CEP
     * @param {string} cep - CEP a ser validado
     * @returns {boolean} True se válido
     */
    validarCep(cep) {
      const cepLimpo = cep.replace(/\D/g, '');
      return cepLimpo.length === 8 && /^\d{8}$/.test(cepLimpo);
    }
  };