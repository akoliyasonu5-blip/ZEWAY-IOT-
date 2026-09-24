import net from 'node:net';import http from 'node:http';import dgram from 'node:dgram';import {parse,ack,location,encode} from './jt808.js';import {TripTracker} from './tracker.js';
const tcpPort=Number(process.env.TCP_PORT||7008),httpPort=Number(process.env.PORT||3000),token=process.env.API_TOKEN,allowed=new Set((process.env.TERMINAL_IDS||'').split(',').map(s=>s.trim()).filter(Boolean));if(!token||!allowed.size){console.error('Set API_TOKEN and TERMINAL_IDS before starting');process.exit(1)}
const devices=new Map(),history=new Map(),tripTracker=new TripTracker(),MAX_FRAME=4096;let serial=0;const fence=(process.env.GEOFENCE||'').split(',').map(Number);if(fence.length===3)tripTracker.setGeofence(...fence);
const sbUrl=process.env.SUPABASE_URL?.replace(/\/$/,'');
const sbSecret=process.env.SUPABASE_SECRET_KEY;
async function publishPosition(pos){
 if(!sbUrl||!sbSecret)return;
 try{
  const headers={apikey:sbSecret,Authorization:'Bearer '+sbSecret,'Content-Type':'application/json'};
  const lookup=await fetch(sbUrl+'/rest/v1/zeway_devices?select=id,owner_id&id=eq.'+encodeURIComponent(pos.id),{headers});
  if(!lookup.ok)throw Error('device lookup HTTP '+lookup.status);
  const [device]=await lookup.json();
  if(!device){console.warn('Device not registered in Supabase:',pos.id);return}
  const response=await fetch(sbUrl+'/rest/v1/zeway_positions',{method:'POST',headers,body:JSON.stringify({device_id:device.id,owner_id:device.owner_id,recorded_at:pos.timestamp,lat:pos.lat,lng:pos.lng,speed:pos.speed,voltage:pos.voltage,ignition:pos.ignition})});
  if(!response.ok)throw Error('position write HTTP '+response.status);
 }catch(err){console.warn('Supabase publish:',err.message)}
}
function handleFrame(frame,reply,deny=()=>{}){
 try{
  const m=parse(frame);
  if(!allowed.has(m.terminal)){console.warn('Unregistered terminal:',m.terminal);deny();return}
  if(m.fragmented){console.warn('Fragmented packet ignored:',m.id.toString(16));return}
  if(m.id===0x0200){
   const pos=location(m);
   if(pos.gpsValid&&!(pos.lat===0&&pos.lng===0)){
    devices.set(m.terminal,pos);tripTracker.record(pos);
    const list=history.get(m.terminal)||[];
    list.push(pos);history.set(m.terminal,list.slice(-1000));
    void publishPosition(pos);
   }
   reply(ack(m,0,++serial));
  }else if(m.id===0x0002||m.id===0x0102)reply(ack(m,0,++serial));
  else if(m.id===0x0100){
   const auth=Buffer.from(m.terminal),body=Buffer.alloc(3+auth.length);
   body.writeUInt16BE(m.seq,0);body[2]=0;auth.copy(body,3);
   reply(encode(0x8100,m.terminal,++serial,body,m.versioned));
  }else{reply(ack(m,0,++serial));console.log('Message',m.id.toString(16),'from',m.terminal)}
 }catch(err){console.warn('Invalid JT808 frame:',err.message)}
}
const tcp=net.createServer(socket=>{
 let pending=Buffer.alloc(0);
 socket.setTimeout(180000,()=>socket.destroy());
 socket.on('data',chunk=>{
  pending=Buffer.concat([pending,chunk]);
  if(pending.length>MAX_FRAME*2){socket.destroy();return}
  while(true){
   const start=pending.indexOf(0x7e);
   if(start<0){pending=Buffer.alloc(0);break}
   const end=pending.indexOf(0x7e,start+1);
   if(end<0){pending=pending.subarray(start);break}
   const frame=pending.subarray(start,end+1);
   pending=pending.subarray(end+1);
   handleFrame(frame,response=>socket.write(response),()=>socket.destroy());
   if(socket.destroyed)return;
  }
 });
 socket.on('error',err=>console.warn('TCP client:',err.message))
});
tcp.listen(tcpPort,'0.0.0.0',()=>console.log('JT808 TCP receiver on',tcpPort));
// Set UDP_PORT=7008 to use a free Playit UDP tunnel from an always-on PC.
if(process.env.UDP_PORT){
 const udpPort=Number(process.env.UDP_PORT);
 if(!Number.isInteger(udpPort)||udpPort<1||udpPort>65535)throw Error('Invalid UDP_PORT');
 const udp=dgram.createSocket('udp4');
 udp.on('message',(packet,remote)=>{
  if(packet.length>MAX_FRAME)return;
  let cursor=0;
  while(cursor<packet.length){
   const start=packet.indexOf(0x7e,cursor);if(start<0)break;
   const end=packet.indexOf(0x7e,start+1);if(end<0)break;
   handleFrame(packet.subarray(start,end+1),response=>udp.send(response,remote.port,remote.address));
   cursor=end+1;
  }
 });
 udp.on('error',err=>console.warn('UDP receiver:',err.message));
 udp.bind(udpPort,'0.0.0.0',()=>console.log('JT808 UDP receiver on',udpPort));
}
http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('Access-Control-Allow-Origin',process.env.DASHBOARD_ORIGIN||'https://zeway-iot-fleet-tracking.akoliyasonu5.chatgpt.site');res.setHeader('Access-Control-Allow-Headers','Authorization');if(req.method==='OPTIONS'){res.writeHead(204).end();return}if(req.url==='/health'){res.end(JSON.stringify({ok:true}));return}if(req.headers.authorization!==`Bearer ${token}`){res.writeHead(401).end(JSON.stringify({error:'Unauthorized'}));return}if(req.url==='/api/devices'){res.end(JSON.stringify({devices:[...devices.values()],trips:tripTracker.getTrips(),alerts:tripTracker.getAlerts()}));return}if(req.url?.startsWith('/api/history/')){const id=decodeURIComponent(req.url.slice('/api/history/'.length));if(!allowed.has(id)){res.writeHead(404).end(JSON.stringify({error:'Unknown device'}));return}res.end(JSON.stringify({positions:history.get(id)||[]}));return}res.writeHead(404).end(JSON.stringify({error:'Not found'}))}).listen(httpPort,'0.0.0.0',()=>console.log('HTTP API on',httpPort));
