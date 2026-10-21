import {test} from 'node:test';
import fs from 'node:fs';import crypto from 'node:crypto';
test('Sanji: temporary complete offline fingerprint',()=>{
 const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const files=JSON.parse(sw.match(/const DATEIEN = (\[[^\]]*\])/)[1]);
 const fotos=JSON.parse(sw.match(/const FOTOS_H = (\{[^}]*\})/)[1]);
 const h=crypto.createHash('sha1');
 for(const d of files){if(d==='./')continue;h.update(d);h.update(fs.readFileSync(new URL('../'+d,import.meta.url)));}
 for(const k of Object.keys(fotos).sort()){h.update(k);h.update(fotos[k]);}
 console.log('SANJI_EXPECTED_INHALT='+h.digest('hex').slice(0,12));
});