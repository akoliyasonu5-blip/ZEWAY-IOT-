// Kingwo hard-wired tracker protocol (*HQ20...#)
// Based on the Communication Protocol For Hardwired Trackers supplied by the user.

function nibbleChar(ch){
  if(!ch) return 0;
  return ch.charCodeAt(0)&0x0f;
}
function dmToDegrees(raw, degreeDigits){
  if(typeof raw!=='string'||raw.length<degreeDigits+2) return null;
  const deg=Number(raw.slice(0,degreeDigits));
  const min=Number(raw.slice(degreeDigits,degreeDigits+2)+'.'+raw.slice(degreeDigits+2));
  if(!Number.isFinite(deg)||!Number.isFinite(min)||min>=60) return null;
  return deg+min/60;
}
function parseGps(raw){
  // hhmmss + latitude(8) + longitude(9) + flag(1) + speed(2) + heading(2) + ddmmyy
  if(typeof raw!=='string'||raw.length<34) return null;
  const time=raw.slice(0,6),latRaw=raw.slice(6,14),lngRaw=raw.slice(14,23),flagChar=raw[23],speedRaw=raw.slice(24,26),headingRaw=raw.slice(26,28),date=raw.slice(28,34);
  let lat=dmToDegrees(latRaw,2),lng=dmToDegrees(lngRaw,3);
  const flags=nibbleChar(flagChar);
  if(lat==null||lng==null) return null;
  if((flags&0x02)===0) lat=-lat;
  if((flags&0x04)===0) lng=-lng;
  const precise=(flags&0x01)===0;
  const speedNmi=Number(speedRaw)*2;
  const speed=Number.isFinite(speedNmi)?speedNmi*1.852:0;
  const heading=Number(headingRaw)*10;
  const dd=Number(date.slice(0,2)),mm=Number(date.slice(2,4)),yy=Number(date.slice(4,6));
  const hh=Number(time.slice(0,2)),mi=Number(time.slice(2,4)),ss=Number(time.slice(4,6));
  // The vendor protocol uses terminal-local date/time and does not declare the timezone here.
  // Store as an ISO-like UTC timestamp for transport; consumers should treat it as device-reported time.
  const year=2000+yy;
  const d=new Date(Date.UTC(year,mm-1,dd,hh,mi,ss));
  return {lat,lng,speed:+speed.toFixed(2),heading:Number.isFinite(heading)?heading:null,timestamp:Number.isNaN(d.valueOf())?new Date().toISOString():d.toISOString(),gpsValid:precise};
}
function parseMileage(raw){
  if(typeof raw!=='string'||raw.length<8)return null;
  let hex='';
  for(const ch of raw.slice(0,8))hex+=(ch.charCodeAt(0)&0x0f).toString(16);
  const n=parseInt(hex,16);
  if(!Number.isFinite(n))return null;
  return +(n*2*1.852/3600).toFixed(3);
}
function additionalMap(payload){
  const out={};
  const re=/&([A-Z])([^&\r\n#]*)/g;
  let m;
  while((m=re.exec(payload)))out[m[1]]=m[2];
  return out;
}
export function parseKingwo(packet){
  const text=Buffer.isBuffer(packet)?packet.toString('ascii'):String(packet||'');
  const m=text.match(/^\*HQ20([01])([0-9]{4,15}),([A-Z])([A-Z])([\s\S]*)#$/);
  if(!m)throw Error('Invalid Kingwo frame');
  const [,response,id,code,keyword,data]=m;
  const extras=additionalMap(data);
  const gps=extras.A?parseGps(extras.A):null;
  const status=extras.B||'';
  const s0=nibbleChar(status[0]),s1=nibbleChar(status[1]);
  const voltage=extras.V&&/^\d{4}/.test(extras.V)?Number(extras.V.slice(0,4))/10:null;
  const fineSpeed=extras.F&&/^\d{4}/.test(extras.F)?Number(extras.F.slice(0,4))*0.1*1.852:null;
  return {
    protocol:'kingwo-hq20',responseRequired:response==='1',id,code,keyword,raw:text,
    ...(gps||{}),
    speed:fineSpeed??gps?.speed??0,
    voltage:Number.isFinite(voltage)?voltage:null,
    ignition:status?!!(s1&0x01):null,
    locked:status?!!(s0&0x02):null,
    odometerKm:extras.C?parseMileage(extras.C):null
  };
}
export function kingwoAck(message){
  return `*HQ20Y${message.code}${message.keyword}#`;
}
export function isKingwoPosition(message){
  return message.code==='B'&&message.keyword==='A'&&Number.isFinite(message.lat)&&Number.isFinite(message.lng);
}
