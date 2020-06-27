function Player() {
  // this.selected = [false,false,false,false,false,false,false,false,false];
  // this.handPointers = [0,0,0];
  this.hand = ["", ""];
  this.numericSum = [0, 0];
  this.busted = false;
  this.playState = "none"; // none, sat, dealt, done. todo: enumerate later
  this.balance = 100;
}

module.exports = Player;
