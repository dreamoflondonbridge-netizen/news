import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,validate,buildQuizSteps,quizReady,gradeQuiz,prepareQuizzes} from '../data.js';

test('quiz order follows every block position, including repeated media types',()=>{
 const data=structuredClone(initial);
 assert.deepEqual(buildQuizSteps(data).filter(s=>s.kind==='quiz').map(s=>s.id),data.blocks.filter(b=>data.quizzes[b.id]).map(b=>b.id));
 const a=data.blocks.findIndex(b=>b.id==='photo-a'),b=data.blocks.findIndex(b=>b.id==='photo-b');
 [data.blocks[a],data.blocks[b]]=[data.blocks[b],data.blocks[a]];
 const media=buildQuizSteps(data).filter(s=>['photo-a','photo-b'].includes(s.id));
 assert.deepEqual(media.map(s=>s.id),['photo-b','photo-a']);
 assert.notEqual(data.quizzes['photo-a'].question,data.quizzes['photo-b'].question);
});
test('disabled, incomplete, and deleted-block quizzes never become questions',()=>{
 const data=structuredClone(initial);
 data.quizzes.title.enabled=false;
 data.quizzes.lead.options[1]='';
 data.blocks=data.blocks.filter(b=>b.id!=='rules');
 assert.equal(buildQuizSteps(data).some(s=>['title','lead','rules'].includes(s.id)),false);
 assert.equal(buildQuizSteps({...data,quizzes:{}})[0].kind,'quiz-empty');
});
test('grading validates selection bounds and distinguishes right and wrong',()=>{
 const q=initial.quizzes.title;
 assert.equal(quizReady(q),true);assert.equal(gradeQuiz(q,q.answer),true);assert.equal(gradeQuiz(q,0),false);
 assert.throws(()=>gradeQuiz(q,-1));assert.throws(()=>gradeQuiz(q,100));assert.throws(()=>gradeQuiz(q,null));
});
test('old untouched example receives example quizzes while edited articles stay untouched',()=>{
 const example=structuredClone(initial);delete example.quizzes;prepareQuizzes(example);
 assert.deepEqual(example.quizzes,initial.quizzes);
 const edited=structuredClone(initial);delete edited.quizzes;edited.blocks[0].text='교사의 다른 기사';
 prepareQuizzes(edited);assert.deepEqual(edited.quizzes,{});assert.equal(edited.blocks[0].text,'교사의 다른 기사');
 const deliberate=structuredClone(initial);deliberate.quizzes={};prepareQuizzes(deliberate);assert.deepEqual(deliberate.quizzes,{});
});
test('old JSON, disabled drafts and new quiz JSON remain compatible',()=>{
 const old=structuredClone(initial);delete old.quizzes;assert.doesNotThrow(()=>validate(old));
 const next=JSON.parse(JSON.stringify(initial));assert.doesNotThrow(()=>validate(next));
 next.quizzes.title={enabled:false,question:'',options:['','','',''],answer:0,explanation:'',relatedIds:[]};
 assert.doesNotThrow(()=>validate(next));assert.equal(quizReady(next.quizzes.title),false);
});
test('malformed quiz answers and related paragraph data are rejected on import',()=>{
 for(const change of [q=>q.answer=4,q=>q.options='보기',q=>q.relatedIds='lead',q=>q.enabled='yes']){
  const data=structuredClone(initial);change(data.quizzes.title);assert.throws(()=>validate(data));
 }
});
