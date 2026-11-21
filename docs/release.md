# Quay demo, phát hành và nộp bài

## 1. Chuẩn bị bản cuối

Mở PowerShell ở thư mục repo. Chạy bộ kiểm chứng và đóng gói.

```powershell
npm.cmd run verify
npm.cmd run package
```

Gói phát hành được tạo tại `dist/dao-den-long-v1.0.0.tar.gz`. Hai tệp `bench.json` và `soak.json` ở gốc là bằng chứng từ lần đo thật. Nếu bạn đo lại để lấy kết quả trên máy của mình, đóng các chương trình nặng rồi chạy hai lệnh trong README. Ghi đúng GPU, hệ điều hành và số đo thu được.

## 2. Quay video dưới 5 phút

1. Nếu phiên chơi phase trước còn mở, dừng máy chủ cũ bằng **Ctrl+C** trong terminal đã khởi chạy. Chạy `npm.cmd start` và mở `http://127.0.0.1:4173/`. Mở thêm một terminal để quay bước kiểm chứng.
2. Trong OBS, thêm **Display Capture** để có thể chuyển qua lại giữa trình duyệt và PowerShell. Kiểm tra âm thanh game và micro nếu cần. Bấm **Start Recording**. [Hướng dẫn OBS](https://obsproject.com/kb/quick-start-guide)
3. Quay khoảng **1–2 phút** chơi trực tiếp. Di chuyển, nhặt đom đóm, thắp một đèn và cho thấy thanh dầu. Nếu tiện, mở Cài đặt để minh họa đổi phím, chữ lớn, hoặc mở Bảng xếp hạng. Giữ lại cảnh bạn đã thực sự chơi.
4. Chuyển sang terminal. Chạy lại bộ test và một replay headless. Chờ kết quả rồi hiện dòng kết thúc.

   ```powershell
   npm.cmd run verify
   node src/headless.mjs --seed 42 --night 1 --ticks 240 --out dist/fuel-demo.jsonl --scenario tests/fixtures/fuel-drain.scenario.json --inputs tests/fixtures/fuel-drain.inputs.json
   Get-Content dist/fuel-demo.jsonl -Tail 1
   ```

5. Quay benchmark mở cửa sổ và ghi kết quả. Ghi file riêng trong `dist/` để việc ghi màn hình không ghi đè phép đo nộp bài.

   ```powershell
   node scripts/bench.mjs --seed 42 --duration 30 --out dist/bench-demo.json
   Get-Content bench.json
   Get-Content soak.json
   ```

   Khi trình bày, phân biệt kết quả thật trong video với kết quả đã lưu để nộp. Tải thêm OBS có thể làm thay đổi FPS.
6. Dừng quay. Nếu OBS xuất MKV, vào **File → Remux Recordings** để xuất MP4. Đặt tên `demo.mp4`, mở xem lại và kiểm tra thời lượng dưới 5 phút. [Hướng dẫn định dạng OBS](https://obsproject.com/kb/standard-recording-output-guide)

## 3. Commit và gắn tag

```powershell
git add -- .github/skills/verify-phase/SKILL.md .gitignore AGENTS.md CHANGELOG.md CREDITS.md LICENSE README.md game.contract.json package.json bench.json soak.json scripts src tests web docs/play-release.md docs/release.md docs/retro.md docs/proof/phase-4
git diff --cached --name-only
git commit -m "Implement Phase 4: Binh minh v1.0.0"
git tag phase-4
git tag v1.0.0
git push --atomic origin main phase-4 v1.0.0
```

Kiểm tra hai tag trỏ cùng commit. Tệp đề bài `phase_*.txt`, thư mục `dist/` và dữ liệu bảng điểm cục bộ `.data/` để ở máy bạn.

## 4. Phát hành trên GitHub và nộp link

1. Mở repo công khai, vào **Releases → Draft a new release** và chọn tag đã push **v1.0.0**. Đặt tiêu đề `Đảo Đèn Lồng v1.0.0`.
2. Đính kèm cả `dist/dao-den-long-v1.0.0.tar.gz` và `demo.mp4`. Trong mô tả release, ghi cách giải nén, chạy `node scripts/serve.mjs` và mở `http://127.0.0.1:4173/`.
3. Bấm **Publish release**. Link ở đầu README đã trỏ đến trang này. [Hướng dẫn GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
4. Mở cửa sổ ẩn danh để xác nhận tải được game và video. Nộp link repo theo hướng dẫn của Coach.
