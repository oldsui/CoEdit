

  var NORMAL_STATE = 'normal';
  var UNDOING_STATE = 'undoing';
  var REDOING_STATE = 'redoing';

  // Create a new UndoManager with an optional maximum history size.
  function UndoManager (maxItems) {
    this.maxItems  = maxItems || 50;
    this.state = NORMAL_STATE;
    this.dontCompose = false;
    this.undoStack = [];
    this.redoStack = [];
  }

  // Add an operation to the undo or redo stack, depending on the current state
  // of the UndoManager. The operation added must be the inverse of the last
  // edit. When `compose` is true, compose the operation with the last operation
  // unless the last operation was alread pushed on the redo stack or was hidden
  // by a newer operation on the undo stack.
  UndoManager.prototype.add = function (operation, compose) {
    if (this.state === UNDOING_STATE) {
      this.redoStack.push(operation);
      this.dontCompose = true;
    } else if (this.state === REDOING_STATE) {
      this.undoStack.push(operation);
      this.dontCompose = true;
    } else {
      var undoStack = this.undoStack;
      if (!this.dontCompose && compose && undoStack.length > 0) {
		console.log('To compose undo!');
		var org = undoStack.pop();
		console.log(org.initLen);
		var after = operation.compose(org);
		console.log('compose type: ' + typeof after);
        undoStack.push(after);
      } else {
        undoStack.push(operation);
        if (undoStack.length > this.maxItems) { undoStack.shift(); }
      }
      this.dontCompose = false;
      this.redoStack = [];
    }
  };

  function transformStack (stack, operation) {
    var newStack = [];
    var Operation = operation.constructor;
	//console.log('transform-stack~~~~~~~~~~~~~');
    for (var i = stack.length - 1; i >= 0; i--) 
	{
	  //console.log('round ' + i);
	  //console.log('undo before: ');
	  //stack[i].displayOps();
	  //console.log('operation: ');
	  //operation.displayOps();
      var pair = Operation.transform(stack[i], operation);
      //if (typeof pair[0].isNoop !== 'function' || !pair[0].isNoop()) {
		//console.log('transformed undo: ');
        //pair[0].displayOps();		
        newStack.push(pair[0]);
      //}
      operation = pair[1];
    }
    return newStack.reverse();
  }

  // Transform the undo and redo stacks against a operation by another client.
  UndoManager.prototype.transform = function (operation) {
    this.undoStack = transformStack(this.undoStack, operation);
    this.redoStack = transformStack(this.redoStack, operation);
  };

  // Perform an undo by calling a function with the latest operation on the undo
  // stack. The function is expected to call the `add` method with the inverse
  // of the operation, which pushes the inverse on the redo stack.
  UndoManager.prototype.performUndo = function () {
    this.state = UNDOING_STATE;
    if (this.undoStack.length === 0) { throw new Error("undo not possible"); }
    var oper = new Operation();
	oper = this.undoStack.pop();
	console.log('performUndo~~~~~~~~~' + typeof oper);
	oper.displayOps();
	client.doc = $('#editor').val();
	inverse = oper.invert(client.doc);
	console.log('Inverse operation is~~~~~ ');
	inverse.displayOps();
	// add into redoStack
	this.add(inverse, false);
    // apply undo on the text 
	client.doc = oper.apply(client.doc);
	$('#editor').val(client.doc);
	// send to server
	client.applyClient(oper);
	this.state = NORMAL_STATE;
  };

  // The inverse of `performUndo`.
  UndoManager.prototype.performRedo = function () {
    this.state = REDOING_STATE;
    if (this.redoStack.length === 0) { throw new Error("redo not possible"); }
	var oper = new Operation();
	oper = this.redoStack.pop();
	console.log('performRedo~~~~~~~~~' + typeof oper);
	oper.displayOps();
	client.doc = $('#editor').val();
	inverse = oper.invert(client.doc);
	console.log('Inverse operation is~~~~~ ');
	inverse.displayOps();
	// add into undoStack
	this.add(inverse, false);
    // apply redo on the text	
    client.doc = oper.apply(client.doc);
	$('#editor').val(client.doc);
	// send to server
	client.applyClient(oper);
	this.state = NORMAL_STATE;
  };

  // Is the undo stack not empty?
  UndoManager.prototype.canUndo = function () {
    return this.undoStack.length !== 0;
  };

  // Is the redo stack not empty?
  UndoManager.prototype.canRedo = function () {
    return this.redoStack.length !== 0;
  };

  // Whether the UndoManager is currently performing an undo.
  UndoManager.prototype.isUndoing = function () {
    return this.state === UNDOING_STATE;
  };

  // Whether the UndoManager is currently performing a redo.
  UndoManager.prototype.isRedoing = function () {
    return this.state === REDOING_STATE;
  };
