# HƯỚNG DẪN TÍCH HỢP THANH TOÁN TỰ ĐỘNG (SALES SETUP)

Mục tiêu: Thu tiền $19 (Pro) và $39 (Pro+) mà không cần tự viết backend.
Công cụ: ExtensionPay (extensionpay.com) - Giải pháp phổ biến nhất cho Chrome Extension.

## Bước 1: Đăng ký ExtensionPay (5 phút)
1. Truy cập https://extensionpay.com và đăng ký (miễn phí).
2. Kết nối với Stripe (bạn cần tạo tài khoản Stripe để nhận tiền, yêu cầu CCCD/Passport).
3. Tạo 2 gói sản phẩm trên ExtensionPay:
   - ID: `pro` | Giá: $19 one-time
   - ID: `pro_plus` | Giá: $39 one-time

## Bước 2: Tích hợp code (Tôi sẽ viết code cho bạn)
ExtensionPay cung cấp thư viện JS nhẹ. Tôi sẽ cập nhật file `src/background.js` và `src/popup.js` để:
- Kiểm tra xem user đã mua chưa.
- Nếu chưa: hiện nút "Upgrade to Pro".
- Nếu rồi: mở khóa tính năng.

## Bước 3: Cập nhật Manifest
Thêm `https://extensionpay.com/*` vào `host_permissions`.

## Bước 4: Test thanh toán
ExtensionPay có chế độ "Test Mode" để bạn giả lập mua hàng mà không mất tiền thật.

## Bước 5: Submit lên Chrome Web Store
Khi submit, bạn khai báo đây là extension có "In-app purchases". Google sẽ duyệt bình thường.

---
*Lưu ý: Do yêu cầu KYC (xác minh danh tính) của Stripe, tôi (AI) không thể tạo tài khoản Stripe thay bạn. Bạn phải làm bước này.*
