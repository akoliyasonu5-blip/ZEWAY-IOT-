const DEFAULT_BASE='https://api.iotbeeveglobal.in/v1';

export class BeeVeClient{
  constructor({clientId,clientSecret,baseUrl=DEFAULT_BASE,fetchImpl=fetch}={}){
    this.clientId=clientId;this.clientSecret=clientSecret;this.baseUrl=String(baseUrl).replace(/\/$/,'');this.fetch=fetchImpl;
    this.token=null;this.expiresAt=0;
  }
  enabled(){return !!(this.clientId&&this.clientSecret)}
  async getToken(){
    if(this.token&&Date.now()<this.expiresAt-60000)return this.token;
    const r=await this.fetch(this.baseUrl+'/auth/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientId:this.clientId,clientSecret:this.clientSecret})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||!j.success||!j.data?.accessToken)throw Error(j.message||j.errorCode||'BeeVe token HTTP '+r.status);
    this.token=j.data.accessToken;
    const exp=Date.parse(j.data.expiresAt||'');
    this.expiresAt=Number.isFinite(exp)?exp:Date.now()+Number(j.data.expiresInSeconds||604800)*1000;
    return this.token;
  }
  async locations(page=0,size=500){
    const token=await this.getToken();
    let r=await this.fetch(this.baseUrl+`/locations?page=${page}&size=${size}`,{headers:{Authorization:'Bearer '+token}});
    if(r.status===401){this.token=null;this.expiresAt=0;const retry=await this.getToken();r=await this.fetch(this.baseUrl+`/locations?page=${page}&size=${size}`,{headers:{Authorization:'Bearer '+retry}})}
    const j=await r.json().catch(()=>({}));
    if(!r.ok||!j.success)throw Error(j.message||j.errorCode||'BeeVe locations HTTP '+r.status);
    return j.data;
  }
}
export function normalizeBeeVeVehicle(v){
  const status=String(v.status||'').toUpperCase();
  const lat=Number(v.latitude),lng=Number(v.longitude),speed=Number(v.speed||0);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
  return {
    id:String(v.vehicleId),
    vehicleId:v.vehicleId,
    name:v.registrationNumber||('Vehicle '+v.vehicleId),
    plate:v.registrationNumber||'',
    vehicleType:v.vehicleType||null,
    lat,lng,speed:Number.isFinite(speed)?speed:0,
    heading:v.heading==null?null:Number(v.heading),
    ignition:v.ignition==null?null:Number(v.ignition)===1,
    status:status||null,
    timestamp:v.pingTime||new Date().toISOString(),
    statusSince:v.statusSince||null,
    voltage:v.externalVoltage==null?null:Number(v.externalVoltage),
    battery:v.deviceBatteryPercent==null?null:Number(v.deviceBatteryPercent),
    odometerKm:v.odometerKm==null?null:Number(v.odometerKm),
    fuelPercent:v.fuelPercent==null?null:Number(v.fuelPercent),
    temperature:v.temperature==null?null:Number(v.temperature),
    humidity:v.humidity==null?null:Number(v.humidity),
    immobilizer:v.immobilizer||'UNKNOWN',
    wheelLock:v.wheelLock||'UNKNOWN',
    locked:v.wheelLock==='LOCKED'||v.immobilizer==='IMMOBILIZED'?true:v.wheelLock==='UNLOCKED'&&v.immobilizer==='MOBILIZED'?false:null,
    protocol:'beeve-api'
  };
}
