/**
 * Created by zhibin_zhang_MacPro15 on 4/22/16.
 */
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// public folder to store assets

app.get('/', function(req, res){
  res.sendfile('views/index.html');
});

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
