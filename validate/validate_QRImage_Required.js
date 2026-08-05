function validateQRImageRequired(showRequired = false) {

    if (!qrImage.files.length) {

        qrImage.classList.add('error');

        if (showRequired) {
            qrImageError.textContent = 'Vui lòng chọn ảnh mã QR!';
            qrImageError.classList.add('show');
        }

        return false;
    }

    qrImage.classList.remove('error');
    qrImageError.classList.remove('show');

    return true;
}