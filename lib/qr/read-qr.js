// ==========================================
// ===== read_qr_bank.js =====
// Đọc mã QR chuyển khoản (VietQR / EMVCo) → điền form thêm mới
// Cần: ZXing (@zxing/library) và/hoặc jsQR
// ==========================================

/** Map BIN (6 số) → tên ngân hàng trong select */
const VIETQR_BANK_BIN = {
    '970436': 'Vietcombank',
    '970415': 'VietinBank',
    '970418': 'BIDV',
    '970405': 'Agribank',
    '970407': 'Techcombank',
    '970422': 'MB Bank',
    '970432': 'VPBank',
    '970423': 'TPBANK',
    '970416': 'ACB',
    '970403': 'Sacombank',
    '970437': 'HDBank',
    '970448': 'OCB',
    '970414': 'VIB',
    '970441': 'Vikki',
    '970454': 'VietCapitalBank',
    '970429': 'SCB',
    '970440': 'SeABank',
    '970426': 'MSB',
    '970431': 'Eximbank',
    '970419': 'NCB',
    '970428': 'NamABank',
    '970430': 'PVcomBank',
    '970439': 'PublicBank',
    '970412': 'PVcomBank',
    '970427': 'VietABank',
    '970438': 'BaoVietBank',
    '970446': 'CoopBank',
    '970452': 'KienLongBank',
    '970409': 'BacABank',
    '970424': 'ShinhanBank',
    '970425': 'ABBANK',
    '970433': 'VietBank',
    '970400': 'SaigonBank',
    '970457': 'Woori',
    '970458': 'UOB',
    '970421': 'VRB',
    '970443': 'SHB',
    '970449': 'LienVietPostBank',
    '970455': 'IBK',
    '970462': 'Kookmin',
    '970466': 'KEB Hana',
    '970467': 'CIMB',
    '970468': 'UOB'
};

/** Parse TLV EMVCo: tag(2) + length(2) + value */
function parseEMVTLV(payload) {
    const out = {};
    let i = 0;
    const s = String(payload || '');
    while (i + 4 <= s.length) {
        const tag = s.substr(i, 2);
        const len = parseInt(s.substr(i + 2, 2), 10);
        if (isNaN(len) || len < 0) break;
        const value = s.substr(i + 4, len);
        out[tag] = value;
        i += 4 + len;
    }
    return out;
}

/**
 * Parse nội dung QR VietQR
 * @returns {{ bankBin, bankName, accountNumber, accountHolder, raw }}
 */
function parseVietQR(payload) {
    const result = {
        bankBin: '',
        bankName: '',
        accountNumber: '',
        accountHolder: '',
        raw: payload || ''
    };
    if (!payload || typeof payload !== 'string') return result;

    const root = parseEMVTLV(payload);

    // Tag 38: Merchant Account Information (VietQR)
    if (root['38']) {
        const mai = parseEMVTLV(root['38']);
        // 01 = BIN, 02 = số tài khoản (chuẩn NAPAS/VietQR)
        if (mai['01']) result.bankBin = mai['01'];
        if (mai['02']) result.accountNumber = mai['02'];
        // Một số QR để STK trong 01 nếu không có 02
        if (!result.accountNumber && mai['01'] && mai['01'].length > 6) {
            result.accountNumber = mai['01'];
        }
    }

    // Tag 59: Merchant Name → thường là tên chủ TK (không dấu)
    if (root['59']) {
        result.accountHolder = root['59'].trim();
    }

    // Tag 62 Additional Data Field Template — có thể có tên
    if (root['62']) {
        const add = parseEMVTLV(root['62']);
        // 08 = Purpose / 50 Bill Number / đôi khi 01
        if (!result.accountHolder && add['50']) result.accountHolder = add['50'].trim();
    }

    if (result.bankBin) {
        const bin6 = result.bankBin.substring(0, 6);
        result.bankName = VIETQR_BANK_BIN[bin6] || VIETQR_BANK_BIN[result.bankBin] || '';
    }

    return result;
}

/** Đọc text từ ảnh file bằng ZXing → fallback jsQR */
async function decodeQRFromFile(file) {
    if (!file) return null;

    // --- ZXing ---
    if (typeof ZXing !== 'undefined' && ZXing.BrowserQRCodeReader) {
        try {
            const reader = new ZXing.BrowserQRCodeReader();
            const url = URL.createObjectURL(file);
            try {
                const result = await reader.decodeFromImageUrl(url);
                URL.revokeObjectURL(url);
                if (result) {
                    const text = typeof result.getText === 'function' ? result.getText() : (result.text || '');
                    if (text) return text;
                }
            } catch (e1) {
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.warn('ZXing decode fail', e);
        }
    }

    // --- jsQR fallback ---
    if (typeof jsQR === 'function') {
        try {
            const dataUrl = await new Promise(function (resolve, reject) {
                const fr = new FileReader();
                fr.onload = function () { resolve(fr.result); };
                fr.onerror = reject;
                fr.readAsDataURL(file);
            });
            const img = await new Promise(function (resolve, reject) {
                const i = new Image();
                i.onload = function () { resolve(i); };
                i.onerror = reject;
                i.src = dataUrl;
            });
            const canvas = document.createElement('canvas');
            const max = 1200;
            let w = img.width, h = img.height;
            if (w > max || h > max) {
                if (w > h) { h = Math.round(h * max / w); w = max; }
                else { w = Math.round(w * max / h); h = max; }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code && code.data) return code.data;
        } catch (e) {
            console.warn('jsQR decode fail', e);
        }
    }

    return null;
}

/**
 * Đọc QR từ file ảnh và điền form thêm mới:
 * - Ngân hàng (select #qrBank)
 * - Số tài khoản (#qrAccount)
 * - Chủ tài khoản (#qrHolder) — chữ in hoa không dấu
 * - Tên người nhận (#qrName) nếu đang trống (từ chủ TK)
 */
async function readQRAndFillForm(file) {
    if (!file) return null;

    try {
        if (typeof showToast === 'function') {
            showToast('Đang đọc thông tin từ mã QR...', 'info');
        }

        const text = await decodeQRFromFile(file);
        if (!text) {
            if (typeof showToast === 'function') {
                showToast('Không đọc được nội dung QR. Bạn có thể nhập tay.', 'warning');
            }
            return null;
        }

        const info = parseVietQR(text);
        console.log('VietQR parsed:', info);

        // Số tài khoản
        const accountEl = document.getElementById('qrAccount');
        if (accountEl && info.accountNumber) {
            accountEl.value = info.accountNumber;
            accountEl.classList.remove('error');
            accountEl.classList.add('success');
            const err = document.getElementById('qrAccountError');
            if (err) err.classList.remove('show');
        }

        // Chủ tài khoản (chuẩn form: IN HOA, không dấu)
        const holderEl = document.getElementById('qrHolder');
        if (holderEl && info.accountHolder) {
            let holder = info.accountHolder;
            if (typeof removeVietnameseTones === 'function') {
                holder = removeVietnameseTones(holder).toUpperCase();
            } else {
                holder = holder.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase();
            }
            holderEl.value = holder;
            holderEl.classList.remove('error');
            holderEl.classList.add('success');
            const errH = document.getElementById('qrHolderError');
            if (errH) errH.classList.remove('show');
        }

        // Ngân hàng
        const bankEl = document.getElementById('qrBank');
        if (bankEl && info.bankName) {
            // Khớp option (không phân biệt hoa thường)
            const opts = bankEl.options;
            let matched = false;
            for (let i = 0; i < opts.length; i++) {
                if (opts[i].value && opts[i].value.toLowerCase() === info.bankName.toLowerCase()) {
                    bankEl.value = opts[i].value;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                // Thử includes
                for (let i = 0; i < opts.length; i++) {
                    const v = (opts[i].value || '').toLowerCase();
                    const n = info.bankName.toLowerCase();
                    if (v && (v.indexOf(n) >= 0 || n.indexOf(v) >= 0)) {
                        bankEl.value = opts[i].value;
                        matched = true;
                        break;
                    }
                }
            }
            if (matched) {
                bankEl.classList.remove('error');
                bankEl.classList.add('success');
                const errB = document.getElementById('qrBankError');
                if (errB) errB.classList.remove('show');
            }
        }

        // Tên người nhận: nếu trống, gợi ý từ chủ TK (có khoảng trắng)
        const nameEl = document.getElementById('qrName');
        if (nameEl && !nameEl.value.trim() && info.accountHolder) {
            // Giữ nguyên nếu có dấu trong payload; không thì dùng holder
            nameEl.value = info.accountHolder;
            if (typeof validateQrName === 'function') validateQrName(false);
        }

        const parts = [];
        if (info.bankName) parts.push(info.bankName);
        if (info.accountNumber) parts.push('STK ' + info.accountNumber);
        if (info.accountHolder) parts.push(info.accountHolder);

        if (typeof showToast === 'function') {
            if (parts.length) {
                showToast('Đã điền: ' + parts.join(' · '), 'success');
            } else {
                showToast('Đã đọc QR nhưng không tìm thấy STK/ngân hàng. Kiểm tra lại ảnh.', 'warning');
            }
        }

        return info;
    } catch (err) {
        console.error('readQRAndFillForm', err);
        if (typeof showToast === 'function') {
            showToast('Lỗi đọc QR: ' + (err.message || 'không xác định'), 'error');
        }
        return null;
    }
}

if (typeof window !== 'undefined') {
    window.parseVietQR = parseVietQR;
    window.decodeQRFromFile = decodeQRFromFile;
    window.readQRAndFillForm = readQRAndFillForm;
    window.VIETQR_BANK_BIN = VIETQR_BANK_BIN;
}
