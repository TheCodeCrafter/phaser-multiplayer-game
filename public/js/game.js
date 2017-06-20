/* global Phaser RemotePlayer io */

var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update, render: render });

function preload () {
  // Space Background
  game.load.image('space', 'assets/starfield.jpg');
  
  // Ships
  game.load.image('fighter', 'assets/Human-Fighter.png');
  game.load.image('corvette', 'assets/Human-Corvette.png');
  game.load.image('frigate', 'assets/Human-Frigate.png');
  game.load.image('destroyer', 'assets/Human-Destroyer.png');
  game.load.image('battleship', 'assets/Human-Battleship.png');
  game.load.image('battlecruiser', 'assets/Human-Battlecruiser.png');
  game.load.image('heavycruiser', 'assets/Human-HeavyCruiser.png');
  game.load.image('cruiser', 'assets/Human-Cruiser.png');
  game.load.image('enemy', 'assets/Fighter.png');
  
  // Space Station
  game.load.image('station', 'assets/Human-Spacestation.png');
}

var socket; // Socket connection

var land;
var station;

var canShoot = false;

var player;

var enemies;

var currentSpeed = 0;
var cursors;

function create () {
  alert("Created By Noah Coetsee! Enjoy!\n\nArrow Keys to Move\n\nP.S. Press space while hovering over the space station!");
  
  socket = io.connect();

  // Resize our game world to be a 3500 x 3500 square
  game.world.setBounds(-500, -500, 2000, 2000);

  // Our tiled scrolling background
  land = game.add.tileSprite(0, 0, 800, 600, 'space');
  land.fixedToCamera = true;
  
  // Add a space station for player interaction
  station = game.add.sprite(game.world.centerX, game.world.centerY, 'station');
  
  game.physics.startSystem(Phaser.Physics.ARCADE);

  // The base of our player
  var startX = Math.round(Math.random() * (1000) - 500);
  var startY = Math.round(Math.random() * (1000) - 500);
  player = game.add.sprite(startX, startY, 'fighter');
  player.anchor.setTo(0.5, 0.5);

  // This will force it to decelerate and limit its speed
  // player.body.drag.setTo(200, 200)
  game.physics.enable(player, Phaser.Physics.ARCADE);
  player.body.maxVelocity.setTo(400, 400);
  player.body.collideWorldBounds = true;
  
  // Give the Player an amount of money
  player.money = 0;

  // Create some baddies to waste :)
  enemies = [];

  player.bringToTop();

  game.camera.follow(player);
  game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
  game.camera.focusOnXY(0, 0);

  cursors = game.input.keyboard.createCursorKeys();

  // Start listening for events
  setEventHandlers();
  
  game.input.mouse.capture = true;
  canShoot = true;
}

var setEventHandlers = function () {
  // Socket connection successful
  socket.on('connect', onSocketConnected);

  // Socket disconnection
  socket.on('disconnect', onSocketDisconnect);

  // New player message received
  socket.on('new player', onNewPlayer);

  // Player move message received
  socket.on('move player', onMovePlayer);
  
  // Player change message received
  socket.on('change player', onChangePlayer);

  // Player removed message received
  socket.on('remove player', onRemovePlayer);
}

// Socket connected
function onSocketConnected () {
  console.log('Connected to socket server');

  // Reset enemies on reconnect
  enemies.forEach(function (enemy) {
    enemy.player.kill();
  });
  enemies = [];

  // Send local player data to the game server
  socket.emit('new player', { x: player.x, y: player.y, angle: player.angle });
}

// Socket disconnected
function onSocketDisconnect () {
  console.log('Disconnected from socket server');
}

// New player
function onNewPlayer (data) {
  console.log('New player connected:', data.id);

  // Avoid possible duplicate players
  var duplicate = playerById(data.id);
  if (duplicate) {
    console.log('Duplicate player!');
    return;
  }

  // Add new player to the remote players array
  enemies.push(new RemotePlayer(data.id, game, player, data.x, data.y, data.angle));
}

// Move player
function onMovePlayer (data) {
  var movePlayer = playerById(data.id);

  // Player not found
  if (!movePlayer) {
    console.log('Player not found: ', data.id);
    return;
  }

  // Update player position
  movePlayer.player.x = data.x;
  movePlayer.player.y = data.y;
  movePlayer.player.angle = data.angle;
}

function onShootPlayer (data) {
  var shootPlayer = playerById(data.owner);
  
  // Player not found
  if (!shootPlayer) {
    console.log('Player not found: ', data.owner);
    return;
  }
  
  // Create laser and check it for hits
  var laser = new Phaser.Line(data.start.x, data.start.y, data.end.x, data.end.y);
  checkLaserCollision(laser);
}

// Change Player
function onChangePlayer (data) {
  var changePlayer = playerById(data.id);
  
  // Player not found
  if(!changePlayer) {
    console.log("Player not found, ID: " + data.id);
    return;
  }
  
  changePlayer.player.loadTexture(data.key);
}

// Remove player
function onRemovePlayer (data) {
  var removePlayer = playerById(data.id);

  // Player not found
  if (!removePlayer) {
    console.log('Player not found: ', data.id);
    return;
  }

  removePlayer.player.kill();

  // Remove player from array
  enemies.splice(enemies.indexOf(removePlayer), 1);
}

function update () {
  for (var i = 0; i < enemies.length; i++) {
    if (enemies[i].alive) {
      enemies[i].update();
    }
  }

  if (cursors.left.isDown) {
    player.angle -= 4;
  } else if (cursors.right.isDown) {
    player.angle += 4;
  }

  if (cursors.up.isDown) {
    // The speed we'll travel at
    currentSpeed = 300;
  } else {
    if (currentSpeed > 0) {
      currentSpeed -= 4;
    }
  }
  
  if(game.input.activePointer.leftButton.isDown) {
    if(canShoot) {
      socket.emit('shoot', {
        start: {
          x: player.x,
          y: player.y
        },
        end: {
          x: game.input.mousePointer.x,
          y: game.input.mousePointer.y
        }
      });
      
      canShoot = false;
      setTimeout(function() {
        canShoot = true;
      },500);
    }
  }
  
  game.physics.arcade.velocityFromAngle(player.angle - 90, currentSpeed, player.body.velocity);

  land.tilePosition.x = -game.camera.x;
  land.tilePosition.y = -game.camera.y;

  socket.emit('move player', { x: player.x, y: player.y, angle: player.angle });
}

function render () {
  // Display Money
  game.debug.text( "$" + player.money, 100, 380 );
}

// Change Texture
function changeTexture(object, texture) {
  // Object not found
  if(!object) {
    console.log('Object not found...');
    return;
  }
  
  object.loadTexture(texture);
}

function displayGUI() {
  swal({
    title: 'Station Shop',
    html:
      'You can use <b>bold text</b>, ' +
      '<a href="//github.com">links</a> ' +
      'and other HTML tags',
    showCloseButton: true,
    showCancelButton: true,
    confirmButtonText:
      '<i class="fa fa-thumbs-up"></i> Great!',
    cancelButtonText:
      '<i class="fa fa-thumbs-down"></i>'
  });
}


// Check For Laser Collision
function checkLaserCollision(laser) {
  for(var i = 0; i < enemies.length; i++) {
    var collisionRect = new Phaser.Rectangle;
    if(enemies[i].alive) {
      collisionRect.copyFrom(enemies[i].player);
      
      if(Phaser.Line.intersectsRectangle(laser, collisionRect)) {
        return true;
      } else {
        return false;
      }
    }
  }
}

// Find player by ID
function playerById (id) {
  for (var i = 0; i < enemies.length; i++) {
    if (enemies[i].player.name === id) {
      return enemies[i];
    }
  }

  return false;
}
