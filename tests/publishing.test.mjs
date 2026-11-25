import test from "node:test";
import assert from "node:assert/strict";
import {transition,validateLessonContent} from "../app/lib/publishing.mjs";
const teacher={id:"t",role:"teacher",active:true};
const reviewer={id:"r",role:"reviewer",active:true};
const approval={accuracy:true,answerKeys:true,rights:true,safeguarding:true,accessibility:true};
const step=(state,action,actor,extra={})=>transition({state,action,actor,ownerId:"t",authorId:"t",...extra});
test("independent review and publication",()=>{
 assert.equal(step("draft","submitted",teacher),"submitted");
 assert.equal(step("submitted","approved",reviewer,{approval}),"approved");
 assert.equal(step("approved","published",reviewer),"published");
 assert.equal(step("published","archived",reviewer),"archived");
});
test("reject bypasses, inactive staff, self review, incomplete checklist",()=>{
 for(const fn of [
 ()=>step("draft","published",reviewer),
 ()=>step("submitted","approved",teacher,{approval}),
 ()=>step("submitted","approved",{...reviewer,id:"t"},{approval}),
 ()=>step("submitted","approved",reviewer),
 ()=>step("approved","published",{...reviewer,active:false}),
 ()=>step("draft","submitted",{...teacher,id:"other"}),
 ()=>step("draft","constructor",teacher),
 ()=>step("constructor","published",reviewer)
 ]) assert.throws(fn);
});
test("requested changes require a new immutable revision",()=>{
 assert.equal(step("submitted","changes_requested",reviewer),"changes_requested");
 assert.throws(()=>step("changes_requested","submitted",teacher));
});
test("validate complete lesson, reject malformed content and video URL",()=>{
 const valid={title:"Fractions",subject:"Mathematics",topic:"Numbers",objective:"Compare fractions",notes:["Use equal denominators"],examples:[{prompt:"Compare halves",steps:["Use denominator 2"]}],questions:[{id:"q1",prompt:"Which is larger?",options:["1/2","1/4"],answer:0,explanation:"One half is larger"}]};
 assert.deepEqual(validateLessonContent(valid),[]);
 assert.ok(validateLessonContent({...valid,videoId:"https://example.com"}).length);
 assert.ok(validateLessonContent({...valid,notes:[]}).length);
 assert.ok(validateLessonContent({...valid,questions:[{...valid.questions[0],answer:9}]}).length);
 assert.ok(validateLessonContent({...valid,questions:[...valid.questions,...valid.questions]}).length);
 assert.ok(validateLessonContent(null).length);
});
