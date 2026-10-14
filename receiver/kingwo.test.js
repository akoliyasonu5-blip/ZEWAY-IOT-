import test from 'node:test';import assert from 'node:assert/strict';import {parseKingwo,kingwoAck} from './kingwo.js';
test('parses Kingwo BA GPS packet',()=>{
 const m=parseKingwo('*HQ200999999,BA&A1656512233362911356523660000230618&B0100060010&C00000<6<&F0000&R2405&V0109#');
 assert.equal(m.id,'999999');assert.equal(m.code,'B');assert.equal(m.keyword,'A');assert.ok(Number.isFinite(m.lat));assert.ok(Number.isFinite(m.lng));assert.equal(m.voltage,10.9);assert.equal(kingwoAck(m),'*HQ20YBA#');
});
