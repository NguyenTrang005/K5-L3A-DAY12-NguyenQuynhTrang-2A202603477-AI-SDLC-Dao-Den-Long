# Bằng chứng Phase 2

Chạy `npm run verify` ở gốc repo để build, chạy test và tạo lại TAP, JSONL và số đo headless trong `dist/proof/phase-2/`. Các bài kiểm tra dùng Node.js 26 trên Windows. Lệnh cũng tương thích Node.js 20 trở lên.

| Yêu cầu | Bằng chứng |
|---|---|
| Hồi quy Đêm 1 sau chuẩn hóa | Nhặt 10 đom đóm, nạp vào đèn cuối và thắng với 406 điểm ở tick 91. [JSONL](night1-standard.jsonl) |
| Contract v1.1, bản đồ và các luật mới | Test snapshot, seed, lỗi đầu vào, dash, thứ tự thắng/thua, rơi, pause, cầu, bục nhảy, các tầng, Bóng Mực, Gió Lạc, Bùa Gió và gió mạnh. [Báo cáo TAP](tests.tap) |
| Cầu tre, Bùa Gió, pause và dash | Đi qua cầu, nhặt bùa, tạm dừng và tiếp tục. So sánh `tick` và `sim_tick` trong các snapshot lúc paused. [JSONL](cau-bridge.jsonl) |
| Headless đầy đủ | Chạy ba Đêm đến bình minh với seed 7 và scenario khởi tạo bất tử để thời lượng đo đủ 18.000, 19.800 và 21.600 tick. Đo với snapshot mỗi 10 tick mặc định. Ba tệp JSONL đính kèm được chạy lại với snapshot mỗi 900 tick và cùng kết quả cuối. [Số đo và cấu hình](headless-metrics.json) · [Đêm 1](full-night-1.jsonl) · [Đêm 2](full-night-2.jsonl) · [Đêm 3](full-night-3.jsonl) |
| Giao diện và luồng ba Đêm | Kiểm tra menu, lời Ông Đăng, cài đặt sau khi tải lại, pause và tiếp tục, dash, HUD, chơi lại Đêm 2 và tổng điểm ở Bình Minh. [Nhật ký trình duyệt](browser.json) · [Menu](menu.jpg) · [Pause](pause.jpg) · [Đảo Cau](night-2.jpg) · [Đảo Chuông](night-3.jpg) · [Bình Minh](dawn.jpg) |
| FPS | Đo dấu thời gian `requestAnimationFrame` thực ở 1280×720, khoảng 5 giây cho mỗi cảnh. [Số đo Chrome và cấu hình](browser.json) |

Kiểm chứng trình duyệt gửi phím và thao tác các nút trên bản web đã build. Lượt kiểm tra luồng dùng trạng thái dựng sẵn trước đèn cuối để kích hoạt thắng qua thao tác nạp thật. Cảnh kiểm tra cầu và bục nhảy bắt đầu gần các cơ chế tương ứng. Các phép đo FPS dùng thời gian thực, còn một số bước kiểm tra chức năng điều khiển đồng hồ khung hình để so sánh trạng thái.
