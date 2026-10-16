import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFederations,parseOffices,mergeFederations,mergeOffices } from './sync-official-sources.mjs';
test('federasyon adlarini resmi sayfa biciminden okur',()=>{
 const html='<div>Türkiye Yüzme Federasyonu Başkanlığı</div><div>Türkiye Basketbol Federasyonu Başkanlığı</div>';
 const result=parseFederations(html);
 assert.equal(result.length,2);
 assert.match(result.join(' '),/Türkiye Yüzme/);
});
test('81 il mudurluklerine benzer gsb linklerini okur',()=>{
 const html='<a href="https://aydin.gsb.gov.tr">Aydın Gençlik ve Spor İl Müdürlüğü aydin.gsb.gov.tr</a><a href="https://test.example.com">Bilinmeyen Gençlik ve Spor İl Müdürlüğü</a>';
 assert.deepEqual(parseOffices(html),[{name:'Aydın Gençlik ve Spor İl Müdürlüğü',city:'Aydın',officialSite:'https://aydin.gsb.gov.tr'}]);
});
test('federasyonlari iki kere eklemez ve var olan tyf okuyucusunu bozmaz',()=>{
 const doc={federations:[{id:'tyf',name:'Türkiye Yüzme Federasyonu Başkanlığı',readerStatus:'legacy_reader'}]};
 assert.equal(mergeFederations(doc,['Türkiye Yüzme Federasyonu','Türkiye Tenis Federasyonu']),1);
 assert.equal(mergeFederations(doc,['Türkiye Yüzme Federasyonu','Türkiye Tenis Federasyonu']),0);
 assert.equal(doc.federations.find(x=>x.id==='tyf').readerStatus,'legacy_reader');
});
test('il mudurluklerini URLye gore tekilleştirir',()=>{
 const doc={offices:[]};
 const item={name:'Aydın Gençlik ve Spor İl Müdürlüğü',city:'Aydın',officialSite:'https://aydin.gsb.gov.tr'};
 assert.equal(mergeOffices(doc,[item,item]),1);
 assert.equal(mergeOffices(doc,[item]),0);
});
