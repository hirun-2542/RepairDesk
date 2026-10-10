import {notFound} from "next/navigation";
import {requireUser} from "@/lib/session";
import {prisma} from "@/lib/db";
import {getJobDetail} from "@/server/job-service";
import {canViewJob,canAssign} from "@/domain/permissions";
import {CATEGORY_LABEL,IDENTIFIER_LABEL} from "@/domain/labels";
import {StatusBadge,Stepper,formatDate} from "@/components/job-ui";
import {Assignment} from "@/components/assignment";
export default async function Job({params}:{params:Promise<{id:string}>}) {
 const user=await requireUser(); const {id}=await params; const job=await getJobDetail(id);
 if(!job||!canViewJob(user,job))notFound();
 const technicians=await prisma.user.findMany({where:{role:"TECHNICIAN",active:true},select:{id:true,name:true}});
 return <div className="page">
  <div className="page-head"><div><h1>{job.jobNo}</h1><StatusBadge status={job.status}/><p className="muted">{CATEGORY_LABEL[job.category]} · {job.brand} {job.model} · รับเมื่อ {formatDate(job.createdAt)}</p></div></div>
  <div className="card card-pad"><Stepper status={job.status}/></div>
  <div className="detail" style={{marginTop:20}}>
   <div className="card card-pad"><h2>ลูกค้าและอุปกรณ์</h2><dl className="kv"><dt>ลูกค้า</dt><dd>{job.customer.name}</dd><dt>โทรศัพท์</dt><dd>{job.customer.phone}</dd><dt>ประเภท</dt><dd>{CATEGORY_LABEL[job.category]}</dd><dt>ยี่ห้อ/รุ่น</dt><dd>{job.brand} {job.model}</dd><dt>{IDENTIFIER_LABEL[job.category]}</dt><dd>{job.identifier||"—"}</dd><dt>อาการ</dt><dd>{job.symptom}</dd><dt>อุปกรณ์มาด้วย</dt><dd>{job.accessories||"—"}</dd></dl></div>
   {canAssign(user,job.status)?<Assignment jobId={job.id} technicianId={job.technicianId} revision={job.revision} technicians={technicians}/>:<div className="card card-pad"><h3>ช่างผู้รับผิดชอบ</h3>{job.technician?.name??"ยังไม่มอบหมาย"}</div>}
  </div>
 </div>;
}
