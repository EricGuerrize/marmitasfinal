// services/firebaseAuthService.js
import { 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
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
  
        const email = cnpjToEmail(cnpj);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
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
  
        const firebaseEmail = cnpjToEmail(cnpj);
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
          errorMessage = 'CNPJ já cadastrado';
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
        const user = auth.currentUser;
        
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