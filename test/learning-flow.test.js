import {test} from 'node:test';import assert from 'node:assert/strict';
import {initial,buildLearningSteps,quizReady} from '../data.js';
test('one article pass places each linked quiz immediately after its explanation',()=>{
 const data=structuredClone(initial),steps=buildLearningSteps(data);
 const explain=steps.filter(s=>s.kind==='block');assert.equal(new Set(explain.map(s=>s.id)).size,explain.length);
 assert.deepEqual(steps.filter(s=>s.kind==='quiz').map(s=>s.id),data.blocks.filter(b=>quizReady(data.quizzes[b.id])).map(b=>b.id));
 for(let i=0;i<steps.length;i++)if(steps[i].kind==='quiz'){assert.equal(steps[i-1].kind,'block');assert.equal(steps[i-1].id,steps[i].id);}
 const body=data.blocks.findIndex(b=>b.id==='body-a'),photo=data.blocks.findIndex(b=>b.id==='photo-a');assert.ok(photo<body);assert.ok(explain.findIndex(s=>s.id==='photo-a')<explain.findIndex(s=>s.id==='body-a'));
});
test('missing, disabled and incomplete quizzes add no detours or empty quiz page',()=>{
 const data=structuredClone(initial);data.quizzes={};let steps=buildLearningSteps(data);assert.equal(steps.some(s=>s.kind.startsWith('quiz')),false);assert.equal(steps.at(-1).kind,'concept');
 data.quizzes.title={...structuredClone(initial.quizzes.title),enabled:false};data.quizzes.lead={...structuredClone(initial.quizzes.lead),question:''};steps=buildLearningSteps(data);assert.equal(steps.some(s=>s.kind==='quiz'),false);
});
test('quiz-only text gets its own article explanation position before the question',()=>{
 const data=structuredClone(initial);delete data.lessons.title;const steps=buildLearningSteps(data),i=steps.findIndex(s=>s.kind==='quiz'&&s.id==='title');assert.ok(i>0);assert.deepEqual(steps[i-1],{kind:'block',id:'title',name:'설명 · 기사 제목'});
});
