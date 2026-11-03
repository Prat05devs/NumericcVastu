import assert from 'node:assert/strict';
import {readChart, validBirthDate, combine, NUMBERS, kuaNumber, KUA} from '../src/lib/numerology.js';
import {nameNumbers, phoneNumbers, readProfile} from '../src/lib/profileNumbers.js';
import {createFullReport} from '../src/lib/fullReport.js';
const today=new Date(2026,10,1,12);
// Independently transcribed values from the supplied completed Biyyani report.
const sample=readChart('1977-09-17','',today);
assert.equal(sample.mulank,8);assert.equal(sample.bhagyank,5);
assert.deepEqual(sample.counts,{1:2,2:0,3:0,4:0,5:1,6:0,7:3,8:1,9:2});
const name=nameNumbers('Viekram Biyyani');
assert.equal(name.first.total,21);assert.equal(name.first.number,3);
assert.equal(name.total,33);assert.equal(name.number,6);assert.equal(name.letterCount,14);
assert.deepEqual(combine(6,1),{friend:[1,2,5,6,7,9],enemy:[3,8],neutral:[4],shortTerm:[]});
assert.deepEqual(combine(8,5),{friend:[3,5,6,7],enemy:[1,2],neutral:[9],shortTerm:[4,8]});
assert.equal(NUMBERS[3].colour,'Yellow');assert.equal(NUMBERS[8].colour,'Black');
const profile=readProfile({dob:'1990-05-23',gender:'male',name:'Priya Sharma',phone:'98765 43210',today});
assert.equal(profile.phoneAnalysis.total,45);assert.equal(profile.phoneAnalysis.number,9);
assert.equal(profile.phoneAnalysis.mulank,'neutral');assert.equal(profile.phoneAnalysis.bhagyank,'enemy');
assert.equal(profile.nameAnalysis.total,29);assert.equal(profile.nameAnalysis.number,2);
assert.deepEqual(profile.vedicCounts,{1:0,2:2,3:1,4:0,5:2,6:0,7:0,8:0,9:1});
assert.equal(profile.phoneAnalysis.name,'enemy');
assert.equal(kuaNumber(2002,'male'),7);
assert.deepEqual(KUA[7].favourable.map(p=>[p.key,p.direction]),[['growth','West'],['wellbeing','South-west'],['success','North-west'],['relationships','North-east']]);
for(const entry of Object.values(KUA)){assert.equal(new Set(entry.favourable.map(p=>p.direction)).size,4);assert.equal(entry.best,entry.favourable.find(p=>p.key==='success').direction)}
assert.equal(kuaNumber(1990,'male'),1);assert.equal(kuaNumber(1990,'female'),8);
assert.equal(kuaNumber(2000,'male'),9);assert.equal(kuaNumber(2000,'female'),6);
assert(validBirthDate('2000-02-29',today));
for(const dob of ['1900-02-29','1990-02-31','0000-01-01','1899-12-31','2027-01-01','1990-00-00','invalid']){
 assert(!validBirthDate(dob,today));assert.throws(()=>readChart(dob,'',today));
}
for(const bad of ['', 'नाम', '<script>', 'a'.repeat(121)])assert.throws(()=>nameNumbers(bad));
for(const bad of ['+919876543210','123','0000000000','123abc4567'])assert.throws(()=>phoneNumbers(bad,5,2));
const report=createFullReport({dob:'1977-09-17',name:'Viekram Biyyani',phone:'9876543210',today});
assert.equal(report.names.total,33);assert.equal(report.years.length,6);
assert.deepEqual(report.years.map(y=>y.year),[2026,2027,2028,2029,2030,2031]);
assert.equal(report.periods.filter(p=>p.current).length,1);
assert.equal(report.periods[0].from,1977);assert.equal(report.periods[0].to,1985);
assert.deepEqual(report.remedies.map(r=>r.n),[2,3,4,6]);
console.log('Numerology verified against the supplied name/grid example, compatibility worked example, phone arithmetic and invalid inputs.');
