// ==========================================
// ===== DATABASE - FIREBASE =====
// ==========================================

const DB_USERS = 'users';
const DB_QRS = 'qrCodes';

// ==========================================
// ===== AUTH - FIREBASE =====
// ==========================================

let currentUser = null;

function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        hash = ((hash << 5) - hash) + password.charCodeAt(i);
        hash = hash & hash;
    }
    return 'hashed_' + hash;
}

// ===== ĐĂNG KÝ =====
async function registerUser(username, password) {
    if (username.length < 3) {
        return { success: false, message: 'Tên phải có ít nhất 3 ký tự!' };
    }
    if (password.length < 4) {
        return { success: false, message: 'Mật khẩu phải có ít nhất 4 ký tự!' };
    }
    
    try {
        const snapshot = await database.ref(`${DB_USERS}/${username}`).once('value');
        if (snapshot.exists()) {
            return { success: false, message: 'Tên đăng nhập đã tồn tại!' };
        }
        
        await database.ref(`${DB_USERS}/${username}`).set({
            password: hashPassword(password)
        });
        return { success: true, message: 'Đăng ký thành công!' };
    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        return { success: false, message: 'Lỗi kết nối: ' + error.message };
    }
}

// ===== ĐĂNG NHẬP =====
async function loginUser(username, password) {
    try {
        const snapshot = await database.ref(`${DB_USERS}/${username}`).once('value');
        if (!snapshot.exists()) {
            return { success: false, message: 'Tên đăng nhập không tồn tại!' };
        }
        
        const user = snapshot.val();
        if (user.password !== hashPassword(password)) {
            return { success: false, message: 'Mật khẩu không đúng!' };
        }
        
        currentUser = username;
        localStorage.setItem('qr_current_user', username);
        return { success: true, message: 'Đăng nhập thành công!' };
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        return { success: false, message: 'Lỗi kết nối: ' + error.message };
    }
}

function logoutUser() {
    currentUser = null;
    localStorage.removeItem('qr_current_user');
}

function checkSession() {
    const saved = localStorage.getItem('qr_current_user');
    if (saved) {
        currentUser = saved;
        return true;
    }
    return false;
}

// ==========================================
// ===== QR CODE - FIREBASE =====
// ==========================================

async function getQRList() {
    try {
        const snapshot = await database.ref(DB_QRS).once('value');
        const data = snapshot.val();
        if (data) {
            return Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
        }
        return [];
    } catch (error) {
        console.error('Lỗi lấy dữ liệu:', error);
        return [];
    }
}

async function addQRCode(data) {
    try {
        const newQR = {
            ...data,
            uploadedBy: currentUser,
            uploadedAt: new Date().toISOString()
        };
        const newRef = await database.ref(DB_QRS).push(newQR);
        return { id: newRef.key, ...newQR };
    } catch (error) {
        console.error('Lỗi thêm dữ liệu:', error);
        return null;
    }
}

async function deleteQRCode(id) {
    try {
        await database.ref(`${DB_QRS}/${id}`).remove();
        return true;
    } catch (error) {
        console.error('Lỗi xóa dữ liệu:', error);
        return false;
    }
}

// ==========================================
// ===== DOM ELEMENTS =====
// ==========================================

const userList = document.getElementById('userList');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const manageBtn = document.getElementById('manageBtn');
const logoutBtn = document.getElementById('logoutBtn');
const usernameDisplay = document.getElementById('usernameDisplay');
const authSection = document.getElementById('authSection');
const userSection = document.getElementById('userSection');
const uploadArea = document.getElementById('uploadArea');

// Modals
const detailModal = document.getElementById('detailModal');
const detailContent = document.getElementById('detailContent');

const uploadModal = document.getElementById('uploadModal');
const uploadModalClose = document.getElementById('uploadModalClose');
const uploadForm = document.getElementById('uploadForm');
const uploadBtn = document.getElementById('uploadBtn');
const qrImage = document.getElementById('qrImage');
const imagePreview = document.getElementById('imagePreview');
const previewContainer = document.getElementById('previewContainer');
const uploadImageBox = document.getElementById('uploadImageBox');

const authModal = document.getElementById('authModal');
const authFormContainer = document.getElementById('authFormContainer');

// ==========================================
// ===== BANK COLORS =====
// ==========================================

function getBankClass(bank) {
    const map = {
        'Techcombank': 'bank-techcombank',
        'Vietcombank': 'bank-vietcombank',
        'BIDV': 'bank-bidv',
        'MB Bank': 'bank-mbbank',
        'VPBank': 'bank-vpbank',
        'TPBANK': 'bank-tpbank',
        'MoMo': 'bank-momo',
        'VietinBank': 'bank-vietinbank',
        'ACB': 'bank-acb',
        'Sacombank': 'bank-sacombank'
    };
    return map[bank] || 'bank-khac';
}

function getInitials(name) {
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

// ==========================================
// ===== RENDER USER LIST =====
// ==========================================

async function renderUserList(filter = '') {
    const qrs = await getQRList();
    const filtered = qrs.filter(qr => 
        qr.name.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
        userList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    let html = '';
    filtered.forEach(qr => {
        const initial = getInitials(qr.name);
        const bankClass = getBankClass(qr.bank);
        html += `
            <div class="user-item" data-id="${qr.id}">
                <div class="user-info">
                    <div class="user-avatar ${bankClass}">${initial}</div>
                    <div>
                        <div class="user-name-text">${qr.name}</div>
                        <div class="user-bank">${qr.bank}</div>
                    </div>
                </div>
                <div class="user-initial">${initial}</div>
            </div>
        `;
    });

    userList.innerHTML = html;

    document.querySelectorAll('.user-item').forEach(item => {
        item.addEventListener('click', function() {
            const id = this.dataset.id;
            getQRList().then(qrs => {
                const qr = qrs.find(q => q.id === id);
                if (qr) showDetail(qr);
            });
        });
    });
}

// ==========================================
// ===== SHOW DETAIL =====
// ==========================================

function showDetail(qr) {
    const isOwner = currentUser === qr.uploadedBy;
    
    detailContent.innerHTML = `
        <span class="modal-close" id="detailClose">&times;</span>
        <div class="detail-header">
            <h2>${qr.name}</h2>
            <div class="bank-name">${qr.bank}</div>
        </div>
        
        <div class="qr-image-container">
            <img src="${qr.imageData}" alt="QR Code của ${qr.name}" />
        </div>
        
        <div class="detail-row">
            <span class="detail-label">Số tài khoản</span>
            <div class="detail-value">
                <span>${qr.accountNumber}</span>
                <button class="btn-copy" onclick="copyText('${qr.accountNumber}')">Copy</button>
            </div>
        </div>
        
        <div class="detail-row">
            <span class="detail-label">Chủ tài khoản</span>
            <div class="detail-value">
                <span>${qr.accountHolder}</span>
                <button class="btn-copy" onclick="copyText('${qr.accountHolder}')">Copy</button>
            </div>
        </div>
        
        <div class="detail-row">
            <span class="detail-label">Ngân hàng</span>
            <span class="detail-value">${qr.bank}</span>
        </div>
        
        <div class="detail-actions">
            <button class="btn-transfer" onclick="openTransfer('${qr.id}')">💳 Chuyển khoản</button>
            ${isOwner ? `
                <button class="btn-delete" onclick="deleteQR('${qr.id}')">🗑️ Xóa mã QR</button>
            ` : ''}
            <button class="btn-close-detail" onclick="closeDetail()">Đóng</button>
        </div>
    `;
    
    detailModal.style.display = 'flex';
    
    document.getElementById('detailClose').addEventListener('click', closeDetail);
}

function closeDetail() {
    detailModal.style.display = 'none';
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('✅ Đã sao chép: ' + text);
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('✅ Đã sao chép: ' + text);
    });
}

async function deleteQR(id) {
    if (!confirm('Bạn có chắc muốn xóa mã QR này?')) return;
    await deleteQRCode(id);
    closeDetail();
    renderUserList(searchInput.value);
}

// ==========================================
// ===== UPLOAD QR =====
// ==========================================

uploadBtn.addEventListener('click', function() {
    if (!currentUser) {
        alert('Vui lòng đăng nhập để thêm mã QR!');
        return;
    }
    uploadModal.style.display = 'flex';
});

uploadModalClose.addEventListener('click', function() {
    uploadModal.style.display = 'none';
    uploadForm.reset();
    previewContainer.style.display = 'none';
    uploadImageBox.style.display = 'block';
});

uploadImageBox.addEventListener('click', function() {
    document.getElementById('qrImage').click();
});

qrImage.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            previewContainer.style.display = 'block';
            uploadImageBox.style.display = 'none';
        };
        reader.readAsDataURL(this.files[0]);
    }
});

uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Vui lòng đăng nhập!');
        return;
    }
    
    const name = document.getElementById('qrName').value.trim();
    const bank = document.getElementById('qrBank').value;
    const account = document.getElementById('qrAccount').value.trim();
    const holder = document.getElementById('qrHolder').value.trim();
    const imageFile = document.getElementById('qrImage').files[0];
    
    if (!name) {
        alert('❌ Vui lòng nhập tên người nhận!');
        document.getElementById('qrName').focus();
        return;
    }
    if (!bank) {
        alert('❌ Vui lòng chọn tên ngân hàng!');
        document.getElementById('qrBank').focus();
        return;
    }
    if (!imageFile) {
        alert('❌ Vui lòng chọn ảnh mã QR!');
        return;
    }
    
    const finalAccount = account || 'Chưa cập nhật';
    const finalHolder = holder || name.toUpperCase();
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        await addQRCode({
            name: name,
            bank: bank,
            accountNumber: finalAccount,
            accountHolder: finalHolder,
            imageData: e.target.result
        });
        
        uploadModal.style.display = 'none';
        uploadForm.reset();
        previewContainer.style.display = 'none';
        uploadImageBox.style.display = 'block';
        renderUserList(searchInput.value);
        alert('✅ Đã thêm mã QR thành công!');
    };
    reader.readAsDataURL(imageFile);
});

// ==========================================
// ===== AUTH UI =====
// ==========================================

function updateUI() {
    if (currentUser) {
        authSection.style.display = 'none';
        userSection.style.display = 'flex';
        usernameDisplay.textContent = currentUser;
        uploadArea.style.display = 'block';
    } else {
        authSection.style.display = 'block';
        userSection.style.display = 'none';
        uploadArea.style.display = 'none';
    }
    renderUserList(searchInput.value);
}

// ==========================================
// ===== AUTH MODAL =====
// ==========================================

let isLoginMode = true;

manageBtn.addEventListener('click', function() {
    if (currentUser) {
        uploadBtn.click();
    } else {
        openAuthModal(true);
    }
});

function openAuthModal(loginMode = true) {
    isLoginMode = loginMode;
    authModal.style.display = 'flex';
    renderAuthForm();
}

function closeAuthModal() {
    authModal.style.display = 'none';
}

function renderAuthForm() {
    const title = isLoginMode ? 'Đăng nhập' : 'Đăng ký tài khoản';
    const subText = isLoginMode 
        ? 'Đăng nhập để thêm và quản lý mã QR' 
        : 'Tạo tài khoản để bắt đầu thêm mã QR';
    const btnText = isLoginMode ? 'Đăng nhập' : 'Đăng ký';
    const switchText = isLoginMode 
        ? 'Chưa có tài khoản? <a id="switchAuth">Đăng ký ngay</a>' 
        : 'Đã có tài khoản? <a id="switchAuth">Đăng nhập</a>';

    authFormContainer.innerHTML = `
        <span class="modal-close" id="authModalClose">&times;</span>
        <div class="auth-form">
            <h2>${title}</h2>
            <p class="sub">${subText}</p>
            <div class="auth-error" id="authError"></div>
            <div class="form-group">
                <label>Tên đăng nhập</label>
                <input type="text" id="authUsername" placeholder="Nhập tên đăng nhập" />
            </div>
            <div class="form-group">
                <label>Mật khẩu</label>
                <input type="password" id="authPassword" placeholder="Nhập mật khẩu" />
            </div>
            <button class="btn-submit" id="authSubmit">${btnText}</button>
            <p class="switch-text">${switchText}</p>
        </div>
    `;

    document.getElementById('authModalClose').addEventListener('click', closeAuthModal);
    
    const switchLink = document.getElementById('switchAuth');
    if (switchLink) {
        switchLink.addEventListener('click', function(e) {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            renderAuthForm();
        });
    }

    const submitBtn = document.getElementById('authSubmit');
    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleAuthSubmit();
        });
    }

    const passwordInput = document.getElementById('authPassword');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleAuthSubmit();
            }
        });
    }
}

async function handleAuthSubmit() {
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const errorEl = document.getElementById('authError');

    if (!username || !password) {
        errorEl.style.display = 'block';
        errorEl.textContent = 'Vui lòng nhập đầy đủ thông tin!';
        return;
    }

    errorEl.style.display = 'none';

    let result;
    if (isLoginMode) {
        result = await loginUser(username, password);
    } else {
        result = await registerUser(username, password);
    }

    if (result.success) {
        closeAuthModal();
        updateUI();
        alert(result.message);
    } else {
        errorEl.style.display = 'block';
        errorEl.textContent = result.message;
    }
}

// ==========================================
// ===== LOGOUT =====
// ==========================================

logoutBtn.addEventListener('click', function() {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
        logoutUser();
        updateUI();
        alert('Đã đăng xuất!');
    }
});

// ==========================================
// ===== SEARCH =====
// ==========================================

searchInput.addEventListener('input', function() {
    renderUserList(this.value);
});

// ==========================================
// ===== CLICK OUTSIDE MODAL =====
// ==========================================

window.addEventListener('click', function(e) {
    if (e.target === detailModal) closeDetail();
    if (e.target === uploadModal) {
        uploadModal.style.display = 'none';
        uploadForm.reset();
        previewContainer.style.display = 'none';
        uploadImageBox.style.display = 'block';
    }
    if (e.target === authModal) closeAuthModal();
});

// ==========================================
// ===== KHỞI CHẠY =====
// ==========================================

checkSession();
updateUI();
console.log('✨ QR Bank Storage - Firebase đã sẵn sàng!');
console.log('User:', currentUser || 'Chưa đăng nhập');
console.log('📊 Số QR:', getQRList().length);