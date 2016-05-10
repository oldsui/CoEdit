/**
 * Created by zhibin_zhang_MacPro15 on 4/22/16.
 */
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

//basic sign up form 
app.use(express.static('public'));
app.get('/', function(req, res){
  res.sendfile('views/index.html');
});


var bodyParser = require('body-parser');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

//
//
//redirect to editing page
var sockets = {};
app.post('/editing_page',function(req, res){
  var usernname = req.body.username;
  var documentID= req.body.documentID
  res.sendfile('views/edite.html');
});

io.on('connection', function(socket){
    console.log('a new user connected');
	socket.on('newdata', function(data){
        
		console.log(data.val + " " + data.pos);
	    socket.broadcast.emit('edit_editor',data);
	});
//  socket.on('chat message', function(msg){
//    io.emit('chat message', msg);
//  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

