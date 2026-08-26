// ==========================================
// ===== SEARCH =====
// ==========================================

// ===== TÌM KIẾM NHANH (cache local) =====
let searchTimer = null;
let isComposingSearch = false;

searchInput.setAttribute('maxlength', '50');
searchInput.setAttribute('autocomplete', 'off');
searchInput.setAttribute('lang', 'vi');

searchInput.addEventListener('compositionstart', function () {
    isComposingSearch = true;
});
searchInput.addEventListener('compositionend', function () {
    isComposingSearch = false;
    renderUserList(this.value);
});
searchInput.addEventListener('input', function () {
    if (isComposingSearch) return;
    var v = this.value;
    // Xóa hết → hiện tất cả ngay lập tức
    if (!v.trim()) {
        clearTimeout(searchTimer);
        renderUserList('');
        return;
    }
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
        renderUserList(v);
    }, 50);
});
searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        clearTimeout(searchTimer);
        this.value = '';
        renderUserList('');
    }
});
