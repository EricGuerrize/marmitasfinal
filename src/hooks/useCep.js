// src/hooks/useCep.js
import { useState, useCallback } from 'react';

export const useCep = () => {
  const [endereco, setEndereco] = useState({
    cep: '',
    rua: '',
    bairro: '',
    cidade: '',
    estado: 'SP',
    numero: '',
    referencia: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Busca CEP na API ViaCEP
   */
  const buscarCep = useCallback(async (cep) => {
    if (!cep || cep.length < 8) return;
    
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        setError('CEP não encontrado');
        return;
      }
      
      setEndereco(prev => ({
        ...prev,
        cep: data.cep,
        rua: data.logradouro || prev.rua,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado
      }));
      
    } catch (err) {
      setError('Erro ao buscar CEP');
      console.error('Erro CEP:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Atualiza campo específico do endereço
   */
  const atualizarCampo = useCallback((campo, valor) => {
    setEndereco(prev => ({
      ...prev,
      [campo]: valor
    }));
    
    // Auto-busca CEP quando completo
    if (campo === 'cep') {
      const cepFormatado = aplicarMascaraCep(valor);
      setEndereco(prev => ({ ...prev, cep: cepFormatado }));
      
      const cepLimpo = valor.replace(/\D/g, '');
      if (cepLimpo.length === 8) {
        buscarCep(cepLimpo);
      }
    }
  }, [buscarCep]);

  /**
   * Aplica máscara de CEP
   */
  const aplicarMascaraCep = (valor) => {
    const apenasNumeros = valor.replace(/\D/g, '');
    return apenasNumeros
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
  };

  /**
   * Valida se endereço está completo
   */
  const validarEndereco = useCallback(() => {
    const camposObrigatorios = ['cep', 'rua', 'numero', 'bairro', 'cidade'];
    const camposVazios = camposObrigatorios.filter(campo => !endereco[campo]?.trim());
    
    if (camposVazios.length > 0) {
      return {
        isValid: false,
        mensagem: `Preencha os campos obrigatórios: ${camposVazios.join(', ')}`
      };
    }
    
    const cepLimpo = endereco.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      return {
        isValid: false,
        mensagem: 'CEP deve ter 8 dígitos'
      };
    }
    
    return { isValid: true, mensagem: '' };
  }, [endereco]);

  /**
   * Formata endereço completo para exibição
   */
  const formatarEnderecoCompleto = useCallback(() => {
    const { rua, numero, bairro, cidade, estado, cep, referencia } = endereco;
    
    let enderecoCompleto = `${rua}, ${numero} - ${bairro}, ${cidade}/${estado}`;
    
    if (cep) {
      enderecoCompleto += ` - CEP: ${cep}`;
    }
    
    if (referencia?.trim()) {
      enderecoCompleto += ` (Ref: ${referencia.trim()})`;
    }
    
    return enderecoCompleto;
  }, [endereco]);

  /**
   * Limpa todos os campos
   */
  const limparEndereco = useCallback(() => {
    setEndereco({
      cep: '',
      rua: '',
      bairro: '',
      cidade: '',
      estado: 'SP',
      numero: '',
      referencia: ''
    });
    setError('');
  }, []);

  /**
   * Define endereço completo
   */
  const setEnderecoCompleto = useCallback((novoEndereco) => {
    setEndereco(prev => ({
      ...prev,
      ...novoEndereco
    }));
  }, []);

  return {
    endereco,
    loading,
    error,
    buscarCep,
    atualizarCampo,
    validarEndereco,
    formatarEnderecoCompleto,
    limparEndereco,
    setEnderecoCompleto,
    aplicarMascaraCep
  };
};