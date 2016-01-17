$(document).ready(function () {
    'use strict';
    
    
    window.Game = (function() {
        
        
        /**
         * Game part
         */
        
        //game variables
        var canvas = $('#game')[0], //[0] is used to access DOM/canvas element instead of jQuery, that way getContext works in next row
        ctx = canvas.getContext('2d'),
        status = 'paused',
        winner = null;
        
        
        
        //player object and functions
        function Player() {
            this.x = null;
            this.y = null;
            this.width = 75;
            this.height = 10;
            this.speed = 7;
            this.name = null;
            this.nr = null;
        }
        
        Player.prototype.draw = function() {
            if(status === 'running') {
                ctx.beginPath();
                ctx.rect(this.x, this.y, this.width, this.height);
                ctx.fillStyle = "#0095DD";
                ctx.fill();
                ctx.closePath();
            }
        };
        
        Player.prototype.moveLeft = function() {
            if(this.x > 0) {
                this.x -= this.speed;
            }
            var message = {type:"playerMove", playerNr:playerMe.nr, x:this.x};
            send(message);
        };
        
        Player.prototype.moveRight = function() {
            
            
            if(this.x < canvas.width-this.width) {
                this.x += this.speed;
            }
            
            var message = {type:"playerMove", playerNr:playerMe.nr, x:this.x};
            send(message);
            
        };
        
        Player.prototype.update = function() {
                if (Key.isDown(Key.LEFT)) this.moveLeft();
                if (Key.isDown(Key.RIGHT)) this.moveRight();
        };
        
        
        //initiate player object
        var playerMe = new Player();
        var playerOp = new Player();
        
                //keypress capture
        var Key = {
            _pressed: {},
            
            LEFT: 37,
            RIGHT: 39,
            
            isDown: function(keyCode) {
                return this._pressed[keyCode];
            },
            
            onKeydown: function(event) {
                this._pressed[event.keyCode] = true;
                //prevent browser from scrolling when left and right is pressed
                if(event.keyCode === 37 || event.keyCode === 39) {
                    event.preventDefault();
                }
            },
            
            onKeyup: function(event) {
                delete this._pressed[event.keyCode];
            }
        };
        
        window.addEventListener('keyup', function(event) { Key.onKeyup(event); }, false);
        window.addEventListener('keydown', function(event) { Key.onKeydown(event); }, false);
        
        
        
        function Ball() {
            this.x = null;
            this.y = null;
            this.radius = 10;
            this.color = "#10EA17";
        }
         
        Ball.prototype.draw = function() {
            if(status === 'running'){
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2, true);
                ctx.fill();
                ctx.closePath();
            }
            
        };
        
        var ball = new Ball();
        
        
        //draw canvas inkl players + ball
        function draw() {
                if(status === 'running'){
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ball.draw();
                    playerMe.draw();
                    playerOp.draw();
                }
                else if(status === 'ended') {
                    ctx.font="40px Georgia";
                    ctx.fillText(winner + ' WON!', 200, 130);
                }
        };
        
        
        
        
        
        
        /**
         * websocket-client part of code
         * 
         */
        var url = 'ws://localhost:8047', //change this to your serversadress and portnr
            connect = $('#connect'),
            name = $('#name'),
            nameError = $('#nameError'),
            websocket;
        
        
        
        //settings of initial gui elements
        $('#game').hide();
        $('#ready').hide();
        
        
        
        $('#ready').click(function() {
            $('#gameMessage').html('You are ready. Wait until another player is ready.');
            $('#gameMessage').show();
            send({type:'ready'});
            $('#ready').hide();
        });
        
        
        $('#connect').click(function() {
            
            console.log('Connectiong to: ' + url);
            //close old connection if exists
            if(websocket) {
                websocket.close();
                websocket = null;
            }
            
             //check if user has filled in a name
            if (/\S/.test(name.val())) {
                //remove errormessage
                nameError.html = null;
                
                websocket = new WebSocket(url, 'game-protocol');
                
                // Eventhandler when the websocket is opened.
                websocket.onopen = function() {
                    $('#servconnection').html('');
                    console.log('The websocket is now open.');
                    send({type:"connect", name:name.val()});
                }
                $('#connection').hide();
                $('#gameMessage').html('You are in queue to play. Wait until it is your turn to face the winner.');
            } 
            else {
                nameError.html("Set a name");
            }
            
            //on message from server to client
            websocket.onmessage = function(event) {
                console.log('Message from server: ' + event.data);
                parseServMsg(event.data);
            }
             
            // Eventhandler when the websocket is closed.
            websocket.onclose = function() {
                console.log('The websocket is now closed.');
                $('#servconnection').html('You disconnected from the server or the server is unavailable.');
                status = 'ended';
            }
        });
        
        
        //Send message to server
        var send = function(message) {
            if(!websocket || websocket.readyState === 3) {
                console.log('The websocket is not connected to a server.');
                msglog.append("The websocket is not connected to a server. </br>");
            } else {
                //console.log("Sending message: " + JSON.stringify(message)); //uncomment for debugging
                websocket.send(JSON.stringify(message));
            }
        };
        
        
        //parse incoming message from server and decide what to do
        function parseServMsg(message) {
            var result = $.parseJSON(message); //convert message back to js object from Json format which it was sent as.
            
            $.each(result, function(k, v) {
                switch(v) {
                    case "movement":
                        ball.x = result.bx;
                        ball.y = result.by;
                        playerOp.x = result.pX;
                        break;
                        
                    case "gameState":
                        if(result.status === 'start') {
                            $('#ready').hide();
                            $('#gameMessage').hide();
                            $('#game').show();
                            status = 'running';
                        }
                        
                        //Game has ended and you won
                        else if(result.result === 'win') {
                            winner = result.winner;
                            status = 'ended';
                            $('#gameMessage').html(result.message);
                            setTimeout(function() {
                                $('#game').hide();
                                $('#gameMessage').show();
                                $('#ready').show();
                                winner = "";
                            }, 2000);
                            
                        }
                        
                        //Game has ended and you lost
                        else if(result.result === 'lost') {
                            winner = result.winner;
                            $('#gameMessage').html(result.message);
                            status = 'ended';
                            websocket.close();
                            setTimeout(function() {
                                $('#game').hide();
                                $('#gameMessage').show();
                                $('#connection').show();
                            }, 4000);
                        }
                        break;
                        
                    case "init":
                        $('#ready').show();
                        ball.x = result.bx;
                        ball.y = result.by;
                        playerMe.x = result.playerMeX;
                        playerMe.y = result.playerMeY;
                        playerOp.x = result.playerOpX;
                        playerOp.y = result.playerOpY;
                        playerMe.nr = result.playerNr;
                        break;
                        
                }
            });
        };
        
        
        
        var update = function() {
            if(status === 'running'){
                playerMe.update(); //update your position through key presses
            }
            //playerOp's position is updated through received msg from server and drawn.
        };
        
        var run = function() {
            update();
            draw();
        };
        
        //loop that runs game and requestAnimFrame for smooth gameplay
        var loop = function() {
            /** 
             * Shim layer, polyfill, for requestAnimationFrame with setTimeout fallback.
             * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
             */ 
            window.requestAnimFrame = (function(){
              return  window.requestAnimationFrame       || 
                      window.webkitRequestAnimationFrame || 
                      window.mozRequestAnimationFrame    || 
                      window.oRequestAnimationFrame      || 
                      window.msRequestAnimationFrame     || 
                      function( callback ){
                        window.setTimeout(callback, 1000 / 60);
                      };
            })();
             
            /**
             * Shim layer, polyfill, for cancelAnimationFrame with setTimeout fallback.
             */
            window.cancelRequestAnimFrame = (function(){
              return  window.cancelRequestAnimationFrame || 
                      window.webkitCancelRequestAnimationFrame || 
                      window.mozCancelRequestAnimationFrame    || 
                      window.oCancelRequestAnimationFrame      || 
                      window.msCancelRequestAnimationFrame     || 
                      window.clearTimeout;
            })();
            
            (function() {
                requestAnimFrame(loop);
                run();
            })();
        };
        
        
        
        
        /**
         * returns functions for use outside Game object.
         */
        return {
            'loop': loop
        }
    
})();
    
    
    
 
/**
 * Init the game and leave control to the animation loop.
 *
**/
    Game.loop();
    
    
    
    
    
    
    
    
});

