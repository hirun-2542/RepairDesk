import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/server/audit";
export const {handlers,auth,signIn,signOut}=NextAuth({trustHost:true,session:{strategy:"jwt"},pages:{signIn:"/login"},providers:[Credentials({credentials:{email:{},password:{}},async authorize(input){
 const email=typeof input.email==="string"?input.email.trim().toLowerCase():"";
 const password=typeof input.password==="string"?input.password:"";
 const user=email?await prisma.user.findUnique({where:{email}}):null;
 const valid=!!user?.active && await bcrypt.compare(password,user.passwordHash);
 await prisma.$transaction(tx=>writeAudit(tx,{actor:valid?{kind:"USER",id:user!.id,name:user!.name,role:user!.role}:{kind:"ANONYMOUS",label:email.slice(0,254)},action:valid?"auth.login":"auth.login_failed",entityType:"User",entityId:user?.id??"unknown"}));
 if(!valid) return null;
 return {id:user!.id,name:user!.name,email:user!.email,role:user!.role};
}})],callbacks:{jwt({token,user}){if(user)token.id=user.id;return token;},session({session,token}){session.user.id=String(token.id);return session;}}});
