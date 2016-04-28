var Operation = require('./operation.js');

var op = new Operation();

op.insert(3, '1234');
op.insert(3, '1234');
op.insert(3, '1234');
op.insert(3, '1234');



op.delete(5, 2);
//op.delete(18, 4);


var str = '';
console.log( op.apply(str) );