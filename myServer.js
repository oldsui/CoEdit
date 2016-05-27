/**
 * Created by zhibin_zhang_MacPro15 on 4/22/16.
 */
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var ot = require('./ot_server.js');

app.set('view engine', 'ejs');

//basic sign up form
app.use(express.static('public'));
app.get('/', function(req, res){
  res.sendfile('views/index.html');
});

app.locals.resoucePath = "/";

var bodyParser = require('body-parser');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));





// server's properties
var version = 0;                                        // version of last commited text
var text = "0123456789";                                // last commited text in the edit area
var operations = [];                                    // operation history

//redirect to editing page
var sockets = {};
app.post('/editing_page',function(req, res){
  var uid = req.body.username;
  var docid= req.body.documentID;

  res.render('edite', {UID: uid, DOCID: docid});

});



io.on('connection', function(socket){
    console.log('a new connection detected');



    socket.on('newClient', function(){
		console.log("A new client asks for the latest version! ");
        // send the latest version number and text to the new client
		io.sockets.emit('initClient', {v:version, txt: text});
	})





    // receiving operations from a sender data:  {op:operation, v:client.Version, sender: client.uid}
	socket.on('newClientOp', function(data){
		var sender_version = data.v;            // latest version received by the sender from the server
		var operation = data.op;
		var sender = data.uid;

        console.log('sender: '+sender);
        //operation.display();
        // find all the operations server has stored but this sender hasn't applied
        var previousOperations = operations.slice(sender_version);
        // transform the sender's operation against all these operations
        for (var i = 0; i < previousOperations.length; i++) {
            operation = operation.constructor.transform(operation, previousOperations[i])[0];
        }



        // apply the transformed operation on the document.
        text = operation.apply(this.document);
        // Store operation in history and increment version
        //operations.push(operation);
        version += 1;

		console.log("current text is : " + text);


        // after updating server, broadcast this latest operation to all clients
		io.sockets.emit('edit_editor', {op: operation, uid: sender, v: version});
	});




});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

