import {test} from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import {spawn} from 'node:child_process';
import {encode,parse} from './jt808.js';

test('UDP registration and heartbeat receive JT808 replies',async()=>{
 const port=43000+Math.floor(Math.random()*12000),terminal='123456789012';
 const child=spawn(process.execPath,['server.js'],{
  cwd:import.meta.dirname,
  env:{...process.env,API_TOKEN:'test-token',TERMINAL_IDS:terminal,
   TCP_PORT:String(port+1),UDP_PORT:String(port),PORT:String(port+2)},
  stdio:['ignore','pipe','pipe']
 });
 const udp=dgram.createSocket('udp4');
 try{
  await Promise.race([new Promise((resolve,reject)=>{
   child.once('error',reject);
   child.stdout.on('data',chunk=>{if(chunk.toString().includes('JT808 UDP receiver'))resolve()});
   child.once('exit',()=>reject(Error('receiver exited')));
  }),new Promise((_,reject)=>setTimeout(()=>reject(Error('receiver start timeout')),4000))]);
  for(const [requestId,responseId] of [[0x0100,0x8100],[0x0002,0x8001]]){
   const response=await Promise.race([
    new Promise((resolve,reject)=>{
     udp.once('message',buf=>resolve(parse(buf)));
     udp.send(encode(requestId,terminal,1),port,'127.0.0.1',err=>{if(err)reject(err)});
    }),
    new Promise((_,reject)=>setTimeout(()=>reject(Error('no UDP response')),3000))
   ]);
   assert.equal(response.id,responseId);
   assert.equal(response.terminal,terminal);
  }
 }finally{udp.close();child.kill()}
});
