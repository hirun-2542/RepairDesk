import Link from "next/link";
import {notFound} from "next/navigation";
import {requireUser,toActor} from "@/lib/session";
import {prisma} from "@/lib/db";
import {getJobDetail} from "@/server/job-service";
import {buildWorkflowContext} from "@/server/workflow-service";
import {canViewJob,canAssign,uploadableStages} from "@/domain/permissions";
import {CATEGORY_LABEL,IDENTIFIER_LABEL} from "@/domain/labels";
import {StatusBadge,Stepper,formatDate} from "@/components/job-ui";
import {Assignment} from "@/components/assignment";
import {JobActions} from "@/components/job-actions";
import {QuoteView} from "@/components/quote-view";
import {AuditTimeline} from "@/components/audit-timeline";
import {Attachments} from "@/components/attachments";
import {TrackingLink} from "@/components/tracking-link";
export default async function Job({params}:{params:Promise<{id:string}>}) {
 const user=await requireUser(); const {id}=await params; const job=await getJobDetail(id);
 if(!job||!canViewJob(user,job))notFound();
 const technicians=await prisma.user.findMany({where:{role:"TECHNICIAN",active:true},select:{id:true,name:true}});
 const entries=await prisma.auditLog.findMany({where:{jobId:id},orderBy:{at:"desc"}});
 return <div className="page">
  <div className="page-head"><div><p className="crumbs"><Link href="/jobs">กระดานงาน</Link> / {job.jobNo}</p><h1>{job.jobNo}</h1><StatusBadge status={job.status}/><p className="muted">{CATEGORY_LABEL[job.category]} · {job.brand} {job.model} · รับเมื่อ {formatDate(job.createdAt)}</p></div><div className="stack-sm"><TrackingLink token={job.trackingToken}/><Link className="btn btn-secondary" href={"/jobs/"+id+"/receipt"}>พิมพ์ใบรับงาน/ใบเสร็จ</Link></div></div>
  {job.status==="CANCELLED"?<p className="banner banner-error">งานนี้ถูกยกเลิก — {job.cancelReason}</p>:<div className="card card-pad"><Stepper status={job.status}/></div>}
  <div className="detail" style={{marginTop:20}}>
   <div className="stack">
    <JobActions id={id} revision={job.revision} actor={toActor(user)} ctx={buildWorkflowContext(job)} diagnosis={job.diagnosis} total={job.quotes.find(q=>q.status==="APPROVED")?.total??0} hasSlip={job.attachments.some(file=>file.stage==="PAYMENT_SLIP")}/>
    <section className="card card-pad stack"><h2>ใบเสนอราคา</h2>{job.diagnosis&&<p>ผลการตรวจสอบ: {job.diagnosis}</p>}{job.quotes.length?job.quotes.map(quote=><QuoteView key={quote.id} quote={quote}/>):<p className="muted">ยังไม่มีใบเสนอราคา — ช่างที่รับผิดชอบจะสร้างหลังตรวจสอบเสร็จ</p>}</section>
    <Attachments jobId={id} attachments={job.attachments} stages={uploadableStages(user,job)}/>
   </div>
   <aside className="stack">
    <div className="card card-pad"><h2>ลูกค้าและอุปกรณ์</h2><dl className="kv"><dt>ลูกค้า</dt><dd>{job.customer.name}</dd><dt>โทรศัพท์</dt><dd>{job.customer.phone}</dd><dt>ประเภท</dt><dd>{CATEGORY_LABEL[job.category]}</dd><dt>ยี่ห้อ/รุ่น</dt><dd>{job.brand} {job.model}</dd><dt>{IDENTIFIER_LABEL[job.category]}</dt><dd>{job.identifier||"—"}</dd><dt>อาการ</dt><dd>{job.symptom}</dd><dt>อุปกรณ์มาด้วย</dt><dd>{job.accessories||"—"}</dd></dl></div>
    {job.payment&&<div className="card card-pad"><h3>การชำระเงิน</h3><p>{job.payment.kind==="REPAIR"?"ค่าซ่อม":"ค่าตรวจเช็ค"} — {(job.payment.amount/100).toLocaleString("th-TH",{style:"currency",currency:"THB"})}</p><p>ผู้รับเงิน {job.payment.receivedBy.name} · {formatDate(job.payment.paidAt)}</p></div>}
    {canAssign(user,job.status)?<Assignment jobId={job.id} technicianId={job.technicianId} revision={job.revision} technicians={technicians}/>:<div className="card card-pad"><h3>ช่างผู้รับผิดชอบ</h3>{job.technician?.name??"ยังไม่มอบหมาย"}</div>}
    <AuditTimeline entries={entries}/>
   </aside>
  </div>
 </div>;
}
