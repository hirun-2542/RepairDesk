# RepairDesk — Service / Repair Management

เว็บแอปรับงานซ่อมมือถือ คอมพิวเตอร์ รถยนต์ และเครื่องปรับอากาศสำหรับ portfolio demo ภาษาไทย ใช้ข้อมูลจริงใน SQLite และเก็บไฟล์แนบบนดิสก์ ไม่ใช้ mock backend

**Flow:** รับงาน → ตรวจสอบ → เสนอราคา → อนุมัติ → ซ่อม → ชำระเงิน พร้อมเส้นทางปฏิเสธราคา → เสนอราคาใหม่ หรือยกเลิกพร้อมค่าตรวจเช็ค

## เริ่มใช้งานในเครื่อง

ต้องใช้ Node.js 24 และ npm; SQLite ไม่ต้องมี database server

```bash
npm install
cp -n .env.example .env
# หากยังไม่มี secret ให้รัน openssl rand -base64 32 แล้วใส่ผลใน AUTH_SECRET ของ .env
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```

เปิด `http://localhost:3000` บัญชี Demo ใช้รหัสผ่าน `demo1234` ทุกบัญชี หรือกดปุ่ม Demo login ที่หน้าเข้าสู่ระบบ

| บัญชี                  | บทบาท       |
| ---------------------- | ----------- |
| `admin@demo.local`     | ผู้ดูแลระบบ |
| `frontdesk@demo.local` | หน้าร้าน    |
| `tech1@demo.local`     | ช่างเอ      |
| `tech2@demo.local`     | ช่างบี      |

`.env` ของเครื่องนี้มี secret ที่สุ่มไว้แล้ว ไม่ต้องสร้างซ้ำ; `.env.example` มีค่าแทนที่ซึ่ง **ไม่ควรใช้เป็น secret จริง** `DATABASE_URL="file:./dev.db"` และ `UPLOAD_DIR="./uploads"` อ้างอิงจากรากโปรเจกต์

### เริ่มข้อมูล demo ใหม่

```bash
npm run db:reset
```

**คำสั่งนี้ลบข้อมูลในฐานข้อมูลที่ตั้งไว้ใน DATABASE_URL แล้วสร้าง demo ใหม่** อย่าใช้กับข้อมูลลูกค้าจริง ใน Prisma 7 การ reset ไม่รัน seed อัตโนมัติ (auto-seed ถูกถอดออกแล้ว) คำสั่งนี้จึงรัน `prisma migrate reset --force` แล้วต่อด้วย `npm run db:seed` โดยคำสั่ง seed กำหนดไว้ที่ `migrations.seed` ใน `prisma.config.ts` และ seed จะปฏิเสธถ้าฐานข้อมูลไม่ว่าง

> Prisma บล็อกการ reset ที่ทำลายข้อมูลเมื่อรันโดย AI agent เว้นแต่ผู้ใช้ยินยอมชัดเจน (ตัวแปร `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` = ข้อความยินยอมของผู้ใช้) การรีเซ็ตต้องมีคนกดยืนยันเอง

**ทางเลือกที่ไม่ทำลายข้อมูลเดิม** (แนะนำเมื่อยังอยากเก็บ `dev.db` และไฟล์อัปโหลดเดิมไว้): ชี้ `DATABASE_URL` ไปไฟล์ฐานข้อมูลใหม่ แล้ว migrate + seed ไฟล์ใหม่นั้น

```bash
DATABASE_URL="file:./demo-fresh.db" npx prisma migrate deploy
DATABASE_URL="file:./demo-fresh.db" npm run db:seed
```

Seed ปฏิเสธฐานข้อมูลที่ไม่ว่าง เพื่อไม่เขียนทับข้อมูลโดยไม่ตั้งใจ เมื่อ seed ทำงาน จะล้างเฉพาะไฟล์ชื่อ UUID ที่แอปสร้างใน upload directory; ไม่ลบไฟล์ที่ชื่ออื่น

ข้อมูลทันทีหลัง seed ที่ตรวจจากฐานข้อมูล: ผู้ใช้ 4 คน, ลูกค้า 8 คน, ใบงาน 12 ใบ, Audit Entry 86 รายการ (การใช้งาน/login หลังจากนั้นเพิ่มรายการ audit)

| สถานะ             | จำนวนงาน |
| ----------------- | -------: |
| รับงาน            |        2 |
| ตรวจสอบ           |        1 |
| รออนุมัติราคา     |        2 |
| อนุมัติแล้ว       |        1 |
| กำลังซ่อม         |        2 |
| รอชำระ/รับเครื่อง |        1 |
| เสร็จสิ้น         |        2 |
| ยกเลิก            |        1 |

มีใบงานที่ลูกค้าปฏิเสธ v1 แล้วเสนอ v2, งานชำระเงินสด, งานโอนพร้อมสลิป และงานยกเลิกที่เก็บค่าตรวจเช็ค 300 บาท ไฟล์ตัวอย่างเป็น PNG จริงขนาดเล็กสำหรับทดสอบไฟล์แนบ ไม่ใช่ภาพลูกค้าจริง

## ทัวร์ฟีเจอร์

- **Workflow / Status:** หน้าร้านรับงานและมอบหมายช่าง, ช่างเริ่มตรวจและส่งใบเสนอราคา, ลูกค้าอนุมัติผ่านลิงก์ส่วนตัว, ช่างซ่อมและแนบรูปหลังซ่อม, หน้าร้านรับชำระและพิมพ์ใบเสร็จ กระดาน Kanban อ่านอย่างเดียวและตารางค้นหา/กรองแสดงทุกสถานะรวมงานปิด
- **Role:** Admin เห็นทุกงานและจัดการพนักงาน/ประวัติ; หน้าร้านรับงาน มอบหมาย ติดต่อเรื่องราคา รับเงิน; ช่างเห็นเฉพาะงานที่ได้รับมอบหมาย ทุกคำขอตรวจบทบาทจากฐานข้อมูลใหม่ ทำให้เปลี่ยน role หรือปิดใช้งานมีผลทันที เมนูซ้ายปรับตาม role และขนาดหน้าจอ
- **Quote:** ค่าแรง/อะไหล่ จำนวน ราคาต่อหน่วย, VAT 7%, ทุกเวอร์ชันอยู่ในประวัติ เงินเก็บเป็นสตางค์เต็มจำนวน หน้าร้านตัดสินใจแทนลูกค้าได้โดยมีป้าย “แทนลูกค้า”
- **File Upload:** JPG, PNG, WEBP หรือ PDF ไม่เกิน 10 MB ตรวจ MIME และลายเซ็นไฟล์, จำกัด Stage ตาม role, งานปิดแนบเพิ่มไม่ได้ ไฟล์ไม่ได้อยู่ใน public directory ดาวน์โหลดผ่านเส้นทางที่ตรวจสิทธิ์
- **Audit Log:** ทุก mutation มีผู้ทำ เวลา และค่าก่อน/หลัง; มี timeline ในใบงานและหน้าของ Admin ที่กรองได้ ฐานข้อมูลปฏิเสธ UPDATE/DELETE บน Audit Log ไม่บันทึกรหัสผ่านหรือ hash
- **Customer:** ไม่ต้องมีบัญชี ลิงก์ส่วนตัวเป็น bearer credential ผู้ถือสามารถดูงานและตัดสินใจราคาได้ ต้องส่งเฉพาะให้เจ้าของงาน หน้าลูกค้าไม่เห็นชื่อพนักงาน, Audit ภายใน หรือสลิปโอน และ token ไม่สามารถเปิดไฟล์สลิปผ่าน URL ตรง
- **Payment / Print:** เงินสด โอน หรือบัตร เต็มยอดใบเสนอราคาที่อนุมัติ; โอนต้องมีสลิป; ยกเลิกมีเหตุผลและค่าตรวจเช็คได้ มีใบรับงานและใบเสร็จ HTML สำหรับ browser print

## ตรวจสอบ

```bash
npm test          # Vitest: workflow, permissions, money
npm run e2e       # Playwright: workflow ผ่าน UI จริงบนฐานข้อมูล/ไฟล์แยกจาก dev
npm run build     # สร้าง Prisma client, type-check และ production build
npm start         # รัน production build หลัง build สำเร็จ
```

การทดสอบ e2e ต้องมี Chromium ของ Playwright (`npx playwright install chromium` หากเครื่องยังไม่มี) ไม่ใช้ `dev.db` หรือ upload directory ของ demo สำหรับ reset fixtures งานที่ต้องมีรูป AFTER จะมีปุ่ม disabled พร้อมเหตุผลจนแนบรูปแล้ว และปุ่มการชำระแบบโอนถูกปิดหากยังไม่มีสลิป

## เอกสารและขอบเขต

- `GLOSSARY.md` — คำศัพท์โดเมน
- `docs/adr/0001-customer-access-via-tracking-link.md` — เหตุผลที่ลูกค้าไม่ใช้บัญชี
- `design/README.md` — User Flow, Sitemap, Wireframe, Design System และภาพ prototype; โค้ด prototype แยกจากแอปจริง
- `.scratch/repair-management/` — spec, execution plan และ local ticket tracker; ticket ที่อนุมัติแก้ข้อขัดแย้งใน plan (เมนูซ้าย, guard disabled + เหตุผล, ซ่อนสลิปจากลูกค้า)

ระบบนี้สำหรับ demo ในเครื่องร้านเดียว ไม่ใช่ production deployment: ไม่มี payment gateway, notifications, multi-tenant, สต็อกอะไหล่, นัดหมายซ่อมนอกสถานที่, การชำระบางส่วน หรือ customer accounts
