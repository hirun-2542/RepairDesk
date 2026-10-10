"use server";
import {requireUser,toActor} from "@/lib/session";
import type {JobAction} from "@/domain/types";
import {startDiagnosis,startRepair,markReady,requote} from "@/server/workflow-service";
import {submitQuote,decideQuote,type QuoteInput} from "@/server/quote-service";
import {DomainError} from "@/server/errors";
import {revalidatePath} from "next/cache";
export async function jobAction(id:string,action:JobAction,revision:number,payload?:QuoteInput){const user=await requireUser();try{const actor=toActor(user);switch(action){case "START_DIAGNOSIS":await startDiagnosis(actor,id,revision);break;case "START_REPAIR":await startRepair(actor,id,revision);break;case "MARK_READY":await markReady(actor,id,revision);break;case "REQUOTE":await requote(actor,id,revision);break;case "APPROVE_QUOTE":await decideQuote(actor,id,"APPROVE",revision);break;case "REJECT_QUOTE":await decideQuote(actor,id,"REJECT",revision);break;case "SUBMIT_QUOTE":if(!payload)throw new DomainError("กรุณากรอกข้อมูลใบเสนอราคา");await submitQuote(actor,id,payload,revision);break;default:throw new DomainError("ไม่สามารถทำรายการนี้ในสถานะปัจจุบัน");}revalidatePath("/jobs","layout");revalidatePath("/track","layout");return {ok:true as const};}catch(error){if(error instanceof DomainError)return {ok:false as const,error:error.message};throw error;}}
