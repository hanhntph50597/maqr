function validateBankName(showRequired) {
    if (typeof showRequired === 'undefined') showRequired = false;
    var select = document.getElementById('qrBank') || (typeof qrBankSelect !== 'undefined' ? qrBankSelect : null);
    var errorEl = document.getElementById('qrBankError') || (typeof qrBankSelectError !== 'undefined' ? qrBankSelectError : null);
    if (!select) return false;
    var value = (select.value || '').trim();
    if (!value) {
        select.classList.remove('success');
        select.classList.add('error');
        if (errorEl) {
            if (showRequired) {
                errorEl.textContent = 'Vui lòng chọn ngân hàng!';
                errorEl.classList.add('show');
            } else errorEl.classList.remove('show');
        }
        return false;
    }
    select.classList.remove('error');
    select.classList.add('success');
    if (errorEl) errorEl.classList.remove('show');
    return true;
}
