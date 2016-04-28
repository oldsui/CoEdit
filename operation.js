
    module.exports = Operation;

	// Constructor	
	function Operation (){
		if(!this || this.constructor !== Operation) {
			return new Operation();
		}
		
		this.ops = [];              // operations: ops[i] data type: number/string
        this.pos = [];              // positions of each operation
	};



    // Operation categories
    Operation.prototype.isInsert = function (op) {
    	return typeof op === 'string';
  	};

    Operation.prototype.isDelete = function (op) {
        return typeof op === 'number';
    };




    // Insert a string at the position pos
    Operation.prototype.insert = function (pos, str) {
    if (typeof str !== 'string') {
        throw new Error("insert expects a string");
    }

    if (str === '') { 
        return this; 
    }
    
    // if the last op is insert at the same pos, merge them
    if (this.pos[this.pos.length-1] == pos && this.isInsert(this.ops[this.ops.length-1])) {
        this.ops[this.ops.length-1] += str;
    } 
    else {
        this.pos.push(pos);
        this.ops.push(str);
    }
    return this;
  };



    // Delete (Backspace) n characters at the position pos
    Operation.prototype.delete = function (pos, n) {
        if (typeof n !== 'number') {
            throw new Error("delete expects an integer >= 0");
        }
        if (n === 0) {
            return this; 
        }

        // if last op is delete at the same pos, merge them
        if (this.pos[this.pos.length-1] == pos &&this.isDelete(this.ops[this.ops.length-1])) {
            this.ops[this.ops.length-1] += n;
        } 

        else {
            this.pos.push(pos);
            this.ops.push(n);
        }
        return this;
  };

  

    Operation.prototype.applyInsert = function(pos, insertStr, originStr) {
        var subStrs = [];
        subStrs[0] = originStr.slice(0, pos);
        subStrs[1] = insertStr;
        subStrs[2] = originStr.slice(pos, originStr.length);
        return subStrs.join('');
    };


    Operation.prototype.applyDelete = function(pos, n, originStr) {
        if(n >= pos) {
            return originStr.slice(pos, originStr.length);
        }
        var subStrs = [];
        subStrs[0] = originStr.slice(0, pos-n);
        subStrs[1] = originStr.slice(pos, originStr.length);
        return subStrs.join('');
    };



    // Apply the operations in ops[] to a string, returning a new string. 
    Operation.prototype.apply = function (str) {

        var newStr = str;              

        for (var i = 0; i < this.ops.length; i++) {
            var op = this.ops[i];
            var curPos = this.pos[i];

            if (this.isInsert(op)) {
                newStr = this.applyInsert(curPos, op, newStr);
            } 

            else if (this.isDelete(op)) { 
                newStr = this.applyDelete(curPos, op, newStr);
            }

            else {
                throw new Error ("Invalid operation encountered !");
            }
        }


        return newStr;
    };



