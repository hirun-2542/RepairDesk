import {requireUser} from "@/lib/session";
import {prisma} from "@/lib/db";
import {IntakeForm} from "./intake-form";
export default async function NewJob(){await requireUser(["ADMIN","FRONT_DESK"]);const customers=await prisma.customer.findMany({select:{name:true,phone:true}});const technicians=await prisma.user.findMany({where:{role:"TECHNICIAN",active:true},select:{id:true,name:true}});return <div className="page"><h1>รับงานใหม่</h1><IntakeForm customers={customers} technicians={technicians}/></div>;}
