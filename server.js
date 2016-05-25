/**
 * Created by zhibin_zhang_MacPro15 on 4/22/16.
 */
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
//var path = require('path');
var Operation = require('./ot_server.js');

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

// database setup
var sqlite3 = require('sqlite3').verbose();
//var db = new sqlite3.Database('Document.db');
var db_in_memory = new sqlite3.Database(':memory:');

var version = 0;
var text = "";
var array = new Array();

// Database initialization
db_in_memory.serialize(function() {
  
  // op-->  operation  'keyCode'   pos 'x'
  db_in_memory.run("CREATE TABLE if not exists Document(version integer primary key, operation text, pos integer) ");
  db_in_memory.run("INSERT INTO Document values (?, ?, ?)", [0, "", 0]);
  console.log("Is it only once?");
  db_in_memory.get("SELECT version from Document where version = (SELECT max(version) from Document)", function(err, row){
	 
	 console.log("version : " + row.version);
	 version = row.version;
	 
  });
  
});

//
//redirect to editing page
var sockets = {};
app.post('/editing_page',function(req, res){
  var username = req.body.username;
  var documentID= req.body.documentID;
  var value = "";

  res.render('edite', {name: username, cur: value});
/*  db.run(sqlRequest, function(err) {
    if(err !== null) {
      console.log(err);
    }
    else {
      res.sendfile('views/edite.html');
    }
  });
*/  
  
});

/*function op_ot(operation)
{
	var sender_version = operation.v;
	var oper = operation.val;
	var pos = operation.pos;
	db_in_memory.serialize(function() {

     	db_in_memory.all("select operation, pos from Document where version > ? and version <= ?", [sender_version, version], function(err, rows){
			rows.forEach(function (row){
				console.log(row.operation + " " + row.pos);
				// TODO: OT
			});
			console.log("end with db_in_memory search");
		});		
    });
}*/

io.on('connection', function(socket){
    console.log('a new user connected');
	
	socket.on('newdata', function(data){
		var sender_version = data.v;
		var oper = data.val;
		var pos = data.pos;
		var sender = data.sender;
		var B = Operation.importOps({position: pos, value: oper, strLen: text.length}); // B is Operation;
		//B.displayOps();
		for(var i = sender_version; i < array.length; i++)
		{
			console.log(array[i].pos + " " + array[i].oper);
			var A = Operation.importOps({position: array[i].pos, value: array[i].oper, strLen: array[i].strLen});
			B = Operation.importOps({position: pos, value: oper, strLen: array[i].strLen}); // TODO: importOps(changed)
			A.displayOps();
			B.displayOps();
			B = Operation.transform(A, B)[1]; // server-implemented first
		}
		console.log("end OT");
        B.displayOps();		
		var Bp = Operation.exportOps(B);
		
		// now oper and pos are actually oper' and pos'
		version += 1;
		array.push({version: version, oper:oper, pos:pos, strLen: text.length});
		// TODO: apply operation on text;
		text = B.apply(text);
		/*if(oper == "BackSpace")
		{
			var textbefore = text.substring(0, pos);
			var textafter = text.substring(pos+1);
			text = textbefore + textafter;
		}
		else
		{
			var add_char = oper;			
			var textbefore = text.substring(0, pos - 1);
			var textafter = text.substring(pos - 1);
			text = textbefore + add_char + textafter;
		} */    				
		
		console.log("current text is : " + text);
		
		//db_in_memory.run("insert into Document values (?, ?, ?)", [version, oper, pos]);
		io.sockets.emit('edit_editor', {val: Bp.value, pos: Bp.position, sender: sender});
		
		
/*		var position = data.pos;
        if(data.v > version)
		{
			version = data.v;
		}	 
		else if(data.v == version)
		{
			version += 1;
			// TODO: OT
			if(last_change <= position)
				  position += 1;
			
		}
		var add_char = String.fromCharCode(data.val);			
		var textbefore = text.substring(0, position - 1);
		var textafter = text.substring(position - 1);
		text = textbefore + add_char + textafter;
		last_change = position;
		
		console.log(data.val + " " + data.pos + " " + data.v);
		console.log("current text is : " + text);
	    socket.broadcast.emit('edit_editor',data);
*/
	});
	
	socket.on('I_am_in', function(){
		console.log("One in");
		io.sockets.emit('someone_in', {v:version, txt: text});
	})
	

});

http.listen(3000, function(){
  console.log('listening on *:3000');
});

