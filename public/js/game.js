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
  game.load.image('cruiser', 'assets/Human-Cruiser.png');
  game.load.image('heavycruiser', 'assets/Human-HeavyCruiser.png');
  game.load.image('capitalship', 'assets/Human-CapitalShip.png');
  game.load.image('enemy', 'assets/Fighter.png');
  
  // Space Station
  game.load.image('station', 'assets/Human-Spacestation.png');
}

var socket; // Socket connection

var land;
var station;

var canChange = false;

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
  player.money = 0;
  player.inventory = {
    iron: 0,
    titanium: 0,
    dilithium: 0,
    zinc: 0
  };

  // This will force it to decelerate and limit its speed
  // player.body.drag.setTo(200, 200)
  game.physics.enable(player, Phaser.Physics.ARCADE);
  player.body.maxVelocity.setTo(400, 400);
  player.body.collideWorldBounds = true;

  // Create some baddies to waste :)
  enemies = [];

  player.bringToTop();

  game.camera.follow(player);
  game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
  game.camera.focusOnXY(0, 0);

  cursors = game.input.keyboard.createCursorKeys();

  // Start listening for events
  setEventHandlers();
  
  canChange = true;
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
      game.physics.arcade.collide(player, enemies[i].player);
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
  
  if(game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR) && game.physics.arcade.intersects(player, station)) {
    if(guiContainer.visible = false) {
      guiContainer.visible = true;
    }
  }
  
  game.physics.arcade.velocityFromAngle(player.angle - 90, currentSpeed, player.body.velocity);

  land.tilePosition.x = -game.camera.x;
  land.tilePosition.y = -game.camera.y;

  socket.emit('move player', { x: player.x, y: player.y, angle: player.angle });
}

function render () {

}

function changeTextureRandom(object) {
  var random = Math.floor(Math.random() * (8 - 1)) + 1;
    
  if(random == 8) {
    object.loadTexture('fighter');
  } else if(random == 7) {
    object.loadTexture('corvette');
  } else if(random == 6) {
    object.loadTexture('frigate');
  } else if(random == 5) {
    object.loadTexture('destroyer');
  } else if(random == 4) {
    object.loadTexture('battleship');
  } else if(random == 3) {
    object.loadTexture('battlecruiser');
  } else if(random == 2) {
    object.loadTexture('cruiser');
  } else if(random == 1) {
    object.loadTexture('heavycruiser');
  } else {
    console.log("An error occured with the random number generation");
    return;
  }
}

function changeTexture(object, key) {
  if(!object) {
    console.log("You must have a Phaser Sprite object to change it's texture!");
    return;
  }
  
  if(!key) {
    console.log("You must have a correct resource key to change an objects texture to it!");
    return;
  }
  
  object.loadTexture(key);
}

function newShip(key) {
  socket.emit('change', { key: key });
  changeTexture(player, key);
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


/// GUI
//Set EZGUI renderer
EZGUI.renderer = game.renderer;
//load EZGUI themes 
//here you can pass multiple themes
EZGUI.Theme.load(['assets/kenney-theme/kenney-theme.json'], function () {
  //create the gui
  //the second parameter is the theme name, see kenney-theme.json, the name is defined under __config__ field
  var guiContainer = EZGUI.create(guiObj, 'kenney');
  guiContainer.visible = false;

  // Basic Button Input
  EZGUI.components.btn1.on('click', function (event) {
    sellOre();
  });
  
  EZGUI.components.btn2.on('click', function (event) {
    guiContainer.visible = false;
  });
  
  /// Ship Selection and Purchase Input
  
  // Corvette
  EZGUI.components.sc1.on('click', function (event) {
    newShip('corvette');
  });
  
  // Frigate
  EZGUI.components.sc2.on('click', function (event) {
    newShip('frigate');
  });
  
  // Destroyer
  EZGUI.components.sc3.on('click', function (event) {
    newShip('destroyer');
  });
  
  // Battleship
  EZGUI.components.sc4.on('click', function (event) {
    newShip('battleship');
  });
  
  // Battlecruiser
  EZGUI.components.sc5.on('click', function (event) {
    newShip('battlecruiser');
  });
  
  // Cruiser
  EZGUI.components.sc6.on('click', function (event) {
    newShip('cruiser');
  });
  
  // Heavy Cruiser
  EZGUI.components.sc7.on('click', function (event) {
    newShip('heavycruiser');
  });
  
  // Capital Ship
  EZGUI.components.sc8.on('click', function (event) {
    newShip('capitalship');
  });
});

// Functions
function sellOre() {
  guiContainer.bindChildrenOfType(EZGUI.Component.Radio, 'checked', function (event, me) {
    console.log('checked ', me.guiID);
    if(me.guiID == "radio1") {
      // Selling Iron Ore
    } else if(me.guiID == "radio2") {
      // Selling Titanium Ore
    } else if(me.guiID == "radio3") {
      // Selling Dilithium Ore
    } else if(me.guiID == "radio4") {
      // Selling Zinc
    } else {
      // No Selected Ore Type
      console.log("No selected ore type!");
    }
  });
}
