// modified client.js based on ot lib

// A client:
// member data - uid:       user id
// member data - version:   modifications are made based on which version of document from server
// member data - state:     3 states: synchronized, awaitingConfirm, awaitingWithBuffer



// methods: invoke current state's method, and set the state to the returned state
// e.g. Client.applyClient(..) : state' = Client.state.applyClient(..), then Client.setState(state')

// state methods:
// applyClient: apply this client's operation to the text
// applyServer: apply operation sent from server to the text
// serverAck:
// resend:

/*
    var io=document.createElement('script');
    io.setAttribute("type","text/javascript");
    io.setAttribute("src", "socket.io/socket.io.js");

    var socket = io.connect('http://localhost:3000');
*/


    // Client constructor
    function Client (uid, doc, version) {
        this.uid = uid;
        this.doc = doc;
        this.version = version;         // the version number
        this.state = synchronized_;     // start state
        console.log('A client is constructed: uid: '+uid);
    }



    // setters
    Client.prototype.setDoc = function (doc) {
        this.doc = doc;
    }

    Client.prototype.setVersion = function (v) {
        this.version = v;
    }

    Client.prototype.setState = function (state) {
        this.state = state;
    };



    // Only need to call these methods at higher level
    // exact procedure will be called by the state that the client is in

    // when client mutates the local document
    Client.prototype.applyClient = function (operation) {
        this.setState(this.state.applyClient(this, operation));             // current state will invoke corresponding procedure
    };

    // when RECEIVING an operation from the server
    Client.prototype.applyServer = function (operation) {
        this.version ++;
        this.setState(this.state.applyServer(this, operation));
    };

    // when find out that the operation that the client has sent to the server is accepted by the server
    Client.prototype.serverAck = function () {
        this.version ++;
        this.setState(this.state.serverAck(this));
    };


    // 
    Client.prototype.serverReconnect = function () {
        if (typeof this.state.resend === 'function') { this.state.resend(this); }
    };



    // low-level functions that will be invoked by the states
    
    Client.prototype.sendOperation = function (operation) {
        console.log('sendOperation is called trying to execute! ');
        try {
            socket.emit('newClientOp', {ops:operation.ops, initLen:operation.initLen, finalLen:operation.finalLen, v:this.version, sender: this.uid});
        }
        catch (err) {
            console.log('SendOperation failed !');
            console.log(err);
        }
    };

    Client.prototype.applyOperation = function (operation) {
        console.log('Client.applyOperaion is called ! The operation from server is: ');
        operation.displayOps();
        this.doc = $('#editor').val();
        this.doc = operation.apply(this.doc);
        $('#editor').val(this.doc);
    };





    //========================== 3 states ==============================


    // In the 'Synchronized' state, there is no pending operation that the client
    // has sent to the server.
    function Synchronized () {}
    Client.Synchronized = Synchronized;

    // When the user makes an edit, send the operation to the server and
    // switch to the 'AwaitingConfirm' state
    Synchronized.prototype.applyClient = function (client, operation) {
        client.sendOperation(operation);
        console.log('Sync -> AwaitingConfirm');
        return new AwaitingConfirm(operation);
    };

    // When we receive a new operation from the server, the operation can be
    // simply applied to the current document
    Synchronized.prototype.applyServer = function (client, operation) {
        console.log('sync applyServer !');
        client.applyOperation(operation);
        return this;
    };

    Synchronized.prototype.serverAck = function (client) {
        throw new Error("There is no pending operation.");
    };
    
    // Singleton
    var synchronized_ = new Synchronized();






    // In the 'AwaitingConfirm' state, there's one operation the client has sent
    // to the server and is still waiting for an acknowledgement.
    function AwaitingConfirm (outstanding) {
        // Save the pending operation
        this.outstanding = outstanding;
    }

    Client.AwaitingConfirm = AwaitingConfirm;

    AwaitingConfirm.prototype.applyClient = function (client, operation) {
        // When the user makes an edit, don't send the operation immediately,
        // instead switch to 'AwaitingWithBuffer' state
        console.log('AwaitingConfirm -> AwaitingWithBuffer');
        return new AwaitingWithBuffer(this.outstanding, operation);
    };

    AwaitingConfirm.prototype.applyServer = function (client, operation) {
        // This is another client's operation. Visualization:
        //
        //                   /\
        // this.outstanding /  \ operation
        //                 /    \
        //                 \    /
        //  pair[1]         \  / pair[0] (new outstanding)
        //  (can be applied  \/
        //  to the client's
        //  current document)

        console.log('awaitingConfirm applyServer !');
        var pair = operation.constructor.transform(this.outstanding, operation);
        client.applyOperation(pair[1]);

        console.log('AwaitingConfirm -> AwaitingConfirm');
        return new AwaitingConfirm(pair[0]);
    };

    AwaitingConfirm.prototype.serverAck = function (client) {
        // The client's operation has been acknowledged
        // => switch to synchronized state
        console.log('AwaitingConfirm -> Sync');
        return synchronized_;
    };

    AwaitingConfirm.prototype.resend = function (client) {
        // The confirm didn't come because the client was disconnected.
        // Now that it has reconnected, we resend the outstanding operation.
        client.sendOperation(this.outstanding);
    };







    // In the 'AwaitingWithBuffer' state, the client is waiting for an operation called outstanding
    // to be acknowledged by the server while buffering the edits the user makes
    function AwaitingWithBuffer (outstanding, buffer) {
        // Save the pending operation and the user's edits since then
        this.outstanding = outstanding;
        this.buffer = buffer;
    }

    Client.AwaitingWithBuffer = AwaitingWithBuffer;

    AwaitingWithBuffer.prototype.applyClient = function (client, operation) {
        // Compose the user's changes onto the buffer
        try {
            var newBuffer = this.buffer.compose(operation);
        }
        catch (err) {
            console.log('applyClient failed ! Ignored this operation ! ');
            return this;
        }
        console.log('Successful appllyClient: AwaitingWithBuffer -> AwaitingWithBuffer');
        return new AwaitingWithBuffer(this.outstanding, newBuffer);
    };

    AwaitingWithBuffer.prototype.applyServer = function (client, operation) {
        // Operation comes from another client. It is already accepted by the server, who sent operation to this client
        //
        //                       /\
        //     this.outstanding /  \ operation
        //                     /    \
        //                    /\    /
        //       this.buffer /  \* / pair1[0] (new outstanding)
        //                  /    \/
        //                  \    /
        //          pair2[1] \  / pair2[0] (new buffer)
        // the transformed    \/
        // operation -- can
        // be applied to the
        // client's current
        // document
        //
        // *: pair1[1]
        console.log('awaitingConfirm applyServer !');
        var transform = operation.constructor.transform;
        var pair1 = transform(this.outstanding, operation);
        var pair2 = transform(this.buffer, pair1[1]);
        client.applyOperation(pair2[1]);
        console.log('AwaitingWithBuffer -> AwaitingWithBuffer');
        return new AwaitingWithBuffer(pair1[0], pair2[0]);
    };

    AwaitingWithBuffer.prototype.serverAck = function (client) {
        // The pending operation has been acknowledged
        // => send buffer
        client.sendOperation(this.buffer);
        console.log('ServerAck, AwaitingWithBuffer -> AwaitingConfirm');
        return new AwaitingConfirm(this.buffer);
    };

    AwaitingWithBuffer.prototype.resend = function (client) {
        // The confirm didn't come because the client was disconnected.
        // Now that it has reconnected, we resend the outstanding operation.
        client.sendOperation(this.outstanding);
    };






