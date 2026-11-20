---
name: verify-phase
description: Chạy kiểm chứng và lưu bằng chứng tái lập được cho Đảo Đèn Lồng.
---

1. Chạy `npm run verify` (dùng `npm.cmd run verify` trên PowerShell nếu cần). Lệnh sẽ dừng nếu build, test hoặc scenario mẫu thất bại.
2. Xem TAP, JSONL bình minh, dầu, cầu Đảo Cau và số đo ba đêm trong `dist/proof/phase-3/`. Lệnh `npm run verify -- docs/proof/phase-3` lưu bằng chứng v1.2. Dùng tag `phase-1` hoặc `phase-2` để tái lập bản cũ.
3. Mở bản web, thử châm dầu, thắp lại và kiểm tra HUD. Bật bảng màu dễ phân biệt, tải lại, so màu mắt Bóng Mực, ký hiệu cảnh báo và hình dạng đèn tắt. Ghi FPS đo ở 1280×720, trình duyệt, chế độ GPU và cấu hình máy.
4. Đối chiếu bằng chứng với tiêu chí nghiệm thu trước khi gắn tag. Ghi rõ yêu cầu chưa xác nhận được.
