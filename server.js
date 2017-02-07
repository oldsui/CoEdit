/**
 * Created by zhibin_zhang_MacPro15 on 4/22/16.
 */
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Operation = require('./operation.js');



app.set('view engine', 'ejs');
app.locals.resoucePath = "/";

var bodyParser = require('body-parser');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));




// data structures the server is maintaining
var version = 0;                                        // version of last commited text
var text = "";                                          // last commited text in the edit area
var operations = [];                                    // operation history
var clients = [];                                       // online clients
var allSockets = [];                                    // all sockets connected



//index: basic sign up form
app.use(express.static('public'));
app.get('/', function(req, res){
  res.sendfile('views/index.html');
});


//redirect the login form to the editing page
var sockets = {};
app.post('/editing_page',function(req, res){
  var uid = req.body.username;
  var docid= req.body.documentID;

  res.render('edite', {UID: uid, DOCID: docid});

});




// while in connection, accepts operations from clients, update text at server and broadcast the change
io.on('connection', function(socket){

    console.log('a new connection detected');


    // when a newly joined in client notifies the server, asking for the latest text for initialization
    socket.on('newClient', function(sender){
		console.log("A new client asks for the latest version! ");



        if( clients.indexOf(sender.uid) == -1 && allSockets.indexOf(socket) == -1 ) {
            console.log('pushed ' +sender.uid);
            clients.push(sender.uid);
            allSockets.push(socket);
        }

		io.sockets.emit('initClient', {uid:sender.uid, v:version, txt: text, activeClients:clients});
	})
	
	socket.on('reJoin', function(data){
		console.log("reJoin happens~~~~~~~~~");
		io.sockets.emit('recover', {uid: data.uid, cursor: data.cursor, v: version, txt: text, activeClients: clients});
	})


    socket.on('disconnect', function() {
        console.log('Someone quitted. ');
        
        var index = allSockets.indexOf(socket);
        if (index > -1) {
            var client = clients[index];
            console.log('Client '+client+' has logged off. ');
            allSockets.splice(index, 1);
            clients.splice(index, 1);
            io.sockets.emit('updateClients', {activeClients:clients});

        }
    })


    // when the server receives an operation from a client
    // data format:  {ops:operation.ops, initLen:operation.initLen, finalLen:operation.finalLen, v:this.version, sender: this.uid}
	socket.on('newClientOp', function(data) {

        var sender_version = data.v;            // latest version received by the sender from the server
        var sender = data.sender;               // sender name

        var operation = new Operation(data.ops, data.initLen, data.finalLen);


        // for debug use
        console.log('sender: ' + sender);
        console.log('version: ' + sender_version);
        operation.displayOps();


        // find all the operations server has stored but this sender hasn't received
        var previousOperations = operations.slice(sender_version);
        // transform the sender's operation against all these operations
        for (var i = 0; i < previousOperations.length; i++) {
            console.log('Transforming:');
            operation = operation.constructor.transform(operation, previousOperations[i])[0];
        }

        // for debug use
        console.log('text before applying op is: ' + text);

        try {
            // apply the transformed operation on the document.
            text = operation.apply(text);
        }
        catch (err) {
            console.log('the operation from  '+sender +' is not compatible, so he is forced to re-sync !' );
            io.sockets.emit('recover', {uid: sender, cursor: data.cursor,  v:version, txt: text, activeClients: clients});
        }
        // Store operation in history and increment version
        operations.push(operation);
        version += 1;


        // for debug use
		console.log("text after applying op is : " + text);


        // after updating server, broadcast this latest operation to all clients
		io.sockets.emit('edit_editor', {ops:operation.ops, initLen:operation.initLen, finalLen:operation.finalLen, uid: sender, v: version});
	});




});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

