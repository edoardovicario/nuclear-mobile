// Official Audius public API; only tracks available for anonymous full streaming.
const API='https://api.audius.co/v1';
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9]{1,64}$/.test(id);
export function mapAudius(t){
  if(!t||!validId(t.id)||t.is_streamable!==true||t.is_stream_gated===true||t.is_unlisted===true||t.is_available===false||t.is_delete===true||t.access?.stream===false||typeof t.title!=='string'||!t.title.trim())return null;
  const id=t.id,permalink=typeof t.permalink==='string'&&/^\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(t.permalink)?'https://audius.co'+t.permalink:'https://audius.co';
  const cover=t.artwork?.['480x480']||t.artwork?.['150x150']||'';
  return {provider:'audius',id:'audius:'+id,collection:'audius:'+id,title:t.title,artist:typeof t.user?.name==='string'?t.user.name:'Artista sconosciuto',album:'Audius',license:'Streaming pubblico su Audius',url:API+'/tracks/'+id+'/stream',source:permalink,cover:typeof cover==='string'&&cover.startsWith('https://')?cover:''};
}
export function validAudius(t){
  return !!t&&t.provider==='audius'&&typeof t.title==='string'&&typeof t.artist==='string'&&typeof t.id==='string'&&t.id.startsWith('audius:')&&validId(t.id.slice(7))&&t.collection===t.id&&t.url===API+'/tracks/'+t.id.slice(7)+'/stream';
}
export async function searchAudius(term,signal){
 const q=new URLSearchParams({query:term.trim(),limit:'30',app_name:'NuclearMobilePWA'});
 const res=await fetch(API+'/tracks/search?'+q,{signal,credentials:'omit',referrerPolicy:'no-referrer'});
 if(!res.ok)throw new Error('Audius: '+res.status);
 const body=await res.json();if(!Array.isArray(body.data))throw new Error('Risposta Audius non valida');
 return body.data.map(mapAudius).filter(Boolean);
}
export function coverFor(t){return t?.provider==='audius'?(typeof t.cover==='string'&&t.cover.startsWith('https://')?t.cover:'./icon.png'):null;}
export function sourceFor(t){if(t?.provider!=='audius')return null;try{const u=new URL(t.source);return u.origin==='https://audius.co'?u.href:'https://audius.co';}catch{return 'https://audius.co';}}
