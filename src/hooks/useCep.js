// src/hooks/useCep.js
import { useState, useCallback, useRef } from 'react';

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
  const latestRequestRef = useRef(0);

  const fetchComTimeout = async (url, timeoutMs = 7000) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  };

  const normalizarCepData = (provider, data) => {
    if (provider === 'viacep') {
      if (data.erro) return null;
      return {
        cep: data.cep || '',
        rua: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || ''
      };
    }

    if (provider === 'brasilapi') {
      return {
        cep: data.cep || '',
        rua: data.street || '',
        bairro: data.neighborhood || '',
        cidade: data.city || '',
        estado: data.state || ''
      };
    }

    return null;
  };

  /**
   * Busca CEP com fallback entre provedores
   */
  const buscarCep = useCallback(async (cep) => {
    if (!cep || cep.length < 8) return;
    
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    
    const requestId = Date.now();
    latestRequestRef.current = requestId;
    setLoading(true);
    setError('');
    
    try {
      const providers = [
        { name: 'brasilapi', url: `https://brasilapi.com.br/api/cep/v1/${cepLimpo}` },
        { name: 'viacep', url: `https://viacep.com.br/ws/${cepLimpo}/json/` }
      ];

      let enderecoEncontrado = null;
      let cepInvalido = false;

      for (const provider of providers) {
        try {
          const response = await fetchComTimeout(provider.url);
          if (!response.ok) {
            continue;
          }

          const data = await response.json();
          const normalizado = normalizarCepData(provider.name, data);

          if (!normalizado) {
            cepInvalido = true;
            continue;
          }

          enderecoEncontrado = normalizado;
          break;
        } catch {
          // tenta próximo provider sem quebrar o fluxo
        }
      }

      if (latestRequestRef.current !== requestId) return;

      if (!enderecoEncontrado) {
        const enderecoJaPreenchido = Boolean(endereco.rua?.trim() && endereco.cidade?.trim());
        if (!enderecoJaPreenchido) {
          setError(cepInvalido ? 'CEP não encontrado' : 'Não foi possível consultar o CEP agora. Preencha manualmente.');
        }
        return;
      }

      setEndereco(prev => ({
        ...prev,
        cep: enderecoEncontrado.cep || prev.cep,
        rua: enderecoEncontrado.rua || prev.rua,
        bairro: enderecoEncontrado.bairro || prev.bairro,
        cidade: enderecoEncontrado.cidade || prev.cidade,
        estado: enderecoEncontrado.estado || prev.estado
      }));

      setError('');
    } catch (err) {
      if (latestRequestRef.current !== requestId) return;
      const enderecoJaPreenchido = Boolean(endereco.rua?.trim() && endereco.cidade?.trim());
      if (!enderecoJaPreenchido) {
        setError('Não foi possível consultar o CEP agora. Preencha manualmente.');
      }
      console.error('Erro CEP:', err);
    } finally {
      if (latestRequestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [endereco.cidade, endereco.rua]);

  /**
   * Atualiza campo específico do endereço
   */
  const atualizarCampo = useCallback((campo, valor) => {
    // Auto-busca CEP quando completo
    if (campo === 'cep') {
      const cepFormatado = aplicarMascaraCep(valor);
      setEndereco(prev => ({ ...prev, cep: cepFormatado }));
      if (error) setError('');
      
      const cepLimpo = valor.replace(/\D/g, '');
      if (cepLimpo.length === 8) {
        buscarCep(cepLimpo);
      }
      return;
    }

    setEndereco(prev => ({
      ...prev,
      [campo]: valor
    }));
  }, [buscarCep, error]);

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
