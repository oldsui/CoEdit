var Operation = require('./operation.js');


var str = '012345';

var testCase = 2;

Ajson = {};
Bjson = {};

// 9 testing testCases
/*

A\B		ins 	del
ins 	1		2	

del 	3		4

*/

// testCase 1: A insert, B insert
if (testCase == 1) {
	Ajson = {position:2, value: 'a', strLen: str.length};
	Bjson = {position:2, value: 'b', strLen: str.length};
}


// testCase 2: A insert, B del
if (testCase == 2) {
	Ajson = {position:2, value: 'a', strLen: str.length};
	Bjson = {position:2, value: 'Del', strLen: str.length};
}

// testCase 3: A del, B insert
if (testCase == 3) {
	Ajson = {position:2, value: 'Del', strLen: str.length};
	Bjson = {position:2, value: 'a', strLen: str.length};
}


// testCase 4: A del, B del
if (testCase == 4) {
	Ajson = {position:2, value: 'Del', strLen: str.length};
	Bjson = {position:2, value: 'Del', strLen: str.length};
}





Aimport = Operation.importOps(Ajson);
Bimport = Operation.importOps(Bjson);

console.log ("Imported opeations are: ");
Aimport.displayOps();
Bimport.displayOps();


console.log( "Operation Aimport results: "+Aimport.apply(str) );
console.log( "Operation Bimport results: "+Bimport.apply(str) );


console.log("Transformed operations are: ");
Aprime = Operation.transform(Aimport, Bimport)[0];
Bprime = Operation.transform(Aimport, Bimport)[1];

Aprime.displayOps();
Bprime.displayOps();


console.log( "Aimport + Bprime results: "+ Bprime.apply(Aimport.apply(str)) );
console.log( "Bimport + Aprime results: "+ Aprime.apply(Bimport.apply(str)) );




ApExp = Operation.exportOps(Aprime);
console.log(ApExp);

BpExp = Operation.exportOps(Bprime);
console.log(BpExp);


