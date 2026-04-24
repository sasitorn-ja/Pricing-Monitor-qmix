# Pricing Monitor qmix

Dashboard สำหรับวิเคราะห์ว่าโครงการไหนยังขึ้นราคาไม่ถึงเป้า `300 บาท` โดยใช้ `NP_AVG` เป็น `net price`

โปรเจกต์เวอร์ชันนี้ตั้งค่าให้ใช้ `mock data` ภายในทั้งหมดสำหรับ demo และการนำเสนอเท่านั้น
- ไม่มีการเรียก API จริง
- ไม่ต้องใช้ token หรือเชื่อมต่อระบบภายนอก
- ตัวกรอง, กราฟ, และตารางยังทำงานจากข้อมูลจำลองที่สร้างไว้ให้ดูสมจริง

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

ข้อมูลที่แสดงทั้งหมดถูก generate จากไฟล์ mock ภายในโปรเจกต์ที่ [server/data/mockPricingRecords.ts](/Users/sasitorn/Pricing%20Monitor%20qmix/server/data/mockPricingRecords.ts)

ถ้าต้องการเปลี่ยนเนื้อหา demo สามารถปรับได้ที่:
- รายชื่อโครงการ, division, segment, channel
- baseline price, discount, volume
- แนวโน้มการขึ้นราคาหลัง campaign
- โครงการที่มีและไม่มี baseline

## Deploy

รองรับ local และ Vercel ได้โดยไม่ต้องตั้งค่า environment สำหรับ API จริง
- API จะถูกรันผ่าน path `/api/*`
- ระบบจะ cache snapshot ของข้อมูล demo ไว้เพื่อลดเวลาคำนวณ
