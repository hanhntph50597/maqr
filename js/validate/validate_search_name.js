// ==========================================
// ===== validate_search_name.js =====
// Validate form + tìm kiếm tên
// Phân biệt với: validate_qrName, validate_bankName, validate_QRImage_Required
// ==========================================

const SEARCH_MAX_LEN = 50;

// ---------- Validate form ----------

function validateName(name) {
    if (!name || !String(name).trim()) return false;
    return /^[a-zA-ZÀ-Ỹà-ỹĂăÂâĐđÊêÔôƠơƯư\s\-]+$/.test(String(name).trim());
}

function validateAccountNumber(account) {
    if (!account || !String(account).trim()) return true; // không bắt buộc
    return /^[0-9]+$/.test(String(account).trim());
}

function validateHolder(holder) {
    if (!holder || !String(holder).trim()) return true; // không bắt buộc
    return /^[A-Z\s]+$/.test(String(holder).trim());
}

// ---------- Tìm kiếm tên ----------

/** Bỏ dấu tiếng Việt để so khớp không phân biệt dấu */
function removeVietnameseTones(str) {
    if (!str) return '';
    return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();
}

/**
 * Tìm tuyệt đối theo từ (không dính substring).
 * - Rỗng → true (hiện tất cả)
 * - "hanh" khớp "Hạnh", KHÔNG khớp "Thanh" / "Khánh"
 * - "nguyen hanh" → mọi từ đều phải có trong tên
 * - Khớp cả chuỗi tên đầy đủ
 */
function matchSearchName(name, query) {
    const q = removeVietnameseTones(query || '').trim();
    if (!q) return true;
    const n = removeVietnameseTones(name || '').trim();
    if (!n) return false;
    if (n === q) return true;
    const words = n.split(/\s+/).filter(Boolean);
    const qWords = q.split(/\s+/).filter(Boolean);
    if (qWords.length > 1) {
        return qWords.every(function (qw) {
            return words.some(function (w) { return w === qw; });
        });
    }
    return words.some(function (w) { return w === q; });
}

function normalizeSearchInput(raw) {
    if (raw == null) return '';
    let v = String(raw).normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '');
    if (v.length > SEARCH_MAX_LEN) v = v.slice(0, SEARCH_MAX_LEN);
    return v;
}

/**
 * Gắn ô tìm kiếm:
 * - Hỗ trợ gõ IME tiếng Việt (Telex/VNI)
 * - Debounce 50ms khi đang gõ
 * - Xóa hết / Esc → hiện tất cả ngay
 * - maxlength 50
 *
 * @param {HTMLInputElement} inputEl
 * @param {(query: string) => void} onSearch  ví dụ: (q) => renderUserList(q)
 */
function initSearchValidation(inputEl, onSearch) {
    if (!inputEl || typeof onSearch !== 'function') return;

    var searchTimer = null;
    var isComposing = false;

    inputEl.setAttribute('maxlength', String(SEARCH_MAX_LEN));
    inputEl.setAttribute('autocomplete', 'off');
    inputEl.setAttribute('spellcheck', 'false');
    inputEl.setAttribute('lang', 'vi');

    function run(value) {
        onSearch(normalizeSearchInput(value).trim());
    }

    inputEl.addEventListener('compositionstart', function () {
        isComposing = true;
    });
    inputEl.addEventListener('compositionend', function () {
        isComposing = false;
        clearTimeout(searchTimer);
        run(this.value);
    });
    inputEl.addEventListener('input', function () {
        if (isComposing) return;
        var v = this.value;
        // Xóa hết → hiện tất cả ngay, không chờ debounce
        if (!String(v).trim()) {
            clearTimeout(searchTimer);
            run('');
            return;
        }
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
            run(v);
        }, 50);
    });
    inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            clearTimeout(searchTimer);
            this.value = '';
            run('');
        }
    });
    inputEl.addEventListener('blur', function () {
        this.value = normalizeSearchInput(this.value).trim();
    });
}

// Gắn global
if (typeof window !== 'undefined') {
    window.validateName = validateName;
    window.validateAccountNumber = validateAccountNumber;
    window.validateHolder = validateHolder;
    window.removeVietnameseTones = removeVietnameseTones;
    window.matchSearchName = matchSearchName;
    window.normalizeSearchInput = normalizeSearchInput;
    window.initSearchValidation = initSearchValidation;
}
