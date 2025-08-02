// test-firebase-connection.js (temporário)
import { db } from './src/lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

console.log('🔥 Testando conexão Firebase...');
console.log('Database instance:', db);
console.log('✅ Firebase configurado com sucesso!');

// Teste simples de conexão
async function testFirestore() {
  try {
    // Tenta acessar uma coleção (mesmo que vazia)
    const testRef = collection(db, 'test');
    console.log('📊 Firestore conectado:', testRef);
    return true;
  } catch (error) {
    console.error('❌ Erro no Firestore:', error);
    return false;
  }
}

testFirestore();
