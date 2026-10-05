// Kura Card Game Engine

export const COLORS = ['green', 'brown', 'purple', 'magenta'];
export const SPECIAL_TYPES = ['shield', 'swap', 'shell'];
export const WILD_TYPES = ['wild', 'wild-draw4'];

export function createDeck() {
  const deck = [];
  let id = 1;

  for (const color of COLORS) {
    // One 0 per color
    deck.push({
      id: `c_${id++}`,
      color,
      type: '0',
      value: 0,
      image: `assets/cards/${color}/0.png`
    });

    // Two of 1-9 per color
    for (let num = 1; num <= 9; num++) {
      for (let count = 0; count < 2; count++) {
        deck.push({
          id: `c_${id++}`,
          color,
          type: String(num),
          value: num,
          image: `assets/cards/${color}/${num}.png`
        });
      }
    }

    // Two of each special per color: Shield, Swap, Shell
    for (const spec of SPECIAL_TYPES) {
      for (let count = 0; count < 2; count++) {
        deck.push({
          id: `c_${id++}`,
          color,
          type: spec,
          value: spec,
          image: `assets/cards/${color}/${spec}.png`
        });
      }
    }
  }

  // 4 Wild and 4 Wild Draw 4
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `c_${id++}`,
      color: 'wild',
      type: 'wild',
      value: 'wild',
      image: `assets/cards/wild/wild.png`
    });
    deck.push({
      id: `c_${id++}`,
      color: 'wild',
      type: 'wild-draw4',
      value: 'wild-draw4',
      image: `assets/cards/wild/wild-draw4.png`
    });
  }

  return shuffle(deck);
}

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class GameEngine {
  constructor(playersConfig = null, options = {}) {
    this.options = options;

    if (Array.isArray(playersConfig) && playersConfig.length >= 2) {
      this.players = playersConfig.map((p, idx) => ({
        id: p.id || `p_${idx}`,
        name: p.name || `Player ${idx + 1}`,
        isHuman: Boolean(p.isHuman),
        avatar: p.avatar || 'assets/avatars/you.png',
        hand: [],
        calledKura: false
      }));
    } else {
      this.players = [
        { id: 'you', name: 'You', isHuman: true, avatar: 'assets/avatars/you.png', hand: [], calledKura: false },
        { id: 'kuro', name: 'Kuro', isHuman: false, avatar: 'assets/avatars/kuro.png', hand: [], calledKura: false },
        { id: 'reyy', name: 'Reyy', isHuman: false, avatar: 'assets/avatars/reyy.png', hand: [], calledKura: false },
        { id: 'luna', name: 'Luna', isHuman: false, avatar: 'assets/avatars/luna.png', hand: [], calledKura: false }
      ];
    }

    this.drawPile = [];
    this.discardPile = [];
    this.activeColor = null; // 'green' | 'brown' | 'purple' | 'magenta'
    this.turnIndex = 0;
    this.direction = 1; // 1 for clockwise, -1 for counter-clockwise
    this.turnCount = 0;
    this.gameOver = false;
    this.winner = null;
    this.pendingReaction = null; // For Shield counter reaction
    this.hasDrawnThisTurn = false;
    this.log = [];
  }

  initGame() {
    this.drawPile = createDeck();
    this.discardPile = [];
    this.gameOver = false;
    this.winner = null;
    this.pendingReaction = null;
    this.hasDrawnThisTurn = false;
    this.turnIndex = 0;
    this.direction = 1;
    this.log = [];

    // Deal 7 cards to each player
    for (const player of this.players) {
      player.hand = [];
      player.calledKura = false;
      for (let i = 0; i < 7; i++) {
        player.hand.push(this.drawCardRaw());
      }
    }

    // Flip starting card from drawPile (must not be wild or wild-draw4 for smooth start)
    let startCardIndex = this.drawPile.findIndex(c => c.color !== 'wild');
    if (startCardIndex === -1) startCardIndex = 0;
    const [startCard] = this.drawPile.splice(startCardIndex, 1);
    this.discardPile.push(startCard);
    this.activeColor = startCard.color;

    this.addLog(`Game dimulai! Kartu awal adalah ${this.cardName(startCard)}.`);
  }

  get topDiscard() {
    return this.discardPile[this.discardPile.length - 1];
  }

  get currentPlayer() {
    return this.players[this.turnIndex];
  }

  drawCardRaw() {
    if (this.drawPile.length === 0) {
      if (this.discardPile.length > 1) {
        const top = this.discardPile.pop();
        this.drawPile = shuffle(this.discardPile);
        this.discardPile = [top];
        this.addLog('Deck diacak kembali dari tumpukan buangan.');
      } else {
        // Fallback: create fresh deck
        this.drawPile = createDeck();
      }
    }
    return this.drawPile.pop();
  }

  canPlayCard(card, hand) {
    if (this.gameOver || this.pendingReaction) return false;
    const top = this.topDiscard;
    if (!top) return true;

    // Shell rule: requires at least 3 cards in hand, counting the Shell itself
    if (card.type === 'shell') {
      if (!hand || hand.length < 3) {
        return false;
      }
    }

    // Wild cards can always be played
    if (card.color === 'wild' || card.type === 'wild' || card.type === 'wild-draw4') {
      return true;
    }

    // Matches active color
    if (card.color === this.activeColor) {
      return true;
    }

    // Matches type/number
    if (card.type === top.type) {
      return true;
    }

    return false;
  }

  getPlayableCards(player) {
    return player.hand.filter(card => this.canPlayCard(card, player.hand));
  }

  drawForCurrentPlayer() {
    if (this.hasDrawnThisTurn) return null;
    const player = this.currentPlayer;
    const drawn = this.drawCardRaw();
    player.hand.push(drawn);
    this.hasDrawnThisTurn = true;
    this.addLog(`${player.name} menarik 1 kartu dari deck.`);
    return drawn;
  }

  passTurn() {
    this.hasDrawnThisTurn = false;
    this.advanceTurn();
  }

  advanceTurn(skipCount = 1) {
    this.hasDrawnThisTurn = false;
    this.turnCount++;
    const total = this.players.length;
    this.turnIndex = (this.turnIndex + this.direction * skipCount + total * 10) % total;
  }

  playCard(player, cardId, options = {}) {
    // options: { chosenColor, swapTargetIndex, shellGiveCardId, shellTargetIndex }
    const cardIdx = player.hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return { success: false, reason: 'Kartu tidak ada di tangan.' };

    const card = player.hand[cardIdx];
    if (!this.canPlayCard(card, player.hand)) {
      if (card.type === 'shell' && player.hand.length < 3) {
        return { success: false, reason: 'Kartu Shell butuh minimal 3 kartu di tangan!' };
      }
      return { success: false, reason: 'Kartu tidak cocok dengan kartu di meja!' };
    }

    // Remove from hand and push to discard
    player.hand.splice(cardIdx, 1);
    this.discardPile.push(card);

    // KURA Shout Check
    if (player.hand.length === 1 && !player.calledKura) {
      // Player reached 1 card without calling Kura
      // We will flag or give grace period
    }

    let result = {
      success: true,
      card,
      requiresColorChoice: false,
      requiresSwapChoice: false,
      requiresShellChoice: false,
      shieldTriggered: false,
      attacker: player,
      targetPlayer: null
    };

    // Card resolution
    if (card.type === 'wild') {
      const newColor = options.chosenColor || 'green';
      this.activeColor = newColor;
      this.addLog(`${player.name} memainkan Wild dan memilih warna ${this.colorName(newColor)}!`);
      this.checkWinCondition(player);
      if (!this.gameOver) {
        this.advanceTurn();
      }
    } else if (card.type === 'wild-draw4') {
      const newColor = options.chosenColor || 'green';
      this.activeColor = newColor;
      const targetIdx = (this.turnIndex + this.direction + this.players.length) % this.players.length;
      const targetPlayer = this.players[targetIdx];
      this.addLog(`${player.name} memainkan Wild +4! Warna aktif: ${this.colorName(newColor)}. Menargetkan ${targetPlayer.name}!`);

      // Check if target player holds a Shield!
      const shieldIndex = targetPlayer.hand.findIndex(c => c.type === 'shield');
      if (shieldIndex !== -1) {
        // Pending Shield Counter reaction!
        this.pendingReaction = {
          type: 'shield_prompt',
          attackerIndex: this.turnIndex,
          targetIndex: targetIdx,
          attacker: player,
          targetPlayer: targetPlayer,
          shieldIndex
        };
        result.shieldTriggered = true;
        result.targetPlayer = targetPlayer;
        return result;
      } else {
        // Target has no shield: takes 4 cards and skipped
        this.executeWildDraw4Hit(player, targetPlayer, false);
      }
    } else if (card.type === 'swap') {
      this.activeColor = card.color;
      result.requiresSwapChoice = true;
      // If target provided:
      if (options.swapTargetIndex !== undefined) {
        this.executeSwap(player, options.swapTargetIndex);
      }
    } else if (card.type === 'shell') {
      this.activeColor = card.color;
      result.requiresShellChoice = true;
      if (options.shellGiveCardId && options.shellTargetIndex !== undefined) {
        this.executeShell(player, options.shellGiveCardId, options.shellTargetIndex);
      }
    } else if (card.type === 'shield') {
      this.activeColor = card.color;
      this.addLog(`${player.name} memainkan Shield (${this.colorName(card.color)}).`);
      this.checkWinCondition(player);
      if (!this.gameOver) {
        this.advanceTurn();
      }
    } else {
      // Normal number card
      this.activeColor = card.color;
      this.addLog(`${player.name} memainkan ${this.cardName(card)}.`);
      this.checkWinCondition(player);
      if (!this.gameOver) {
        this.advanceTurn();
      }
    }

    return result;
  }

  executeWildDraw4Hit(attacker, targetPlayer, shieldUsed = false) {
    if (shieldUsed) {
      // Shield bounced back to attacker!
      this.addLog(`🛡️ BOUNCE! ${targetPlayer.name} memantulkan Wild +4 kembali ke ${attacker.name}!`);
      // Attacker draws 4 cards
      for (let i = 0; i < 4; i++) {
        attacker.hand.push(this.drawCardRaw());
      }
      this.addLog(`${attacker.name} terkena pantulan dan mengambil 4 kartu!`);
      // Target player is NOT skipped: turn becomes target player's turn!
      const targetIdx = this.players.indexOf(targetPlayer);
      this.turnIndex = targetIdx;
      this.hasDrawnThisTurn = false;
      this.pendingReaction = null;
    } else {
      // Normal +4 hit
      for (let i = 0; i < 4; i++) {
        targetPlayer.hand.push(this.drawCardRaw());
      }
      this.addLog(`${targetPlayer.name} mengambil 4 kartu dan giliran dilewati!`);
      this.pendingReaction = null;
      this.checkWinCondition(attacker);
      if (!this.gameOver) {
        // Skip target player
        this.advanceTurn(2);
      }
    }
  }

  resolveShieldReaction(useShield) {
    if (!this.pendingReaction) return null;
    const { attacker, targetPlayer, shieldIndex } = this.pendingReaction;

    if (useShield && shieldIndex !== -1) {
      // Take shield card from target's hand and put on discard
      const [shieldCard] = targetPlayer.hand.splice(shieldIndex, 1);
      this.discardPile.push(shieldCard);
      this.activeColor = shieldCard.color;
      this.executeWildDraw4Hit(attacker, targetPlayer, true);
      return { bounced: true, shieldCard };
    } else {
      this.executeWildDraw4Hit(attacker, targetPlayer, false);
      return { bounced: false };
    }
  }

  executeSwap(player, targetIndex) {
    const targetPlayer = this.players[targetIndex];
    if (!targetPlayer || targetPlayer === player || targetPlayer.hand.length === 0 || player.hand.length === 0) {
      this.advanceTurn();
      return null;
    }

    const pCardIdx = Math.floor(Math.random() * player.hand.length);
    const tCardIdx = Math.floor(Math.random() * targetPlayer.hand.length);

    const [playerGivenCard] = player.hand.splice(pCardIdx, 1);
    const [targetGivenCard] = targetPlayer.hand.splice(tCardIdx, 1);

    player.hand.push(targetGivenCard);
    targetPlayer.hand.push(playerGivenCard);

    this.addLog(`🔄 ${player.name} bertukar 1 kartu acak dengan ${targetPlayer.name}!`);
    this.checkWinCondition(player);
    if (!this.gameOver) {
      this.advanceTurn();
    }
    return { playerGivenCard, targetGivenCard, targetPlayer };
  }

  executeShell(player, giveCardId, targetIndex) {
    const targetPlayer = this.players[targetIndex];
    if (!targetPlayer || targetPlayer === player) {
      this.advanceTurn();
      return null;
    }

    const cIdx = player.hand.findIndex(c => c.id === giveCardId);
    let givenCard;
    if (cIdx !== -1) {
      [givenCard] = player.hand.splice(cIdx, 1);
    } else {
      givenCard = player.hand.pop();
    }

    targetPlayer.hand.push(givenCard);
    this.addLog(`🐚 ${player.name} memberikan kartu ${this.cardName(givenCard)} secara permanen kepada ${targetPlayer.name}!`);
    this.checkWinCondition(player);
    if (!this.gameOver) {
      this.advanceTurn();
    }
    return { givenCard, targetPlayer };
  }

  callKura(player) {
    if (player.hand.length <= 2) {
      player.calledKura = true;
      this.addLog(`📢 ${player.name} meneriakkan KURA! Sisa 1 kartu!`);
      return true;
    }
    return false;
  }

  checkWinCondition(player) {
    if (player.hand.length === 0) {
      this.gameOver = true;
      this.winner = player;
      this.addLog(`🏆 ${player.name} memenangkan permainan!`);
      return true;
    }
    return false;
  }

  addLog(msg) {
    this.log.unshift({
      id: Date.now() + Math.random(),
      text: msg,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
    if (this.log.length > 50) this.log.pop();
  }

  colorName(color) {
    const map = {
      green: 'Hijau (Green)',
      brown: 'Cokelat (Brown)',
      purple: 'Ungu (Purple)',
      magenta: 'Magenta'
    };
    return map[color] || color;
  }

  cardName(card) {
    if (card.type === 'wild') return 'Kartu Wild';
    if (card.type === 'wild-draw4') return 'Kartu Wild +4';
    if (card.type === 'shield') return `Shield (${this.colorName(card.color)})`;
    if (card.type === 'swap') return `Swap (${this.colorName(card.color)})`;
    if (card.type === 'shell') return `Shell (${this.colorName(card.color)})`;
    return `${this.colorName(card.color)} Angka ${card.value}`;
  }
}
