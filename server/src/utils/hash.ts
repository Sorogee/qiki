import argon2 from 'argon2';
export async function hashPassword(p:string){return argon2.hash(p,{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1});}
export async function verifyPassword(h:string,p:string){return argon2.verify(h,p);}
