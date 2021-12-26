// Require the packages we will use:
const http = require("http"),
fs = require("fs");
const { SocketAddress } = require("net");

const port = 3456;
const file = "chatClient.html";
// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html, on port 3456:
const server = http.createServer(function (req, res) {
    // This callback runs when a new connection is made to our HTTP server.

    fs.readFile(file, function (err, data) {
        // This callback runs when the client.html file has been read from the filesystem.

        if (err) return res.writeHead(500);
        res.writeHead(200);
        res.end(data);
    });
});
server.listen(port);

// Import Socket.IO and pass our HTTP server object to it.
const socketio = require("socket.io")(http, {
    wsEngine: 'ws'
});

// Attach our Socket.IO server to our HTTP server to listen
const io = socketio.listen(server);

let starterRooms = [{"name" : "Home"}, {"name" : "Room2"}];
let joinedSocketId = {};
let socketIds = {};
let currUsers = {};
let listOfRooms = {};
let setSocketIds = new Set();
io.sockets.on("connection", function (socket) {
    // This callback runs when a new Socket.IO connection is established.

    socket.on("newUser", function(username){
        if(username == ""){
            socket.emit("displayInformation", "You must enter a username. Refresh the page and try again.")
        }
        let newUser = {};
        //let newUser = username["userName"]
        newUser.username = username; 
        newUser.room = "Home";
        //console.log("Current Users:", currUsers);
        socket.room = "Home";
        socket.join("Home");
        setSocketIds.add(socket.id);
        socket.username = username;
        socket.bannedFrom = new Set();
        socketIds[username] = socket.id;
        currUsers[username] = newUser;


		socket.to("Home").emit('displayInfo', username + ' has joined to this room');
		newUser.room= socket.room;
		currUsers[username] = newUser;
        io.to(socket.id).emit("updateRoomDisplay", socket.room, starterRooms);
        io.to(socket.room).emit("displayWhoInRoom", getWhoInRoom(socket.room));

    });

    socket.on('message_to_server', function (data) {
        // This callback runs when the server receives a new message from the client.
        console.log("message123: " + data["message"]);
        console.log("Room: " + socket.room)// log it to the Node.JS output


        //this function iterates through every socket that exists and checks to see if it is in the current room
    //not very efficient but idrc
        if(data["message"] == "/currentusers"){
            inRoom = getWhoInRoom(socket.room)
            io.to(socket.id).emit("displayInfo", "Current Occupents of Room: " + inRoom);
            return;
        }

        //basic broadcast
        io.to(socket.room).emit("message_to_client", socket.username, {message: data["message"]});
    });

    socket.on("changeRoom", function(roomToChangeTo){
        if(socket.bannedFrom.has(roomToChangeTo)){
            io.sockets.in(socket.room).emit("displayInfo", "You may not enter that room, you have been banned.");
            return;
        }
        console.log("Changing rooms to: " + roomToChangeTo);
        socket.to(socket.room).emit("displayInfo", socket.username + " has left the room.");
        socket.leave(socket.room)
        socket.join(roomToChangeTo);
        socket.room = roomToChangeTo;
        currUsers[socket.username].room = roomToChangeTo;
        socket.to(roomToChangeTo).emit("displayInfo", socket.username + " has joined the room.");
        socket.emit('updateRoomDisplay', roomToChangeTo, starterRooms);
        io.to(socket.room).emit("displayWhoInRoom", getWhoInRoom(socket.room));

    });

    socket.on("addRoom", function(roomName){
        listOfRooms[roomName] = socket.username;
        starterRooms.push({name:roomName, creator: socket.username});
        io.emit("updateRoomDisplay", socket.room, starterRooms);
    });

    socket.on("kick", function(usernameToKick){
        if(socket.room == "Home"){
            console.log("You are in room: " + socket.room);
            socket.emit("improperPermission");
            return;
        }
        if(socket.username != listOfRooms[socket.room]){
            console.log("Recorded Owner Of Room: " + listOfRooms[socket.room]);
            console.log("User that tried to kick: " + socket.username)
            socket.emit("improperPermission");
            return;
        }
        let kickedUser = io.sockets.connected[socketIds[usernameToKick]]
        if(kickedUser == null){
            io.to(socket.id).emit("displayInfo", "User does not exist."); 
            return;    
        }
        if(kickedUser.room != socket.room){
            io.to(socket.id).emit("displayInfo", "That user is not in your room"); 
            return; 
        }
        console.log("Username to Kick: " + usernameToKick)
        console.log("Socket ID: " + socketIds[usernameToKick])
        kickedUser.leave(kickedUser.room);
        kickedUser.join("Home");
        kickedUser.room = "Home";
        console.log("Kicked Users new room: " + kickedUser.room + " (should be home)")
        io.to(socketIds[usernameToKick]).emit("updateRoomDisplay", "Home", starterRooms)
        io.to(socket.room).emit("displayInfo", "User has been kicked.");
        io.to(socket.room).emit("displayWhoInRoom", getWhoInRoom(socket.room));
        io.to(kickedUser.room).emit("displayWhoInRoom", getWhoInRoom(socket.room));
        io.to(socketIds[usernameToKick]).emit("displayInfo", "You have been kicked from the room.");

    });

    socket.on("ban", function(usernameToBan){
        if(socket.room == "Home"){
            console.log("You are in room: " + socket.room);
            socket.emit("improperPermission");
            return;
        }
        if(socket.username != listOfRooms[socket.room]){
            console.log("Recorded Owner Of Room: " + listOfRooms[socket.room]);
            console.log("User that tried to kick: " + socket.username)
            socket.emit("improperPermission");
            return;
        } 

        let kickedUser = io.sockets.connected[socketIds[usernameToBan]]
        if(kickedUser == null){
            io.to(socket.id).emit("displayInfo", "User does not exist."); 
            return;    
        }
        if(kickedUser.room != socket.room){
            io.to(socket.id).emit("displayInfo", "That user is not in your room"); 
            return; 
        }
        console.log("Username to Ban: " + usernameToBan)
        console.log("Socket ID: " + socketIds[usernameToBan])
        kickedUser.leave(kickedUser.room);
        kickedUser.join("Home");
        kickedUser.room = "Home";
        kickedUser.bannedFrom.add(socket.room);
        io.to(socketIds[usernameToBan]).emit("updateRoomDisplay", "Home", starterRooms)
        io.to(socket.room).emit("displayInfo", "User has been banned.");
        io.to(socket.room).emit("displayWhoInRoom", getWhoInRoom(socket.room));
        io.to(kickedUser.room).emit("displayWhoInRoom", getWhoInRoom(socket.room));
        io.to(socketIds[usernameToBan]).emit("displayInfo", "You have been banned from that room.");

    })

    socket.on("disconnect", function(){
        setSocketIds.delete(socket.id);
        io.to(socket.room).emit("displayWhoInRoom", getWhoInRoom(socket.room));
        console.log(socket.username + " has disconnected.");
    })

    function getWhoInRoom(currentRoom){
        let inRoom = "";
            setSocketIds.forEach(id =>{
                let randomSocket = io.sockets.connected[id];
                if(randomSocket.room == currentRoom){
                    inRoom = inRoom + " " + randomSocket.username;
                }  
            })
            inRoom.replace("null", "");
            return inRoom;
    }
    socket.on("joinPrivateRoom", function(privateRoom, guess){
		//every private room should open a prompt onclick, redirect to that function in the html
        console.log("in joinPrivateRoom (js)")
		for(var i=0; i<starterRooms.length; i++){
			console.log(starterRooms[i].hasOwnProperty('password'));
			if(starterRooms[i].name == privateRoom){
				if(starterRooms[i].hasOwnProperty('password')){
                    //check password guess with real password
                            if(starterRooms[i].password == guess){
                                //currUsers[socket.user].room = room_name;
                                console.log("password approved");
                                socket.broadcast.to(socket.room).emit("displayInfo", socket.username + ' has left this room');
                                socket.leave(socket.room);
                                console.log(socket.user + " left room: " + socket.room);
                                socket.join(privateRoom);
                                socket.room = privateRoom;
                                currUsers[socket.username].room = privateRoom;
                                //socket.to(socket.room).emit("displayInfo", socket.username + " has joined this room.");
            
                                socket.to(privateRoom).emit("displayInfo", socket.username + " has joined the room.");
                                socket.emit('updateRoomDisplay', privateRoom, starterRooms);
                                io.to(socket.room).emit("displayWhoInRoom", getWhoInRoom(socket.room));
                                //socket.broadcast.to(privateRoom).emit("displayInfo", socket.username + ' has joined this room');
                                return;
                            } else {
                                socket.emit("displayInfo", 'wrong password for ' +privateRoom);
                                return;
                            }
                        }
                    }
                    
				}
	});

    socket.on("addWithPassword", function(roomName, password){
        starterRooms.push({name:roomName, creator: socket.username, password: password});
        listOfRooms[roomName] = socket.username;
        //io.emit('addRoom', starterRooms, socket.room);
        //socket.emit("updateRoomDisplay", socket.room, starterRooms);
        io.emit("updateRoomDisplay", socket.room, starterRooms);
	});
    

    socket.on("pm", function(to, msg){
        let from = socket.username;
		io.to(socketIds[to]).emit('sendPM', from, msg);
	});

    socket.on("passOnCreator", function(newCreator){
		listOfRooms[socket.room] = newCreator;
        for(var i = 0; i < starterRooms.length; i++){
            if(starterRooms[i].name == socket.room){
                if(starterRooms[i].creator == socket.username){
                    starterRooms[i].creator = newCreator;
                }
                else {
                    console.log("Recorded creator Of Room: " + starterRooms[i].creator);
                    console.log("User that tried to give privileges: " + socket.username)
                    socket.emit("improperPermission");
                }
            } 
        }
        console.log("New creator for room " + socket.room + " : " + newCreator);
	});

    socket.on("deleteRoom", function(room_name){
        if(room_name == "Home"){
            console.log("You are in the home room");
            io.to(socket.id).emit("displayInfo", "You can't delete the home room"); 
            return;
        }
        for(var i=0; i<starterRooms.length; i++){
			if(starterRooms[i].name == room_name){
                //find room to be deleted in the array of rooms
				if(socket.username != starterRooms[i].creator){
                    console.log("Recorded Owner Of Room: " + starterRooms[i].creator);
                    console.log("User that tried to delete room: " + socket.username)
                    socket.emit("improperPermission");
                    return;  
                    }
                else{
                    //iterate through connected sockets and move them to the home room.
                    setSocketIds.forEach(id =>{
                        if(io.sockets.connected[id].room == room_name){
                            io.sockets.connected[id].leave(room_name);
                            io.sockets.connected[id].join("Home");
                            io.to(socket.id).emit("displayInfo", "The room you were in has been deleted. Click a room to join."); 
                        }
                    })
                    starterRooms.splice(i,1);
                    io.sockets.emit("updateRoomDisplay", socket.room, starterRooms);
                }
             }          
		}
            //go through all the users in this room and leave room and put them back in home
            
            //run thru the chat rooms array to remove room
            /*
            for (let i in starterRooms){
                if(starterRooms[i].name==room_name){
                    starterRooms.splice(i,1);
                }
            }
            */
            io.sockets.emit("updateRoomDisplay", socket.room, starterRooms);
    });
});

