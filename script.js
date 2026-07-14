// ==========================================
// ===== DATABASE - FIREBASE =====
// ==========================================

const DB_USERS = 'users';
const DB_QRS = 'qrCodes';

// ==========================================
// ===== AUTH - FIREBASE =====
// ==========================================

let currentUser = null;
const ADMIN_USER = 'hanhnt';
const ADMIN_PASS = '1234';

function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        hash = ((hash << 5) - hash) + password.charCodeAt(i);
        hash = hash & hash;
    }
    return 'hashed_' + hash;
}

// ===== KIỂM TRA ADMIN =====
function isAdmin() {
    return currentUser === ADMIN_USER;
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
    // Kiểm tra tài khoản admin
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        currentUser = ADMIN_USER;
        localStorage.setItem('qr_current_user', ADMIN_USER);
        return { success: true, message: 'Đăng nhập thành công (Admin)!' };
    }
    
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
// ===== VALIDATE FUNCTIONS =====
// ==========================================

function validateName(name) {
    const regex = /^[a-zA-ZÀ-Ỹà-ỹĂăÂâĐđÊêÔôƠơƯư\s\-]+$/;
    return regex.test(name);
}

function validateAccountNumber(account) {
    const regex = /^[0-9]+$/;
    return regex.test(account);
}

function validateHolder(holder) {
    const regex = /^[A-Z\s]+$/;
    return regex.test(holder);
}

// ==========================================
// ===== TOAST NOTIFICATION =====
// ==========================================

function showToast(message, type = 'success') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 380px;
            width: 100%;
            pointer-events: none;
        `;
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    const colors = {
        success: 'rgba(16, 185, 129, 0.15)',
        error: 'rgba(239, 68, 68, 0.15)',
        warning: 'rgba(245, 158, 11, 0.15)',
        info: 'rgba(59, 130, 246, 0.15)'
    };
    const borderColors = {
        success: 'rgba(16, 185, 129, 0.3)',
        error: 'rgba(239, 68, 68, 0.3)',
        warning: 'rgba(245, 158, 11, 0.3)',
        info: 'rgba(59, 130, 246, 0.3)'
    };
    const textColors = {
        success: '#6ee7b7',
        error: '#fca5a5',
        warning: '#fcd34d',
        info: '#93c5fd'
    };
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    toast.style.cssText = `
        background: ${colors[type] || colors.success};
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid ${borderColors[type] || borderColors.success};
        border-radius: 14px;
        padding: 14px 20px;
        color: ${textColors[type] || textColors.success};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 0.95rem;
        font-weight: 500;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        transform: translateX(calc(100% + 40px));
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 50px;
    `;

    toast.innerHTML = `
        <span style="font-size: 1.2rem; flex-shrink: 0;">${icons[type] || icons.success}</span>
        <span style="flex: 1;">${message}</span>
    `;

    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    });

    setTimeout(() => {
        toast.style.transform = 'translateX(calc(100% + 40px))';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 400);
    }, 1500);
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

// ===== REAL-TIME VALIDATION =====
const qrNameInput = document.getElementById('qrName');
const qrAccountInput = document.getElementById('qrAccount');
const qrHolderInput = document.getElementById('qrHolder');
const qrBankSelect = document.getElementById('qrBank');

const qrNameError = document.getElementById('qrNameError');
const qrAccountError = document.getElementById('qrAccountError');
const qrHolderError = document.getElementById('qrHolderError');
const qrBankError = document.getElementById('qrBankError');

// ===== VALIDATE TÊN NGƯỜI NHẬN (real-time) =====
qrNameInput.addEventListener('input', function() {
    const value = this.value.trim();
    
    if (value && !validateName(value)) {
        this.classList.remove('success');
        this.classList.add('error');
        qrNameError.textContent = '❌ Chỉ được chứa chữ cái (có dấu) và khoảng trắng!';
        qrNameError.classList.add('show');
    } else if (value && validateName(value)) {
        this.classList.remove('error');
        this.classList.add('success');
        qrNameError.classList.remove('show');
    } else {
        this.classList.remove('error', 'success');
        qrNameError.textContent = '⚠️ Vui lòng nhập tên người nhận!';
        qrNameError.classList.add('show');
    }
});

qrNameInput.addEventListener('blur', function() {
    const value = this.value.trim();
    if (!value) {
        this.classList.remove('success');
        this.classList.add('error');
        qrNameError.textContent = '⚠️ Vui lòng nhập tên người nhận!';
        qrNameError.classList.add('show');
    }
});

// ===== VALIDATE SỐ TÀI KHOẢN (real-time) =====
qrAccountInput.addEventListener('input', function() {
    const value = this.value.trim();
    
    if (value && !validateAccountNumber(value)) {
        this.classList.remove('success');
        this.classList.add('error');
        qrAccountError.textContent = '❌ Số tài khoản chỉ được chứa chữ số!';
        qrAccountError.classList.add('show');
    } else if (value && validateAccountNumber(value)) {
        this.classList.remove('error');
        this.classList.add('success');
        qrAccountError.classList.remove('show');
    } else {
        this.classList.remove('error', 'success');
        qrAccountError.classList.remove('show');
    }
});

// ===== VALIDATE CHỦ TÀI KHOẢN (real-time) =====
qrHolderInput.addEventListener('input', function() {
    const value = this.value.trim();
    
    if (value && !validateHolder(value)) {
        this.classList.remove('success');
        this.classList.add('error');
        qrHolderError.textContent = '❌ Chỉ được chứa chữ in hoa, không dấu và khoảng trắng! (VD: NGUYEN VAN A)';
        qrHolderError.classList.add('show');
    } else if (value && validateHolder(value)) {
        this.classList.remove('error');
        this.classList.add('success');
        qrHolderError.classList.remove('show');
    } else {
        this.classList.remove('error', 'success');
        qrHolderError.classList.remove('show');
    }
});

// ===== VALIDATE NGÂN HÀNG (real-time) =====
qrBankSelect.addEventListener('change', function() {
    if (this.value) {
        this.classList.remove('error');
        this.classList.add('success');
        qrBankError.classList.remove('show');
    } else {
        this.classList.remove('success');
        this.classList.add('error');
        qrBankError.textContent = '⚠️ Vui lòng chọn tên ngân hàng!';
        qrBankError.classList.add('show');
    }
});

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
    const isOwner = currentUser === qr.uploadedBy || isAdmin();
    
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
            <button class="btn-transfer" onclick="openTransfer('${qr.id}')">Chuyển khoản</button>
            ${isOwner ? `
                <button class="btn-delete" onclick="deleteQR('${qr.id}')">Xóa mã QR</button>
            ` : ''}
            <button class="btn-close-detail" onclick="closeDetail()">Đóng</button>
        </div>
        ${isAdmin() && !(currentUser === qr.uploadedBy) ? `
            <div style="text-align:center; margin-top:8px; font-size:0.7rem; color:rgba(255,255,255,0.3);">
                Admin - Xóa được ảnh của người khác
            </div>
        ` : ''}
    `;
    
    detailModal.style.display = 'flex';
    
    document.getElementById('detailClose').addEventListener('click', closeDetail);
}

function closeDetail() {
    detailModal.style.display = 'none';
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(' Đã sao chép: ' + text, 'success');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(' Đã sao chép: ' + text, 'success');
    });
}

async function deleteQR(id) {
    if (!confirm('Bạn có chắc muốn xóa mã QR này?')) return;
    await deleteQRCode(id);
    closeDetail();
    renderUserList(searchInput.value);
    showToast(' Đã xóa mã QR thành công!', 'success');
}

// ==========================================
// ===== TRANSFER =====
// ==========================================

let currentTransferQR = null;

async function openTransfer(id) {
    const qrs = await getQRList();
    const qr = qrs.find(q => q.id === id);
    if (!qr) return;
    
    currentTransferQR = qr;
    
    const transferInfo = document.getElementById('transferInfo');
    if (transferInfo) {
        transferInfo.innerHTML = `
            <div class="info-row">
                <span class="label">Người nhận</span>
                <span class="value">${qr.name}</span>
            </div>
            <div class="info-row">
                <span class="label">Ngân hàng</span>
                <span class="value">${qr.bank}</span>
            </div>
            <div class="info-row">
                <span class="label">Số tài khoản</span>
                <span class="value">${qr.accountNumber}</span>
            </div>
            <div class="info-row">
                <span class="label">Chủ tài khoản</span>
                <span class="value">${qr.accountHolder}</span>
            </div>
        `;
    }
    
    const transferAmount = document.getElementById('transferAmount');
    const transferContent = document.getElementById('transferContent');
    if (transferAmount) transferAmount.value = '';
    if (transferContent) transferContent.value = '';
    
    const transferModal = document.getElementById('transferModal');
    if (transferModal) transferModal.style.display = 'flex';
}

function closeTransfer() {
    const transferModal = document.getElementById('transferModal');
    if (transferModal) transferModal.style.display = 'none';
    currentTransferQR = null;
}

const transferModalClose = document.getElementById('transferModalClose');
const transferCancel = document.getElementById('transferCancel');
if (transferModalClose) transferModalClose.addEventListener('click', closeTransfer);
if (transferCancel) transferCancel.addEventListener('click', closeTransfer);

window.addEventListener('click', function(e) {
    const transferModal = document.getElementById('transferModal');
    if (e.target === transferModal) closeTransfer();
});

const transferForm = document.getElementById('transferForm');
if (transferForm) {
    transferForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!currentTransferQR) {
            showToast(' Lỗi: Không tìm thấy thông tin chuyển khoản!', 'error');
            return;
        }
        
        const transferAmount = document.getElementById('transferAmount');
        const transferContent = document.getElementById('transferContent');
        const amount = transferAmount ? transferAmount.value.trim() : '';
        const content = transferContent ? transferContent.value.trim() || 'Chuyển khoản' : 'Chuyển khoản';
        
        if (!amount || parseInt(amount) < 1000) {
            showToast(' Vui lòng nhập số tiền (tối thiểu 1,000 VNĐ)!', 'error');
            if (transferAmount) transferAmount.focus();
            return;
        }
        
        const amountNum = parseInt(amount);
        const formattedAmount = amountNum.toLocaleString('vi-VN') + ' VNĐ';
        
        if (!confirm(` Xác nhận chuyển khoản:\n\nNgười nhận: ${currentTransferQR.name}\nNgân hàng: ${currentTransferQR.bank}\nSố tài khoản: ${currentTransferQR.accountNumber}\nSố tiền: ${formattedAmount}\nNội dung: ${content}\n\nBấm OK để tiếp tục.`)) {
            return;
        }
        
        closeTransfer();
        closeDetail();
        
        showToast(` Vui lòng mở ứng dụng ${currentTransferQR.bank} để chuyển khoản`, 'info');
    });
}

// ==========================================
// ===== UPLOAD QR =====
// ==========================================

uploadBtn.addEventListener('click', function() {
    if (!currentUser) {
        showToast('Vui lòng đăng nhập để thêm mã QR!', 'warning');
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

// ===== PASTE ẢNH BẰNG CTRL+V =====
document.addEventListener('paste', function(e) {
    if (uploadModal.style.display !== 'flex') return;
    
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    previewContainer.style.display = 'block';
                    uploadImageBox.style.display = 'none';
                    
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    document.getElementById('qrImage').files = dataTransfer.files;
                };
                reader.readAsDataURL(file);
                break;
            }
        }
    }
});

uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showToast('Vui lòng đăng nhập!', 'error');
        return;
    }
    
    const name = document.getElementById('qrName').value.trim();
    const bank = document.getElementById('qrBank').value;
    const account = document.getElementById('qrAccount').value.trim();
    const holder = document.getElementById('qrHolder').value.trim();
    const imageFile = document.getElementById('qrImage').files[0];
    
    // ===== VALIDATE =====
    
    if (!name) {
        showToast('❌ Vui lòng nhập tên người nhận!', 'error');
        document.getElementById('qrName').focus();
        return;
    }
    if (!validateName(name)) {
        showToast('❌ Tên người nhận chỉ được chứa chữ cái (có dấu) và khoảng trắng!', 'error');
        document.getElementById('qrName').focus();
        document.getElementById('qrName').value = '';
        return;
    }
    
    if (!bank) {
        showToast('❌ Vui lòng chọn tên ngân hàng!', 'error');
        document.getElementById('qrBank').focus();
        return;
    }
    
    if (account && !validateAccountNumber(account)) {
        showToast('❌ Số tài khoản chỉ được chứa chữ số!', 'error');
        document.getElementById('qrAccount').focus();
        document.getElementById('qrAccount').value = '';
        return;
    }
    
    if (holder && !validateHolder(holder)) {
        showToast('❌ Chủ tài khoản chỉ được chứa chữ in hoa, không dấu và khoảng trắng! (VD: NGUYEN VAN A)', 'error');
        document.getElementById('qrHolder').focus();
        document.getElementById('qrHolder').value = '';
        return;
    }
    
    if (!imageFile) {
        showToast('❌ Vui lòng chọn ảnh mã QR!', 'error');
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
        const displayName = isAdmin() ? currentUser + ' (Admin)' : currentUser;
        usernameDisplay.textContent = displayName;
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
            ${isLoginMode ? `<p style="font-size:0.8rem; color:rgba(255,255,255,0.2); margin-bottom:12px;">Admin: hanhnt / 1234</p>` : ''}
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
        showToast(result.message, 'success');
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
        showToast('Đã đăng xuất!', 'info');
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
console.log('👤 User:', currentUser || 'Chưa đăng nhập');
console.log('📊 Số QR:', getQRList().length);
if (isAdmin()) {
    console.log('Admin mode: Bạn có thể xóa tất cả ảnh!');
}