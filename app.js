import {initial,mediaTypes,labels,buildLearningSteps,quizReady,gradeQuiz,prepareQuizzes,validate,highlightColors,paintHighlightRanges} from './data.js?v=3ca3fc3acc94';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function icon(name){return `<svg class="ui-icon" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;}
let activeNav='article';
let highlightSelection=[],highlightUndo=null;
const localVideos=new Map(),uploadStatuses=new Map();
let videoDatabasePromise;
const safeUrl=s=>{s=localVideos.get(s)?.url||s;try{const u=new URL(s,location.href);return ['http:','https:','blob:'].includes(u.protocol)||(/^data:(?:(image|video)\/|application\/octet-stream(?:;|,))/.test(s))?esc(s):''}catch{return ''}};
const embedded=document.getElementById('embeddedArticle');
const packagedAssets=JSON.parse(document.getElementById('embeddedAssets')?.textContent||'{}');
function hydrateAssets(article){for(const block of article.blocks)if(packagedAssets[block.src])block.src=packagedAssets[block.src];return article;}
hydrateAssets(initial);
const storageKey=embedded?.dataset.storageKey||'school-news-v1';
const quizAnswers=new Map();
let data=embedded?validate(JSON.parse(embedded.textContent)):structuredClone(initial),mode='read',index=0,reveal=0,panel=true,hidden=new Set(),compare=new Set(),concept=0;
try{const saved=localStorage.getItem(storageKey);if(saved)data=validate(JSON.parse(saved));}catch{toast('저장된 자료를 읽지 못해 예시 기사를 표시합니다.');}
hydrateAssets(data);prepareQuizzes(data);
function toast(msg){$('#toast').textContent=msg;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',3500)}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(portableData()));reportEditor('✓ 이 브라우저에 저장되었습니다.');return true;}catch{reportEditor('브라우저 저장 공간이 부족합니다. JSON 또는 사이트 파일로 내보내 주세요.',true);return false;}}
function media(b,summary=false){if(b.type==='video')return videoPlayer(b);if(!b.src)return '<div class="hidden-media">편집에서 자료를 등록해 주세요.</div>';return `<img src="${safeUrl(b.src)}" alt="${esc(b.alt||b.caption)}" ${summary?'':`data-media-focus="${esc(b.id)}" title="이 자료의 학습 설명 보기"`} style="display:block;width:100%;height:auto;max-height:none;aspect-ratio:auto;object-fit:contain;transform:none" loading="lazy">`;}
function renderArticle(){highlightSelection=[];const previousVideos=new Map([...document.querySelectorAll('#article .block video[data-video-id]')].map(v=>[v.dataset.videoId,v]));const current=currentSteps()[index],lesson=data.lessons[current?.id]||{};$('#article').innerHTML=articleViewTools()+'<div class="article-content"><div class="section-tag">⚑ 뉴스 탐험 <span style="margin:0 9px">|</span> 기사문 · 복합양식</div>'+data.blocks.map(b=>{const active=current?.id===b.id;const related=mode==='quiz'?(current?.kind==='quiz'&&quizState(current.id).submitted&&(data.quizzes[current.id].relatedIds||[]).includes(b.id)):(phases(lesson).slice(0,reveal).some(p=>p.key==='explanation')&&(lesson.relatedIds||[]).includes(b.id));let content='';if(b.type==='title')content=`<h1>${esc(b.text)}</h1>`;else if(b.type==='subtitle')content=`<h2 class="subtitle">${esc(b.text)}</h2>`;else if(b.type==='lead')content=`<p class="article-lead" data-highlight-text="${esc(b.id)}">${highlightedText(b)}</p>`;else if(b.type==='subheading')content=`<h2 class="article-subheading">${esc(b.text)}</h2>`;else if(b.type==='paragraph')content=`<p class="body" data-highlight-text="${esc(b.id)}">${highlightedText(b)}</p>`;else content=`<figure><div class="media-wrap" style="width:${mediaWidth(b)}%;margin-inline:auto">${hidden.has(b.id)?'<div class="hidden-media">자료를 숨겼습니다 · 글만 읽고 비교해 보세요</div>':media(b)}<span class="media-label">${esc(labels[b.type])} · 수업용 예시</span></div><figcaption><div class="caption">${esc(b.caption)}</div><div class="source">${esc(b.source)}</div></figcaption><div class="media-actions"><button class="material-lesson-button" data-material-lesson="${esc(b.id)}">${icon('book')} 자료 설명 보기</button><span class="media-size-controls" role="group" aria-label="자료 크기 조절"><button data-media-size="${esc(b.id)}" data-size-direction="-1" ${mediaWidth(b)<=25?'disabled':''} aria-label="자료 축소">− 축소</button><output data-media-percent="${esc(b.id)}" aria-live="polite">${mediaWidth(b)}%</output><button data-media-size="${esc(b.id)}" data-size-direction="1" ${mediaWidth(b)>=100?'disabled':''} aria-label="자료 확대">＋ 확대</button><button data-media-reset="${esc(b.id)}" ${mediaWidth(b)===100?'disabled':''}>원래대로</button></span><button data-hide="${esc(b.id)}">${hidden.has(b.id)?'다시 보기':'자료 숨기기'}</button>${b.type!=='video'?`<button data-zoom="${esc(b.id)}">크게 보기 ↗</button>`:''}<button data-compare="${esc(b.id)}">${compare.has(b.id)?'✓ 비교 선택':'＋ 비교'}</button></div></figure>`;return `<section class="block ${active?'focused':''} ${related?'related':''}" data-id="${esc(b.id)}">${content}</section>${b.type==='subtitle'?articleByline():''}`}).join('')+'<div class="article-end">우리학교 학생기자단 · 수업용으로 작성한 예시 기사입니다.<br><br>이 기사에 사용된 글과 자료의 관계를 함께 생각해 보세요.</div><div id="summary"></div></div>';for(const video of document.querySelectorAll('#article .block video[data-video-id]')){const old=previousVideos.get(video.dataset.videoId);if(old&&old.getAttribute('src')===video.getAttribute('src')){const previousError=old.closest('.video-player')?.querySelector('.video-error'),nextError=video.closest('.video-player')?.querySelector('.video-error');if(previousError&&nextError&&!previousError.hidden){nextError.textContent=previousError.textContent;nextError.hidden=false;}video.replaceWith(old);previousVideos.delete(video.dataset.videoId);}}for(const old of previousVideos.values())old.pause();applyArticleScale();if(mode==='read'&&['summary','concept'].includes(current?.kind))renderSummary(current.kind);if(current?.kind==='quiz-summary')$('#summary').innerHTML='<section class="summary-area"><div class="section-tag">기사 탐험 마무리</div><h2>설명과 퀴즈를 함께 살펴봤어요.</h2><p>오른쪽에서 이해한 내용과 다시 확인할 문제를 돌아보세요.</p></section>';}
function renderSummary(kind){const mediaBlocks=data.blocks.filter(b=>mediaTypes.includes(b.type));$('#summary').innerHTML=kind==='summary'?`<section class="summary-area"><div class="section-tag">배움을 연결하다</div><h2>각 자료는 어떤 역할을 했을까요?</h2><p class="muted">기사에 등장한 ${mediaBlocks.length}개 자료를 순서대로 정리합니다.</p>${mediaBlocks.map((b,i)=>{const l=data.lessons[b.id]||{};return `<div class="summary-item"><div>${media(b,true)}</div><div><small>${i+1}. ${labels[b.type]}</small><h4>${esc(b.caption)}</h4><p><b>글과의 관계</b> ${esc(l.explanation||'등록된 설명이 없습니다.')}</p><p><b>표현 효과</b> ${esc(l.effect||'등록된 효과가 없습니다.')}</p></div></div>`}).join('')}</section>`:`<section class="summary-area"><div class="section-tag">오늘의 배움</div><h2>글과 자료가 만나, 더 풍부한 기사로</h2><p>각 자료는 글의 내용을 보충하며 서로 다른 방식으로 정보를 전달합니다.</p><table class="concept-table"><thead><tr><th>자료</th><th>특징과 표현 효과</th></tr></thead><tbody>${[['사진','실제 장면을 포착하여 현장감과 구체성을 높입니다.'],['그림','필요한 정보를 선택하고 단순화하여 이해를 돕습니다.'],['영상','움직임과 소리, 시간의 흐름을 함께 전달합니다.']].map(([t,d],i)=>`<tr><th>${t}</th><td>${concept>i?d:'다음 설명을 눌러 확인하세요.'}</td></tr>`).join('')}</tbody></table><button data-action="concept" ${concept>=3?'disabled':''}>${concept>=3?'모든 개념을 확인했습니다':'다음 설명 공개 ＋'}</button><p style="margin-top:30px;line-height:2">생각해 보기 · 같은 내용을 글로만 전달한다면 어떤 점이 달라질까요?<br>새로운 기사를 쓴다면 어떤 자료를 선택하고 싶나요?</p></section>`;}
function phases(l){return [{key:'question',title:'관찰 질문',text:l.question},{key:'explanation',title:'글과의 관계',text:l.explanation},{key:'effect',title:'표현 효과',text:l.effect},{key:'extra',title:'더 생각해 보기',text:l.extra}].filter(x=>x.text)}
function renderSide(){if(mode==='quiz'){renderQuizSide();return;}if(!panel){$('#sidebar').innerHTML='<button data-action="panel">학습 패널 다시 보기 →</button>';return;}const step=currentSteps()[index],l=data.lessons[step.id]||{},p=phases(l),material=data.blocks.find(b=>b.id===step.id);$('#sidebar').innerHTML=`<div class="lesson-panel"><div class="lesson-number">${icon('book')} 기사 탐험 · 설명 ${String(index+1).padStart(2,'0')} <button style="float:right;border:0;padding:0;background:none" data-action="panel" aria-label="학습 패널 숨기기">−</button></div><h3 class="lesson-title">${esc(step.name)}</h3>${material&&mediaTypes.includes(material.type)?currentMaterialCard(material):''}${step.kind==='block'?`<div class="lesson-phases" aria-label="설명 공개 단계">${p.map((phase,i)=>`<button data-reveal-stage="${i+1}" class="${i<reveal?'revealed':''}" aria-pressed="${i<reveal}"><span>${i+1}</span>${esc(phase.title)}</button>`).join('')}</div>`:''}${step.kind==='intro'?'<p>기사의 처음부터 제목·본문·자료를 순서대로 살펴봅니다.</p><p class="muted">설명을 확인한 뒤 연결된 퀴즈가 있으면 바로 풀고 다음 부분으로 넘어갑니다.</p><button class="primary" data-action="next">기사 탐험 시작 →</button>':step.kind==='block'?`<p class="muted">${reveal===0?'먼저 강조된 부분을 관찰해 보세요. 설명은 버튼을 누를 때마다 공개됩니다.':''}</p>${p.slice(0,reveal).map(x=>`<div class="reveal-item"><small>${icon(x.key==='question'?'lens':x.key==='explanation'?'book':'bulb')}${x.title}</small><p>${esc(x.text)}</p></div>`).join('')}${!p.length?`<p>이 요소의 설명은 아직 등록되지 않았어요. 기사 내용을 읽고 다음으로 진행하거나 편집실에서 설명을 추가해 주세요.</p><button data-edit-lesson="${esc(step.id)}">이 요소의 학습 설명 편집</button>`:''}<div class="panel-buttons"><button class="primary" data-action="reveal">${reveal<p.length?'다음 설명 ＋':currentSteps()[index+1]?.kind==='quiz'?'연결 퀴즈 풀기 →':'다음 내용 →'}</button><button data-action="all">설명 전체 보기</button></div>`:step.kind==='summary'?'<p>기사 속 자료를 순서대로 모았습니다. 각각 어떤 내용을 보충하는지 비교해 보세요.</p>':'<p>사진·그림·영상의 특징을 하나씩 공개하며 오늘 배운 내용을 정리합니다.</p><button data-action="concept">개념 설명 공개 ＋</button>'}<div class="side-note">← → 방향키로 진행할 수 있습니다.<br>→ 키는 설명을 공개한 뒤 다음 요소로 이동합니다.</div></div>`;}
function renderBar(){const steps=currentSteps(),step=steps[index],pendingQuiz=step.kind==='quiz'&&!quizState(step.id).submitted,more=index<steps.length-1||(step.kind==='concept'&&concept<3);$('#learningBar').hidden=false;$('#learningBar').innerHTML=`<div class="progress"><i style="width:${(index+1)/steps.length*100}%"></i></div><button data-action="previous" ${index===0&&reveal===0?'disabled':''}>❮ 이전</button><select id="stepSelect" aria-label="기사 탐험 단계로 이동">${steps.map((s,i)=>`<option value="${i}" ${i===index?'selected':''}>${i+1}. ${esc(s.name)}</option>`).join('')}</select><span class="bar-count">${index+1} / ${steps.length}</span><button data-action="restart">처음부터</button><button data-action="fullscreen" class="fullscreen-button">전체 화면 ⛶</button><button data-action="panel">패널 ${panel?'숨기기':'보기'}</button>${mode==='quiz'?'<button class="quiz-return" data-quiz-action="question">문제 보기</button>':''}<button class="primary" data-action="next" ${!more||pendingQuiz?'disabled':''}>${nextLearningLabel()} ❯</button>`;}
function nextLearningLabel(){const steps=currentSteps(),step=steps[index];if(step.kind==='quiz')return '다음 내용';if(step.kind==='block'&&reveal<phases(data.lessons[step.id]||{}).length)return '다음 설명';if(step.kind==='concept'&&concept<3)return '다음 개념';if(steps[index+1]?.kind==='quiz')return '연결 퀴즈';return index===steps.length-1?'학습 완료':'다음 내용';}
function render(scroll=false){index=Math.min(index,currentSteps().length-1);mode=['quiz','quiz-summary'].includes(currentSteps()[index].kind)?'quiz':'read';document.body.classList.add('learning');document.body.classList.toggle('classroom-focus',data.classroomFocus===true);document.body.classList.toggle('quizzing',mode==='quiz');index=Math.min(index,currentSteps().length-1);renderArticle();renderSide();renderBar();renderJourney();enhanceSelects(document);if(scroll){const s=currentSteps()[index];requestAnimationFrame(()=>{const el=mode==='quiz'&&innerWidth<=760?$('#sidebar'):s.id?[...document.querySelectorAll('.block')].find(x=>x.dataset.id===s.id):['summary','concept','quiz-summary'].includes(s.kind)?$('#summary'):$('#article');el?.scrollIntoView({behavior:'smooth',block:'start'});});}}
function move(n){index=Math.max(0,Math.min(currentSteps().length-1,index+n));reveal=initialReadReveal(currentSteps()[index]);render(true)}
function nextReveal(){if(mode==='quiz'){const step=currentSteps()[index];if(step.kind==='quiz'&&!quizState(step.id).submitted){toast('정답을 확인하거나 이 문제 건너뛰기를 눌러 주세요.');return;}move(1);return;}const s=currentSteps()[index],p=phases(data.lessons[s.id]||{});if(s.kind==='block'&&reveal<p.length){reveal++;render();}else if(s.kind==='concept'&&concept<3){concept++;render();}else move(1)}

document.addEventListener('click',async e=>{const el=e.target.closest('button,[data-zoom]');if(!el)return;const id=el.dataset.hide;if(id){hidden.has(id)?hidden.delete(id):hidden.add(id);render();return;}if(el.dataset.zoom){const b=data.blocks.find(x=>x.id===el.dataset.zoom);if(!b?.src)return;$('#imageDialog img').src=new URL(b.src,location.href).href;$('#imageDialog img').alt=b.alt||b.caption||'';$('#imageDialog p').textContent=b.caption||'';$('#imageDialog').showModal();return;}if(el.dataset.compare){const id=el.dataset.compare;if(compare.has(id))compare.delete(id);else compare.add(id);if(compare.size===2){const selected=data.blocks.filter(b=>compare.has(b.id));const d=document.createElement('dialog');d.innerHTML=`<button class="close">×</button><h2>자료 나란히 비교하기</h2><div class="compare-list">${selected.map(b=>`<div>${media(b,true)}<p>${esc(b.caption)}</p><p class="muted">${esc(data.lessons[b.id]?.effect)}</p></div>`).join('')}</div>`;document.body.append(d);d.querySelector('button').onclick=()=>{d.close();d.remove()};d.showModal();compare.clear()}else toast('비교할 다른 자료를 하나 더 선택하세요.');render();return;}const a=el.dataset.action;if(a==='learn')setMode('quiz');if(a==='next')nextReveal();if(a==='previous'){if(mode==='read'&&reveal>0){reveal--;render()}else move(-1)}if(a==='reveal')nextReveal();if(a==='all'){reveal=phases(data.lessons[currentSteps()[index].id]||{}).length;render()}if(a==='panel'){panel=!panel;renderSide();renderBar();enhanceSelects(document)}if(a==='restart'){quizAnswers.clear();index=0;reveal=0;concept=0;render(true)}if(a==='concept'){concept=Math.min(3,concept+1);render()}if(a==='fullscreen'){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{toast('이 브라우저에서는 전체 화면을 사용할 수 없습니다.')}}if(a==='print')window.print();if(a==='font'){document.querySelectorAll('.body').forEach(p=>p.style.fontSize=p.style.fontSize?'':'20px')}});
$('#article').addEventListener('click',e=>{if(e.target.closest('button,img,video')||window.getSelection()?.toString().trim())return;const id=e.target.closest('[data-id]')?.dataset.id;const i=currentSteps().findIndex(s=>s.id===id);if(i>=0){index=i;reveal=initialReadReveal(currentSteps()[index]);panel=true;render()}});
document.addEventListener('change',e=>{if(e.target.id==='stepSelect'){index=Number(e.target.value);reveal=initialReadReveal(currentSteps()[index]);panel=true;render(true)}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')return;if(document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.target.closest('.pixel-select')||e.shiftKey||window.getSelection()?.isCollapsed===false||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='ArrowRight'){e.preventDefault();nextReveal()}if(e.key==='ArrowLeft'){e.preventDefault();if(mode==='read'&&reveal){reveal--;render()}else move(-1)}});
document.querySelectorAll('dialog .close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
function field(id,key,label,value,lesson=false){const fieldId=esc(`${id}-${lesson?'lesson-':''}${key}`);const packed=key==='src'&&(value?.startsWith('data:')||value?.startsWith('local-video:'));return `<div class="editor-field"><label for="${fieldId}">${label}</label><textarea id="${fieldId}" data-field="${key}" data-owner="${esc(id)}" ${lesson?'data-lesson="true"':''} ${packed?'placeholder="기기 파일이 등록되어 있어요. 새 URL을 입력하면 교체됩니다."':''}>${packed?'':esc(value)}</textarea></div>`;}
function renderEditor(){const pars=data.blocks.filter(b=>['paragraph','lead'].includes(b.type));$('#editorBlocks').innerHTML=data.blocks.map((b,i)=>{const l=data.lessons[b.id]||{};return `<section class="editor-block"><div class="edit-row"><span class="block-number">${String(i+1).padStart(2,'0')}</span><strong>${icon(mediaTypes.includes(b.type)?b.type==='video'?'video':'picture':'news')}${labels[b.type]}</strong><button data-up="${esc(b.id)}" ${i===0?'disabled':''} aria-label="위로 이동">↑</button><button data-down="${esc(b.id)}" ${i===data.blocks.length-1?'disabled':''} aria-label="아래로 이동">↓</button><button data-delete="${esc(b.id)}">삭제</button></div>${mediaTypes.includes(b.type)?`${field(b.id,'src','자료 URL (영상은 MP4/WebM 등 직접 재생 주소)',b.src)}<label>또는 기기의 자료 파일 선택<input type="file" data-upload="${esc(b.id)}" accept="${b.type==='video'?'video/*,.mp4,.m4v,.mov,.webm,.ogv':'image/*'}"></label>${uploadStatusMarkup(b)}${field(b.id,'caption','캡션',b.caption)}${field(b.id,'source','출처',b.source)}${field(b.id,'alt','대체 텍스트',b.alt)}`:field(b.id,'text','기사 내용',b.text)}<details class="lesson-settings"><summary>${icon('book')} 기사 읽기 설명 편집 <span>펼치기 ＋</span></summary>${field(b.id,'question','관찰 질문 (비워 두면 생략)',l.question,true)}${field(b.id,'explanation','글과의 관계 / 학습 설명',l.explanation,true)}${field(b.id,'effect','표현 효과',l.effect,true)}${field(b.id,'extra','추가 설명 (선택)',l.extra,true)}<label>관련 기사 문단</label>${pars.filter(p=>p.id!==b.id).map(p=>`<label class="check"><input type="checkbox" data-related="${esc(b.id)}" value="${esc(p.id)}" ${(l.relatedIds||[]).includes(p.id)?'checked':''}>${esc(p.text?.slice(0,28))}…</label>`).join('')}</details>${renderQuizEditor(b,pars)}</section>`}).join('');renderPositions();enhanceSelects($('#editor'));}
function renderPositions(){const select=$('#addPosition'),previous=select.value;select.innerHTML='<option value="end">기사 맨 끝에</option><option value="start">기사 맨 앞에</option>'+data.blocks.map((b,i)=>`<option value="${esc(b.id)}">${i+1}. ${labels[b.type]} 뒤 · ${esc((b.text||b.caption||'').slice(0,18))}</option>`).join('');if([...select.options].some(o=>o.value===previous))select.value=previous;enhanceSelects($('#editor'));}
$('#addType').onchange=()=>{if($('#addType').value==='lead'){const subtitle=data.blocks.find(b=>b.type==='subtitle');if(subtitle)$('#addPosition').value=subtitle.id;}};
$('#editButton').onclick=()=>{renderEditor();$('#editor').showModal()};
$('#editorBlocks').addEventListener('input',e=>{const t=e.target;if(!t.dataset.field)return;const b=data.blocks.find(x=>x.id===t.dataset.owner);if(t.dataset.lesson){data.lessons[b.id]??={};data.lessons[b.id][t.dataset.field]=t.value}else{if(t.dataset.field==='text'&&data.highlights)delete data.highlights[b.id];b[t.dataset.field]=t.value;}save();render()});
$('#editorBlocks').addEventListener('change',async e=>{const t=e.target;if(t.dataset.related){const l=data.lessons[t.dataset.related]??={};l.relatedIds=[...$('#editorBlocks').querySelectorAll('input[data-related]')].filter(x=>x.dataset.related===t.dataset.related&&x.checked).map(x=>x.value);save();render()}if(t.dataset.upload&&t.files[0])await uploadMedia(t.dataset.upload,t.files[0],t);});
$('#editorBlocks').addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const id=t.dataset.up||t.dataset.down||t.dataset.delete,i=data.blocks.findIndex(b=>b.id===id);if(i<0)return;if(t.dataset.delete){if(!confirm('이 블록과 연결된 학습 설명을 삭제할까요?'))return;data.blocks.splice(i,1);delete data.lessons[id];delete data.quizzes[id];if(data.highlights)delete data.highlights[id];quizAnswers.delete(id);for(const q of Object.values(data.quizzes))if(q.relatedIds)q.relatedIds=q.relatedIds.filter(x=>x!==id);for(const l of Object.values(data.lessons))if(l.relatedIds)l.relatedIds=l.relatedIds.filter(x=>x!==id);}else{const j=i+(t.dataset.up?-1:1);[data.blocks[i],data.blocks[j]]=[data.blocks[j],data.blocks[i]];}save();renderEditor();render()});
$('#addButton').onclick=()=>{const type=$('#addType').value,id='block-'+crypto.randomUUID();const position=$('#addPosition').value;const insertion=position==='start'?0:position==='end'?data.blocks.length:Math.max(0,data.blocks.findIndex(b=>b.id===position)+1);data.blocks.splice(insertion,0,{id,type,...(mediaTypes.includes(type)?{src:'',caption:'새 자료',source:''}:{text:type==='lead'?'기사의 핵심 내용을 요약해 주세요.':type==='subheading'?'소제목을 입력해 주세요.':'새 내용을 입력해 주세요.'})});if(mediaTypes.includes(type))data.lessons[id]={question:'이 자료는 어떤 내용을 보여 주나요?',relatedIds:[]};save();renderEditor();render();[...$('#editorBlocks').children][insertion]?.scrollIntoView({behavior:'smooth'})};
$('#exportButton').onclick=async()=>{const button=$('#exportButton');button.disabled=true;try{reportEditor('영상이 있으면 함께 포함해 JSON을 준비하고 있습니다.');const portable=await exportArticleData(false);const u=URL.createObjectURL(new Blob([JSON.stringify(portable,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='우리학교-뉴스-수업.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);reportEditor('✓ 영상이 포함된 JSON 파일을 저장했습니다.');}catch(err){reportEditor('내보내기 실패: '+err.message,true);}finally{button.disabled=false;}};
$('#importInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const next=validate(JSON.parse(await f.text()));if(!confirm('현재 기사를 가져온 기사로 교체할까요?'))return;data=prepareQuizzes(hydrateAssets(next));quizAnswers.clear();highlightUndo=null;index=0;reveal=0;hidden.clear();save();renderEditor();render();toast('기사를 가져왔습니다.')}catch(err){toast('가져오기 실패: '+err.message)}e.target.value=''};
$('#resetButton').onclick=()=>{if(!confirm('편집한 내용을 예시 기사로 바꿀까요? 먼저 JSON 내보내기로 보관할 수 있습니다.'))return;data=structuredClone(initial);quizAnswers.clear();highlightUndo=null;index=0;reveal=0;hidden.clear();save();renderEditor();render()};
render();

$('#downloadHtmlButton').onclick=async()=>{
 const button=$('#downloadHtmlButton');button.disabled=true;
 try{
  if(!embedded){
   const response=await fetch('./school-news.html');if(!response.ok)throw Error('먼저 npm run build를 실행해 주세요.');
   const text=await response.text();await downloadHtml(new DOMParser().parseFromString(text,'text/html'));
  }else await downloadHtml(document.cloneNode(true));
 }catch(err){reportEditor('파일 저장 실패: '+err.message,true)}finally{button.disabled=false;}
};
async function downloadHtml(doc){
 const payload=doc.getElementById('embeddedArticle');
 reportEditor('영상이 있으면 함께 포함해 사이트 파일을 준비하고 있습니다.');
 const portable=await exportArticleData(true);
 payload.textContent=JSON.stringify(portable).replaceAll('<','\\u003c');
 payload.dataset.storageKey='school-news-'+crypto.randomUUID();
 doc.querySelectorAll('.pixel-select').forEach(widget=>widget.remove());
 doc.querySelectorAll('dialog').forEach(d=>d.removeAttribute('open'));
 doc.querySelector('#toast').style.display='none';
 doc.body.classList.remove('learning');
 const html='<!doctype html>\n'+doc.documentElement.outerHTML;
 const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download='우리학교-NEWS.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
 reportEditor('✓ 영상이 포함된 사이트 파일을 저장했습니다.');toast('사이트 파일을 저장했습니다. 내려받은 HTML을 더블클릭해 열어 주세요.');
}

function renderJourney(){
 const percent=Math.round(index/Math.max(1,currentSteps().length-1)*100);
 $('#journeyPercent').textContent=percent+'%';$('#journeyFill').style.width=percent+'%';
 $('.journey-track').setAttribute('aria-valuenow',String(percent));$('.journey-label').textContent='학습 진행률';
 document.querySelectorAll('nav [data-nav]').forEach(b=>b.classList.toggle('selected',b.dataset.nav===activeNav));
}
function jumpToBlock(id){const block=[...document.querySelectorAll('#article [data-id]')].find(b=>b.dataset.id===id);block?.scrollIntoView({behavior:'smooth',block:'center'});}
document.addEventListener('click',e=>{
 const library=e.target.closest('[data-library-id]');if(library){$('#mediaDialog').close();const id=library.dataset.libraryId;setMode('read',false);const i=currentSteps().findIndex(s=>s.id===id);if(i>=0)index=i;reveal=initialReadReveal(currentSteps()[index]);panel=true;render(true);return;}
 const jump=e.target.closest('[data-map-step]');if(jump){index=Number(jump.dataset.mapStep);reveal=initialReadReveal(currentSteps()[index]);panel=true;$('#mapDialog').close();render(true);return;}
 const nav=e.target.closest('[data-nav]');if(!nav)return;
 const target=nav.dataset.nav;activeNav=target;
 if(target==='home'){setMode('read',false);render();window.scrollTo({top:0,behavior:'smooth'});}
 if(target==='article'){setMode('read',false);render();$('#article').scrollIntoView({behavior:'smooth'});}
 if(target==='media'){$('#mediaDialogList').innerHTML=resourceList();$('#mediaDialog').showModal();}
 if(target==='map'){renderJourney();$('#mapSteps').innerHTML=currentSteps().map((step,i)=>`<button data-map-step="${i}" class="${i===index?'current':''}"><span>${String(i+1).padStart(2,'0')}</span>${esc(step.name)}${i===index?' · 현재 위치':''}</button>`).join('');$('#mapDialog').showModal();}
 if(target==='structure'||target==='concept'){setMode('read',false);index=target==='structure'?Math.min(1,currentSteps().length-1):currentSteps().length-1;reveal=0;render(true);}
});

function portableData(){
 const copy=structuredClone(data);
 const bySource=new Map(Object.entries(packagedAssets).map(([key,value])=>[value,key]));
 for(const block of copy.blocks)if(bySource.has(block.src))block.src=bySource.get(block.src);
 return copy;
}

// Styled, keyboard-operable menus keep their native selects as the data source.
function enhanceSelects(scope){
 for(const select of scope.querySelectorAll('select')){
  if(!select.id)continue;
  const previous=document.getElementById(select.id+'-widget');previous?.remove();
  select.classList.add('native-select');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  const widget=document.createElement('div');widget.className='pixel-select';widget.id=select.id+'-widget';
  const option=select.selectedOptions[0];
  widget.innerHTML=`<button type="button" class="select-trigger" id="${select.id}-trigger" role="combobox" aria-expanded="false" aria-haspopup="listbox" aria-controls="${select.id}-choices" aria-label="${esc(select.getAttribute('aria-label')||select.labels?.[0]?.textContent||'선택')}"><span class="select-emblem">${icon(select.id==='stepSelect'?'map':select.id==='addType'?'picture':'flag')}</span><span class="select-value">${esc(option?.textContent)}</span><span class="select-chevron" aria-hidden="true">⌄</span></button><div class="select-menu" id="${select.id}-choices" role="listbox" aria-label="선택 항목" hidden>${[...select.options].map((o,i)=>`<button type="button" role="option" data-select-option="${i}" aria-selected="${o.selected}" ${o.disabled?'disabled':''}><span class="option-check">${o.selected?'✓':''}</span><span>${esc(o.textContent)}</span></button>`).join('')}</div>`;
  select.after(widget);
 }
}
function closeSelectMenus(except){for(const menu of document.querySelectorAll('.select-menu'))if(menu!==except){menu.hidden=true;menu.previousElementSibling.setAttribute('aria-expanded','false');}}
document.addEventListener('click',e=>{
 const trigger=e.target.closest('.select-trigger');
 if(trigger){const menu=trigger.nextElementSibling;const open=menu.hidden;closeSelectMenus(menu);menu.hidden=!open;trigger.setAttribute('aria-expanded',String(open));if(open)menu.querySelector('[aria-selected="true"]')?.focus();return;}
 const option=e.target.closest('[data-select-option]');
 if(option){const widget=option.closest('.pixel-select');const id=widget.id.slice(0,-7);const select=document.getElementById(id);select.selectedIndex=Number(option.dataset.selectOption);closeSelectMenus();select.dispatchEvent(new Event('change',{bubbles:true}));document.getElementById(id+'-trigger')?.focus();return;}
 if(!e.target.closest('.pixel-select'))closeSelectMenus();
 const phase=e.target.closest('[data-reveal-stage]');if(phase){reveal=Number(phase.dataset.revealStage);render();}
});
document.addEventListener('change',e=>{if(e.target.tagName==='SELECT')enhanceSelects(document);});
document.addEventListener('keydown',e=>{
 const widget=e.target.closest('.pixel-select');if(!widget)return;
 const menu=widget.querySelector('.select-menu'),trigger=widget.querySelector('.select-trigger');
 const options=[...menu.querySelectorAll('[role="option"]:not(:disabled)')];let position=options.indexOf(document.activeElement);
 if(['ArrowDown','ArrowUp','Home','End','Escape'].includes(e.key))e.preventDefault();
 if(e.key==='Escape'){menu.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus();return;}
 if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
  menu.hidden=false;trigger.setAttribute('aria-expanded','true');
  position=e.key==='Home'?0:e.key==='End'?options.length-1:position<0?(e.key==='ArrowUp'?options.length-1:0):(position+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;
  options[position]?.focus();
 }
});

$('#helpButton').onclick=()=>$('#helpDialog').showModal();
const onlineClassroom=['http:','https:'].includes(location.protocol)&&!['localhost','127.0.0.1','::1'].includes(location.hostname);
$('#connectionStatus').textContent=onlineClassroom?'● 온라인 교실':'● 이 기기에서 이용 중';
$('#connectionStatus').title=onlineClassroom?'이 주소를 즐겨찾기하세요. 업데이트 후 새로고침하면 최신 기능을 사용할 수 있습니다.':'오프라인 파일 또는 개발용 서버에서 이용 중입니다.';

function currentSteps(){return buildLearningSteps(data);}
function setMode(next,scroll=true){
 const step=currentSteps()[index];
 if(next==='read'){const related=currentSteps().findIndex(s=>s.kind==='block'&&s.id===step.id);index=related>=0?related:0;}
 else{const related=currentSteps().findIndex(s=>s.kind==='quiz'&&s.id===step.id);if(related>=0)index=related;}
 reveal=initialReadReveal(currentSteps()[index]);panel=true;render(scroll);
}
function quizState(id){
 const q=data.quizzes?.[id],block=data.blocks.find(b=>b.id===id);
 const signature=JSON.stringify([q,block?.type,block?.text,block?.caption,(q?.relatedIds||[]).map(related=>data.blocks.find(b=>b.id===related)?.text)]);let state=quizAnswers.get(id);
 if(!state||state.signature!==signature){state={signature,choice:null,submitted:false,correct:false};quizAnswers.set(id,state);}
 return state;
}
function renderQuizSide(){
 if(!panel){$('#sidebar').innerHTML='<button data-action="panel">퀴즈 패널 다시 보기 →</button>';return;}
 const steps=currentSteps(),step=steps[index];
 if(step.kind==='quiz-empty'){
  $('#sidebar').innerHTML=`<section class="lesson-panel quiz-panel"><div class="lesson-number">${icon('flag')} 퀴즈 탐험</div><h3 class="lesson-title">이 기사에 퀴즈를 더해 볼까요?</h3><p>선생님 편집실에서 기사 요소별로 문제·보기·정답·해설을 등록해 주세요. 완성된 퀴즈만 기사에 배치된 순서대로 표시됩니다.</p><button class="primary" data-quiz-action="edit">퀴즈 만들러 가기</button><button data-quiz-action="reading">기사 설명 다시 보기</button></section>`;return;
 }
 if(step.kind==='quiz-summary'){
  const questions=steps.filter(s=>s.kind==='quiz'),states=questions.map(s=>quizState(s.id));
  const correct=states.filter(s=>s.submitted&&s.correct).length,review=states.filter(s=>s.submitted&&!s.correct).length,unanswered=states.filter(s=>!s.submitted).length;
  $('#sidebar').innerHTML=`<section class="lesson-panel quiz-panel"><div class="lesson-number">${icon('check')} 탐험 마무리</div><h3 class="lesson-title">배운 내용을 돌아봐요</h3><div class="quiz-totals"><span>이해했어요 <b>${correct}</b></span><span>다시 살펴봐요 <b>${review}</b></span><span>아직 안 풀었어요 <b>${unanswered}</b></span></div><div class="quiz-review-list">${questions.map((s,i)=>{const state=quizState(s.id);return `<button data-quiz-jump="${steps.findIndex(step=>step.kind==='quiz'&&step.id===s.id)}"><span>${i+1}. ${esc(labels[data.blocks.find(b=>b.id===s.id).type])}</span><small>${!state.submitted?'아직 안 풀었어요':state.correct?'✓ 이해했어요':'↻ 다시 살펴봐요'}</small></button>`;}).join('')}</div><p class="muted">문제를 누르면 해당 기사 부분과 퀴즈로 돌아갑니다. 점수 대신 이해한 내용과 다시 살펴볼 내용을 확인해요.</p><button class="primary" data-action="restart">처음부터 다시 학습</button><button data-quiz-action="reading">기사 설명 다시 보기</button></section>`;return;
 }
 const q=data.quizzes[step.id],state=quizState(step.id),number=steps.filter(s=>s.kind==='quiz').findIndex(s=>s.id===step.id)+1,total=steps.filter(s=>s.kind==='quiz').length;
 $('#sidebar').innerHTML=`<section class="lesson-panel quiz-panel"><div class="lesson-number">${icon('flag')} 퀴즈 탐험 · ${number} / ${total}<button data-action="panel" aria-label="퀴즈 패널 숨기기">−</button></div><h3 class="lesson-title">${esc(labels[data.blocks.find(b=>b.id===step.id).type])} 살펴보기</h3><fieldset class="quiz-options"><legend>${esc(q.question)}</legend>${q.options.map((option,i)=>`<label class="quiz-choice ${state.choice===i?'chosen':''} ${state.submitted&&i===q.answer?'answer':''} ${state.submitted&&state.choice===i&&!state.correct?'incorrect':''}"><input type="radio" name="quiz-choice" value="${i}" data-quiz-choice="${i}" ${state.choice===i?'checked':''} ${state.submitted?'disabled':''}><span class="quiz-option-number">${i+1}</span><span>${esc(option)}</span></label>`).join('')}</fieldset>${state.submitted?`<div class="quiz-feedback ${state.correct?'correct':'review'}" role="status"><h4>${state.correct?'✓ 잘 찾았어요!':'한 번 더 살펴볼까요?'}</h4><p class="quiz-answer-line">정답은 ${q.answer+1}번 · ${esc(q.options[q.answer])}</p><p>${esc(q.explanation||'기사의 강조된 부분을 다시 확인해 보세요.')}</p></div>`:'<p class="quiz-instruction">기사에서 근거를 찾고, 알맞은 보기를 골라 주세요.</p>'}<div class="panel-buttons">${state.submitted?'<button class="primary" data-action="next">다음 내용 →</button><button data-quiz-action="retry">이 문제 다시 풀기</button>':`<button class="primary" data-quiz-action="check" ${state.choice===null?'disabled':''}>정답 확인</button><button data-quiz-action="skip">이 문제 건너뛰기</button>`}<button data-quiz-action="article">기사에서 근거 찾아보기 ↗</button></div><div class="side-note">설명에 이어 연결된 퀴즈를 확인하고, 다음 내용으로 진행합니다. 풀이 기록은 현재 열린 페이지에서 유지됩니다.</div></section>`;
}
function resourceList(){return `<div class="media-library">${data.blocks.filter(b=>mediaTypes.includes(b.type)).map((b,i)=>`<button class="library-item" data-library-id="${esc(b.id)}"><span class="library-thumb">${b.type==='video'?icon('video'):b.src?`<img src="${safeUrl(b.src)}" alt="">`:icon('picture')}</span><span class="library-text"><b>${i+1}. ${labels[b.type]}</b><small>${esc(b.caption)}</small><em>기사에서 보기 ↗</em></span></button>`).join('')||'<p class="muted">등록된 자료가 없습니다.</p>'}</div>`;}
function ensureQuiz(id){return data.quizzes[id]??={enabled:true,question:'',options:['','','',''],answer:0,explanation:'',relatedIds:[]};}
function quizEditorField(id,key,label,value){return `<div class="editor-field"><label for="${esc(id+'-quiz-'+key)}">${label}</label><textarea id="${esc(id+'-quiz-'+key)}" data-quiz-field="${key}" data-owner="${esc(id)}">${esc(value)}</textarea></div>`;}
function renderQuizEditor(block,paragraphs){
 const q=data.quizzes[block.id],options=q?.options||['','','',''];
 return `<details class="lesson-settings quiz-settings"><summary>${icon('flag')} 탐험 퀴즈 편집 <span>${quizReady(q)?'등록됨':'선택 사항'} ＋</span></summary><label class="check quiz-enable"><input type="checkbox" data-quiz-enabled="${esc(block.id)}" ${q&&q.enabled!==false?'checked':''}>이 요소의 설명 뒤에 퀴즈 연결</label>${quizEditorField(block.id,'question','퀴즈 질문',q?.question)}<div class="quiz-editor-options">${options.map((option,i)=>`<div class="editor-field"><label for="${esc(block.id+'-option-'+i)}">보기 ${i+1}</label><textarea id="${esc(block.id+'-option-'+i)}" data-quiz-option="${i}" data-owner="${esc(block.id)}">${esc(option)}</textarea></div>`).join('')}</div><div class="editor-field"><label for="quiz-answer-${esc(block.id)}">정답 선택</label><select id="quiz-answer-${esc(block.id)}" data-quiz-answer="${esc(block.id)}">${options.map((_,i)=>`<option value="${i}" ${(q?.answer??0)===i?'selected':''}>${i+1}번 보기</option>`).join('')}</select></div>${quizEditorField(block.id,'explanation','정답 해설',q?.explanation)}<label>정답 확인 후 함께 강조할 문단</label>${paragraphs.filter(p=>p.id!==block.id).map(p=>`<label class="check"><input type="checkbox" data-quiz-related="${esc(block.id)}" value="${esc(p.id)}" ${(q?.relatedIds||[]).includes(p.id)?'checked':''}>${esc(p.text?.slice(0,28))}…</label>`).join('')}<p class="quiz-editor-status" data-quiz-status="${esc(block.id)}">${quizReady(q)?'✓ 이 요소의 설명 뒤에 퀴즈가 이어집니다.':'사용을 켜고 질문과 모든 보기를 입력하면 설명 바로 뒤에 퀴즈가 이어집니다.'}</p></details>`;
}
function quizEditorChanged(id){
 save();render();
 const details=[...$('#editorBlocks').querySelectorAll('.quiz-settings')].find(d=>d.querySelector('[data-quiz-enabled]')?.dataset.quizEnabled===id);
 if(details){details.querySelector('[data-quiz-enabled]').checked=data.quizzes[id].enabled!==false;details.querySelector('[data-quiz-status]').textContent=quizReady(data.quizzes[id])?'✓ 이 요소의 설명 뒤에 퀴즈가 이어집니다.':'사용을 켜고 질문과 모든 보기를 입력하면 설명 바로 뒤에 퀴즈가 이어집니다.';}
}
$('#editorBlocks').addEventListener('input',e=>{
 const t=e.target;if(t.dataset.quizField){ensureQuiz(t.dataset.owner)[t.dataset.quizField]=t.value;quizEditorChanged(t.dataset.owner);}
 if(t.dataset.quizOption!==undefined){ensureQuiz(t.dataset.owner).options[Number(t.dataset.quizOption)]=t.value;quizEditorChanged(t.dataset.owner);}
});
$('#editorBlocks').addEventListener('change',e=>{
 const t=e.target;let id;
 if(t.dataset.quizEnabled){id=t.dataset.quizEnabled;ensureQuiz(id).enabled=t.checked;}
 if(t.dataset.quizAnswer){id=t.dataset.quizAnswer;ensureQuiz(id).answer=Number(t.value);}
 if(t.dataset.quizRelated){id=t.dataset.quizRelated;ensureQuiz(id).relatedIds=[...$('#editorBlocks').querySelectorAll('[data-quiz-related]')].filter(x=>x.dataset.quizRelated===id&&x.checked).map(x=>x.value);}
 if(id)quizEditorChanged(id);
});
document.addEventListener('change',e=>{
 if(e.target.dataset.quizChoice===undefined)return;
 const step=currentSteps()[index];if(mode!=='quiz'||step.kind!=='quiz')return;
 const state=quizState(step.id);if(state.submitted)return;state.choice=Number(e.target.value);render();
 $('#sidebar .quiz-choice.chosen input')?.focus();
});
document.addEventListener('click',e=>{
 const jump=e.target.closest('[data-quiz-jump]');if(jump){index=Number(jump.dataset.quizJump);render(true);return;}
 const button=e.target.closest('[data-quiz-action]');if(!button)return;
 const action=button.dataset.quizAction,step=currentSteps()[index];
 if(action==='reading'){setMode('read');return;}if(action==='skip'&&step.kind==='quiz'){move(1);return;}
 if(action==='edit'){renderEditor();$('#editor').showModal();return;}
 if(action==='question'){$('#sidebar').scrollIntoView({behavior:'smooth',block:'start'});return;}
 if(mode!=='quiz'||step.kind!=='quiz')return;
 const state=quizState(step.id);
 if(action==='check'&&state.choice!==null&&!state.submitted){state.correct=gradeQuiz(data.quizzes[step.id],state.choice);state.submitted=true;render();}
 if(action==='retry'){quizAnswers.delete(step.id);render();}
 if(action==='article')jumpToBlock(step.id);
});

function articleByline(){return `<div class="byline"><strong>우리학교 학생기자단</strong><span>입력 2026.05.16 09:00</span><span class="tools"><button data-action="font" title="글자 크기 조절">가+</button><button data-action="print" title="인쇄">▤</button></span></div>`;}

function mediaWidth(block){return typeof block.displayWidth==='number'?Math.max(25,Math.min(100,block.displayWidth)):100;}
function articleScale(){return typeof data.articleScale==='number'?Math.max(50,Math.min(100,data.articleScale)):100;}
function articleViewTools(){const scale=articleScale();return `<div class="article-view-tools" role="group" aria-label="본문과 자료 함께 크기 조절"><span>${icon('lens')} 기사 화면</span><button class="classroom-toggle" data-classroom-toggle>${data.classroomFocus===true?'일반 화면':'수업 화면'}</button><button class="classroom-edit" data-classroom-edit>편집실</button><button data-article-size="-1" ${scale<=50?'disabled':''}>− 축소</button><output id="articleScaleValue" aria-live="polite">${scale}%</output><button data-article-size="1" ${scale>=100?'disabled':''}>＋ 확대</button><button data-article-reset ${scale===100?'disabled':''}>원래대로</button>${highlightTools()}</div>`;}
function applyArticleScale(){
 const article=$('#article'),surface=article.querySelector('.article-content');if(!surface)return;
 const style=getComputedStyle(article),width=article.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
 surface.style.width=Math.max(1,width)+'px';surface.style.zoom=String(articleScale()/100);
 const toolbar=article.querySelector('.article-view-tools');const clearance=toolbar.getBoundingClientRect().height+(parseFloat(getComputedStyle(toolbar).top)||0)+16;
 surface.querySelectorAll('.block').forEach(block=>block.style.scrollMarginTop=(clearance/(articleScale()/100))+'px');
 const output=$('#articleScaleValue');if(output)output.textContent=articleScale()+'%';
 article.querySelector('[data-article-size="-1"]').disabled=articleScale()<=50;
 article.querySelector('[data-article-size="1"]').disabled=articleScale()>=100;
 article.querySelector('[data-article-reset]').disabled=articleScale()===100;
}
function applyMediaWidth(block){
 const element=[...document.querySelectorAll('#article [data-id]')].find(e=>e.dataset.id===block.id);if(!element)return;
 element.querySelector('.media-wrap').style.width=mediaWidth(block)+'%';
 element.querySelector('[data-media-percent]').textContent=mediaWidth(block)+'%';
 element.querySelector('[data-size-direction="-1"]').disabled=mediaWidth(block)<=25;
 element.querySelector('[data-size-direction="1"]').disabled=mediaWidth(block)>=100;
 element.querySelector('[data-media-reset]').disabled=mediaWidth(block)===100;
}
document.addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.articleSize!==undefined||button.hasAttribute('data-article-reset')){
  data.articleScale=button.hasAttribute('data-article-reset')?100:Math.max(50,Math.min(100,articleScale()+Number(button.dataset.articleSize)*10));
  applyArticleScale();save();return;
 }
 const id=button.dataset.mediaSize||button.dataset.mediaReset;if(!id)return;
 const block=data.blocks.find(b=>b.id===id);if(!block)return;
 block.displayWidth=button.dataset.mediaReset?100:Math.max(25,Math.min(100,mediaWidth(block)+Number(button.dataset.sizeDirection)*25));
 applyMediaWidth(block);save();
});
const articleSizeObserver=new ResizeObserver(()=>applyArticleScale());
articleSizeObserver.observe($('#article'));

function reportEditor(message,error=false){const status=$('#editorStatus');status.textContent=message;status.classList.toggle('error',error);}
function uploadStatusMarkup(block){const state=uploadStatuses.get(block.id);return `<p class="upload-status ${state?.kind||''}" data-upload-status="${esc(block.id)}" role="status">${esc(state?.message||block.videoFileName&&('등록된 영상: '+block.videoFileName)||'')}${block.type==='video'?'<small>영상 최대 500MB · MP4(H.264/AAC), WebM 권장 · 지원 여부를 실제로 확인한 뒤 적용합니다.</small>':''}</p>`;}
function setUploadStatus(id,message,kind){
 uploadStatuses.set(id,{message,kind});const block=data.blocks.find(b=>b.id===id);if(!block)return;
 for(const target of document.querySelectorAll('[data-upload-status]'))if(target.dataset.uploadStatus===id){const holder=document.createElement('div');holder.innerHTML=uploadStatusMarkup(block);target.replaceWith(holder.firstElementChild);}
}
function videoPlayer(block){
 if(!block.src)return `<div class="video-empty"><b>▷</b>수업 영상 등록 대기<small style="display:block;margin-top:10px">편집에서 영상 파일 또는 직접 재생 URL을 추가하세요.</small></div>`;
 if(block.src.startsWith('local-video:')&&!localVideos.has(block.src))return `<div class="video-empty"><b>▷</b>${esc(uploadStatuses.get(block.id)?.message||'이 기기에 저장된 영상을 불러오고 있습니다.')}<small style="display:block;margin-top:10px">다른 기기에서는 영상이 포함된 JSON/HTML을 가져오거나 영상 파일을 다시 등록해 주세요.</small></div>`;
 return `<div class="video-player"><video controls playsinline preload="metadata" data-video-id="${esc(block.id)}" src="${safeUrl(block.src)}" aria-label="${esc(block.caption||'기사 영상 자료')}"></video><p class="video-error" role="alert" hidden></p>${block.videoFileName?`<small class="video-file-label">${esc(block.videoFileName)}</small>`:''}</div>`;
}
function openVideoDatabase(){
 if(!videoDatabasePromise)videoDatabasePromise=new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(Error('이 브라우저는 영상 저장 공간을 지원하지 않습니다. Chrome 또는 Edge를 사용해 주세요.'));return;}
  const request=indexedDB.open('news-classroom-media-v1',1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('files'))request.result.createObjectStore('files',{keyPath:'id'});};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>{videoDatabasePromise=undefined;reject(request.error||Error('영상 저장 공간을 열지 못했습니다.'));};
  request.onblocked=()=>{videoDatabasePromise=undefined;reject(Error('다른 창을 닫은 뒤 영상 업로드를 다시 시도해 주세요.'));};
 });return videoDatabasePromise;
}
async function videoRecord(id,record){
 const database=await openVideoDatabase();return new Promise((resolve,reject)=>{
  const transaction=database.transaction('files',record?'readwrite':'readonly'),store=transaction.objectStore('files');
  const request=record?store.put(record):store.get(id);let result;
  request.onsuccess=()=>{result=request.result;};transaction.oncomplete=()=>resolve(result);
  transaction.onerror=transaction.onabort=()=>reject(transaction.error||request.error||Error('영상 저장에 실패했습니다.'));
 });
}
function readBlobAsDataURL(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('파일을 읽지 못했습니다. 기기에 완전히 다운로드된 파일을 선택해 주세요.'));reader.onabort=()=>reject(Error('파일 읽기가 중단되었습니다.'));reader.readAsDataURL(blob);});}
function probeVideo(url){return new Promise((resolve,reject)=>{
 const video=document.createElement('video');video.preload='auto';video.muted=true;video.playsInline=true;
 const finish=(error)=>{clearTimeout(timer);video.oncanplay=null;video.onerror=null;video.pause();video.removeAttribute('src');video.load();error?reject(error):resolve();};
 const timer=setTimeout(()=>finish(Error('영상 재생 준비를 확인하지 못했습니다. 파일이 완전히 다운로드되었는지 확인하거나 MP4(H.264/AAC)로 변환해 주세요.')),20000);
 video.oncanplay=()=>{if(!video.videoWidth||!video.videoHeight)finish(Error('화면이 없는 오디오 파일입니다. 영상 파일을 선택해 주세요.'));else finish();};
 video.onerror=()=>finish(Error('현재 브라우저가 이 영상의 형식·코덱을 재생하지 못하거나 파일이 손상되었습니다. MP4(H.264/AAC) 또는 WebM 파일을 사용해 주세요.'));
 video.src=url;video.load();
 });}
async function uploadMedia(id,file,input){
 const block=data.blocks.find(b=>b.id===id);if(!block)return;
 const limit=block.type==='video'?500:20;
 if(file.size>limit*1024*1024){setUploadStatus(id,`${limit}MB 이하의 파일을 선택해 주세요. 현재 파일: ${(file.size/1024/1024).toFixed(1)}MB`,'error');input.value='';return;}
 if(file.size===0){setUploadStatus(id,'비어 있는 파일입니다. 다운로드를 완료한 파일을 선택해 주세요.','error');input.value='';return;}
 input.disabled=true;setUploadStatus(id,'파일을 읽고 재생 가능 여부를 확인하고 있습니다…','pending');let candidateUrl;
 try{
  if(block.type==='video'){
   const ext=file.name.split('.').pop().toLowerCase(),mime=file.type.startsWith('video/')?file.type:({mp4:'video/mp4',m4v:'video/mp4',mov:'video/quicktime',webm:'video/webm',ogv:'video/ogg'}[ext]||file.type||'application/octet-stream');
   const blob=new Blob([file],{type:mime});candidateUrl=URL.createObjectURL(blob);await probeVideo(candidateUrl);
   setUploadStatus(id,'재생 확인 완료. 이 기기의 영상 저장 공간에 저장하고 있습니다…','pending');
   const token='local-video:'+crypto.randomUUID();await videoRecord(token,{id:token,blob,name:file.name,type:mime});
   if(!data.blocks.includes(block))throw Error('자료 블록이 삭제되어 영상 적용을 중단했습니다.');
   localVideos.set(token,{url:candidateUrl,blob,name:file.name});candidateUrl=null;block.src=token;block.videoFileName=file.name;
   setUploadStatus(id,`✓ 적용 완료 · ${file.name} (${(file.size/1024/1024).toFixed(1)}MB) · 이 기기에 저장되었습니다.`,'success');
  }else{block.src=await readBlobAsDataURL(file);setUploadStatus(id,'✓ 이미지가 적용되었습니다.','success');}
  const saved=save();if(!saved)setUploadStatus(id,'현재 화면에는 적용했지만 기사 설정을 저장하지 못했습니다. JSON 또는 사이트 파일로 내보내 주세요.','error');render();renderEditor();
 }catch(error){
  const message=error.name==='QuotaExceededError'?'이 기기의 저장 공간이 부족합니다. 브라우저 저장 공간을 확보하거나 더 작은 영상을 선택해 주세요.':error.message;
  setUploadStatus(id,message+' 기존 자료는 그대로 유지됩니다.','error');
 }finally{if(candidateUrl)URL.revokeObjectURL(candidateUrl);input.disabled=false;input.value='';}
}
async function restoreLocalVideos(){
 const blocks=data.blocks.filter(b=>b.type==='video'&&b.src?.startsWith('local-video:')&&!localVideos.has(b.src));if(!blocks.length)return;
 await Promise.all(blocks.map(async block=>{try{const record=await videoRecord(block.src);if(!record?.blob)throw Error('이 기기에 해당 영상 파일이 없습니다. 편집실에서 다시 선택해 주세요.');localVideos.set(block.src,{url:URL.createObjectURL(record.blob),blob:record.blob,name:record.name});}catch(error){setUploadStatus(block.id,error.message,'error');}}));
 render();
}
async function exportArticleData(compact){
 const copy=compact?portableData():structuredClone(data);
 for(const block of copy.blocks){if(!block.src?.startsWith('local-video:'))continue;const cached=localVideos.get(block.src);const record=cached?.blob?cached:await videoRecord(block.src);if(!record?.blob)throw Error('영상 파일이 이 기기에 없습니다. 편집실에서 다시 등록한 뒤 내보내 주세요.');block.src=await readBlobAsDataURL(record.blob);}
 return copy;
}
document.addEventListener('error',e=>{
 const video=e.target;if(video.tagName!=='VIDEO'||!video.dataset.videoId)return;
 const message=video.error?.code===2?'영상을 불러오지 못했습니다. 인터넷 연결과 영상 주소를 확인해 주세요.':'이 브라우저에서 영상을 재생하지 못했습니다. MP4(H.264/AAC) 또는 WebM 파일을 다시 등록해 주세요.';
 const status=video.closest('.video-player')?.querySelector('.video-error');if(status){status.textContent=message;status.hidden=false;}
},true);
document.addEventListener('loadeddata',e=>{if(e.target.tagName==='VIDEO'){const status=e.target.closest('.video-player')?.querySelector('.video-error');if(status)status.hidden=true;}},true);
restoreLocalVideos();

document.addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-classroom-toggle')){data.classroomFocus=data.classroomFocus!==true;if(data.classroomFocus)data.articleScale=100;render();save();window.scrollTo({top:0,behavior:'smooth'});}
 if(button.hasAttribute('data-classroom-edit')){renderEditor();$('#editor').showModal();}
});

function highlightedText(block){
 const text=block.text||'',entry=data.highlights?.[block.id];if(!entry||entry.text!==text)return esc(text);
 let html='',cursor=0;
 for(const range of entry.ranges){html+=esc(text.slice(cursor,range.start))+`<mark class="text-highlight highlight-${range.color}">${esc(text.slice(range.start,range.end))}</mark>`;cursor=range.end;}
 return html+esc(text.slice(cursor));
}
function hasHighlights(){return Object.values(data.highlights||{}).some(entry=>entry.ranges.length>0);}
function highlightTools(){return `<div class="highlight-tools" role="group" aria-label="본문 형광펜"><span class="highlight-label">${icon('pen')} 형광펜</span>${highlightColors.map((color,i)=>`<button class="highlighter-color ${color}" data-highlight-color="${color}" aria-label="${['노랑','연두','분홍'][i]} 형광펜" disabled><span aria-hidden="true"></span>${['노랑','연두','분홍'][i]}</button>`).join('')}<button data-highlight-erase disabled>선택 지우기</button><button data-highlight-clear ${hasHighlights()?'':'disabled'}>전체 지우기</button><button data-highlight-undo ${highlightUndo?'':'disabled'}>되돌리기</button><small data-highlight-help>본문을 드래그한 뒤 색을 눌러 주세요.</small></div>`;}
function selectedHighlightRanges(){
 const selection=window.getSelection();if(!selection||selection.isCollapsed||!selection.rangeCount)return [];
 const selected=selection.getRangeAt(0),result=[];
 for(const element of document.querySelectorAll('#article [data-highlight-text]')){
  if(!selected.intersectsNode(element))continue;
  const full=document.createRange();full.selectNodeContents(element);const part=selected.cloneRange();
  if(part.compareBoundaryPoints(Range.START_TO_START,full)<0)part.setStart(element,0);
  if(part.compareBoundaryPoints(Range.END_TO_END,full)>0)part.setEnd(element,element.childNodes.length);
  const prefix=document.createRange();prefix.selectNodeContents(element);prefix.setEnd(part.startContainer,part.startOffset);
  const start=prefix.toString().length,end=start+part.toString().length;
  const block=data.blocks.find(b=>b.id===element.dataset.highlightText);
  if(block&&end>start&&end<=block.text.length)result.push({id:block.id,start,end,text:block.text});
 }
 return result;
}
function syncHighlightTools(){
 const ready=highlightSelection.length>0;
 for(const button of document.querySelectorAll('[data-highlight-color],[data-highlight-erase]'))button.disabled=!ready;
 const help=document.querySelector('[data-highlight-help]');if(help)help.textContent=ready?'선택한 부분에 색을 칠하거나 지울 수 있어요.':'본문을 드래그한 뒤 색을 눌러 주세요.';
}
function applyUserHighlight(color){
 const selection=selectedHighlightRanges();if(selection.length)highlightSelection=selection;
 const ranges=highlightSelection.filter(range=>data.blocks.find(b=>b.id===range.id)?.text===range.text);if(!ranges.length)return;
 highlightUndo=structuredClone(data.highlights||{});data.highlights??={};
 for(const selected of ranges){
  const previous=data.highlights[selected.id],ranges=previous?.text===selected.text?previous.ranges:[];
  const next=paintHighlightRanges(ranges,selected.start,selected.end,color);
  if(next.length)Object.defineProperty(data.highlights,selected.id,{value:{text:selected.text,ranges:next},enumerable:true,writable:true,configurable:true});else delete data.highlights[selected.id];
 }
 window.getSelection()?.removeAllRanges();save();renderArticle();
}
document.addEventListener('selectionchange',()=>{const selected=selectedHighlightRanges();if(selected.length)highlightSelection=selected;syncHighlightTools();});
document.addEventListener('pointerdown',e=>{
 if(!e.target.closest('[data-highlight-color],[data-highlight-erase]'))return;
 const selected=selectedHighlightRanges();if(selected.length)highlightSelection=selected;
 if(e.pointerType!=='touch')e.preventDefault();
});
document.addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.highlightColor){applyUserHighlight(button.dataset.highlightColor);return;}
 if(button.hasAttribute('data-highlight-erase')){applyUserHighlight(null);return;}
 if(button.hasAttribute('data-highlight-clear')&&hasHighlights()){highlightUndo=structuredClone(data.highlights);data.highlights={};window.getSelection()?.removeAllRanges();save();renderArticle();return;}
 if(button.hasAttribute('data-highlight-undo')&&highlightUndo){data.highlights=highlightUndo;highlightUndo=null;window.getSelection()?.removeAllRanges();save();renderArticle();}
});

function initialReadReveal(step){if(step?.kind!=='block'||!step.id)return 0;const block=data.blocks.find(b=>b.id===step.id);return block&&mediaTypes.includes(block.type)&&phases(data.lessons[step.id]||{})[0]?.key==='question'?1:0;}
function currentMaterialCard(block){const lesson=data.lessons[block.id]||{};return `<div class="current-material"><span class="current-material-thumb">${block.type==='video'?icon('video'):block.src?`<img src="${safeUrl(block.src)}" alt="">`:icon('picture')}</span><div><small>${esc(labels[block.type])} · 현재 살펴보는 자료</small><p>${esc(block.caption||'캡션이 없는 자료입니다.')}</p><button data-edit-lesson="${esc(block.id)}">질문·설명 편집</button></div></div>${lesson.question&&!lesson.explanation&&!lesson.effect?'<p class="material-config-note">이 자료의 관찰 질문만 등록되어 있어요. 글과의 관계·표현 효과는 위의 질문·설명 편집에서 추가할 수 있습니다.</p>':''}`;}
function focusMaterialLesson(id,forceRead=false){
 if(forceRead&&mode!=='read')setMode('read',false);
 const i=currentSteps().findIndex(step=>step.id===id);if(i<0){toast('이 자료에는 등록된 퀴즈가 없습니다. 자료 설명 보기로 학습 내용을 확인해 주세요.');return;}
 index=i;reveal=initialReadReveal(currentSteps()[index]);panel=true;render(true);
}
document.addEventListener('click',e=>{
 const lesson=e.target.closest('[data-material-lesson]');if(lesson){focusMaterialLesson(lesson.dataset.materialLesson,true);return;}
 const picture=e.target.closest('[data-media-focus]');if(picture){focusMaterialLesson(picture.dataset.mediaFocus);return;}
 const edit=e.target.closest('[data-edit-lesson]');if(edit){
  renderEditor();$('#editor').showModal();const id=edit.dataset.editLesson;
  const field=[...$('#editorBlocks').querySelectorAll('[data-field="question"][data-lesson]')].find(element=>element.dataset.owner===id);
  if(field){field.closest('details').open=true;field.closest('.editor-block').scrollIntoView({behavior:'smooth',block:'start'});field.focus({preventScroll:true});}
 }
});

function syncLessonHeaderHeight(){
 const header=document.querySelector('.lesson-header');if(!header)return;
 const height=Math.ceil(header.getBoundingClientRect().height)+'px';
 if(document.documentElement.style.getPropertyValue('--lesson-header-height')!==height){document.documentElement.style.setProperty('--lesson-header-height',height);applyArticleScale();}
}
const lessonHeaderObserver=new ResizeObserver(syncLessonHeaderHeight);
lessonHeaderObserver.observe(document.querySelector('.lesson-header'));
syncLessonHeaderHeight();
