// ==========================================
// ===== EDIT QR MODULE =====
// ==========================================

let editingQRId = null;
let editingQRData = null;
let cropper = null;
let editCurrentImageData = null; // giữ ảnh hiện tại (dataURL) hoặc ảnh mới sau khi crop/upload
let editHasNewImage = false;     // true nếu user đã chọn/crop ảnh mới

// ===== MỞ MODAL CHỈNH SỬA =====
async function openEditModal(qrId) {
    const qrs = await getQRList();
    const qr = qrs.find(q => q.id === qrId);
    
    if (!qr) {
        showToast('Không tìm thấy mã QR!', 'error');
        return;
    }
    
    editingQRId = qrId;
    editingQRData = qr;
    editCurrentImageData = qr.imageData;
    editHasNewImage = false;
    
    // Đóng detail modal
    closeDetail();
    
    // Hiển thị edit modal
    const editModal = document.getElementById('editModal');
    const editContent = document.getElementById('editContent');
    
    editContent.innerHTML = `
        <span class="modal-close" id="editModalClose">&times;</span>
        <h2 class="modal-title">Chỉnh sửa mã QR</h2>
        <form id="editForm">
            <!-- ===== TÊN NGƯỜI NHẬN ===== -->
            <div class="form-group">
                <label>Tên người nhận <span class="required">*</span></label>
                <input type="text" id="editName" placeholder="Tên người nhận" value="${escapeHtml(qr.name)}" />
                <div class="field-error" id="editNameError">Vui lòng nhập tên người nhận!</div>
            </div>

            <!-- ===== TÊN NGÂN HÀNG ===== -->
            <div class="form-group">
                <label>Tên ngân hàng <span class="required">*</span></label>
                <div class="select-wrapper">
                    <select id="editBank">
                        <option value="" disabled ${!qr.bank ? 'selected' : ''}>Chọn ngân hàng...</option>
                        ${getBankOptions(qr.bank)}
                    </select>
                </div>
                <div class="field-error" id="editBankError">⚠️ Vui lòng chọn tên ngân hàng!</div>
            </div>

            <!-- ===== SỐ TÀI KHOẢN ===== -->
            <div class="form-group">
                <label>Số tài khoản <span class="optional">(không bắt buộc)</span></label>
                <input type="text" id="editAccount" placeholder="Số tài khoản" value="${escapeHtml(qr.accountNumber === 'Chưa cập nhật' ? '' : qr.accountNumber)}" />
                <div class="field-error" id="editAccountError"></div>
            </div>

            <!-- ===== CHỦ TÀI KHOẢN ===== -->
            <div class="form-group">
                <label>Chủ tài khoản <span class="optional">(không bắt buộc)</span></label>
                <input type="text" id="editHolder" placeholder="Tên chủ tài khoản" value="${escapeHtml(qr.accountHolder === 'Chưa cập nhật' ? '' : qr.accountHolder)}" />
                <div class="field-error" id="editHolderError"></div>
            </div>

            <!-- ===== ẢNH MÃ QR (1 phần duy nhất - giống thêm mới) ===== -->
            <div class="form-group">
                <label>Ảnh mã QR <span class="required">*</span></label>

                <!-- Upload box (ẩn ban đầu vì đã có ảnh hiện tại) -->
                <label class="upload-image-box" id="editUploadImageBox" style="display:none;" for="editImage">
                    <span class="upload-icon">📤</span>
                    <span class="upload-text">Nhấn để chọn ảnh</span>
                    <span class="upload-hint">PNG, JPG, WEBP (tối đa 5MB)</span>
                    <input type="file" id="editImage" accept="image/*" />
                </label>

                <!-- Preview (hiển thị ảnh hiện tại ban đầu) -->
                <div class="preview-container show" id="editPreviewContainer">
                    <img id="editImagePreview" src="${qr.imageData}" alt="Ảnh mã QR" />
                    <button class="btn-remove-image" id="editRemoveImageBtn" type="button">✕</button>
                    <span class="preview-label" id="editPreviewLabel">Ảnh hiện tại</span>
                </div>

                <!-- Crop container -->
                <div class="crop-wrapper" id="cropContainer" style="display:none;">
                    <div class="crop-controls">
                        <div class="crop-toolbar">
                            <button type="button" class="btn-crop-rotate" id="cropRotateLeft">↺ Xoay trái</button>
                            <button type="button" class="btn-crop-rotate" id="cropRotateRight">↻ Xoay phải</button>
                            <button type="button" class="btn-crop-reset" id="cropReset">⟲ Đặt lại</button>
                        </div>
                        <div class="crop-container-inner" id="cropContainerInner">
                            <img id="cropImage" src="" alt="Crop" />
                        </div>
                        <div class="crop-actions">
                            <button type="button" class="btn-crop-apply" id="cropApply">Áp dụng cắt</button>
                        </div>
                    </div>
                </div>

                <div class="field-error" id="editImageError">Vui lòng chọn ảnh mã QR hợp lệ!</div>
            </div>

            <button type="submit" class="btn-submit">Lưu thay đổi</button>
        </form>
    `;
    
    editModal.style.display = 'flex';
    
    // Gán sự kiện
    setupEditEvents();
}

// ===== TẠO OPTIONS CHO SELECT NGÂN HÀNG =====
function getBankOptions(selected) {
    const banks = [
        'Techcombank', 'Vietcombank', 'BIDV', 'MB Bank', 'VPBank',
        'TPBANK', 'MoMo', 'VietinBank', 'ACB', 'Sacombank'
    ];
    return banks.map(bank => 
        `<option value="${bank}" ${bank === selected ? 'selected' : ''}>${bank}</option>`
    ).join('');
}

// ===== ESCAPE HTML =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== SETUP EDIT EVENTS =====
function setupEditEvents() {
    // Close modal
    const closeBtn = document.getElementById('editModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeEditModal);
    }
    
    // Chỉ đóng edit modal bằng nút X
    
    // Validate tên
    const editName = document.getElementById('editName');
    editName.addEventListener('input', function() {
        validateEditName(false);
    });
    editName.addEventListener('blur', function() {
        validateEditName(true);
    });
    
    // Validate ngân hàng
    const editBank = document.getElementById('editBank');
    editBank.addEventListener('change', function() {
        validateEditBank(true);
    });
    
    // Validate số tài khoản
    const editAccount = document.getElementById('editAccount');
    const editAccountError = document.getElementById('editAccountError');
    editAccount.addEventListener('input', function() {
        const value = this.value.trim();
        if (value && !validateAccountNumber(value)) {
            this.classList.add('error');
            editAccountError.textContent = 'Số tài khoản chỉ được chứa chữ số!';
            editAccountError.classList.add('show');
        } else if (value && validateAccountNumber(value)) {
            this.classList.remove('error');
            editAccountError.classList.remove('show');
        } else {
            this.classList.remove('error');
            editAccountError.classList.remove('show');
        }
    });
    
    // Validate chủ tài khoản
    const editHolder = document.getElementById('editHolder');
    const editHolderError = document.getElementById('editHolderError');
    editHolder.addEventListener('input', function() {
        const value = this.value.trim();
        if (value && !validateHolder(value)) {
            this.classList.add('error');
            editHolderError.textContent = 'Chỉ được chứa chữ in hoa, không dấu và khoảng trắng! (VD: NGUYEN VAN A)';
            editHolderError.classList.add('show');
        } else if (value && validateHolder(value)) {
            this.classList.remove('error');
            editHolderError.classList.remove('show');
        } else {
            this.classList.remove('error');
            editHolderError.classList.remove('show');
        }
    });
    
    // ===== IMAGE HANDLING (giống thêm mới) =====
    const editImage = document.getElementById('editImage');
    const editUploadBox = document.getElementById('editUploadImageBox');
    const editPreviewContainer = document.getElementById('editPreviewContainer');
    const editPreviewImg = document.getElementById('editImagePreview');
    const editRemoveBtn = document.getElementById('editRemoveImageBtn');
    const editPreviewLabel = document.getElementById('editPreviewLabel');
    const cropContainer = document.getElementById('cropContainer');
    
    // File selected (label for="editImage" sẽ tự mở file dialog khi click)
    editImage.addEventListener('change', function(e) {
        e.stopPropagation();
        if (this.files && this.files[0]) {
            handleNewEditImage(this.files[0]);
        }
    });
    
    // Ngăn sự kiện click của input lan ra ngoài (tránh đóng modal)
    editImage.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // Remove image
    editRemoveBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        // Ẩn preview, hiện upload box
        editPreviewContainer.classList.remove('show');
        editPreviewContainer.style.display = 'none';
        editUploadBox.style.display = 'flex';
        editImage.value = '';
        editPreviewImg.src = '';
        cropContainer.style.display = 'none';
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        editCurrentImageData = null;
        editHasNewImage = false;
        showToast('Đã xóa ảnh!', 'info');
    });
    
    // Submit form
    const editForm = document.getElementById('editForm');
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleEditSubmit();
    });
}

// ===== XỬ LÝ ẢNH MỚI (upload hoặc paste) =====
function handleNewEditImage(file) {
    if (file.size > 5 * 1024 * 1024) {
        showToast('Ảnh quá lớn! Tối đa 5MB.', 'error');
        document.getElementById('editImage').value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        const editPreviewImg = document.getElementById('editImagePreview');
        const editPreviewContainer = document.getElementById('editPreviewContainer');
        const editUploadBox = document.getElementById('editUploadImageBox');
        const editPreviewLabel = document.getElementById('editPreviewLabel');
        const cropContainer = document.getElementById('cropContainer');
        
        editPreviewImg.src = dataUrl;
        editPreviewContainer.classList.add('show');
        editPreviewContainer.style.display = 'flex';
        editUploadBox.style.display = 'none';
        editPreviewLabel.textContent = '📷 Ảnh mới';
        cropContainer.style.display = 'block';
        
        editCurrentImageData = dataUrl;
        editHasNewImage = true;
        
        showToast('Đã chọn ảnh mới!', 'success');
        
        // Khởi tạo cropper
        initCropper(dataUrl);
    };
    reader.onerror = function() {
        showToast('Lỗi đọc ảnh! Vui lòng thử lại.', 'error');
    };
    reader.readAsDataURL(file);
}

// ===== PASTE ẢNH TRONG EDIT MODAL =====
document.addEventListener('paste', function(e) {
    const editModal = document.getElementById('editModal');
    if (!editModal || editModal.style.display !== 'flex') return;
    
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
                // Set vào input file để submit dùng được
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                const editImage = document.getElementById('editImage');
                if (editImage) {
                    editImage.files = dataTransfer.files;
                }
                handleNewEditImage(file);
                break;
            }
        }
    }
});

// ===== VALIDATE EDIT NAME =====
function validateEditName(showRequired = false) {
    const input = document.getElementById('editName');
    const error = document.getElementById('editNameError');
    const value = input.value.trim();
    
    if (!value) {
        input.classList.remove('success');
        input.classList.add('error');
        if (showRequired) {
            error.textContent = 'Vui lòng nhập tên người nhận!';
            error.classList.add('show');
        } else {
            error.classList.remove('show');
        }
        return false;
    }
    
    if (!validateName(value)) {
        input.classList.remove('success');
        input.classList.add('error');
        error.textContent = 'Chỉ được chứa chữ cái (có dấu) và khoảng trắng!';
        error.classList.add('show');
        return false;
    }
    
    input.classList.remove('error');
    input.classList.add('success');
    error.classList.remove('show');
    return true;
}

// ===== VALIDATE EDIT BANK =====
function validateEditBank(showRequired = false) {
    const select = document.getElementById('editBank');
    const error = document.getElementById('editBankError');
    const value = select.value.trim();
    
    if (!value) {
        select.classList.remove('success');
        select.classList.add('error');
        if (showRequired) {
            error.textContent = 'Vui lòng chọn ngân hàng!';
            error.classList.add('show');
        } else {
            error.classList.remove('show');
        }
        return false;
    }
    
    select.classList.remove('error');
    select.classList.add('success');
    error.classList.remove('show');
    return true;
}

// ===== INIT CROPPER =====
function initCropper(imageSrc) {
    const image = document.getElementById('cropImage');
    image.src = imageSrc;
    image.onload = function() {
        if (cropper) {
            cropper.destroy();
        }
        cropper = new Cropper(image, {
            // Không khóa tỷ lệ → kéo tự do chiều dài / chiều rộng
            aspectRatio: NaN,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.8,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
        });
    };
}

// ===== CROP CONTROLS =====
document.addEventListener('click', function(e) {
    // Rotate left
    if (e.target.id === 'cropRotateLeft' && cropper) {
        cropper.rotate(-90);
    }
    // Rotate right
    if (e.target.id === 'cropRotateRight' && cropper) {
        cropper.rotate(90);
    }
    // Reset
    if (e.target.id === 'cropReset' && cropper) {
        cropper.reset();
    }
    // Apply crop
    if (e.target.id === 'cropApply' && cropper) {
        // Lấy đúng kích thước vùng đã crop (không ép vuông)
        const canvas = cropper.getCroppedCanvas({
            maxWidth: 1200,
            maxHeight: 1200,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });
        if (canvas) {
            const croppedDataUrl = canvas.toDataURL('image/png');
            document.getElementById('editImagePreview').src = croppedDataUrl;
            document.getElementById('editPreviewLabel').textContent = 'Ảnh đã cắt';
            
            // Tạo file từ data URL để validate & submit
            const file = dataURLtoFile(croppedDataUrl, 'qr_edited.png');
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            document.getElementById('editImage').files = dataTransfer.files;
            
            editCurrentImageData = croppedDataUrl;
            editHasNewImage = true;
            
            cropper.destroy();
            cropper = null;
            document.getElementById('cropContainer').style.display = 'none';
            
            showToast('Đã cắt ảnh thành công!', 'success');
        }
    }
});

// ===== DATA URL TO FILE =====
function dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

// ===== CLOSE EDIT MODAL =====
function closeEditModal() {
    const editModal = document.getElementById('editModal');
    editModal.style.display = 'none';
    editingQRId = null;
    editingQRData = null;
    editCurrentImageData = null;
    editHasNewImage = false;
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

// ===== HANDLE EDIT SUBMIT =====
async function handleEditSubmit() {
    // Validate
    if (!validateEditName(true)) {
        document.getElementById('editName').focus();
        return;
    }
    if (!validateEditBank(true)) {
        document.getElementById('editBank').focus();
        return;
    }
    
    const name = document.getElementById('editName').value.trim();
    const bank = document.getElementById('editBank').value;
    const account = document.getElementById('editAccount').value.trim();
    const holder = document.getElementById('editHolder').value.trim();
    const imageFile = document.getElementById('editImage').files[0];
    
    // Validate account
    if (account && !validateAccountNumber(account)) {
        showToast('Số tài khoản chỉ được chứa chữ số!', 'error');
        document.getElementById('editAccount').focus();
        return;
    }
    
    // Validate holder
    if (holder && !validateHolder(holder)) {
        showToast('Chủ tài khoản chỉ được chứa chữ in hoa, không dấu và khoảng trắng! (VD: NGUYEN VAN A)', 'error');
        document.getElementById('editHolder').focus();
        return;
    }
    
    // Kiểm tra ảnh
    if (!editCurrentImageData) {
        showToast('Vui lòng chọn ảnh mã QR!', 'error');
        document.getElementById('editImageError').classList.add('show');
        return;
    }
    
    // Nếu có ảnh mới (file), validate QR
    if (imageFile && editHasNewImage) {
        showToast('Đang kiểm tra ảnh...', 'info');
        const result = await validateQRImage(imageFile);
        if (!result.valid) {
            showToast(result.message, 'error');
            return;
        }
    }
    
    // Chuẩn bị dữ liệu cập nhật
    const updateData = {
        name: name,
        bank: bank,
        accountNumber: account || 'Chưa cập nhật',
        accountHolder: holder || 'Chưa cập nhật',
        uploadedBy: currentUser,
        updatedAt: new Date().toISOString(),
        imageData: editCurrentImageData
    };
    
    await saveEdit(updateData);
}

// ===== SAVE EDIT =====
async function saveEdit(data) {
    try {
        // Cập nhật vào Firebase
        await database.ref(`${DB_QRS}/${editingQRId}`).update(data);
        
        showToast('Đã cập nhật mã QR thành công!', 'success');
        closeEditModal();
        
        // Refresh danh sách
        await renderUserList(searchInput.value);
        
        // Mở lại detail với dữ liệu mới
        const qrs = await getQRList();
        const updatedQR = qrs.find(q => q.id === editingQRId);
        if (updatedQR) {
            setTimeout(() => showDetail(updatedQR), 300);
        }
    } catch (error) {
        console.error('Lỗi cập nhật:', error);
        showToast('❌ Lỗi cập nhật: ' + error.message, 'error');
    }
}
