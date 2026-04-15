// ─────────────────────────────────────────────────────────────
// SUBSTITUA os valores abaixo pelas configurações do SEU projeto
// Firebase. Você irá encontrá-las no Firebase Console após criar
// o projeto (veja o guia de configuração).
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "COLE-SUA-API-KEY-AQUI",
  authDomain:        "SEU-PROJETO.firebaseapp.com",
  databaseURL:       "https://SEU-PROJETO-default-rtdb.firebaseio.com",
  projectId:         "SEU-PROJETO",
  storageBucket:     "SEU-PROJETO.firebasestorage.app",
  messagingSenderId: "SEU-SENDER-ID",
  appId:             "SEU-APP-ID"
};

firebase.initializeApp(firebaseConfig);
