// src/hooks/useCep.js
import { useState, useCallback } from 'react';
import { cepService } from '../services/cepService';

/**
 * Hook personalizado para busca de CEP
 * @returns {Object} Objeto com estados e funções para busca de CEP
 */
export const useCep = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [endereco, setEndereco] = useState({
    cep: '',
    rua: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: '',
    numero: '',
    referencia: ''
  });

  /**
   * Busca CEP e preenche automaticamente o endereço
   * @param {string} cep - CEP a ser buscado
   * @param {Function} onSuccess - Callback executado em caso de sucesso
   * @param {Function} onError - Callback executado em caso de erro
   */
  const buscarCep = useCallback(async (cep, onSuccess, onError) => {
    // Limpa erro anterior
    setError(null);
    
    // Valida CEP antes de buscar
    if (!cepService.validarCep(cep)) {
      return;
    }

    setLoading(true);

    try {
      const resultado = await cepService.buscarCep(cep);
      
      if (resultado.success) {
        // Atualiza o estado do endereço mantendo dados já preenchidos
        setEndereco(prevEndereco => ({
          ...prevEndereco,
          cep: resultado.data.cep,
          rua: resultado.data.rua,
          bairro: resultado.data.bairro,
          cidade: resultado.data.cidade,
          estado: resultado.data.estado,
          complemento: resultado.data.complemento
          // Não sobrescreve número e referência que são inseridos manualmente
        }));

        // Executa callback de sucesso se fornecido
        if (onSuccess) {
          onSuccess(resultado.data);
        }
      } else {
        setError(resultado.error);
        
        // Executa callback de erro se fornecido
        if (onError) {
          onError(resultado.error);
        }
      }
    } catch (err) {
      const errorMessage = 'Erro ao buscar CEP. Tente novamente.';
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Atualiza um campo específico do endereço
   * @param {string} campo - Nome do campo a ser atualizado
   * @param {string} valor - Novo valor do campo
   */
  const atualizarCampo = useCallback((campo, valor) => {
    setEndereco(prev => ({
      ...prev,
      [campo]: valor
    }));

    // Se for CEP, aplica máscara e busca automaticamente quando completo
    if (campo === 'cep') {
      const cepFormatado = cepService.aplicarMascaraCep(valor);
      setEndereco(prev => ({
        ...prev,
        cep: cepFormatado
      }));

      // Busca automaticamente quando CEP estiver completo
      if (cepService.validarCep(cepFormatado)) {
        buscarCep(cepFormatado);
      }
    }
  }, [buscarCep]);

  /**
   * Reseta todos os campos do endereço
   */
  const resetarEndereco = useCallback(() => {
    setEndereco({
      cep: '',
      rua: '',
      bairro: '',
      cidade: '',
      estado: '',
      complemento: '',
      numero: '',
      referencia: ''
    });
    setError(null);
  }, []);

  /**
   * Valida se todos os campos obrigatórios estão preenchidos
   * @returns {Object} Resultado da validação
   */
  const validarEndereco = useCallback(() => {
    const camposObrigatorios = {
      cep: 'CEP',
      rua: 'Rua/Avenida',
      numero: 'Número',
      bairro: 'Bairro',
      cidade: 'Cidade',
      estado: 'Estado'
    };

    const camposVazios = [];

    Object.entries(camposObrigatorios).forEach(([campo, label]) => {
      if (!endereco[campo] || endereco[campo].trim() === '') {
        camposVazios.push(label);
      }
    });

    return {
      isValid: camposVazios.length === 0,
      camposVazios,
      mensagem: camposVazios.length > 0 
        ? `Por favor, preencha: ${camposVazios.join(', ')}`
        : ''
    };
  }, [endereco]);

  /**
   * Formata endereço completo para exibição
   * @returns {string} Endereço formatado
   */
  const formatarEnderecoCompleto = useCallback(() => {
    const { rua, numero, bairro, cidade, estado, cep, referencia } = endereco;
    
    let enderecoFormatado = `${rua}, ${numero} - ${bairro}, ${cidade}/${estado} - CEP: ${cep}`;
    
    if (referencia && referencia.trim() !== '') {
      enderecoFormatado += ` - Ref: ${referencia}`;
    }
    
    return enderecoFormatado;
  }, [endereco]);

  return {
    // Estados
    endereco,
    loading,
    error,
    
    // Funções
    buscarCep,
    atualizarCampo,
    resetarEndereco,
    validarEndereco,
    formatarEnderecoCompleto,
    
    // Utilitários
    aplicarMascaraCep: cepService.aplicarMascaraCep,
    validarCep: cepService.validarCep
  };
};