// services/firebaseAuthService.js
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    updateEmail,
    onAuthStateChanged
  } from 'firebase/auth';
  import { doc, setDoc, getDoc, getDocs, collection, updateDoc, query, where, limit } from 'firebase/firestore';
  import { auth, db } from '../lib/firebase';
  
  // Converter CNPJ para email fictício (Firebase exige email)
  const cnpjToEmail = (cnpj) => {
    const cleanCnpj = cnpj.replace(/[^\d]/g, ''); // Remove formatação
    return `${cleanCnpj}@fitinbox.local`;
  };
  
  // Validar CNPJ básico
  const isValidCnpj = (cnpj) => {
    const cleanCnpj = cnpj.replace(/[^\d]/g, '');
    return cleanCnpj.length === 14;
  };

  const parseStorageJson = (value) => {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  };

  const getFirstNonEmpty = (...values) => {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  };

  const normalizeEmpresaData = (...sources) => {
    const validSources = sources.filter((source) => source && typeof source === 'object');

    const cnpj = getFirstNonEmpty(
      ...validSources.map((source) => source.cnpj),
      ...validSources.map((source) => source.cnpjFormatado),
      ...validSources.map((source) => source.cnpj_formatado)
    );

    const cnpjFormatado = getFirstNonEmpty(
      ...validSources.map((source) => source.cnpjFormatado),
      ...validSources.map((source) => source.cnpj_formatado),
      cnpj
    );

    const nomeEmpresa = getFirstNonEmpty(
      ...validSources.map((source) => source.nomeEmpresa),
      ...validSources.map((source) => source.nome),          // campo usado na coleção "empresas" legada
      ...validSources.map((source) => source.nomeFantasia),
      ...validSources.map((source) => source.nome_fantasia),
      ...validSources.map((source) => source.nome_empresa),
      ...validSources.map((source) => source.razaoSocial),
      ...validSources.map((source) => source.razao_social)
    );

    const razaoSocial = getFirstNonEmpty(
      ...validSources.map((source) => source.razaoSocial),
      ...validSources.map((source) => source.razao_social),
      ...validSources.map((source) => source.nome_empresa),
      nomeEmpresa
    );

    const email = getFirstNonEmpty(
      ...validSources.map((source) => source.email)
    );

    const tipoUsuario = getFirstNonEmpty(
      ...validSources.map((source) => source.tipoUsuario),
      ...validSources.map((source) => source.tipo_usuario)
    );

    const telefone = getFirstNonEmpty(
      ...validSources.map((source) => source.telefone)
    );

    const endereco = getFirstNonEmpty(
      ...validSources.map((source) => source.endereco)
    );

    return {
      cnpj,
      cnpjFormatado,
      nomeEmpresa,
      razaoSocial,
      email,
      tipoUsuario,
      telefone,
      endereco
    };
  };
  
  export const firebaseAuthService = {
    // Login com CNPJ e senha
    async signInWithCnpj(cnpj, password) {
      try {
        if (!isValidCnpj(cnpj)) {
          return {
            success: false,
            error: 'CNPJ inválido'
          };
        }
  
        // Tenta login com email real (contas novas), fallback para email fictício (contas antigas)
        let userCredential = null;
        const emailReal = await this.buscarEmailPorCnpj(cnpj);
        if (emailReal) {
          try {
            userCredential = await signInWithEmailAndPassword(auth, emailReal, password);
          } catch (e) {
            // Fallback para contas antigas com email fictício
            if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
              userCredential = await signInWithEmailAndPassword(auth, cnpjToEmail(cnpj), password);
            } else {
              throw e;
            }
          }
        } else {
          userCredential = await signInWithEmailAndPassword(auth, cnpjToEmail(cnpj), password);
        }
        
        // Migração silenciosa: se logou com email fictício mas tem email real no Firestore,
        // atualiza o Firebase Auth para usar o email real (sem perda de dados)
        if (emailReal && userCredential.user.email === cnpjToEmail(cnpj)) {
          try {
            await updateEmail(userCredential.user, emailReal);
            console.log('✅ Email migrado para email real:', emailReal);
          } catch (migrateErr) {
            // Não bloqueia o login se a migração falhar
            console.log('⚠️ Migração de email adiada:', migrateErr.code);
          }
        }

        // Buscar dados completos do usuário no Firestore
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        let userData = userDoc.exists() ? userDoc.data() : {};

        // Se o UID atual não tem documento em users (conta antiga @fitinbox.local),
        // busca em users pelo CNPJ para encontrar o documento correto (conta nova)
        const cleanCnpj = cnpj.replace(/[^\d]/g, '');
        const cnpjFormatado = cleanCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');

        if (!userData.cnpj) {
          for (const variante of [cleanCnpj, cnpjFormatado, cnpj.trim()]) {
            try {
              const q = query(collection(db, 'users'), where('cnpj', '==', variante), limit(1));
              const snap = await getDocs(q);
              if (!snap.empty) {
                userData = snap.docs[0].data();
                console.log('✅ Dados do users encontrados por CNPJ:', userData.nomeEmpresa || userData.nomeFantasia);
                break;
              }
            } catch (e) { /* ignora */ }
          }
        }

        // Se ainda sem nome, busca na coleção "empresas" (usuários puramente antigos)
        let empresaLegada = {};
        const temNome = userData.nomeEmpresa || userData.nomeFantasia || userData.nome_empresa || userData.razaoSocial;
        if (!temNome) {
          for (const variante of [cleanCnpj, cnpjFormatado, cnpj.trim()]) {
            try {
              const q = query(collection(db, 'empresas'), where('cnpj', '==', variante), limit(1));
              const snap = await getDocs(q);
              if (!snap.empty) {
                empresaLegada = snap.docs[0].data();
                console.log('✅ Dados da empresa legada encontrados:', empresaLegada);
                break;
              }
            } catch (e) { /* ignora erros por variante */ }
          }
        }

        const nomeEmpresaFinal =
          userData.nomeEmpresa ||
          userData.nomeFantasia ||
          userData.nome_empresa ||
          empresaLegada.nome ||
          empresaLegada.nomeFantasia ||
          empresaLegada.razaoSocial ||
          '';

        // ✅ SALVAR DADOS NO LOCALSTORAGE PARA MANTER SESSÃO
        const dadosEmpresa = {
          cnpj: cnpj,
          cnpj_formatado: cnpj,
          email: userData.email || empresaLegada.email || '',
          nome_empresa: nomeEmpresaFinal,
          razao_social: userData.razaoSocial || empresaLegada.razaoSocial || nomeEmpresaFinal,
          nome_fantasia: userData.nomeFantasia || userData.nomeEmpresa || empresaLegada.nomeFantasia || empresaLegada.nome || nomeEmpresaFinal,
          tipo_usuario: cnpj === '05.336.475/0001-77' ? 'admin' : 'cliente', // Admin especial
          ativo: true,
          data_cadastro: userData.createdAt || new Date().toISOString(),
          ultimo_acesso: new Date().toISOString()
        };
  
        // Salvar nos storages
        localStorage.setItem('dadosEmpresaLogada', JSON.stringify(dadosEmpresa));
        sessionStorage.setItem('empresaLogada', JSON.stringify(dadosEmpresa));
  
        console.log('✅ Dados salvos no localStorage:', dadosEmpresa);
  
        return {
          success: true,
          user: userCredential.user,
          data: {
            ...userCredential.user,
            cnpj: cnpj,
            ...userData,
            ...dadosEmpresa
          }
        };
      } catch (error) {
        let errorMessage = 'Erro no login';
        
        if (error.code === 'auth/user-not-found') {
          errorMessage = 'CNPJ não encontrado';
        } else if (error.code === 'auth/wrong-password') {
          errorMessage = 'Senha incorreta';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'CNPJ inválido';
        }
  
        return {
          success: false,
          error: errorMessage
        };
      }
    },
  
    // Registro com CNPJ, email e senha
    async signUpWithCnpj(cnpj, email, password, userData = {}) {
      try {
        if (!isValidCnpj(cnpj)) {
          return {
            success: false,
            error: 'CNPJ inválido'
          };
        }
  
        // Usa email real para Firebase Auth (permite reset de senha funcionar)
        const firebaseEmail = email || cnpjToEmail(cnpj);
        const userCredential = await createUserWithEmailAndPassword(auth, firebaseEmail, password);
        
        // Salvar dados completos no Firestore
        const userDocData = {
          cnpj: cnpj,
          email: email, // Email real do usuário
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          ...userData
        };
  
        await setDoc(doc(db, 'users', userCredential.user.uid), userDocData);
  
        // Atualizar displayName se fornecido
        if (userData.nomeFantasia) {
          await updateProfile(userCredential.user, {
            displayName: userData.nomeFantasia
          });
        }
  
        return {
          success: true,
          user: userCredential.user,
          data: {
            ...userCredential.user,
            ...userDocData
          }
        };
      } catch (error) {
        let errorMessage = 'Erro no cadastro';
        
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'Este CNPJ já possui cadastro. Caso não lembre a senha, use a opção "Esqueci minha senha" na tela de login.';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'Senha muito fraca';
        }
  
        return {
          success: false,
          error: errorMessage
        };
      }
    },
  
    // ✅ MÉTODO VERIFICAR SESSÃO (CORRIGIDO)
    async verificarSessao() {
      try {
        // Aguarda o Firebase Auth terminar de inicializar (fix race condition)
        const user = await new Promise((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            unsubscribe();
            resolve(firebaseUser);
          });
        });

        // ✅ VERIFICAÇÃO MAIS RIGOROSA
        if (!user) {
          console.log('🚫 Nenhum usuário autenticado no Firebase');
          return { isAuthenticated: false, isAdmin: false };
        }

        const dadosSessao = parseStorageJson(sessionStorage.getItem('empresaLogada'));
        const dadosLocal = parseStorageJson(localStorage.getItem('dadosEmpresaLogada'));

        // Buscar dados do usuário no Firestore (pelo UID da sessão atual)
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        let userData = userDoc.exists() ? userDoc.data() : {};

        // Normalização inicial para extrair o CNPJ do storage
        let dadosNormalizados = normalizeEmpresaData(dadosSessao, dadosLocal, userData);
        const cnpjLimpo = dadosNormalizados.cnpj.replace(/\D/g, '');
        const hasCompanyData = cnpjLimpo.length === 14;

        // Se userData está vazio (UID não encontrou documento em users), busca pelo CNPJ
        // Isso cobre o caso em que o usuário loga com a conta antiga (@fitinbox.local)
        // mas tem um documento em users associado a outra conta (email real)
        if (!userData.cnpj && hasCompanyData) {
          const cnpjFormatado = cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
          for (const variante of [cnpjLimpo, cnpjFormatado]) {
            try {
              const q = query(collection(db, 'users'), where('cnpj', '==', variante), limit(1));
              const snap = await getDocs(q);
              if (!snap.empty) {
                userData = snap.docs[0].data();
                console.log('✅ Documento users encontrado por CNPJ:', userData.nomeEmpresa || userData.nomeFantasia);
                dadosNormalizados = normalizeEmpresaData(dadosSessao, dadosLocal, userData);
                break;
              }
            } catch (e) { /* ignora */ }
          }
        }

        // Se ainda não tem nome, busca na coleção "empresas" (usuários puramente antigos sem users doc)
        if (hasCompanyData && !dadosNormalizados.nomeEmpresa) {
          const cnpjFormatado = cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
          for (const variante of [cnpjLimpo, cnpjFormatado]) {
            try {
              const q = query(collection(db, 'empresas'), where('cnpj', '==', variante), limit(1));
              const snap = await getDocs(q);
              if (!snap.empty) {
                const empresaLegada = snap.docs[0].data();
                const nomeEmpresaLegada = empresaLegada.nome || empresaLegada.nomeFantasia || '';
                if (nomeEmpresaLegada && nomeEmpresaLegada !== 'Empresa') {
                  console.log('✅ Nome encontrado na coleção empresas:', nomeEmpresaLegada);
                  dadosNormalizados = normalizeEmpresaData(dadosSessao, dadosLocal, userData, empresaLegada);
                }
                break;
              }
            } catch (e) { /* ignora */ }
          }
        }

        if (!hasCompanyData) {
          console.warn('⚠️ Usuário autenticado, mas sem dados mínimos de empresa');
          return {
            isAuthenticated: false,
            isAdmin: false,
            hasAuthButNoCompanyData: true,
            user,
            empresa: userData
          };
        }

        const isAdmin = dadosNormalizados.tipoUsuario === 'admin' || cnpjLimpo === '05336475000177';
        const tipoUsuario = dadosNormalizados.tipoUsuario || (isAdmin ? 'admin' : 'cliente');

        const dadosPersistencia = {
          ...dadosLocal,
          ...dadosSessao,
          ...userData,
          cnpj: dadosNormalizados.cnpj,
          cnpj_formatado: dadosNormalizados.cnpjFormatado || dadosNormalizados.cnpj,
          nome_empresa: dadosNormalizados.nomeEmpresa || dadosNormalizados.razaoSocial || '',
          razao_social: dadosNormalizados.razaoSocial || dadosNormalizados.nomeEmpresa || '',
          nome_fantasia: dadosNormalizados.nomeEmpresa || '',
          email: dadosNormalizados.email || '',
          tipo_usuario: tipoUsuario,
          ultimo_acesso: new Date().toISOString()
        };

        sessionStorage.setItem('empresaLogada', JSON.stringify(dadosPersistencia));
        localStorage.setItem('dadosEmpresaLogada', JSON.stringify(dadosPersistencia));

        console.log('✅ Sessão válida encontrada');
        return {
          isAuthenticated: true,
          isAdmin,
          user,
          empresa: userData,
          cnpj: dadosNormalizados.cnpj,
          cnpjFormatado: dadosNormalizados.cnpjFormatado || dadosNormalizados.cnpj,
          nomeEmpresa: dadosNormalizados.nomeEmpresa || dadosNormalizados.razaoSocial,
          razaoSocial: dadosNormalizados.razaoSocial || dadosNormalizados.nomeEmpresa,
          email: dadosNormalizados.email,
          tipoUsuario,
          telefone: dadosNormalizados.telefone,
          endereco: dadosNormalizados.endereco
        };
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        return { isAuthenticated: false, isAdmin: false };
      }
    },
  
    // ✅ MÉTODO LISTAR EMPRESAS (FALTAVA)
    async listarEmpresas() {
      try {
        const snapshot = await getDocs(collection(db, 'empresas'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Erro ao listar empresas:', error);
        return [];
      }
    },
  
    // ✅ MÉTODO TOGGLE EMPRESA ATIVA (FALTAVA)
    async toggleEmpresaAtiva(empresaId, novoStatus) {
      try {
        const empresaRef = doc(db, 'empresas', empresaId);
        await updateDoc(empresaRef, { 
          ativo: novoStatus,
          updated_at: new Date().toISOString()
        });
        
        return {
          success: true,
          message: `Empresa ${novoStatus ? 'ativada' : 'desativada'} com sucesso!`
        };
      } catch (error) {
        console.error('Erro ao alterar status da empresa:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },
  
    // Busca email real no Firestore pelo CNPJ (users e empresas)
    async buscarEmailPorCnpj(cnpj) {
      const cleanCnpj = cnpj.replace(/[^\d]/g, '');
      const cnpjFormatado = cleanCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      const variantes = [cleanCnpj, cnpjFormatado, cnpj.trim()];

      // Busca nas coleções users e empresas
      const colecoes = ['users', 'empresas'];

      for (const colecao of colecoes) {
        for (const variante of variantes) {
          try {
            const q = query(collection(db, colecao), where('cnpj', '==', variante), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const email = snap.docs[0].data().email;
              if (email) return email;
            }
          } catch (e) {
            // ignora erros de permissão por variante e tenta a próxima
          }
        }
      }
      return null;
    },

    // Reset de senha: verifica CNPJ + email antes de enviar o link
    async resetPasswordByCnpj(cnpj, email) {
      try {
        if (!isValidCnpj(cnpj)) {
          return { success: false, error: 'CNPJ inválido' };
        }
        if (!email || !email.trim()) {
          return { success: false, error: 'Informe o email cadastrado' };
        }

        const emailLimpo = email.trim().toLowerCase();

        // Verifica se o CNPJ está vinculado ao email informado
        const emailCadastrado = await this.buscarEmailPorCnpj(cnpj);

        if (!emailCadastrado) {
          return {
            success: false,
            error: 'CNPJ não encontrado ou sem email cadastrado. Entre em contato com o suporte.'
          };
        }

        if (emailCadastrado.toLowerCase() !== emailLimpo) {
          return {
            success: false,
            error: 'O email não corresponde ao cadastrado para este CNPJ.'
          };
        }

        await sendPasswordResetEmail(auth, emailLimpo);

        const [user, domain] = emailLimpo.split('@');
        const emailMascarado = user.substring(0, 2) + '***@' + domain;
        return { success: true, emailMascarado };
      } catch (error) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          return {
            success: false,
            error: 'Email não encontrado no sistema de autenticação.'
          };
        }
        if (error.code === 'auth/invalid-email') {
          return { success: false, error: 'Email inválido.' };
        }
        return { success: false, error: 'Erro ao enviar email. Tente novamente.' };
      }
    },

    // ✅ MÉTODO LOGOUT (RENOMEADO DE signOut)
    async logout() {
      try {
        await signOut(auth);
        // Limpar dados locais
        localStorage.removeItem('dadosEmpresaLogada');
        sessionStorage.removeItem('empresaLogada');
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    },
  
    // Logout original (mantido para compatibilidade)
    async signOut() {
      return this.logout();
    },
  
    // Reset de senha (usando CNPJ)
    async resetPasswordWithCnpj(cnpj) {
      try {
        if (!isValidCnpj(cnpj)) {
          return {
            success: false,
            error: 'CNPJ inválido'
          };
        }
  
        const email = cnpjToEmail(cnpj);
        await sendPasswordResetEmail(auth, email);
        return { 
          success: true,
          message: 'Email de recuperação enviado'
        };
      } catch (error) {
        return {
          success: false,
          error: 'CNPJ não encontrado'
        };
      }
    },
  
    // Observar mudanças de autenticação
    onAuthStateChange(callback) {
      return onAuthStateChanged(auth, async (user) => {
        if (user) {
          // Buscar dados completos do Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          
          callback({
            ...user,
            ...userData
          });
        } else {
          callback(null);
        }
      });
    },
  
    // Obter usuário atual
    getCurrentUser() {
      return auth.currentUser;
    },
  
    // Atualizar dados do usuário
    async updateUserData(userId, data) {
      try {
        await setDoc(doc(db, 'users', userId), data, { merge: true });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  };
  
  export default firebaseAuthService;
