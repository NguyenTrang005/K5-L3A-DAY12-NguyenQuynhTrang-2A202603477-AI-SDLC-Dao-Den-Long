---
name: verify-phase
description: Chạy kiểm chứng và lưu bằng chứng tái lập được cho Đảo Đèn Lồng.
---

1. Chạy `npm run verify` (dùng `npm.cmd run verify` trên PowerShell nếu cần). Lệnh sẽ dừng nếu build, test hoặc scenario mẫu thất bại.
2. Xem TAP, JSONL và số đo trong `dist/proof/phase-4/`. Chạy benchmark và soak theo README để tạo lại `bench.json` và `soak.json` ở gốc. Dùng tag tương ứng để tái lập hợp đồng bản trước.
3. Mở bản web, thử Đổi phím, cảnh báo trùng, khôi phục, lưu cài đặt, phụ đề và bảng điểm sau thắng hoặc thua. Đối chiếu 18 px và 22,5 px ở 1280×720. Ghi trình duyệt, GPU và cấu hình máy khi đo.
4. Chạy `npm run package`, giải nén vào thư mục mới và làm theo README nằm trong gói. So sánh kết quả đầu ra, ảnh và tag.
4. Đối chiếu bằng chứng với tiêu chí nghiệm thu trước khi gắn tag. Ghi rõ yêu cầu chưa xác nhận được.
