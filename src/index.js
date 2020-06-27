var express = require("express");
var socket = require("socket.io");

// App setup
var app = express();
var server = app.listen(8080, function() {
  console.log("listening to request on port 8080");
});

var Player = require("./Player");
var Dealer = require("./Dealer");

//BlackJack settings
var cards = [
  "AH",
  "2H",
  "3H",
  "4H",
  "5H",
  "6H",
  "7H",
  "8H",
  "9H",
  "10H",
  "JH",
  "QH",
  "KH",
  "AC",
  "2C",
  "3C",
  "4C",
  "5C",
  "6C",
  "7C",
  "8C",
  "9C",
  "10C",
  "JC",
  "QC",
  "KC",
  "AD",
  "2D",
  "3D",
  "4D",
  "5D",
  "6D",
  "7D",
  "8D",
  "9D",
  "10D",
  "JD",
  "QD",
  "KD",
  "AS",
  "2S",
  "3S",
  "4S",
  "5S",
  "6S",
  "7S",
  "8S",
  "9S",
  "10S",
  "JS",
  "QS",
  "KS"
];
var cardsDealt = new Array(52).fill(0);
//var player_cash = 100;
//var minimum_bet = 10;
var dealCount = 0;
var players = {};
var dealer = new Dealer();

var cardSetAsDealt = false;
var cardIdx = 0;
// var playersCardsArray = [];

// Socket setup
var io = socket(server);
var connectCounter = 0;
// always start with player0
var playerWithOption = 0;

io.on("connection", function(socket) {
  var sessionId = connectCounter;
  console.log("client connected: " + socket.handshake.address);
  console.log("with sessionId: " + sessionId);
  players[sessionId] = new Player();
  connectCounter++;
  players.length = connectCounter;
  socket.emit("handshake", sessionId);

  players[sessionId].playState = "sat";

  //**** deal cards to already connected players ****
  //**** ignore players who joined after other   ****
  //**** players already have hands dealt        ****//
  dealCount++;
  console.log("deal limit: ", 6 - connectCounter);
  if (dealCount > 6 - connectCounter) {
    //standard single deck 1 player max deal count
    //shuffle
    cardsDealt.fill(0, 0, 52);
    console.log(
      "initialized cardsDealt, dealCount at: " +
        dealCount +
        " and number of players: " +
        connectCounter
    );
    dealCount = 0;
  }

  dealInitialHands();

  // io.sockets.emit("deal", { hiddenDealerCards , players });
  updateTable(playerWithOption);
  //**** end deal action. TODO: move this out in a function ****//

  socket.on("hit", function() {
    console.log("***Player" + sessionId + " chooses to HIT***");
    console.log(
      "player" + sessionId + " hits with: " + players[sessionId].hand
    );

    console.log(
      "@@@@@@@@@@@ sessionId: " +
        sessionId +
        " playerWithOption: " +
        playerWithOption
    );
    if (!players[sessionId].busted && sessionId === playerWithOption) {
      players[sessionId].hand.push(dealHit());
    } else {
      //player already busted or is not his/her turn yet. let user know hit/stay are not valid.
    }

    players[sessionId].numericSum = addUpCards(players[sessionId].hand);
    console.log(
      "player" + sessionId + "s hand sum: " + players[sessionId].numericSum
    );
    players[sessionId].busted = isBust(players[sessionId].numericSum);

    if (players[sessionId].busted) {
      console.log("player" + sessionId + " busts!");
      players[sessionId].playState = "done";
      if (players.length - 1 > playerWithOption) {
        playerWithOption++;
      } else {
        // because third base can bust and give options to dealer
        playerWithOption = -1;
      }
    }
    console.log(
      "player" +
        sessionId +
        " now has: " +
        players[sessionId].hand +
        ". And current player with option is: " +
        playerWithOption
    );
    updateTable(playerWithOption);
    console.log("***Player" + sessionId + "'s HIT action processed***");
  });

  socket.on("stay", function() {
    console.log("***Player" + sessionId + " chooses to stay***");
    if (players.length - 1 > playerWithOption) {
      console.log("why not update?. playerWithOption: " + playerWithOption);
      playerWithOption++;
      console.log("after increment. playerWithOption: " + playerWithOption);
    } else {
      // last player stays
      playerWithOption = -1;
    }
    players[sessionId].playState = "done";

    updateTable(playerWithOption);
    console.log("***Player" + sessionId + "s stay processed***");
  });

  socket.on("rePlay", function() {
    dealInitialHands();
    updateTable(playerWithOption);
  });

  socket.on("disconnect", function() {
    console.log("client disconnected:" + socket.handshake.address);
    console.log("with sessionId: " + sessionId);
    // io.sockets.emit("disconnect");
    delete players[sessionId];
    io.sockets.emit("disconnect", sessionId);
    connectCounter--;
  });
});

function sleep(millisecondsToWait) {
  var now = new Date().getTime();
  while (new Date().getTime() < now + millisecondsToWait) {
    /* do nothing; this will exit once it reaches the time limit */
    /* if you want you could do something and exit */
  }
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function dealCards() {
  var dealtCards = ["", ""];
  for (var i = 0; i < 2; i++) {
    cardSetAsDealt = false;
    while (!cardSetAsDealt) {
      cardIdx = getRandomInt(52);
      if (cardsDealt[cardIdx] === 0) {
        cardsDealt[cardIdx] = 1;
        dealtCards[i] = cards[cardIdx];
        cardSetAsDealt = true;
      }
    }
  }
  return dealtCards;
}

function dealHit() {
  //deal one card to player and check if bust
  var dealtCard = "";
  cardSetAsDealt = false;
  while (!cardSetAsDealt) {
    cardIdx = getRandomInt(52);
    if (cardsDealt[cardIdx] === 0) {
      cardsDealt[cardIdx] = 1;
      dealtCard = cards[cardIdx];
      cardSetAsDealt = true;
    }
  }
  console.log("hitting with: " + dealtCard);
  return dealtCard;
}

function addUpCards(cardArray) {
  // hand can have a soft value if an ace is present
  // numericSums[0] = hard sum, ace counts as 1
  // numericSums[1] = soft sum, ace counts as 11
  var numericSums = [0, 0];
  for (var j = 0; j < cardArray.length; j++) {
    if (
      cardArray[j].length === 3 ||
      cardArray[j].charAt(0) === "J" ||
      cardArray[j].charAt(0) === "Q" ||
      cardArray[j].charAt(0) === "K"
    ) {
      numericSums[0] += 10;
      numericSums[1] += 10;
    } else {
      if (cardArray[j].charAt(0) === "A") {
        numericSums[0] += 1;
        numericSums[1] += 11;
      } else {
        numericSums[0] += Number(cardArray[j].charAt(0));
        numericSums[1] += Number(cardArray[j].charAt(0));
      }
    }
  }

  return numericSums;
}

function isBust(numericSums) {
  console.log("hard sum: " + numericSums[0]);
  console.log("soft sum: " + numericSums[1]);

  if (numericSums[0] > 21 && numericSums[1] > 21) {
    return true;
  } else {
    return false;
  }
}

// function whoWon(playerCards, dealer.hand){
//   var dealerSum = addUpCards(dealer.hand);
//   var dealerBusted = isBust(dealerSum);
//   var playerSum = addUpCards(playerCards);
//
//   if(dealerBusted){
//     return "Player";
//   }
//
//   if ( dealerSum[0] > playerSum[0] && dealerSum[1] > playerSum[1]) {
//     return "Dealer";
//   } else if (dealerSum[0] === playerSum[0] && dealerSum[1] === playerSum[1]) {
//     return "push";
//   } else {
//     return "Player";
//   }
// }

function isBlackJack(hand) {
  // TODO: implement later
}

function dealInitialHands() {
  console.log("========================FRESH TABLE========================");
  dealer.hand = dealCards();
  for (var i = 0; i < connectCounter; i++) {
    if (players[i].playState === "sat") {
      players[i].hand = [...dealCards()];
      players[i].playState = "dealt";
      // if BlackJack
      if (isBlackJack(players[i].hand)) {
        // mark player as won and disable actions. TODO: insurance action ignored here when dealer shows ace.
        players[i].playState = "done"; // TODO: winnings should be 1.5x
      }
    }
  }

  console.log("cards dealt: " + cardsDealt);
  for (var k = 0; k < connectCounter; k++) {
    console.log("players[", k, "].hand: ", players[k].hand);
  }
  console.log("dealer.hand: " + dealer.hand);
  console.log("dealCount: " + dealCount);
  console.log("========================HANDS DEALT========================");
}

function updateTable(playerWithOption) {
  var dealerCards = ["", ""];
  if (playerWithOption >= 0) {
    dealerCards = [...dealer.hand];
    dealerCards[0] = "HIDDEN";
  } else {
    dealerCards = [...dealer.hand];
  }

  io.sockets.emit("updateTable", {
    dealerHand: dealerCards,
    players: players,
    playerWithOption: playerWithOption
  });
  if (playerWithOption === -1) {
    doDealerAction();
  }
}

function doDealerAction() {
  // dealer stays on soft 17
  // dealer continues to hit until reaching 21 or higher
  var dealerBusted = false;
  var dealerSum = addUpCards(dealer.hand);

  sleep(2000);
  // keep dealing cards
  while (!dealerBusted) {
    if (dealerSum[0] >= 17 || dealerSum[1] >= 17) {
      break;
    }
    dealer.hand.push(dealHit());
    dealerSum = addUpCards(dealer.hand);
    dealerBusted = isBust(dealerSum);
    console.log("dealer cards after hit: " + dealer.hand);

    updateTable(-2); // so we don't call doDealerAction again
    sleep(2000);
  }
  updateTable(-3); // game over
  resetTable();
  // var winner = whoWon(players[sessionId].hand, dealer.hand);
  // announce winner and resset states for players
  // io.sockets.emit("announceWinner", winner);
}

function resetTable() {
  playerWithOption = 0;
  dealer = new Dealer();
  for (var i = 0; i < connectCounter; i++) {
    players[i].playState = "sat";
    players[i].hand = ["", ""];
    players[i].numericSum = [0, 0];
  }
}
