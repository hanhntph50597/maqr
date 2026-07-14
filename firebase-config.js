// ========================================
// 🔥 FIREBASE CONFIG
// ========================================
// THAY ĐỔI BẰNG CONFIG CỦA BẠN LẤY TỪ FIREBASE CONSOLE!

const firebaseConfig = {
    apiKey: "AIzaSyAeDv7x8WWxhXDjrgclDKfRQs1dA3byGho",
    authDomain: "webqr-aeff6.firebaseapp.com",
    databaseURL: "https://webqr-aeff6-default-rtdb.firebaseio.com",
    projectId: "webqr-aeff6",
    storageBucket: "webqr-aeff6.firebasestorage.app",
    messagingSenderId: "740328060215",
    appId: "1:740328060215:web:35275679d1d1231be056b2"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);

// Khởi tạo Realtime Database
const database = firebase.database();

console.log('✅ Firebase đã kết nối thành công!');