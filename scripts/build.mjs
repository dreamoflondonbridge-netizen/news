import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {initial} from '../data.js';
import {writeLaunchZip} from './package.mjs';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
const pack=async p=>{const mime=p.endsWith('.svg')?'image/svg+xml':p.endsWith('.jpg')?'image/jpeg':p.endsWith('.woff2')?'font/woff2':'image/png';return 'data:'+mime+';base64,'+(await readFile(new URL(p,root))).toString('base64');};
let [html,css,model,app]=await Promise.all(['index.html','style.css','data.js','app.js'].map(read));
// Version requests by content so browsers do not mix old CSS/modules with a new page.
const hash=text=>createHash('sha256').update(text).digest('hex').slice(0,12);
const dataVersion=hash(model);
app=app.replace(/from '\.\/data\.js(?:\?v=[^']*)?'/,`from './data.js?v=${dataVersion}'`);
await writeFile(new URL('app.js',root),app);
const cozy=await read('cozy.css');
const version=hash(css+cozy+model+app);
html=html.replace(/((?:href|src)="(?:style\.css|cozy\.css|app\.js))(?:\?v=[^"]*)?"/g,`$1?v=${version}"`);
await writeFile(new URL('index.html',root),html);

css+='\n'+await read('cozy.css');
for(const match of [...css.matchAll(/url\(['"]?(assets\/fonts\/[^'")]+)['"]?\)/g)])css=css.replaceAll(match[0],'url("'+await pack(match[1])+'")');
for(const license of ['Jua-OFL.txt','GowunDodum-OFL.txt'])css+='\n/* '+(await read('assets/fonts/'+license)).replaceAll('*/','* /')+' */';
html=html.replace(/<link rel="stylesheet" href="cozy\.css(?:\?v=[^"]*)?">/,'');
for(const match of [...html.matchAll(/src="(assets\/[^"]+)"/g)])html=html.replaceAll(match[0],'src="'+await pack(match[1])+'"');
// Store repeated article images once; the runtime resolves local asset references.
const assets={};
for(const b of initial.blocks)if(b.src?.startsWith('assets/')&&!assets[b.src])assets[b.src]=await pack(b.src);
model=model.replaceAll('export const ','const ').replaceAll('export function ','function ');
app=app.replace(/^import .*?;\s*/,'');
const json=s=>JSON.stringify(s).replaceAll('<','\\u003c');
const inlineScript=s=>s.replace(/<\/script/gi,'<\\/script');
html=html.replace(/<link rel="stylesheet" href="style\.css(?:\?v=[^"]*)?">/,()=>`<style>${css}</style>`).replace(/<script type="module" src="app\.js(?:\?v=[^"]*)?"><\/script>/,()=>`<script id="embeddedAssets" type="application/json">${json(assets)}</script><script id="embeddedArticle" type="application/json" data-storage-key="school-news-offline-v1">${json(initial)}</script><script>${inlineScript(`(()=>{\n${model}\n${app}\n})();`)}</script>`);
await writeFile(new URL('school-news.html',root),html);
console.log('Created school-news.html — double-click to open, no server required.');

await writeLaunchZip(root);
console.log('Created news-explorer.zip — extract and open index.html.');
