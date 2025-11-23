
// ==========================================
// CONFIGURAÇÃO DO BANCO DE DADOS (FIREBASE)
// ==========================================

export const firebaseConfig = {
  apiKey: "AIzaSyDGIeLiXdTCbJwiu9Xbe2LwlaSpLDdO6Bs",
  authDomain: "servicodefila.firebaseapp.com",
  // Adicionei esta linha automaticamente baseada no seu Project ID.
  // Se der erro, verifique no Console do Firebase a URL correta do Realtime Database.
  databaseURL: "https://servicodefila-default-rtdb.firebaseio.com",
  projectId: "servicodefila",
  storageBucket: "servicodefila.firebasestorage.app",
  messagingSenderId: "1053843292972",
  appId: "1:1053843292972:web:f9edfa92251d43414ee289",
  measurementId: "G-LP17KMV209"
};

// Verifica se a configuração foi preenchida
export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey.length > 0 && firebaseConfig.databaseURL.length > 0;
};
