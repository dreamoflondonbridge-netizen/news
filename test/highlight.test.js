import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,validate,paintHighlightRanges} from '../data.js';
test('new colors replace overlapping bands while preserving outside text',()=>{
 assert.deepEqual(paintHighlightRanges([{start:0,end:12,color:'yellow'}],3,8,'mint'),[{start:0,end:3,color:'yellow'},{start:3,end:8,color:'mint'},{start:8,end:12,color:'yellow'}]);
});
test('partial erasing splits a band and adjacent same colors merge',()=>{
 assert.deepEqual(paintHighlightRanges([{start:0,end:12,color:'pink'}],4,9,null),[{start:0,end:4,color:'pink'},{start:9,end:12,color:'pink'}]);
 assert.deepEqual(paintHighlightRanges([{start:0,end:3,color:'yellow'}],3,7,'yellow'),[{start:0,end:7,color:'yellow'}]);
 assert.deepEqual(paintHighlightRanges([{start:0,end:3,color:'yellow'}],0,3,null),[]);
});
test('highlights round trip safely with Unicode UTF-16 positions',()=>{
 const data=structuredClone(initial),text='윷놀이 🎲 함께해요';
 data.highlights={example:{text,ranges:[{start:4,end:6,color:'yellow'}]}};
 assert.doesNotThrow(()=>validate(JSON.parse(JSON.stringify(data))));
 assert.equal(text.slice(4,6),'🎲');
});
test('import rejects invalid highlight colors, out of bounds and overlapping ranges',()=>{
 for(const ranges of [[{start:0,end:3,color:'red'}],[{start:0,end:100,color:'yellow'}],[{start:0,end:3,color:'yellow'},{start:2,end:4,color:'mint'}]]){
  const data=structuredClone(initial);data.highlights={example:{text:'본문 테스트',ranges}};assert.throws(()=>validate(data));
 }
 assert.throws(()=>paintHighlightRanges([],4,2,'yellow'));
});
