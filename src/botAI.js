// Smart and playful AI Bot logic for Kura Card (Luna, Reyy, Kuro)

import { COLORS } from './engine.js';

export class BotAI {
  static getBestColor(hand) {
    const counts = { green: 0, brown: 0, purple: 0, magenta: 0 };
    for (const card of hand) {
      if (counts[card.color] !== undefined) {
        counts[card.color]++;
      }
    }
    let best = 'green';
    let max = -1;
    for (const color of COLORS) {
      if (counts[color] > max) {
        max = counts[color];
        best = color;
      }
    }
    return best;
  }

  static pickTargetForSwap(engine, botIndex) {
    // Choose opponent with the fewest cards
    let bestIdx = -1;
    let minCards = 999;
    engine.players.forEach((p, idx) => {
      if (idx !== botIndex && p.hand.length > 0) {
        if (p.hand.length < minCards) {
          minCards = p.hand.length;
          bestIdx = idx;
        }
      }
    });
    return bestIdx !== -1 ? bestIdx : (botIndex + 1) % engine.players.length;
  }

  static pickTargetForShell(engine, botIndex) {
    // Target the leading player (fewest cards) to burden them with an extra card!
    let bestIdx = -1;
    let minCards = 999;
    engine.players.forEach((p, idx) => {
      if (idx !== botIndex) {
        if (p.hand.length < minCards) {
          minCards = p.hand.length;
          bestIdx = idx;
        }
      }
    });
    return bestIdx !== -1 ? bestIdx : (botIndex + 1) % engine.players.length;
  }

  static pickCardToGiveWithShell(hand) {
    // Pick highest value number or least common color
    // Do not give away Wild if possible!
    const nonWilds = hand.filter(c => c.color !== 'wild');
    if (nonWilds.length > 0) {
      // Find highest number card
      const numberCards = nonWilds.filter(c => !isNaN(parseInt(c.type)));
      if (numberCards.length > 0) {
        numberCards.sort((a, b) => b.value - a.value);
        return numberCards[0].id;
      }
      return nonWilds[0].id;
    }
    return hand[0].id;
  }

  static decideTurn(engine, botPlayer) {
    const botIndex = engine.players.indexOf(botPlayer);
    const playableCards = engine.getPlayableCards(botPlayer);

    // Kura shout check: if bot has 2 cards and is about to play, shout Kura!
    if (botPlayer.hand.length === 2 && Math.random() < 0.95) {
      engine.callKura(botPlayer);
    }

    if (playableCards.length === 0) {
      // Must draw card
      return { action: 'draw' };
    }

    // Check if an opponent has 1 or 2 cards left (threat alert)
    const opponentThreat = engine.players.some((p, i) => i !== botIndex && p.hand.length <= 2);

    let selectedCard = null;

    if (opponentThreat) {
      // Prioritize Wild +4 or special cards to disrupt
      const draw4 = playableCards.find(c => c.type === 'wild-draw4');
      if (draw4) selectedCard = draw4;
      else {
        const swap = playableCards.find(c => c.type === 'swap');
        if (swap) selectedCard = swap;
        else {
          const shell = playableCards.find(c => c.type === 'shell');
          if (shell) selectedCard = shell;
        }
      }
    }

    if (!selectedCard) {
      // Regular tactical choice:
      // Try to save Wilds for later if we have normal cards
      const normalMatches = playableCards.filter(c => c.color !== 'wild');
      if (normalMatches.length > 0) {
        // Prefer number cards first, or specials
        selectedCard = normalMatches[Math.floor(Math.random() * normalMatches.length)];
      } else {
        selectedCard = playableCards[0];
      }
    }

    // Build execution options
    const options = {};

    if (selectedCard.color === 'wild' || selectedCard.type === 'wild' || selectedCard.type === 'wild-draw4') {
      options.chosenColor = this.getBestColor(botPlayer.hand);
    }

    if (selectedCard.type === 'swap') {
      options.swapTargetIndex = this.pickTargetForSwap(engine, botIndex);
    }

    if (selectedCard.type === 'shell') {
      options.shellTargetIndex = this.pickTargetForShell(engine, botIndex);
      // Pick a card from remaining hand (excluding the shell itself)
      const remainingHand = botPlayer.hand.filter(c => c.id !== selectedCard.id);
      options.shellGiveCardId = this.pickCardToGiveWithShell(remainingHand);
    }

    return {
      action: 'play',
      cardId: selectedCard.id,
      options
    };
  }
}
