# Bằng chứng Phase 3

Chạy `npm run verify` ở gốc repo. Lệnh build, chạy các bài kiểm tra và lưu TAP, replay và số đo vào `dist/proof/phase-3/`. Các kết quả dưới đây được ghi trên Windows, Node.js 26 và Chrome 157.

| Yêu cầu | Kết quả |
|---|---|
| Hao dầu, hút dầu và châm dầu | Bóng Mực hút cộng dồn, một đèn cạn, rồi Mây châm đèn yếu để giữ đủ đèn tới bình minh. [Replay dầu](fuel-drain.jsonl) |
| Hồi quy khi thắp đèn cuối | Đèn cuối được thắp ở tick 91. Đêm kết thúc lúc bình minh ở tick 96 với 1.041 điểm. [Replay Đêm 1](dawn-standard.jsonl) |
| Ngưỡng an toàn, thắp lại, điểm và luật thắng | Test dùng 30 dầu và các giá trị liền kề, kiểm tra vùng an toàn, sức chứa, điểm theo dầu thô và kết quả ở tick cuối cho cả ba Đêm. [TAP 29/29](tests.tap) |
| Hồi quy di chuyển và hiệu năng headless | Chạy lại kịch bản cầu, Bùa Gió, pause và dash. Ba Đêm chạy đủ 14.400, 16.200 và 18.000 tick với chu kỳ snapshot mặc định 10 tick. [Replay cầu](cau-bridge.jsonl) · [Số đo headless](headless-metrics.json) |
| Giao diện và bảng màu dễ phân biệt | Tùy chọn còn bật sau khi tải lại. Mắt Bóng Mực xanh lam, cảnh báo trắng có ⚠, thanh dầu đổi độ sáng, giấy đèn tắt rách và xẹp 20%. Bấm E để châm dầu và thắp lại, HUD tăng từ 10 lên 12 ô. [Cài đặt](palette-settings.jpg) · [Ảnh trên đảo](fuel-and-accessible.jpg) · [Kết quả bình minh](dawn-result.jpg) · [Nhật ký trình duyệt](browser.json) |

Kiểm tra trình duyệt dùng một cảnh đặt sẵn đèn ở gần Mây và thời gian ngắn để thử các thao tác cụ thể. Đo tốc độ khung hình bằng thời gian thật trong cảnh này. Các test ẩn của giảng viên chưa được chạy.
