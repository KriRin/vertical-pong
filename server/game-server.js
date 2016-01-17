var port = 8047,
    clientList = [];

// Require the modules we need
var http = require('http');


// Create a http server with a callback handling all requests
var httpServer = http.createServer(function(request, response) {
  console.log((new Date()) + ' Received request for ' + request.url);
  response.writeHead(200, {'Content-type': 'text/plain'});
  response.end();
});


// Setup the http-server to listen to a port
httpServer.listen(port, function() {
  console.log((new Date()) + ' HTTP server is listening on port ' + port);
});


// Require the modules we need
var WebSocketServer = require('websocket').server;


// Create an object for the websocket
// https://github.com/Worlize/WebSocket-Node/wiki/Documentation
wsServer = new WebSocketServer({
  httpServer: httpServer,
  autoAcceptConnections: false
});


//Allways check and explicitly allow the origin
function originIsAllowed(origin) {
    if(origin === 'http://dbwebb.se' || origin === 'http://localhost:81' || origin === 'http://www.student.bth.se') {
        return true;
    }
    return false;
}


// check if client protocol is compatible with server
function checkProtocol(protocol) {
    var protocolGame = protocol.indexOf('game-protocol');
    
    if(protocolGame !== -1) {
        return 'game-protocol';
    }
    else {
        return false;
    }
}


// Create a callback to handle each connection request
wsServer.on('request', function(request) {
    
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }
    
    //check if client connects with the right protocol.
    if(checkProtocol(request.requestedProtocols)) {
       var connection = request.accept('game-protocol', request.origin);
    }
    else {
       request.reject();
    }
    
    
    clientList.push(connection); //add connection to array of players/connections
    //if connected player is 1st or 2st toggle ready button
    if(clientList.length === 1 || clientList.length === 2) {
        prepPlayer(connection);
    }
    console.log((new Date()) + ' Broadcast connection accepted from ' + request.origin);
    
    
    
    // Callback to handle each message from the client
    connection.on('message', function(message) {
        parseClientMsg(message.utf8Data, connection);
    });
    
    
    // Callback when client closes the connection
    connection.on('close', function(reasonCode, description) {
        
        //if player leaves during game - endgame.
        if(connection === clientList[0] || connection === clientList[1]) {
            if(gameState === true) {
                endGame(connection, 'disconnected');
            }
        }
        
        console.log('player: ' + connection.playerName + ' disconnected');
        
        //filter array and remove connection with specific playername of disconnected client
        clientList = clientList.filter(function(entry) {
            return entry.playerName !== connection.playerName;
        });
        
        //check remaining players and prepair them for game.
        if(clientList[0]) {
            prepPlayer(clientList[0]);
        }
        if(clientList[1]) {
            prepPlayer(clientList[1]);
        }
        
    });



});








/**
 * 
 * Game part of server
 *
 */


//Game variables
var canvasWidth = 700,
    canvasHeight = 600,
    gameState = false;


//Ball object and functions
function Ball() {
    this.x = 350;
    this.y = 300;
    this.dx = 3;
    this.dy = -3;
    this.radius = 10;
}

Ball.prototype.checkCollision = function() {
    
    //check if ball collides with walls
    if(this.x + this.dx > canvasWidth-this.radius || this.x + this.dx < this.radius) {
        this.dx = -this.dx;
    }
    
    //check bottom paddle/player2
    else if(this.y + this.dy >= canvasHeight-30) {
        if(this.x > player2.x && this.x < player2.x + player2.width) {
            this.dy = -this.dy;
        }
        else {
            endGame(clientList[1], 'won', clientList[0]);
        }
    }
    
    //check top paddle/player1
    else if(this.y + this.dy <= canvasHeight-570) {
        if(this.x > player1.x && this.x < player1.x + player1.width) {
            this.dy = -this.dy;
        }
        else {
            endGame(clientList[0], 'won', clientList[1]);
        }
    }
};

Ball.prototype.move = function() {
    this.x += this.dx;
    this.y += this.dy;
}

//initiate ball object
var ball = new Ball();


//Player object
function Player(y) {
    this.x = canvasWidth/2;
    this.y = y;
    this.width = 75;
    this.height = 10;
    this.speed = 7;
    this.name = null;
}

//initiate player object
var player1 = new Player(25);
var player2 = new Player(575);



//end game function
function endGame(loser, reason, winner) {
    gameState = false;
    if(reason === 'disconnected') {
        if(loser === clientList[0]) {
            clientList[1].sendUTF(JSON.stringify({type:'gameState', result:'win', winner:clientList[1].playerName, message:'You WON! The other player left the game. You get to play again, press ready and wait for another player.'}));
        }
        else if(loser === clientList[1]) {
            clientList[0].sendUTF(JSON.stringify({type:'gameState', result:'win', winner:clientList[0].playerName, message:'You WON! The other player left the game. You get to play again, press ready and wait for another player'}));
        }
    }
    
    
    else if(reason === 'won') {
        winner.sendUTF(JSON.stringify({type:'gameState', result:'win', winner:winner.playerName, message:'You WON! You get to play again, press ready and wait for another player.'}));
        loser.sendUTF(JSON.stringify({type:'gameState', result:'lost', winner:winner.playerName, message:'You lost, if you want to try again press connect and wait for your turn.'}));
        winner.readyState = 'paused';
    }
    
    resetGame();
    
};


//check incoming message from clients and act accordingly
function parseClientMsg(message, connection) {
    var parsedMsg = JSON.parse(message); //convert message back to object from the json format which it is sent as.
    switch(parsedMsg.type) {
        
        case 'playerMove':
            //update own position
            if(parsedMsg.playerNr === 1) {
                player1.x = parsedMsg.x;
            }
            else if(parsedMsg.playerNr === 2) {
                player2.x = parsedMsg.x;
            }
            break;
        
        
        case 'connect': 
            connection.playerName = parsedMsg.name;
            console.log('added playername: ' + connection.playerName + ', to connection');
            break;
        
        
        case 'ready':
            connection.readyState = 'ready';
            console.log('player: ' + connection.playerName + ' is ready');
            var connect1 = clientList[0];
            var connect2 = clientList[1] || false;
            if(connect1.readyState && connect2.readyState) {
                if(connect1.readyState === 'ready' && connect2.readyState === 'ready') {
                    console.log('Both players are ready, starting GAME');
                    startGame();
                }
            }
            break;
    }
};


//reset game variables and prepair for next game
function resetGame() {
    clearInterval(intervalId);
    gameState = false;
    ball.x = canvasWidth/2;
    ball.y = canvasHeight/2;
    ball.dx = 3;
    ball.dy = -3;
    player1.x = canvasWidth/2;
    player2.x = canvasWidth/2;
}


//prep new players with game info
function prepPlayer(connection) {
    if(clientList[0] === connection) {
        connection.sendUTF(JSON.stringify({type:'init', toggle:'ready', bx:ball.x, by:ball.y, playerMeX:player1.x, playerMeY:player1.y, playerOpX:player2.x, playerOpY:player2.y, playerNr:1}));
    }
    else if(clientList[1] === connection) {
        connection.sendUTF(JSON.stringify({type:'init', toggle:'ready', bx:ball.x, by:ball.y, playerMeX:player2.x, playerMeY:player2.y, playerOpX:player1.x, playerOpY:player1.y, playerNr:2}));
    }
};


//send the start message to players and start the game logic on server
function startGame() {
    
    var message = JSON.stringify({type:'gameState', status:'start'});
    clientList[0].sendUTF(message);
    clientList[1].sendUTF(message);
    
    //enable gameState to true and let the logic-loop do its thing
    gameState = true;
    gameLoop();
};


//update players with fresh information about ball & other player cordinates
function updatePlayers() {
    clientList[0].sendUTF(JSON.stringify({type:'movement', bx:ball.x, by:ball.y, pX:player2.x}));
    clientList[1].sendUTF(JSON.stringify({type:'movement', bx:ball.x, by:ball.y, pX:player1.x}));
}


//execute functions to drive the game logic
function run() {
    if(gameState === true) {
            ball.checkCollision();
            ball.move();
            updatePlayers();
    }
}


var intervalId;
function gameLoop() {
    if(gameState === true) {
        intervalId = setInterval(run, 15);
    }
};


