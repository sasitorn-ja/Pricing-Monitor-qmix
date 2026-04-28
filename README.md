# Pricing Monitor qmix

Dashboard สำหรับติดตามการขึ้นราคา `QMIX` โดยใช้ `NP_AVG` เป็น `net price` และดึงข้อมูลสดจาก DataOcean API แบบเดียวกับโปรเจค `Pricing Monitor`

## Logic ที่ใช้

- Baseline: ใช้ข้อมูลวันที่ `2026-03-01` ถึง `2026-03-24`
- Campaign tracking: ใช้ข้อมูลตั้งแต่ `2026-03-25` เป็นต้นไป
- Metric หลัก: `increaseAmount = max(current net price - baseline net price, 0)`
- เปอร์เซ็นต์ความสำเร็จ: `(increaseAmount / 300) * 100`
- การ์ด `Total increase`: ค่าเพิ่มราคาแบบ weighted B/Q โดยใช้ `SUMQ` เป็นน้ำหนัก
- การ์ด `Average to target`: สัดส่วนโครงการที่อยู่ใน ladder `300-399`, `400-499`, หรือ `500+`
- Step ladder:
  - `500+`
  - `400-499`
  - `300-399`
  - `200-299`
  - `100-199`
  - `0-99` รวมทั้งกรณีที่ยังต่ำกว่า baseline

ค่า baseline และ post-campaign net price ถูกคำนวณแบบ weighted average โดยใช้ `SUMQ` เป็นน้ำหนัก

## Run

1. ติดตั้งแพ็กเกจ
   `npm install`
2. รัน dashboard
   `npm run dev`

Frontend จะอยู่ที่ `http://localhost:5183`
Backend API จะอยู่ที่ `http://localhost:8788`

## Data Source

ตั้งค่า DataOcean API ใน `.env`

```bash
DATAOCEAN_API_URL=...
DATAOCEAN_API_TOKEN=...
```

ตัว dashboard จะเปิดมาใน scope ของ `QMIX` โดยอัตโนมัติ และยังสามารถใช้ filter ภายใน dashboard เพื่อลงลึกตาม division, FC, segment, channel และ discount type ได้

## Deploy

รองรับ local และ Vercel โดยใช้ environment เดียวกับโปรเจค `Pricing Monitor`
- API จะถูกรันผ่าน path `/api/*`
- ระบบจะ cache snapshot ของข้อมูลจาก DataOcean ไว้เพื่อลดเวลาคำนวณ
- รองรับ cache refresh ผ่าน `/api/cache/refresh`
