"use server";
import {requireUser,toActor} from "@/lib/session";
import {createJob,intakeSchema} from "@/server/job-service";
import {DomainError} from "@/server/errors";
import {redirect} from "next/navigation";
export async function intakeAction(_: {error?:string;errors?:Record<string,string>}|null,form:FormData){const user=await requireUser(["ADMIN","FRONT_DESK"]);const input=Object.fromEntries(form) as unknown as Parameters<typeof createJob>[1];const parsed=intakeSchema.safeParse(input);if(!parsed.success){const errors:Record<string,string>={};for(const issue of parsed.error.issues)errors[String(issue.path[0])]=issue.message;return {errors};}let id:string;try{const job=await createJob(toActor(user),parsed.data);id=job.id;}catch(error){if(error instanceof DomainError)return {error:error.message};throw error;}redirect("/jobs/"+id);}
