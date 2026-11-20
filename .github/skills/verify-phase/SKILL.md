---
name: verify-phase
description: Chạy kiểm chứng và lưu bằng chứng tái lập được cho Đảo Đèn Lồng.
---

1. Chạy `npm run verify` (dùng `npm.cmd run verify` trên PowerShell nếu cần). Lệnh sẽ dừng nếu build, test hoặc scenario mẫu thất bại.
2. Xem kết quả trong `dist/proof/phase-1/`. Chạy lại với `npm run verify -- docs/proof/phase-1` để lưu đầu ra thật khi chốt Phase 1.
3. Với mỗi luồng hiển thị chưa được headless bao phủ, chơi bản web, đối chiếu HUD và ghi ảnh cùng các bước tái lập.
4. Đối chiếu bằng chứng với tiêu chí nghiệm thu trước khi gắn tag. Ghi rõ yêu cầu chưa xác nhận được.
