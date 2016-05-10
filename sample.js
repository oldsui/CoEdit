/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

server.listen(5000);

app.get('/',function(req,res){
    res.sendfile("views/edite.html");
});

var activeClients = 0;
var Collaborators=['Colab1','Colab2','Colab3'];
var people=[];

io.sockets.on('connection', function(socket){
    clientConnect(socket);

    socket.on('disconnect', function(){
        clientDisconnect(socket);
    });

    socket.on('para',function(data){
        //io.sockets.emit('updated_para',data.paragraph);
        socket.broadcast.emit('updated_para',data.paragraph);
    });
});

function clientConnect(socket){
    //activeClients +=1;
    var userSocketId=socket.id;
    check_Collaborator(socket);

    io.sockets.emit('message', {uid:userSocketId});
}

var online_collabs=[];

function check_Collaborator(socket){
    socket.on('collabrator',function(data){
        if(Collaborators.indexOf(data)!=-1){
            socket.data=data;

            if(online_collabs.indexOf(data)==-1) {
                online_collabs.push(data);
            }

            io.sockets.emit('online_collabs',online_collabs);
            io.sockets.emit('note_collabs',Collaborators);
        } else {
            console.log("collabrator not found");
        }
    });
}

function clientDisconnect(socket){
    var index=online_collabs.indexOf(socket.data)

    if(index>-1)
        online_collabs.splice(index,1);

    //activeClients -=1;
    //io.sockets.emit('message', {clients:activeClients});
    io.sockets.emit('remained_collabs',online_collabs);
}