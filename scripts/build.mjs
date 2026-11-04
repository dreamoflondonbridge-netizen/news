import {readFile,writeFile} from 'node:fs/promises';
import {initial} from '../data.js';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const pack=async p=>{const mime=p.endsWith('.svg')?'image/svg+xml':p.endsWith('.jpg')?'image/jpeg':'image/png';return 'data:'+mime+';base64,'+(await readFile(new URL(p,root))).toString('base64');};
let [html,css,model,app]=await Promise.all(['index.html','style.css','data.js','app.js'].map(read));
for(const match of [...html.matchAll(/src="(assets\/[^"]+)"/g)])html=html.replaceAll(match[0],'src="'+await pack(match[1])+'"');
// Store repeated article images once; the runtime resolves local asset references.
const assets={};
for(const b of initial.blocks)if(b.src?.startsWith('assets/')&&!assets[b.src])assets[b.src]=await pack(b.src);
model=model.replaceAll('export const ','const ').replaceAll('export function ','function ');
app=app.replace(/^import .*?;\s*/,'');
const json=s=>JSON.stringify(s).replaceAll('<','\\u003c');
const inlineScript=s=>s.replace(/<\/script/gi,'<\\/script');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>`<style>${css}</style>`).replace('<script type="module" src="app.js"></script>',()=>`<script id="embeddedAssets" type="application/json">${json(assets)}</script><script id="embeddedArticle" type="application/json" data-storage-key="school-news-offline-v1">${json(initial)}</script><script>${inlineScript(`(()=>{\n${model}\n${app}\n})();`)}</script>`);
await writeFile(new URL('school-news.html',root),html);
console.log('Created school-news.html — double-click to open, no server required.');
