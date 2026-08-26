function validateBankName(showRequired = false) {
    console.log("validateBankName", showRequired);
    const value = qrBankSelect.value.trim();

    if (!value) {
        qrBankSelect.classList.remove('success');
        qrBankSelect.classList.add('error');

        if (showRequired) {
            qrBankSelectError.textContent = 'Vui lòng chọn ngân hàng!';
            qrBankSelectError.classList.add('show');
        } else {
            qrBankSelectError.classList.remove('show');
        }

        return false;
    }

    if (!validateName(value)) {
        qrBankSelect.classList.remove('success');
        qrBankSelect.classList.add('error');
        qrBankSelectError.textContent = 'Chỉ được chứa chữ cái (có dấu) và khoảng trắng!';
        qrBankSelectError.classList.add('show');
        return false;
    }

    qrBankSelect.classList.remove('error');
    qrBankSelect.classList.add('success');
    qrBankSelectError.classList.remove('show');
    return true;
}