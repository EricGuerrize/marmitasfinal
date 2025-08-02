// src/services/firebaseDbService.js
import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const firebaseDbService = {
  async add(collectionName, data) {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data, 
      createdAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  },

  async getById(collectionName, id) {
    const docSnap = await getDoc(doc(db, collectionName, id));
    return docSnap.exists() 
      ? { success: true, data: { id: docSnap.id, ...docSnap.data() } } 
      : { success: false };
  },

  async getAll(collectionName) {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data };
  },

  async update(collectionName, id, data) {
    await updateDoc(doc(db, collectionName, id), {
      ...data, 
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  },

  async delete(collectionName, id) {
    await deleteDoc(doc(db, collectionName, id));
    return { success: true };
  }
};