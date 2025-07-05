// src/services/cnpjService.js

export const cnpjService = {
  
    // Aplicar máscara de CNPJ
    aplicarMascaraCnpj: (valor) => {
      // Remove caracteres não numéricos
      const apenasNumeros = valor.replace(/\D/g, '');
      
      // Limita a 14 dígitos
      const limitado = apenasNumeros.slice(0, 14);
      
      // Aplica a máscara
      return limitado
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    },
  
    // Remover máscara do CNPJ
    removerMascaraCnpj: (cnpj) => {
      return cnpj.replace(/\D/g, '');
    },
  
    // Validar CNPJ
    validarCnpj: (cnpj) => {
      const cnpjLimpo = typeof cnpj === 'string' ? cnpj.replace(/\D/g, '') : '';
      
      // Verifica se tem 14 dígitos
      if (cnpjLimpo.length !== 14) {
        return {
          valido: false,
          erro: 'CNPJ deve ter 14 dígitos'
        };
      }
      
      // Verifica se todos os dígitos são iguais
      if (/^(\d)\1{13}$/.test(cnpjLimpo)) {
        return {
          valido: false,
          erro: 'CNPJ não pode ter todos os dígitos iguais'
        };
      }
      
      // Validação dos dígitos verificadores
      const calcularDigito = (cnpj, posicao) => {
        let soma = 0;
        let peso = posicao === 12 ? 5 : 6;
        
        for (let i = 0; i < posicao; i++) {
          soma += parseInt(cnpj.charAt(i)) * peso;
          peso = peso === 2 ? 9 : peso - 1;
        }
        
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
      };
      
      const digito1 = calcularDigito(cnpjLimpo, 12);
      const digito2 = calcularDigito(cnpjLimpo, 13);
      
      const digitosValidos = (
        parseInt(cnpjLimpo.charAt(12)) === digito1 &&
        parseInt(cnpjLimpo.charAt(13)) === digito2
      );
      
      if (!digitosValidos) {
        return {
          valido: false,
          erro: 'CNPJ com dígitos verificadores inválidos'
        };
      }
      
      return {
        valido: true,
        cnpjLimpo: cnpjLimpo,
        cnpjFormatado: this.aplicarMascaraCnpj(cnpjLimpo)
      };
    },
  
    // Gerar CNPJ válido (para testes)
    gerarCnpjTeste: () => {
      // Gera os primeiros 12 dígitos aleatoriamente
      let cnpj = '';
      for (let i = 0; i < 12; i++) {
        cnpj += Math.floor(Math.random() * 10);
      }
      
      // Calcula os dígitos verificadores
      const calcularDigito = (cnpj, posicao) => {
        let soma = 0;
        let peso = posicao === 12 ? 5 : 6;
        
        for (let i = 0; i < posicao; i++) {
          soma += parseInt(cnpj.charAt(i)) * peso;
          peso = peso === 2 ? 9 : peso - 1;
        }
        
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
      };
      
      const digito1 = calcularDigito(cnpj, 12);
      const digito2 = calcularDigito(cnpj + digito1, 13);
      
      const cnpjCompleto = cnpj + digito1 + digito2;
      
      return {
        cnpjLimpo: cnpjCompleto,
        cnpjFormatado: this.aplicarMascaraCnpj(cnpjCompleto)
      };
    },
  
    // Buscar dados da empresa via API (simulado)
    buscarDadosEmpresa: async (cnpj) => {
      try {
        console.log('🔍 Buscando dados da empresa para CNPJ:', cnpj);
        
        const cnpjLimpo = this.removerMascaraCnpj(cnpj);
        
        // Valida CNPJ primeiro
        const validacao = this.validarCnpj(cnpjLimpo);
        if (!validacao.valido) {
          return {
            sucesso: false,
            erro: validacao.erro
          };
        }
        
        // Simula delay da API
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Dados simulados específicos para alguns CNPJs
        const dadosEspecificos = {
          '12345678000123': {
            razao_social: 'EMPRESA TESTE LTDA',
            nome_fantasia: 'Empresa Teste',
            situacao: 'ATIVA',
            tipo: 'MATRIZ',
            porte: 'DEMAIS',
            natureza_juridica: 'Sociedade Empresária Limitada',
            logradouro: 'RUA DAS FLORES',
            numero: '123',
            bairro: 'CENTRO',
            municipio: 'SAO PAULO',
            uf: 'SP',
            cep: '01234567',
            telefone: '(11) 99999-9999',
            email: 'contato@empresateste.com.br'
          },
          '98765432000100': {
            razao_social: 'COMERCIO DE ALIMENTOS LTDA',
            nome_fantasia: 'Alimentos & Cia',
            situacao: 'ATIVA',
            tipo: 'MATRIZ',
            porte: 'PEQUENO',
            natureza_juridica: 'Sociedade Empresária Limitada',
            logradouro: 'AVENIDA BRASIL',
            numero: '456',
            bairro: 'VILA NOVA',
            municipio: 'RIO DE JANEIRO',
            uf: 'RJ',
            cep: '20000000',
            telefone: '(21) 88888-8888',
            email: 'contato@alimentosecia.com.br'
          },
          '05336475000177': {
            razao_social: 'H AZEVEDO DE ABREU',
            nome_fantasia: 'H Azevedo',
            situacao: 'ATIVA',
            tipo: 'MATRIZ',
            porte: 'MICRO',
            natureza_juridica: 'Empresário Individual',
            logradouro: 'RUA AUGUSTA',
            numero: '789',
            bairro: 'CONSOLACAO',
            municipio: 'SAO PAULO',
            uf: 'SP',
            cep: '01305000',
            telefone: '(11) 77777-7777',
            email: 'contato@hazevedo.com.br'
          }
        };
        
        // Se tem dados específicos, retorna eles
        if (dadosEspecificos[cnpjLimpo]) {
          console.log('✅ Dados específicos encontrados');
          return {
            sucesso: true,
            dados: {
              cnpj: cnpjLimpo,
              cnpj_formatado: validacao.cnpjFormatado,
              ...dadosEspecificos[cnpjLimpo],
              data_consulta: new Date().toISOString()
            }
          };
        }
        
        // Gera dados aleatórios baseados no CNPJ
        const nomesComercio = [
          'COMERCIO', 'INDUSTRIA', 'SERVICOS', 'ALIMENTOS', 'TECNOLOGIA',
          'CONSULTORIA', 'LOGISTICA', 'MARKETING', 'CONSTRUCAO', 'EDUCACAO',
          'SAUDE', 'TRANSPORTES', 'VAREJO', 'ATACADO', 'EVENTOS'
        ];
        
        const tiposJuridicos = ['LTDA', 'EIRELI', 'SA', 'ME', 'EPP'];
        const portes = ['MICRO', 'PEQUENO', 'MEDIO', 'GRANDE'];
        const estados = ['SP', 'RJ', 'MG', 'PR', 'RS', 'SC', 'GO', 'DF', 'BA', 'PE'];
        
        const randomNome = nomesComercio[parseInt(cnpjLimpo.substring(0, 2)) % nomesComercio.length];
        const randomTipo = tiposJuridicos[parseInt(cnpjLimpo.substring(12, 14)) % tiposJuridicos.length];
        const randomPorte = portes[parseInt(cnpjLimpo.substring(6, 8)) % portes.length];
        const randomUF = estados[parseInt(cnpjLimpo.substring(4, 6)) % estados.length];
        
        // Simula algumas situações inativas (5% de chance)
        const situacao = Math.random() < 0.05 ? 'BAIXADA' : 'ATIVA';
        
        console.log('✅ Dados gerados automaticamente');
        
        return {
          sucesso: true,
          dados: {
            cnpj: cnpjLimpo,
            cnpj_formatado: validacao.cnpjFormatado,
            razao_social: `${randomNome} E PARTICIPACOES ${randomTipo}`,
            nome_fantasia: `${randomNome.toLowerCase().replace(/^\w/, c => c.toUpperCase())} ${randomTipo}`,
            situacao: situacao,
            tipo: 'MATRIZ',
            porte: randomPorte,
            natureza_juridica: randomTipo === 'LTDA' ? 'Sociedade Empresária Limitada' : 'Empresa Individual de Responsabilidade Limitada',
            logradouro: `RUA ${randomNome} ${parseInt(cnpjLimpo.substring(8, 10))}`,
            numero: cnpjLimpo.substring(10, 14),
            bairro: 'CENTRO',
            municipio: randomUF === 'SP' ? 'SAO PAULO' : randomUF === 'RJ' ? 'RIO DE JANEIRO' : 'CAPITAL',
            uf: randomUF,
            cep: cnpjLimpo.substring(0, 8),
            telefone: `(${cnpjLimpo.substring(0, 2)}) 9${cnpjLimpo.substring(2, 6)}-${cnpjLimpo.substring(6, 10)}`,
            email: null, // Email não vem da Receita Federal
            data_consulta: new Date().toISOString()
          }
        };
        
      } catch (error) {
        console.error('❌ Erro na consulta CNPJ:', error);
        return {
          sucesso: false,
          erro: 'Erro ao consultar dados da empresa. Tente novamente.'
        };
      }
    },
  
    // Verificar situação da empresa
    verificarSituacao: (situacao) => {
      const situacaoUpper = situacao ? situacao.toUpperCase() : '';
      
      const situacoesAtivas = ['ATIVA', 'ATIVO'];
      const situacoesInativas = ['BAIXADA', 'BAIXADO', 'SUSPENSA', 'SUSPENSO', 'NULA', 'INAPTA'];
      
      if (situacoesAtivas.includes(situacaoUpper)) {
        return {
          ativa: true,
          status: 'ATIVA',
          mensagem: 'Empresa em situação regular',
          cor: '#28a745'
        };
      }
      
      if (situacoesInativas.includes(situacaoUpper)) {
        return {
          ativa: false,
          status: situacaoUpper,
          mensagem: 'Empresa com situação irregular',
          cor: '#dc3545'
        };
      }
      
      return {
        ativa: null,
        status: situacaoUpper || 'DESCONHECIDA',
        mensagem: 'Situação não identificada',
        cor: '#ffc107'
      };
    },
  
    // Formatação de dados da empresa
    formatarDadosEmpresa: (dados) => {
      if (!dados) return null;
      
      const situacao = this.verificarSituacao(dados.situacao);
      
      return {
        cnpj: dados.cnpj,
        cnpjFormatado: dados.cnpj_formatado,
        razaoSocial: dados.razao_social,
        nomeFantasia: dados.nome_fantasia,
        situacao: situacao,
        tipo: dados.tipo,
        porte: dados.porte,
        naturezaJuridica: dados.natureza_juridica,
        endereco: {
          logradouro: dados.logradouro,
          numero: dados.numero,
          bairro: dados.bairro,
          municipio: dados.municipio,
          uf: dados.uf,
          cep: dados.cep
        },
        contato: {
          telefone: dados.telefone,
          email: dados.email
        },
        dataConsulta: dados.data_consulta
      };
    },
  
    // Lista de CNPJs para teste
    obterCnpjsTeste: () => {
      return [
        {
          cnpj: '12.345.678/0001-23',
          empresa: 'Empresa Teste Ltda',
          situacao: 'ATIVA'
        },
        {
          cnpj: '98.765.432/0001-00',
          empresa: 'Comércio de Alimentos Ltda',
          situacao: 'ATIVA'
        },
        {
          cnpj: '05.336.475/0001-77',
          empresa: 'H Azevedo de Abreu',
          situacao: 'ATIVA'
        },
        {
          cnpj: '11.222.333/0001-44',
          empresa: 'Exemplo Baixado Ltda',
          situacao: 'BAIXADA'
        },
        {
          cnpj: '00.000.000/0001-91',
          empresa: 'CNPJ Inválido (para teste)',
          situacao: 'INVÁLIDO'
        }
      ];
    }
  };