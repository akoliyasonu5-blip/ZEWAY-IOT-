import net from 'node:net';import http from 'node:http';import dgram from 'node:dgram';import {parse,ack,location,encode} from './jt808.js';import {TripTracker} from './tracker.js';
const tcpPort=Number(process.env.TCP_PORT||7008),httpPort=Number(process.env.PORT||3000),token=process.env.API_TOKEN,allowed=new Set((process.env.TERMINAL_IDS||'').split(',').map(s=>s.trim()).filter(Boolean)),autoRegister=String(process.env.AUTO_REGISTER||'false').toLowerCase()==='true';if(!token){console.error('Set API_TOKEN before starting');process.exit(1)}if(!allowed.size&&!autoRegister)console.warn('No TERMINAL_IDS configured; set AUTO_REGISTER=true to accept new device IDs automatically')
const devices=new Map(),history=new Map(),tripTracker=new TripTracker(),MAX_FRAME=4096;const sseClients=new Set(),connections=new Map();let serial=0;const fence=(process.env.GEOFENCE||'').split(',').map(Number);if(fence.length===3)tripTracker.setGeofence(...fence);
const sbUrl=process.env.SUPABASE_URL?.replace(/\/$/,'');
const sbSecret=process.env.SUPABASE_SECRET_KEY;
function deviceAllowed(id){return allowed.has(String(id))||autoRegister}
function noteConnection(id,protocol,transport,remote=''){connections.set(String(id),{deviceId:String(id),protocol,transport,remote,lastSeen:new Date().toISOString()});if(autoRegister)allowed.add(String(id))}
function validPosition(body){
 const id=String(body.device_id??body.id??'');
 const lat=Number(body.lat),lng=Number(body.lng),speed=body.speed==null?0:Number(body.speed);
 const timestamp=body.recorded_at??body.timestamp??new Date().toISOString();
 if(!deviceAllowed(id)||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||(lat===0&&lng===0)||!Number.isFinite(speed)||speed<0||speed>500||!Number.isFinite(Date.parse(timestamp)))return null;
 return {id,lat,lng,speed,timestamp:new Date(timestamp).toISOString(),voltage:body.voltage==null?null:Number(body.voltage),ignition:body.ignition==null?null:!!body.ignition,protocol:String(body.protocol||'http')};
}
function broadcastPosition(pos){
 const payload='data: '+JSON.stringify({type:'position',position:pos})+'\n\n';
 for(const res of sseClients){try{res.write(payload)}catch{sseClients.delete(res)}}
}
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
function handleFrame(frame,reply,deny=()=>{},meta={}){
 try{
  const m=parse(frame);
  if(!deviceAllowed(m.terminal)){console.warn('Unregistered terminal:',m.terminal);deny();return}
  noteConnection(m.terminal,'jt808',meta.transport||'tcp',meta.remote||'')
  if(m.fragmented){console.warn('Fragmented packet ignored:',m.id.toString(16));return}
  if(m.id===0x0200){
   const pos={...location(m),protocol:'jt808'};
   if(pos.gpsValid&&!(pos.lat===0&&pos.lng===0)){
    devices.set(m.terminal,pos);tripTracker.record(pos);broadcastPosition(pos);
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
   handleFrame(frame,response=>socket.write(response),()=>socket.destroy(),{transport:'tcp',remote:socket.remoteAddress||''});
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
   handleFrame(packet.subarray(start,end+1),response=>udp.send(response,remote.port,remote.address),()=>{},{transport:'udp',remote:remote.address+':'+remote.port});
   cursor=end+1;
  }
 });
 udp.on('error',err=>console.warn('UDP receiver:',err.message));
 udp.bind(udpPort,'0.0.0.0',()=>console.log('JT808 UDP receiver on',udpPort));
}
http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('Access-Control-Allow-Origin',process.env.DASHBOARD_ORIGIN||'https://akoliyasonu5-blip.github.io');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');if(req.method==='OPTIONS'){res.writeHead(204).end();return}if(req.url==='/health'){res.end(JSON.stringify({ok:true}));return}
 if(req.url?.startsWith('/api/stream')){
  const u=new URL(req.url,'http://localhost');
  const streamToken=req.headers.authorization===`Bearer ${token}`?token:u.searchParams.get('token');
  if(streamToken!==token){res.writeHead(401).end(JSON.stringify({error:'Unauthorized'}));return}
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','Access-Control-Allow-Origin':process.env.DASHBOARD_ORIGIN||'https://akoliyasonu5-blip.github.io'});
  res.write('retry: 3000\\n\\n');
  for(const pos of devices.values())res.write('data: '+JSON.stringify({type:'position',position:pos})+'\\n\\n');
  sseClients.add(res);
  const ping=setInterval(()=>{try{res.write(': ping\\n\\n')}catch{}},25000);
  req.on('close',()=>{clearInterval(ping);sseClients.delete(res)});
  return
 }
 if(req.headers.authorization!==`Bearer ${token}`){res.writeHead(401).end(JSON.stringify({error:'Unauthorized'}));return}if(req.url==='/api/positions'&&req.method==='POST'){
 let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>8192)req.destroy()});req.on('end',()=>{let body;try{body=JSON.parse(raw)}catch{res.writeHead(400).end(JSON.stringify({error:'Invalid JSON'}));return}const pos=validPosition(body);if(!pos){res.writeHead(400).end(JSON.stringify({error:'Unknown device or invalid GPS position'}));return}noteConnection(pos.id,pos.protocol||'http','http',req.socket.remoteAddress||'');devices.set(pos.id,pos);tripTracker.record(pos);broadcastPosition(pos);const list=history.get(pos.id)||[];list.push(pos);history.set(pos.id,list.slice(-1000));void publishPosition(pos);res.writeHead(202).end(JSON.stringify({accepted:true,device_id:pos.id}))});return}
 if(req.url==='/api/devices'){res.end(JSON.stringify({devices:[...devices.values()].map(d=>({...d,connection:connections.get(String(d.id))||null})),connections:[...connections.values()],trips:tripTracker.getTrips(),alerts:tripTracker.getAlerts(),autoRegister}));return}
 if(req.url==='/api/protocols'){res.end(JSON.stringify({supported:[{id:'jt808',transports:['tcp','udp'],status:'ready'},{id:'http-json',transports:['https'],status:'ready'},{id:'beeve-elevate',transports:['tcp','mqtt','http','https'],status:'adapter-required'},{id:'gt06',transports:['tcp','udp'],status:'adapter-required'},{id:'kingwo-upro',transports:['tcp'],status:'adapter-required'}]}));return}
 if(req.url==='/api/register'&&req.method==='POST'){let raw='';req.on('data',c=>{raw+=c;if(raw.length>4096)req.destroy()});req.on('end',()=>{let body;try{body=JSON.parse(raw)}catch{res.writeHead(400).end(JSON.stringify({error:'Invalid JSON'}));return}const id=String(body.device_id??body.id??'').trim();if(!/^[A-Za-z0-9][A-Za-z0-9_:\-]{5,63}$/.test(id)){res.writeHead(400).end(JSON.stringify({error:'Invalid device ID'}));return}allowed.add(id);res.end(JSON.stringify({registered:true,device_id:id}))});return}if(req.url?.startsWith('/api/history/')){const id=decodeURIComponent(req.url.slice('/api/history/'.length));if(!deviceAllowed(id)){res.writeHead(404).end(JSON.stringify({error:'Unknown device'}));return}res.end(JSON.stringify({positions:history.get(id)||[]}));return}res.writeHead(404).end(JSON.stringify({error:'Not found'}))}).listen(httpPort,'0.0.0.0',()=>console.log('HTTP API on',httpPort));
