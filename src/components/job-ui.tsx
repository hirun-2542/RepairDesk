import { Inbox,ScanSearch,FileClock,BadgeCheck,Wrench,PackageCheck,CircleCheck,CircleX } from "lucide-react";
import {STATUS_LABEL,STATUS_ORDER} from "@/domain/labels";
import type {JobStatus} from "@/domain/types";
export const STATUS_ICON={RECEIVED:Inbox,DIAGNOSING:ScanSearch,QUOTED:FileClock,APPROVED:BadgeCheck,REPAIRING:Wrench,READY_FOR_PICKUP:PackageCheck,COMPLETED:CircleCheck,CANCELLED:CircleX};
export function StatusBadge({status}:{status:JobStatus}){const Icon=STATUS_ICON[status];return <span className={"badge badge-lg st-"+status}><Icon size={16}/>{STATUS_LABEL[status]}</span>;}
export function Stepper({status}:{status:JobStatus}){const steps=STATUS_ORDER.filter(s=>s!=="CANCELLED");const current=steps.findIndex(s=>s===status);return <ol className="stepper" aria-label="ความคืบหน้างาน">{steps.map((step,index)=>{const Icon=STATUS_ICON[step];return <li key={step} className={"step "+(index<current?"done":index===current?"cur":"")} aria-current={index===current?"step":undefined}><span className="node"><Icon size={16}/></span><span>{STATUS_LABEL[step]}</span></li>;})}</ol>;}
export function formatDate(date:Date|string){return new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",day:"numeric",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(date));}
