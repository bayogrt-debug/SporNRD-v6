/* SporNRD Worker Core Source Registry · missing dependency recovered.
 * This catalog is ONLY established TYF/TBF core identities; it does not
 * auto-register newly discovered institutions or approve rights.
 */
export const SOURCE_REGISTRY_VERSION='1.0.0';
const SOURCES=Object.freeze([
  Object.freeze({id:'tyf',name:'Türkiye Yüzme Federasyonu',shortName:'TYF',
    sport:'swimming',sourceType:'FEDERASYON',providerType:'federation',
    website:'https://www.tyf.gov.tr',verified:true,enabled:true}),
  Object.freeze({id:'tbf',name:'Türkiye Basketbol Federasyonu',shortName:'TBF',
    sport:'basketball',sourceType:'FEDERASYON',providerType:'federation',
    website:'https://www.tbf.org.tr',verified:true,enabled:true})
]);
export function getSource(id){return SOURCES.find(s=>s.id===String(id||'').toLowerCase())||null;}
export function getActiveSources(){return SOURCES.filter(s=>s.enabled===true).map(s=>({...s}));}
export function createPublicSourceInfo(s){
  if(!s)return null;
  return {id:s.id,name:s.name,shortName:s.shortName,sport:s.sport,
    sourceType:s.sourceType,providerType:s.providerType,website:s.website,
    verified:s.verified===true};
}
export function getPublicSources(){return getActiveSources().map(createPublicSourceInfo);}
export function validateSourceRegistry(){
  const errors=[],seen=new Set();
  for(const source of SOURCES){
    if(!source.id||!source.name||seen.has(source.id))errors.push('Geçersiz veya mükerrer kaynak');
    seen.add(source.id);
  }
  return {ok:errors.length===0,errors,count:SOURCES.length,version:SOURCE_REGISTRY_VERSION};
}
