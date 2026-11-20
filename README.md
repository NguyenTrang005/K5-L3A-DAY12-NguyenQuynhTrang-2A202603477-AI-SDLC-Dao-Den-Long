# Đảo Đèn Lồng

Theo chân Mây qua **Đảo Bến, Đảo Cau và Đảo Chuông**. Gom đom đóm và thắp lại các Đèn Lồng Lớn trước bình minh. Bản này triển khai **Phase 2** và Test Contract **v1.1**.

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
| E | Nạp đom đóm vào đèn chưa sáng gần nhất. |
| F | Tỏa Sáng với 3 đom đóm. Có thể lấy lại đồ từ Gió Lạc đang mang đom đóm đã cướp. |
| ← → hoặc kéo chuột trên cảnh | Xoay camera. |
| Esc hoặc P | Tạm dừng hoặc tiếp tục. Có thể chơi lại Đêm, chỉnh cài đặt hoặc về menu. |

Mỗi đèn cần **10 đom đóm**. Mây mang tối đa 10, bắt đầu mỗi Đêm với 3 Ngọn Lửa. Đảo Bến có 5 đèn và 5 phút, Đảo Cau có 6 đèn và 5 phút 30 giây, Đảo Chuông có 7 đèn và 6 phút.

Mỗi đom đóm **nạp** được 10 điểm, mỗi đèn thắp được 100 và mỗi Bóng Mực trúng Tỏa Sáng được 5. Khi thắng, cộng 2 điểm cho mỗi giây nguyên còn lại và 50 điểm cho mỗi Ngọn Lửa còn lại. Bình Minh hiển thị tổng điểm của ba Đêm đã thắng.

## Chạy kiểm chứng và headless

```sh
npm run verify
```

Lệnh build, chạy test và lưu TAP, replay và số đo vào `dist/proof/phase-2/`. Để chạy riêng headless, chọn `--night 1`, `2` hoặc `3`. Ví dụ dưới đây chạy Đảo Cau với cầu tre, Bùa Gió, pause và lướt.

```sh
node src/headless.mjs --seed 42 --night 2 --ticks 225 --out cau-bridge.jsonl --scenario tests/fixtures/cau-bridge.scenario.json --inputs tests/fixtures/cau-bridge.inputs.json
```

Xem [Test Contract](game.contract.json), [tiêu chí nghiệm thu Phase 2](docs/notes/phase-2.md) và [bằng chứng Phase 2](docs/proof/phase-2/README.md). Có thể dùng tag `phase-1` để tái lập các số và kết quả cũ của v1.0.

## Sáng tạo của tôi

Biển mây dưới mép đảo và những hạt sáng nhỏ quanh đom đóm vẫn xuất hiện trong bản 3D. Nhạc và hiệu ứng được tổng hợp bằng Web Audio. Các hiệu ứng này thuộc phần trình bày của game.

Tài liệu lab gồm [hướng dẫn](GUIDE.md), [checkpoints](CHECKPOINTS.md), [cách nộp](SUBMISSION.md), [quy định](RULES.md) và [thang điểm](RUBRIC.md). Yêu cầu từng phase được phát hành trên [lab board](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW).
