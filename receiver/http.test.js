import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

test('authorized generic GPS reports appear in the fleet while unknown IDs are rejected',async()=>{
 const port=44000+Math.floor(Math.random()*10000),id='GPS-CUSTOM-123';
 const child=spawn(process.execPath,['server.js'],{cwd:import.meta.dirname,env:{...process.env,API_TOKEN:'test-token',TERMINAL_IDS:id,TCP_PORT:String(port+1),PORT:String(port)},stdio:['ignore','pipe','pipe']});
 try{
  await Promise.race([new Promise((resolve,reject)=>{child.once('error',reject);child.stdout.on('data',b=>{if(b.toString().includes('HTTP API on'))resolve()});child.once('exit',()=>reject(Error('receiver exited')))}),new Promise((_,reject)=>setTimeout(()=>reject(Error('start timeout')),4000))]);
  const send=(device_id,auth='Bearer test-token')=>fetch(`http://127.0.0.1:${port}/api/positions`,{method:'POST',headers:{Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify({device_id,lat:28.58,lng:77.32,speed:21})});
  assert.equal((await send(id,'Bearer wrong')).status,401);
  assert.equal((await send('UNREGISTERED')).status,400);
  assert.equal((await send(id)).status,202);
  const list=await (await fetch(`http://127.0.0.1:${port}/api/devices`,{headers:{Authorization:'Bearer test-token'}})).json();
  assert.equal(list.devices.length,1);
  assert.equal(list.devices[0].id,id);
  assert.equal(list.devices[0].lat,28.58);
 }finally{child.kill()}
});
