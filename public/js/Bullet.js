var Bullet = function(game, ownerID, startX, startY, startAngle) {
  this.owner = ownerID;
  this.x = startX;
  this.y = startY;
  this.angle = startAngle;
  
  this.game = game;
  
  this.alive = true;
  
  this.sprite = game.add.sprite(x, y, 'missile');
  this.sprite.anchor.setTo(0.5, 0.5);
  this.sprite.body.immovable = true;
  
  game.physics.enable(this.sprite, Phaser.Physics.ARCADE);
  
  this.update = function() {
      this.game.physics.arcade.velocityFromAngle(this.angle, 2500, this.sprite.body.velocity);
  };
};
