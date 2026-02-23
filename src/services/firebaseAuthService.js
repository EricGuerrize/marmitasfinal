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
  import { doc, setDoc, getDoc, getDocs, collection, updateDoc, query, where } from 'firebase/firestore';
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
        const userData = userDoc.exists() ? userDoc.data() : {};
  
        // ✅ SALVAR DADOS NO LOCALSTORAGE PARA MANTER SESSÃO
        const dadosEmpresa = {
          cnpj: cnpj,
          cnpj_formatado: cnpj,
          email: userData.email || '',
          nome_empresa: userData.nomeFantasia || userData.nome_empresa || '',
          razao_social: userData.razaoSocial || userData.nome_empresa || '',
          nome_fantasia: userData.nomeFantasia || userData.nome_empresa || '',
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
  
        // ✅ VERIFICAR SE HÁ DADOS DE EMPRESA VÁLIDOS
        const dadosLocalStorage = localStorage.getItem('dadosEmpresaLogada');
        const sessaoStorage = sessionStorage.getItem('empresaLogada');
        
        if (!dadosLocalStorage && !sessaoStorage) {
          console.log('🚫 Nenhum dado de empresa encontrado no storage');
          return { isAuthenticated: false, isAdmin: false };
        }
  
        // Buscar dados do usuário no Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
  
        // Verificar se é admin
        let isAdmin = false;
        if (dadosLocalStorage) {
          try {
            const dadosEmpresa = JSON.parse(dadosLocalStorage);
            isAdmin = dadosEmpresa.tipo_usuario === 'admin';
          } catch (error) {
            console.error('Erro ao verificar dados localStorage:', error);
          }
        }
  
        console.log('✅ Sessão válida encontrada');
        return {
          isAuthenticated: true,
          isAdmin: isAdmin,
          user: user,
          empresa: userData
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
  
    // Busca email real no Firestore pelo CNPJ
    async buscarEmailPorCnpj(cnpj) {
      try {
        const cleanCnpj = cnpj.replace(/[^\d]/g, '');
        const usersRef = collection(db, 'users');

        // Tenta com CNPJ limpo
        const q1 = query(usersRef, where('cnpj', '==', cleanCnpj));
        const snap1 = await getDocs(q1);
        if (!snap1.empty) return snap1.docs[0].data().email || null;

        // Tenta com CNPJ formatado
        const cnpjFormatado = cleanCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        const q2 = query(usersRef, where('cnpj', '==', cnpjFormatado));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) return snap2.docs[0].data().email || null;

        return null;
      } catch (error) {
        console.error('Erro ao buscar email por CNPJ:', error);
        return null;
      }
    },

    // Reset de senha pelo CNPJ — envia link para o email real cadastrado
    async resetPasswordByCnpj(cnpj) {
      try {
        if (!isValidCnpj(cnpj)) {
          return { success: false, error: 'CNPJ inválido' };
        }

        const emailReal = await this.buscarEmailPorCnpj(cnpj);
        if (!emailReal) {
          return {
            success: false,
            error: 'CNPJ não encontrado ou cadastrado sem email vinculado. Entre em contato pelo WhatsApp (21) 96429-8123 para redefinir sua senha.'
          };
        }

        await sendPasswordResetEmail(auth, emailReal);

        // Mascara o email para exibição (ex: em***@gmail.com)
        const [user, domain] = emailReal.split('@');
        const emailMascarado = user.substring(0, 2) + '***@' + domain;

        return { success: true, emailMascarado };
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          return { success: false, error: 'Conta não encontrada. Este CNPJ pode ter sido cadastrado em um sistema anterior. Entre em contato com o suporte.' };
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