import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDO-saswGsi9R7KNvHd0SB_Mlp8O7ZOzVk",
  authDomain: "erp-almoxarifado.firebaseapp.com",
  projectId: "erp-almoxarifado",
  storageBucket: "erp-almoxarifado.firebasestorage.app",
  messagingSenderId: "249956829888",
  appId: "1:249956829888:web:9f5dbbac1fe42d53873b25"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const materiaisRef = collection(db, 'materiais');

async function testWrite() {
  try {
    const docRef = await addDoc(materiaisRef, {
      descricao: "Teste de permissão de escrita",
      estoque_atual: 10,
      estoque_minimo: 5,
      preco_unitario_medio: 100,
      tipo: 'MATERIAL'
    });
    console.log("Sucesso ao gravar! ID: ", docRef.id);
    process.exit(0);
  } catch (err) {
    console.error("Erro ao gravar:", err.message);
    process.exit(1);
  }
}

testWrite();
