import jwt from 'jsonwebtoken';
import { config } from '../config.js';
export function signJwt(payload:object,expiresIn='7d'){return jwt.sign(payload,config.jwtSecret,{expiresIn});}
export function verifyJwt<T=any>(token:string):T|null{try{return jwt.verify(token,config.jwtSecret) as T;}catch{return null;}}
