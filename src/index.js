var express = require("express");
var socket = require("socket.io");

// App setup
var app = express();
var server = app.listen(8080, function() {
  console.log("listening to request on port 8080");
});

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

var dealerCards = ["", ""];
var playerCards = ["", ""];
var cardSetAsDealt = false;
var cardIdx = 0;

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

function whoWon(playerCards, dealerCards) {
  var dealerSum = addUpCards(dealerCards);
  var dealerBusted = isBust(dealerSum);
  var playerSum = addUpCards(playerCards);

  if (dealerBusted) {
    return "Player";
  }

  if (dealerSum[0] > playerSum[0] && dealerSum[1] > playerSum[1]) {
    return "Dealer";
  } else if (dealerSum[0] === playerSum[0] && dealerSum[1] === playerSum[1]) {
    return "push";
  } else {
    return "Player";
  }
}

// Socket setup
var io = socket(server);

io.on("connection", function(socket) {
  console.log("made socket connection", socket.id);

  socket.on("deal", function() {
    dealCount++;
    if (dealCount > 6) {
      //standard single deck 1 player max deal count
      //shuffle
      cardsDealt.fill(0, 0, 51);
      console.log("initialized cardsDealt: " + cardsDealt);
    }

    dealerCards = dealCards();
    playerCards = dealCards();
    var hiddenDealerCards = [...dealerCards];
    hiddenDealerCards[0] = "HIDDEN";

    io.sockets.emit("deal", { hiddenDealerCards, playerCards });
    console.log("cards dealt: " + cardsDealt);
    console.log("playerCards: " + playerCards);
    console.log("dealerCards: " + dealerCards);
    console.log("dealCount: " + dealCount);
  });

  socket.on("hit", function() {
    console.log("player hits with: " + playerCards);
    var numericSums = [0, 0];
    var playerBusted = false;
    playerCards.push(dealHit());

    numericSums = addUpCards(playerCards);
    playerBusted = isBust(numericSums);
    io.sockets.emit("hit", { playerCards, playerBusted });
    if (playerBusted) {
      console.log("player busts!");
    }
    console.log("player now has: " + playerCards);
  });

  socket.on("stay", function() {
    io.sockets.emit("showDealerHidden", dealerCards);

    // dealer stays on soft 17
    // dealer continues to hit until reaching 21 or higher
    var dealerBusted = false;
    var dealerSum = addUpCards(dealerCards);
    // keep dealing cards
    while (!dealerBusted) {
      if (dealerSum[0] >= 17 || dealerSum[1] >= 17) {
        break;
      }
      dealerCards.push(dealHit());
      dealerSum = addUpCards(dealerCards);
      dealerBusted = isBust(dealerSum);
      console.log("dealer cards after hit: " + dealerCards);
      io.sockets.emit("dealerHit", dealerCards);
      sleep(2000);
    }

    var winner = whoWon(playerCards, dealerCards);

    io.sockets.emit("announceWinner", winner);
  });
});
