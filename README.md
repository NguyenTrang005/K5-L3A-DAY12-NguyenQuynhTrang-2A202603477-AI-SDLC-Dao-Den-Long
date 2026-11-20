# Đảo Đèn Lồng

Theo chân Mây qua **Đảo Bến, Đảo Cau và Đảo Chuông**. Gom đom đóm, châm dầu và giữ đủ đèn sáng đến bình minh. Bản này triển khai **Phase 3** và Test Contract **v1.2**.

## Chạy game

Cần Node.js 20 trở lên và trình duyệt có WebGL. Chạy hai lệnh tại gốc repo. Trên Windows, dùng `npm.cmd` nếu PowerShell chặn `npm.ps1`.

```sh
npm run build
npm start
```

Mở **http://127.0.0.1:4173/**. Nếu cổng đã được dùng, đặt `PORT` trước khi chạy lệnh thứ hai. Ví dụ trên PowerShell dùng `$env:PORT='4174'; npm.cmd start` rồi mở cổng 4174.

| Phím | Hành động |
|---|---|
| W A S D | Di chuyển theo camera. Đến đủ gần để tự nhặt đom đóm hoặc Bùa Gió. |
| Space | Nhảy. Chạm bục nhảy trên mặt đất để được phóng. |
| Shift | Lướt. Đang có Bùa Gió thì có thể lướt lại sau khi hết lượt lướt hiện tại. |
| E | Nạp đom đóm vào đèn gần nhất còn nhận được. Đèn đang sáng nhận thêm dầu. |
| F | Tỏa Sáng với 3 đom đóm. Có thể lấy lại đồ từ Gió Lạc đang mang đom đóm đã cướp. |
| ← → hoặc kéo chuột trên cảnh | Xoay camera. |
| Esc hoặc P | Tạm dừng hoặc tiếp tục. Có thể chơi lại Đêm, chỉnh cài đặt hoặc về menu. |

Đèn cần **10 đom đóm** để thắp lần đầu, **5** để thắp lại. Đèn sáng mất 1 dầu mỗi giây. Mỗi đom đóm châm thêm tối đa 10 dầu. Khi dầu dưới 30, đèn nhấp nháy, mất vùng an toàn và có thể bị Bóng Mực hút dầu. Mây có 3 Ngọn Lửa mỗi Đêm. Sức chứa bắt đầu ở 10 và tăng thêm 2 mỗi lần thắp, tối đa 20.

| Đêm | Thời gian | Đèn cần giữ sáng lúc bình minh |
|---|---:|---:|
| Đảo Bến | 4 phút | 3/5 |
| Đảo Cau | 4 phút 30 giây | 4/6 |
| Đảo Chuông | 5 phút | 5/7 |

Mỗi đom đóm nạp được 5 điểm. Thắp lần đầu được 100, thắp lại được 40. Tỏa Sáng được 5 điểm mỗi Bóng Mực trúng, hoặc 15 nếu con đó đang hút dầu. Khi thắng, mỗi đèn còn sáng được 50 điểm cộng phần dầu nguyên, và mỗi Ngọn Lửa còn lại được 50. Màn Bình Minh hiển thị tổng điểm của ba Đêm đã thắng.

Bật **Bảng màu dễ phân biệt** trong Cài đặt để đổi mắt và viền Bóng Mực sang xanh lam, và hiển thị cảnh báo bằng chữ trắng kèm ⚠. Đèn tắt có thân giấy xẹp và rách.

## Chạy kiểm chứng và headless

```sh
npm run verify
```

Lệnh build, chạy test và lưu TAP, replay và số đo vào `dist/proof/phase-3/`. Để chạy riêng headless, chọn `--night 1`, `2` hoặc `3`. Ví dụ dưới đây ghi cảnh Bóng Mực hút dầu, châm dầu và thắng lúc bình minh.

```sh
node src/headless.mjs --seed 42 --night 1 --ticks 240 --out fuel-drain.jsonl --scenario tests/fixtures/fuel-drain.scenario.json --inputs tests/fixtures/fuel-drain.inputs.json
```

Xem [Test Contract](game.contract.json), [quyết định thiết kế Phase 3](docs/notes/phase-3.md), [changelog](CHANGELOG.md) và [bằng chứng Phase 3](docs/proof/phase-3/README.md). Dùng tag `phase-1` hoặc `phase-2` để tái lập kết quả của v1.0 hoặc v1.1.

## Sáng tạo của tôi

Biển mây dưới mép đảo và những hạt sáng nhỏ quanh đom đóm vẫn xuất hiện trong bản 3D. Nhạc và hiệu ứng được tổng hợp bằng Web Audio. Các hiệu ứng này thuộc phần trình bày của game.

Tài liệu lab gồm [hướng dẫn](GUIDE.md), [checkpoints](CHECKPOINTS.md), [cách nộp](SUBMISSION.md), [quy định](RULES.md) và [thang điểm](RUBRIC.md). Yêu cầu từng phase được phát hành trên [lab board](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW).
