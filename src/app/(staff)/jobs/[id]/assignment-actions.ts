"use server";
import {requireUser,toActor} from "@/lib/session";
import {assignTechnician} from "@/server/assignment-service";
import {DomainError} from "@/server/errors";
import {revalidatePath} from "next/cache";
export async function assignAction(jobId:string,technicianId:string,revision:number){const user=await requireUser(["ADMIN","FRONT_DESK"]);try{await assignTechnician(toActor(user),jobId,technicianId,revision);revalidatePath("/jobs","layout");return {ok:true as const};}catch(error){if(error instanceof DomainError)return {ok:false as const,error:error.message};throw error;}}
