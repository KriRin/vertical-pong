# Vertical-pong


After you have downloaded the files from Gibthub the game requires jQuery which is included in the js folder. If you have your own use that. The server script runs on nodeJS which you can download from here.

The server and players communicate via websockets and therefore require a nodeJs module named websocket-node. It can be downloaded either from Github or from the built-in package manager in nodeJs npm. Type npm install websocket@1.0.3 in your terminal or cmd. The game-server.js file now need you to point to where you installed the websocket module. Change line 23: var WebSocketServer = require('websocket').server;

Now the client file game.js in the js folder need you to provide the ip and portnr to your nodeJs server. Replace var url = 'ws://localhost:8047' on line 144 with your adress and portnr.

#Done

You are now done. Start the game-server.js in nodeJs and open the game.html in your browser and play away with a friend over the internet.
