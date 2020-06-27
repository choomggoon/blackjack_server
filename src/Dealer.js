function Dealer() {
  this.hand = ["", ""];
  this.busted = false;
  this.playState = "none"; // none, dealt, stayed, lost, blackjack. todo: enumerate later
}

module.exports = Dealer;
