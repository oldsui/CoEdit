
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
	    
	    // update the length of the updated string
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

        // update the length of the initial string
        this.initLen += n;

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
    // length of str must equal Operation.initLen

    Operation.prototype.apply = function (str) {
	    if (str.length !== this.initLen) {
	      throw new Error("Initial length mismatch !");
	    }

	    var newStr = [], strCnt = 0;
	    var cursorPos = 0;
	    var ops = this.ops;

	    for (var i = 0; i < ops.length; i++) {
			var op = ops[i];

			// case retain
			// copy op characters of str, op is a positive number in this case
			if (isRetain(op)) {
				if (cursorPos + op > str.length) {
			  	throw new Error("Can't retain beyond the string!");
				}

				newStr[strCnt++] = str.slice(cursorPos, cursorPos + op);
				cursorPos += op;
			} 

			// case insert, op is a string in this case
			else if (isInsert(op)) {	        
				newStr[strCnt++] = op;
			} 

			// case delete, effectively skipping characters in str, op is a negative number in this case
			else { 
				cursorPos -= op;
			}
	    }

	    // after applying operations, cursorPos must equal str.length
	    if (cursorPos !== str.length) {
	      	throw new Error("The operation fails to span the whole string.");
	    }

	    // return a new string by joining the substrings
	    return newStr.join('');
  	};



  	// Transform takes two operations A and B that happened concurrently and
  	// produces two operations A' and B' (in an array) such that
  	// B'.apply(A.apply(str)) = A'.apply(B.apply(str)) 
  	// Assume A is applied before B
  	// All cases can be handled by the follwing 5 cases:
  	//		1: one or both are insert 	=>	perform op1 insert first
  	//		2: both are retain 			=>	retain min (op1, op2)
  	//		3: both are delete 			=>	delete min (|op1|, |op2|)
  	//		4: delete and retain		=>	when op1 != op2, A': delete(min)
  	//		5: retain and delete 		=>	

	Operation.transform = function (A, B) {

	    var Aprime = new Operation();
	    var Bprime = new Operation();
	    var ops1 = A.ops, ops2 = B.ops;
	    var i1 = 0, i2 = 0;
	    var op1 = ops1[i1++], op2 = ops2[i2++];


	    while (true) {

			// end condition: both ops1 and ops2 have been processed
			if (typeof op1 === 'undefined' && typeof op2 === 'undefined') {
				break;
			}


			// case 1: one or both ops are insert 
			// insert the string in the corresponding prime operation, retain its length in the other. 
			// if op2 is insert, op1 is delete/retain, op1 does not affect op2 since op1 is doing operation on the portion after current cursor
			// if both op1 and op2 are insert ops, apply op1 first

			if (isInsert(op1) || isInsert(op2)){

				if (isInsert(op1)) {				// op1 is a string
					Aprime.insert(op1);
					Bprime.retain(op1.length);
					op1 = ops1[i1++];
					continue;
				}
				if (isInsert(op2)) {				// op2 is a string
					Aprime.retain(op2.length);
					Bprime.insert(op2);
					op2 = ops2[i2++];
					continue;
				}
			}

			// ============ neither op1 nor op2 is Insert ============

			// checking mismatch
			if (typeof op1 === 'undefined') {
				throw new Error("Length mismatch: first operation is too short.");
			}
			if (typeof op2 === 'undefined') {
				throw new Error("Length mismatch: first operation is too long.");
			}

			

			// case 2: both op1 and op2 are retain
			// retain min (op1, op2) in both Aprime and Bprime

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
				// if delete same # character, both procceed to the next op
				if (op1 === op2) {
					op1 = ops1[i1++];
					op2 = ops2[i2++];
				} 				

				// if op1 delete more than op2
				else if (-op1 > -op2) {
					op1 = op1 - op2;
					op2 = ops2[i2++];
				} 

				// if op1 delete fewer than op2
				else {
					op2 = op2 - op1;
					op1 = ops1[i1++];
				}
			} 



			// case 4: delete/retain
			// no Bprime is needed, only Aprime is needed to perform on the string of B.apply(str)
			else if (isDelete(op1) && isRetain(op2)) {
				var minl;
				// if A deletes more than B retains
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
				// if A deletes fewer than B retains
				else {
					minl = -op1;
					op2 = op2 + op1;
					op1 = ops1[i1++];
				}
				Aprime.delete(minl);
			} 

			// case 5: retain/delete
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







	// Compose merges two consecutive operations into one operation, that
	// preserves the changes of both. Or, in other words, for each input string S
	// and a pair of consecutive operations A and B,
	// apply(apply(S, A), B) = apply(S, compose(A, B)) must hold.
	Operation.prototype.compose = function (B) {
		var A = this;
		if (A.targetLength !== B.baseLength) {
		  throw new Error("Length mismatch !");
		}

		var operation = new Operation(); // the combined operation, to be returned
		var ops1 = A.ops, ops2 = B.ops; // for fast access
		var i1 = 0, i2 = 0; // current index into ops1 respectively ops2
		var op1 = ops1[i1++], op2 = ops2[i2++]; // current ops
		while (true) {

		  	// end condition: both ops1 and ops2 have been processed
			if (typeof op1 === 'undefined' && typeof op2 === 'undefined') {
		    	break;
			}

			if (isDelete(op1)) {
				operation.delete(op1);
				op1 = ops1[i1++];
				continue;
			}
			if (isInsert(op2)) {
				operation.insert(op2);
				op2 = ops2[i2++];
				continue;
			}

			if (typeof op1 === 'undefined') {
				throw new Error("Cannot compose operations: first operation is too short.");
			}
			if (typeof op2 === 'undefined') {
				throw new Error("Cannot compose operations: first operation is too long.");
			}


			if (isRetain(op1) && isRetain(op2)) {
				if (op1 > op2) {
					operation.retain(op2);
					op1 = op1 - op2;
					op2 = ops2[i2++];
				} 
				else if (op1 === op2) {
				  	operation.retain(op1);
				  	op1 = ops1[i1++];
				  	op2 = ops2[i2++];
				} 
				else {
				  	operation.retain(op1);
				  	op2 = op2 - op1;
				  	op1 = ops1[i1++];
				}
			} 
			else if (isInsert(op1) && isDelete(op2)) {
		    	if (op1.length > -op2) {
					op1 = op1.slice(-op2);
					op2 = ops2[i2++];
		    	} 
		    	else if (op1.length === -op2) {
		      		op1 = ops1[i1++];
		      		op2 = ops2[i2++];
		    	} 
		    	else {
		      		op2 = op2 + op1.length;
		      		op1 = ops1[i1++];
		    	}
			} 
		  	else if (isInsert(op1) && isRetain(op2)) {
			    if (op1.length > op2) {
			      	operation.insert(op1.slice(0, op2));
			      	op1 = op1.slice(op2);
			      	op2 = ops2[i2++];
			    } 
			    else if (op1.length === op2) {
			      	operation.insert(op1);
			      	op1 = ops1[i1++];
			      	op2 = ops2[i2++];
			    } else {
			      	operation.insert(op1);
			      	op2 = op2 - op1.length;
			      	op1 = ops1[i1++];
			    }
			} 
			else if (isRetain(op1) && isDelete(op2)) {
				if (op1 > -op2) {
			  		operation.delete(op2);
			  		op1 = op1 + op2;
			  		op2 = ops2[i2++];
				} 
				else if (op1 === -op2) {
			  		operation.delete(op2);
			  		op1 = ops1[i1++];
			  		op2 = ops2[i2++];
				} 
				else {
			  		operation.delete(op1);
			  		op2 = op2 + op1;
			  		op1 = ops1[i1++];
				}
			} 
			else {
				throw new Error(
			  		"This shouldn't happen: op1: " + op1 + ", op2: " +op2);
			}
		}
		return operation;
	};





	// A contains only 1 operation
	Operation.importOps = function(A) {
        var ret = new Operation();
        var strLen = A.strLen;

        if(A.value == 'Del') {
            ret.retain(A.position);
            ret.delete(1);
            var remain = strLen - A.position -1;
            if(remain > 0) {
            	ret.retain( remain );
            }
        }

        else {
            ret.retain(A.position);
            ret.insert(A.value);

            var remain = strLen - A.position;
            if (remain > 0) {
            	ret.retain( remain );
            }            
        }

        return ret;
    }


    // ret contains only 1 operation
    Operation.exportOps = function(A) {
    	var ret = {position:0, value:'', strLen:A.initLen};
    	var op = A.ops[0];

    	if( isRetain(op) ) {
    		ret.position = op;
    		op = A.ops[1];
    		if( isInsert(op) ) {
    			ret.value = op;
    		}
    		else if (isDelete(op) ) {
    			ret.value = 'Del';
    		}
    	}
    	else if ( isInsert(op) )  {
    		ret.value = op;
    	}
    	else {
    		ret.value = 'Del';
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








