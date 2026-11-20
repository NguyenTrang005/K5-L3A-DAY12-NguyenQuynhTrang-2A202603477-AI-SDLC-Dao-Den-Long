# Phase 1 — Đêm 1, Đảo Bến

## Giả định và quyết định

- Dùng Node.js ≥ 20 và WebGL thuần để bản web tĩnh và CLI chia sẻ cùng mô phỏng. Giao diện thử nghiệm dùng seed 2026 để chơi lại có cùng điểm xuất phát và bố cục.
- Đảo bán kính 36 m và giữ người chơi trong biên, nên không có phạt rơi. Nhảy thay đổi độ cao hiển thị, còn thu nhặt, nạp, pulse và va chạm đều đo trong XZ.
- Nạp bằng một lần nhấn, ưu tiên đèn chưa sáng gần nhất. Mỗi lần chuyển tối đa số đom đóm đèn còn thiếu và có thể nạp dở. Đèn đã sáng tạo vùng an toàn.
- Khi trúng đòn, một nửa số đom đóm mang theo được làm tròn xuống rồi thả ra quanh Mây để có thể nhặt lại. Bóng Mực bị pulse đẩy ra ngoài và làm choáng ngay.
- Nếu vừa thắp đủ năm đèn vừa hết giờ trong cùng tick, tính thắng. Điểm thưởng thời gian (tính theo giây nguyên còn lại) và ánh lửa còn lại chỉ cộng khi thắng.

## Nhật ký dùng AI

| Bước | Công việc giao cho Codex | Cách kiểm tra |
|---|---|---|
| Phân tích | Đọc PRD-0, xác định hạng mục bắt buộc và chọn cấu trúc web + CLI | Đối chiếu phạm vi, schema, quy ước tick và bàn giao với đề |
| Xây dựng | Viết mô phỏng, CLI, dựng cảnh và HUD | Dùng một nguồn tuning và chạy test qua CLI thực |
| Sửa lỗi | CLI ban đầu nhận `--seed=-1` nhưng từ chối `--seed -1` do cách phân tích tham số của Node | Chạy trực tiếp, sửa xử lý seed âm và đặt seed âm trong test hồi quy |
| Kiểm chứng | Thêm lệnh chung chạy build, test và trích JSONL | Kiểm tra exit code, trạng thái, dòng cuối và điểm dự kiến |
| Kiểm chứng trình duyệt | Chạy Chrome với bộ dựng hình phần mềm và dùng phím để hoàn thành một lượt | Đối chiếu điểm, số đèn, HUD thua và HUD sau mỗi lần chơi lại |

Ước tính khoảng 15.000–25.000 token cho lượt triển khai và kiểm chứng Phase 1, dựa trên lượng mã, đề bài và kết quả lệnh đã đọc. Đây là ước tính thô, phiên làm việc không cung cấp số đo token hay chi phí thực tế. Cách tiết kiệm là khoanh phạm vi Phase 1, dùng chung mô phỏng và chạy scenario nhỏ để xác định lỗi trước khi kiểm tra giao diện.

## Đánh giá

- Quy ước tick, di chuyển tương đối với camera, thu nhặt, thắp đèn, pulse, sát thương, vùng an toàn và kết quả được kiểm tra bằng test chạy thật.
- Dùng `AGENTS.md`, quy trình kiểm chứng trong repo và lệnh `npm run verify` để tái lập. GitHub Actions được cấu hình chạy kiểm chứng trên Ubuntu.
- Xem bảng yêu cầu và bằng chứng trong `docs/proof/phase-1/README.md`.
