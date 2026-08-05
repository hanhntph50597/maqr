function validateQrName(showRequired = false) {
    console.log("validateQrName", showRequired);
    const value = qrNameInput.value.trim();

    if (!value) {
        qrNameInput.classList.remove('success');
        qrNameInput.classList.add('error');

        if (showRequired) {
            qrNameError.textContent = 'Vui lòng nhập tên người nhận!';
            qrNameError.classList.add('show');
        } else {
            qrNameError.classList.remove('show');
        }

        return false;
    }

    if (!validateName(value)) {
        qrNameInput.classList.remove('success');
        qrNameInput.classList.add('error');
        qrNameError.textContent = 'Chỉ được chứa chữ cái (có dấu) và khoảng trắng!';
        qrNameError.classList.add('show');
        return false;
    }

    qrNameInput.classList.remove('error');
    qrNameInput.classList.add('success');
    qrNameError.classList.remove('show');
    return true;
}