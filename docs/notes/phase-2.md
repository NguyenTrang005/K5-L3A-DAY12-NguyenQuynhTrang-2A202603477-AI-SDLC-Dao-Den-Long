# Phase 2 — Ba hòn đảo

## Tiêu chí nghiệm thu cho Phần 3

| Yêu cầu | Kết quả để đối chiếu | Cách kiểm chứng |
|---|---|---|
| Gió Lạc | Đêm 2–3 sinh tại bội của 1.200 tick, tối đa hai con. Ngưỡng săn là 5 đom đóm và 15 m. Khi chạm, cướp tối đa 3 trước hit của Bóng Mực, rồi rời đi. Pulse đuổi con đang săn và làm con đang trốn thả lại đồ. | Headless kiểm tra lịch sinh, thứ tự chạm, chạy trốn, thả đồ và biến mất. |
| Bùa Gió | Nhặt theo bán kính và độ cao của đom đóm. Chạy đạt 7,2 m/s trong 600 tick. Có thể lướt lại sau 12 tick nếu nhấn mới. Bùa hiện lại sau 2.700 tick. | Headless kiểm tra vận tốc, dash, TTL và hồi bùa. Bản web hiển thị bùa và trạng thái ở HUD. |
| Chuỗi ba Đêm | Menu mở giới thiệu chứa tên đảo và lời Ông Đăng. Kết quả thắng mở Đêm kế tiếp, thua cho chơi lại Đêm đó. Thắng Đêm 3 hiển thị Bình Minh và tổng điểm các Đêm thắng. | Kịch bản trình duyệt đặt trạng thái trước đèn cuối để kiểm tra luồng và tổng điểm. |
| Tạm dừng | Esc/P mở menu có Tiếp tục, Chơi lại Đêm, Cài đặt và Về menu. Đồng hồ gameplay, TTL và mọi cooldown giữ nguyên trong lúc pause. | Headless so sánh snapshot lúc pause. Bản web kiểm tra menu và nút Tiếp tục. |
| Cài đặt | Đổi âm lượng và độ nhạy chuột. Tải lại trang giữ giá trị đã chỉnh. | Chỉnh hai thanh trong trình duyệt, tải lại và đọc giá trị. |
| Âm thanh | Có nhạc nền. Các hành động nhặt, thắp đèn, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, gió sắp nổi và 10 giây cuối kích hoạt hiệu ứng. | Đối chiếu sự kiện với bảng hiệu ứng trong `web/audio.mjs`. Kiểm tra tổng hợp âm thanh trong trình duyệt. |
| HUD | Lửa trái, đồng hồ giữa, đèn và điểm bên phải, túi 10 ô dưới giữa, hai hồi chiêu dưới phải. Ở gần đèn thì hiện tiến độ nạp. Đèn chưa sáng gần nhất ngoài màn hình có mũi tên. Đồng hồ đỏ và nhấp nháy từ 30 giây. | Đối chiếu ảnh bản chơi, tình huống dưới 30 giây và hành vi HUD. |
| Bảng màu và độ sáng | Thành phần liệt kê dùng vật liệu màu theo bảng Ticket-02. Cường độ ánh sáng môi trường tăng từ 0,15 đến 0,70 theo tỷ lệ đèn sáng. | Đối chiếu vật liệu, CSS và uniform ánh sáng với Ticket-02. |

## Giả định và thay đổi

- Đêm 1 và 2 xuất phát tại `(0,0,0)`. Đêm 3 xuất phát ở `(0,0,-10)` ngoài đĩa cao và tháp ở tâm. Hướng ban đầu là +Z. Bản đồ dùng cos/sin lần lượt theo X/Z.
- Bóng Mực sinh trong 30 tick trước khi di chuyển. Vùng sáng dùng bán kính XZ. Bóng Mực đã ở trong vùng được đẩy ra trong 30 tick. Tương tác đèn vẫn dùng bán kính XZ như v1.0. Khi chạm đất, lướt bám theo dốc. Khi đã ở trên không, lướt giữ độ cao.
- Điểm sương của Gió Lạc dùng cùng tập điểm mép đảo với Bóng Mực. Gió Lạc đang lượn vẫn cướp khi chạm nếu túi có đom đóm. Sau khi biến mất, xóa khỏi snapshot.
- `night_start` ở tick 0 sau snapshot đầu. Khi nhấn tiếp tục, tick đó chạy lại bước mô phỏng. Đom đóm thường có `ttl_s: null`; đom đóm rơi giảm TTL theo `sim_tick`.
- Kiểm tra Phase 1 chạy lại với số chuẩn. Assertion về điểm nhặt, chi phí đèn, thời lượng, vận tốc và lịch sinh đã đổi theo Ticket-02. Giữ các bài kiểm tra hướng camera, định dạng, tick, lỗi file, kết quả và tất định. Fixture và bằng chứng v1.0 đã chốt vẫn có thể tái lập ở tag `phase-1`.

## Nhật ký AI và đánh giá

- Codex chuyển bản đồ sang mô-đun dùng chung, cập nhật engine và CLI, rồi nối giao diện, HUD, cài đặt và âm thanh. Dùng test headless từng cơ chế trước khi kiểm tra trình duyệt.
- Test qua cầu ban đầu giả định tốc độ cố định. Replay cho thấy người chơi nhặt Bùa Gió trên cầu. Đã sửa kỳ vọng theo sự kiện nhặt bùa và vận tốc mới.
- Lần đo WebGL ban đầu trên SwiftShader dưới 30 FPS. Đã chuyển tính ánh sáng sang shader đỉnh và chia thêm lưới bề mặt để giữ quầng sáng trên cỏ. Xem số đo cuối trong bằng chứng.
- Ảnh Đảo Chuông cho thấy tháp che khuất camera khi nhìn qua tầng trên. Camera được kéo về trước khi chạm tháp hoặc vách tầng, rồi kiểm chứng lại ở điểm đáp của bục nhảy.
- Ước tính thô 20.000–35.000 token cho phân tích, triển khai và các lượt kiểm chứng từ độ dài đầu vào, mã và log đã đọc. Phiên làm việc thiếu số đo token hoặc chi phí thực tế. Việc dùng mô phỏng chung, fixture hẹp và script chạy lại giúp giảm số lượt rà soát bằng AI.
