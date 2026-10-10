import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";
async function main(){if(await prisma.user.count())throw new Error("Seed requires a fresh database; run npm run db:reset");const passwordHash=await bcrypt.hash("demo1234",10);for(const [email,name,role] of [["admin@demo.local","แอดมิน","ADMIN"],["frontdesk@demo.local","สมศรี หน้าร้าน","FRONT_DESK"],["tech1@demo.local","ช่างเอ","TECHNICIAN"],["tech2@demo.local","ช่างบี","TECHNICIAN"]] as const){await prisma.user.create({data:{email,name,role,passwordHash}});}console.log("Seeded 4 demo users");}
main().finally(()=>prisma.$disconnect());
