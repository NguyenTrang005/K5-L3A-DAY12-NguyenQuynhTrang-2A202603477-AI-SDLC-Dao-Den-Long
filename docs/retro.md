# Retro — Đảo Đèn Lồng, Phase 1–4

## Kết quả qua bốn phase

| Phase | Kết quả và điều rút ra |
|---|---|
| 1 | Dựng Đảo Bến và Test Contract v1.0 dùng một mô phỏng chung. Chốt được vòng nhặt, nạp, thắng/thua và chơi lại. So sánh JSONL trên bản sạch phát hiện Windows tự đổi kết thúc dòng. Cấu hình Git giữ LF cho JSONL, giúp bằng chứng khớp từng byte. |
| 2 | Chuẩn hóa thông số, mở rộng ba đảo, thêm Gió Lạc, Bùa Gió và tạm dừng. Test đi qua cầu ban đầu dùng một tốc độ cho cả đường. Replay cho thấy Mây nhặt bùa ngay trên cầu và tăng tốc đúng. Ảnh trên Đảo Chuông cũng lộ lỗi tháp che camera. Cả hai vấn đề được phát hiện khi đối chiếu trạng thái hoặc khung hình thực. |
| 3 | Chuyển sang giữ đủ đèn tới bình minh. Dầu lưu theo số nguyên nên điểm và ngưỡng vùng sáng dùng đúng giá trị trước khi làm tròn. Giữ lại các test còn hiệu lực và sửa các kỳ vọng thắng sớm theo Ticket-03. |
| 4 | Thêm benchmark, soak, bảng điểm, đổi phím và gói phát hành. Benchmark kiểm tra tải của cảnh chuẩn. Soak đo RSS cả trước và sau chuỗi Đêm, phát hiện chi phí cấp phát của các phép lọc và sắp xếp trong vòng chạy. Gói được kiểm tra bằng cách giải nén và chạy máy chủ từ thư mục riêng. |

## Làm việc với AI

Các yêu cầu rõ về thứ tự tick, seed, điều kiện kết thúc và trường JSON giúp AI triển khai và tự kiểm tra chính xác hơn. Một tình huống nhỏ với kết quả dự đoán được thường phát hiện lỗi nhanh hơn chạy cả chiến dịch. Các lượt kiểm chứng trình duyệt vẫn cần thiết vì headless không thể cho thấy camera bị che, cỡ chữ thấp hoặc một trạng thái giao diện chưa cập nhật.

Codex ban đầu dùng trình phân tích tham số Node theo cách từ chối `--seed -1`. Kiểm tra CLI thật phát hiện và chuyển thành test hồi quy. Ở Phase 2, ảnh chụp cho thấy cách đặt camera mặc định chưa an toàn quanh tháp. Ở Phase 4, bản đo cuối chờ WebGL hoàn tất công việc GPU mỗi khung. Phép soak có lúc vượt ngưỡng do cấp phát tạm trong vòng chạy và mức RSS lúc khởi tạo thay đổi. Giảm cấp phát và đặt kích thước semi-space cố định cho lệnh soak, rồi đo lại RSS thật. Đóng gói thử cũng phát hiện `tar.exe` xử lý sai đường dẫn Windows có dấu. Tạo gói ở thư mục tạm với tên tương đối rồi chép về repo đã giải quyết lỗi.

Hai phần harness hữu ích nhất là `AGENTS.md` và skill kiểm chứng trong repo. `AGENTS.md` giữ các quy tắc khó nhớ ở một chỗ, như mô phỏng 60 tick, phân biệt `tick` với `sim_tick`, và thứ tự trừ dầu. Skill liên kết các lệnh với bằng chứng cần lưu. Lệnh `npm run verify` kết hợp build, regression, replay và soak, nên cùng một lệnh có thể dùng lại trước khi chốt tag.

## Token và chi phí

| Phase | Token ước tính |
|---|---:|
| 1 | 15.000–25.000 |
| 2 | 20.000–35.000 |
| 3 | 13.000–26.000 |
| 4 | 25.000–45.000 |
| **Tổng** | **73.000–131.000** |

Các khoảng trên là ước lượng thô từ tài liệu đọc, mã, lượt sửa và log. Phiên làm việc thiếu dữ liệu sử dụng chi tiết và hóa đơn, nên chưa có con số chi phí tiền đáng tin. Giới hạn phạm vi theo từng ticket, tái dùng mô phỏng cho web và headless, chạy lại bằng script và chỉ đọc phần log liên quan để giảm ngữ cảnh lặp.

## Nếu làm lại

Định nghĩa các fixture theo nhóm chuyển động, sự kiện và lifecycle từ đầu rồi giữ chúng giữa các tag. Thêm một lần chạy giao diện với camera ở từng góc khó ngay khi đổi bản đồ. Chuẩn bị phép đo tải và template release sớm, để cuối buổi còn đủ thời gian quay video, so kết quả trên máy thật và kiểm tra tải gói bằng cửa sổ ẩn danh.
