// ============================================
// Firebase Config — استبدل القيم دي بمفاتيح مشروعك
// من: Firebase Console > Project settings > Your apps > SDK setup and configuration
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyBRgu8FlDPmDDMTlowA-FVWZ8ojODoVrns",
  authDomain: "cava-top.firebaseapp.com",
  projectId: "cava-top",
  storageBucket: "cava-top.firebasestorage.app",
  messagingSenderId: "1064728619561",
  appId: "1:1064728619561:web:465d2a2e62e21d51f24a38"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// يخزن نسخة محلية من البيانات على جهاز الزبون، فبالزيارة الثانية
// المنيو بيبين فوراً حتى لو النت بطيء، وبيتحدث بالخلفية أول ما يتوفر اتصال
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  console.warn('Offline cache not enabled:', err.code);
});
