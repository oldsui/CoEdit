
    module.exports = Operation;

    // Constructor  
    function Operation (){
        
        this.ops = [];              // operations: ops[i] data type: int/string
        this.initLen = 0;           
        this.finalLen = 0;
    };



    // Operation categories
    var isRetain = Operation.isRetain = function (op) {
        return typeof op === 'number' && op > 0;
    };

    var isInsert = Operation.isInsert = function (op) {
        return typeof op === 'string';
    };

    var isDelete = Operation.isDelete = function (op) {
        return typeof op === 'number' && op < 0;
    };



    //=============== class methods ============

    // Skip n characters
    Operation.prototype.retain = function (n) {
        if (typeof n !== 'number') {
          throw new Error("Retain expects a integer >= 0!");
        }
        if (n === 0) { 
            return this; 
        }
        this.initLen += n;
        this.finalLen += n;
        if (isRetain(this.ops[this.ops.length-1])) {
          // iflast op is also a retain, we can merge them into one op
          this.ops[this.ops.length-1] += n;
        } else {
          this.ops.push(n);
        }
        return this;
    };


    // Insert a string at current position
    Operation.prototype.insert = function (str) {
        if (typeof str !== 'string') {
            throw new Error("insert expects a string");
        }

        if (str === '') { 
            return this; 
        }
        
        this.finalLen += str.length
        var ops = this.ops;
        // if the last op is insert at the same pos, merge them
        if (isInsert(ops[ops.length-1])) {
            ops[ops.length-1] += str;
        } 

        // if ops = ..., 'xxx', -3, then we make it as ..., 'xxxstr', -3
        else if (ops.length >= 2 && isDelete(ops[ops.length-1])) {  
            if(isInsert(ops[ops.length-2])) {
                ops[ops.length-2] += str;
            }
        }
        // if last op is retain, or ops.length < 2, we simply push a new string
        else {
            this.ops.push(str);
        }
        return this;
      };



    // Delete n succeeding characters 
    Operation.prototype.delete = function (n) {
        if (typeof n !== 'number') {
            throw new Error("delete expects an integer >= 0");
        }
        if (n === 0) {
            return this; 
        }
        var ops = this.ops;
        // if last op is delete merge them
        if (isDelete(ops[ops.length-1])) {
            ops[ops.length-1] -= n;
        } 

        else {
            this.ops.push(-n);
        }
        return this;
  };

  


    // Apply the operations in ops[] to a string, return a new string. 
    // compose a list of subarrays
    Operation.prototype.apply = function (str) {
        if (str.length !== this.initLen) {
          throw new Error("Initial length mismatch !");
        }

        var newStr = [], strCnt = 0;
        var cursorPos = 0;
        var ops = this.ops;

        for (var i = 0; i < ops.length; i++) {
          var op = ops[i];

          // copy op characters of str, op is a positive number in this case
          if (isRetain(op)) {
            if (cursorPos + op > str.length) {
              throw new Error("Can't retain beyond the string!");
            }

            newStr[strCnt++] = str.slice(cursorPos, cursorPos + op);
            cursorPos += op;
          } 

          // insert op, op is a string in this case
          else if (isInsert(op)) {          
            newStr[strCnt++] = op;
          } 

          // delete op, effectively skipping characters in str, op is a negative number in this case
          else { 
            cursorPos -= op;
          }
        }

        if (cursorPos !== str.length) {
          throw new Error("The operation fails to span the whole string.");
        }
        return newStr.join('');
    };



    // Transform takes two operations A and B that happened concurrently and
    // produces two operations A' and B' (in an array) such that
    // apply(apply(S, A), B') = apply(apply(S, B), A'). 
    // Assume A is applied before B

    Operation.transform = function (A, B) {

        var Aprime = new Operation();
        var Bprime = new Operation();
        var ops1 = A.ops, ops2 = B.ops;
        var i1 = 0, i2 = 0;
        var op1 = ops1[i1++], op2 = ops2[i2++];


        while (true) {
            // At the beginning of every iteration, A and B must perform operation at the same position of the input string.


            // end condition: both ops1 and ops2 have been processed
            if (typeof op1 === 'undefined' && typeof op2 === 'undefined') {
                break;
            }

            // case 1: one or both ops are insert 
            // insert the string in the corresponding prime operation, retain it in the other. 
            // if op2 is insert, op1 is delete/retain, op1 does not affect op2 since op1 is doing operation on the portion after current cursor
            // if both op1 and op2 are insert ops, apply op1 first

            if (isInsert(op1)) {                // op1 is a string
                Aprime.insert(op1);
                Bprime.retain(op1.length);
                op1 = ops1[i1++];
                continue;
            }
            if (isInsert(op2)) {                // op2 is a string
                Aprime.retain(op2.length);
                Bprime.insert(op2);
                op2 = ops2[i2++];
                continue;
            }


            // neither op1 nor op2 is Insert
            if (typeof op1 === 'undefined') {
                throw new Error("Cannot compose operations: first operation is too short.");
            }
            if (typeof op2 === 'undefined') {
                throw new Error("Cannot compose operations: first operation is too long.");
            }

            

            // case 2: both op1 and op2 are retain
            if (isRetain(op1) && isRetain(op2)) {
                var minl;
                if (op1 > op2) {
                    minl = op2;
                    op1 = op1 - op2;
                    op2 = ops2[i2++];
                } 
                else if (op1 === op2) {
                  minl = op2;
                  op1 = ops1[i1++];
                  op2 = ops2[i2++];
                } 
                else {
                    minl = op1;
                    op2 = op2 - op1;
                    op1 = ops1[i1++];
                }
                Aprime.retain(minl);
                Bprime.retain(minl);
            } 


            // case 3: both op1 and op2 are delete
            // if two ops delete the same number of characters, we simply skip them
            // only need to handle the case one op deletes more than the other
            else if (isDelete(op1) && isDelete(op2)) {
            // 
            // Both operations delete at the same position. We don't
            // need to produce any operations, we just skip over the delete ops and
            // handle the case that one operation deletes more than the other.
                if (op1 === op2) {
                    op1 = ops1[i1++];
                    op2 = ops2[i2++];
                }               
                else if (-op1 > -op2) {
                    op1 = op1 - op2;
                    op2 = ops2[i2++];
                } 
                else {
                    op2 = op2 - op1;
                    op1 = ops1[i1++];
                }
            } 



            // case 4: delete/retain and retain/delete
            else if (isDelete(op1) && isRetain(op2)) {
                var minl;
                // if A deletes more than B retains: A' = delete op2
                if (-op1 > op2) {
                    minl = op2;
                    op1 = op1 + op2;
                    op2 = ops2[i2++];
                } 
                // if A deletes the same # of chars B retains
                else if (-op1 === op2) {
                    minl = op2;
                    op1 = ops1[i1++];
                    op2 = ops2[i2++];
                } 
                else {
                    minl = -op1;
                    op2 = op2 + op1;
                    op1 = ops1[i1++];
                }
                Aprime.delete(minl);
            } 

            // case 5: 
            else if (isRetain(op1) && isDelete(op2)) {
                var minl;
                if (op1 > -op2) {
                  minl = -op2;
                  op1 = op1 + op2;
                  op2 = ops2[i2++];
                } 
                else if (op1 === -op2) {
                  minl = op1;
                  op1 = ops1[i1++];
                  op2 = ops2[i2++];
                } 
                else {
                  minl = op1;
                  op2 = op2 + op1;
                  op1 = ops1[i1++];
                }
                Bprime.delete(minl);
            } 

            else {
                throw new Error("The two operations are NOT compatible");
            }
        }

        return [Aprime, Bprime];
    };







    Opeation.importOps = function(A) {
        var ret = new Operation();
        var strLen = A.strLeng;

        if(A.value == 'Backspace') {
            ret.retain(A.positon-1);
            ret.delete(1);
            ret.retain(strLen - (A.position+1) );

        }

        else if(A.value == 'Delete') {
            ret.retain(A.position);
            ret.delete(1);
            ret.retain(strLen - (A.position+1) -1 );
        }

        else {
            ret.retain(A.position);
            ret.insert(A.value);
            ret.retain(strLen - (A.position+1) );
        }

        
        return ret;
    }




    // Display operations 
    Operation.prototype.displayOps = function () {
        var opList = ""
        console.log("The operations are ");
        for(var i = 0; i < this.ops.length; i++){
            opList +=  this.ops[i] + " ";
        }
        console.log(opList);
    }






