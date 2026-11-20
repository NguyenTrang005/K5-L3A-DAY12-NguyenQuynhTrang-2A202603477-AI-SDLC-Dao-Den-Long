---
name: verify-phase
description: Chạy kiểm chứng và lưu bằng chứng tái lập được cho Đảo Đèn Lồng.
---

1. Chạy `npm run verify` (dùng `npm.cmd run verify` trên PowerShell nếu cần). Lệnh sẽ dừng nếu build, test hoặc scenario mẫu thất bại.
2. Xem TAP, JSONL hồi quy Đêm 1, JSONL cầu Đảo Cau và số đo ba đêm trong `dist/proof/phase-2/`. Lệnh `npm run verify -- docs/proof/phase-2` lưu bằng chứng của v1.1. Đọc lại tag `phase-1` khi cần tái lập v1.0.
3. Mở bản web, thử chọn Đêm, dash, pause và tiếp tục, chỉnh rồi tải lại cài đặt, và thử qua đêm hoặc chơi lại. Đo FPS trung bình ở 1280×720 bằng thời gian khung hình thật. Ghi trình duyệt, chế độ GPU và cấu hình máy.
4. Đối chiếu bằng chứng với tiêu chí nghiệm thu trước khi gắn tag. Ghi rõ yêu cầu chưa xác nhận được.
