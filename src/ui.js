// UI Controller and Event Handler for Kura Card
import confetti from 'canvas-confetti';
import { sounds } from './audio.js';
import { BotAI } from './botAI.js';
import { RoomManager } from './roomManager.js';
import { GameEngine } from './engine.js';

export class UIController {
  constructor(engine) {
    this.engine = engine;
    this.roomManager = new RoomManager((msg) => this.onMultiplayerNetworkMessage(msg));
    this.selectedShellGiveCardId = null;
    this.isBotThinking = false;
    this.kuraTimeout = null;
    this.pendingJoinRoomId = null;
    this.selectedCreateMaxPlayers = 4;
    this.selectedBotCount = 4;

    this.initDOMElements();
    this.bindEvents();
    this.renderLobbyRooms();
  }

  initDOMElements() {
    // Screens
    this.screens = {
      menu: document.getElementById('screen-menu'),
      mode: document.getElementById('screen-mode'),
      lobby: document.getElementById('screen-lobby'),
      waiting: document.getElementById('screen-room-waiting'),
      game: document.getElementById('screen-game')
    };

    // Game Elements
    this.tableArena = document.querySelector('.table-arena');
    this.playerHandContainer = document.getElementById('player-hand');
    this.drawPileElem = document.getElementById('draw-pile');
    this.discardPileElem = document.getElementById('discard-pile');
    this.deckCountElem = document.getElementById('deck-count');
    this.activeColorIndicator = document.getElementById('active-color-badge');
    this.activeTurnText = document.getElementById('active-turn-text');
    this.btnKura = document.getElementById('btn-kura');
    this.actionToast = document.getElementById('action-toast');

    // Modals
    this.modalColor = document.getElementById('modal-color');
    this.modalSwap = document.getElementById('modal-swap');
    this.modalShell = document.getElementById('modal-shell');
    this.modalShield = document.getElementById('modal-shield');
    this.modalResult = document.getElementById('modal-result');
    this.modalSettings = document.getElementById('modal-settings');
    this.modalRules = document.getElementById('modal-rules');
    this.modalChat = document.getElementById('modal-chat');
    this.modalCreateRoom = document.getElementById('modal-create-room');
    this.modalRoomPassword = document.getElementById('modal-room-password');
    this.modalBotOptions = document.getElementById('modal-bot-options');
  }

  bindEvents() {
    // Main Menu navigation
    document.getElementById('btn-play-menu')?.addEventListener('click', () => {
      sounds.playClick();
      this.showScreen('mode');
    });

    document.getElementById('btn-room-menu')?.addEventListener('click', () => {
      sounds.playClick();
      this.renderLobbyRooms();
      this.showScreen('lobby');
    });

    document.getElementById('btn-settings-menu')?.addEventListener('click', () => {
      sounds.playClick();
      this.openModal('settings');
    });

    document.getElementById('btn-rules-menu')?.addEventListener('click', () => {
      sounds.playClick();
      this.openModal('rules');
    });

    // Mode Selection back & clicks
    document.getElementById('btn-back-mode')?.addEventListener('click', () => {
      sounds.playClick();
      this.showScreen('menu');
    });

    document.getElementById('mode-vsbot')?.addEventListener('click', () => {
      sounds.playClick();
      this.openModal('bot-options');
    });

    document.getElementById('mode-multiplayer')?.addEventListener('click', () => {
      sounds.playClick();
      this.renderLobbyRooms();
      this.showScreen('lobby');
    });

    // Bot Options Modal buttons
    document.querySelectorAll('.bot-opt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        sounds.playClick();
        document.querySelectorAll('.bot-opt-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.selectedBotCount = parseInt(e.currentTarget.getAttribute('data-count')) || 4;
      });
    });

    document.getElementById('btn-start-bot-match')?.addEventListener('click', () => {
      sounds.playClick();
      this.closeModal('bot-options');
      this.startBotMatch(this.selectedBotCount);
    });

    // Lobby navigation & refresh
    document.getElementById('btn-back-lobby')?.addEventListener('click', () => {
      sounds.playClick();
      this.showScreen('menu');
    });

    document.getElementById('btn-refresh-rooms')?.addEventListener('click', () => {
      sounds.playClick();
      this.renderLobbyRooms();
      this.showToast('Daftar ruangan diperbarui!');
    });

    // Create Room Modal open
    document.getElementById('btn-open-create-room')?.addEventListener('click', () => {
      sounds.playClick();
      this.openModal('create-room');
    });

    // Create Room Player Count Selector
    document.querySelectorAll('#modal-create-room .player-count-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        sounds.playClick();
        document.querySelectorAll('#modal-create-room .player-count-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.selectedCreateMaxPlayers = parseInt(e.currentTarget.getAttribute('data-count')) || 4;
      });
    });

    // Submit Create Room
    document.getElementById('btn-submit-create-room')?.addEventListener('click', () => {
      sounds.playClick();
      const nameInput = document.getElementById('input-room-name')?.value;
      const passInput = document.getElementById('input-room-password')?.value;
      const fillAI = document.getElementById('check-fill-ai')?.checked;

      const newRoom = this.roomManager.createRoom({
        name: nameInput,
        password: passInput,
        maxPlayers: this.selectedCreateMaxPlayers,
        fillWithAI: fillAI
      });

      this.closeModal('create-room');
      this.enterWaitingRoom(newRoom);
    });

    // Password Submit Join
    document.getElementById('btn-submit-password-join')?.addEventListener('click', () => {
      sounds.playClick();
      const passInput = document.getElementById('input-join-password')?.value;
      if (this.pendingJoinRoomId) {
        const res = this.roomManager.joinRoom(this.pendingJoinRoomId, passInput);
        if (res.success) {
          this.closeModal('room-password');
          this.enterWaitingRoom(res.room);
          this.pendingJoinRoomId = null;
        } else {
          alert(res.reason);
        }
      }
    });

    // Waiting Room Actions
    document.getElementById('btn-leave-room')?.addEventListener('click', () => {
      sounds.playClick();
      if (this.roomManager.currentRoom) {
        this.roomManager.removePlayer(this.roomManager.myPlayerId);
      }
      this.renderLobbyRooms();
      this.showScreen('lobby');
    });

    document.getElementById('btn-add-ai-bot')?.addEventListener('click', () => {
      sounds.playClick();
      const updated = this.roomManager.addBotToRoom();
      if (updated) {
        this.renderWaitingRoom();
      } else {
        this.showToast('Ruangan sudah penuh!');
      }
    });

    document.getElementById('btn-toggle-ready')?.addEventListener('click', () => {
      sounds.playClick();
      this.roomManager.toggleReady();
      this.renderWaitingRoom();
    });

    document.getElementById('btn-start-room-game')?.addEventListener('click', () => {
      sounds.playClick();
      this.startRoomGame();
    });

    // In-Game Top buttons
    document.getElementById('btn-game-rules')?.addEventListener('click', () => {
      sounds.playClick();
      this.openModal('rules');
    });

    document.getElementById('btn-game-chat')?.addEventListener('click', () => {
      sounds.playClick();
      this.openModal('chat');
    });

    document.getElementById('btn-game-settings')?.addEventListener('click', () => {
      sounds.playClick();
      this.openModal('settings');
    });

    document.getElementById('btn-game-exit')?.addEventListener('click', () => {
      sounds.playClick();
      if (confirm('Keluar ke menu utama?')) {
        this.showScreen('menu');
      }
    });

    // Draw pile click
    this.drawPileElem?.addEventListener('click', () => {
      if (this.engine.gameOver || this.isBotThinking) return;
      if (this.engine.currentPlayer.isHuman && !this.engine.hasDrawnThisTurn) {
        sounds.playDrawSound();
        const drawn = this.engine.drawForCurrentPlayer();
        this.render();

        if (drawn && this.engine.canPlayCard(drawn, this.engine.currentPlayer.hand)) {
          this.showToast(`Kamu menarik ${this.engine.cardName(drawn)}. Bisa langsung dimainkan!`);
        } else {
          this.showToast(`Kamu menarik 1 kartu. Giliran selesai.`);
          setTimeout(() => {
            if (this.engine.hasDrawnThisTurn) {
              this.engine.passTurn();
              this.render();
              this.handleNextTurn();
            }
          }, 800);
        }
      }
    });

    // KURA Shout button
    this.btnKura?.addEventListener('click', () => {
      sounds.playKuraSound();
      const p = this.engine.players.find(x => x.isHuman);
      if (p) {
        this.engine.callKura(p);
        this.btnKura.classList.remove('alert-pulse');
        this.showSpeechBubble('you', 'KURA! 🐢💨');
        this.showToast('Kamu meneriakkan KURA!');
        if (this.kuraTimeout) {
          clearTimeout(this.kuraTimeout);
          this.kuraTimeout = null;
        }
      }
    });

    // Color picker buttons
    document.querySelectorAll('.color-choice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const color = e.currentTarget.getAttribute('data-color');
        sounds.playWildSound();
        this.closeModal('color');
        if (this.pendingWildCardId) {
          this.executeHumanPlay(this.pendingWildCardId, { chosenColor: color });
          this.pendingWildCardId = null;
        }
      });
    });

    // Settings switches
    document.getElementById('switch-sound')?.addEventListener('change', (e) => {
      sounds.setSoundEnabled(e.target.checked);
    });

    document.getElementById('switch-music')?.addEventListener('change', (e) => {
      sounds.setMusicEnabled(e.target.checked);
    });

    // Close modals on overlay or close button
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay && overlay.id !== 'modal-shield' && overlay.id !== 'modal-color' && overlay.id !== 'modal-result') {
          overlay.classList.remove('active');
        }
      });
    });

    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        sounds.playClick();
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      });
    });

    // Chat emote clicks
    document.querySelectorAll('.chat-emote-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const emote = e.currentTarget.innerText;
        sounds.playClick();
        this.closeModal('chat');
        this.showSpeechBubble('you', emote);
      });
    });
  }

  showScreen(name) {
    Object.values(this.screens).forEach(s => s?.classList.remove('active'));
    this.screens[name]?.classList.add('active');
  }

  openModal(name) {
    const modal = document.getElementById(`modal-${name}`);
    if (modal) modal.classList.add('active');
  }

  closeModal(name) {
    const modal = document.getElementById(`modal-${name}`);
    if (modal) modal.classList.remove('active');
  }

  // Lobby & Room Rendering
  renderLobbyRooms() {
    const container = document.getElementById('lobby-room-container');
    if (!container) return;

    const rooms = this.roomManager.getRooms();
    container.innerHTML = '';

    if (rooms.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 40px;">Belum ada ruangan. Buat ruangan pertamamu!</div>`;
      return;
    }

    rooms.forEach(room => {
      const isFull = room.players.length >= room.maxPlayers;
      const item = document.createElement('div');
      item.className = 'lobby-room-item';
      item.innerHTML = `
        <div>
          <h4 style="font-size: 1.15rem; color: #ffca28; margin-bottom: 2px;">${room.name}</h4>
          <div class="room-meta">
            <span>Host: <strong>${room.hostName}</strong></span>
            <span>•</span>
            <span>🃏 ${room.players.length}/${room.maxPlayers} Pemain</span>
            <span>•</span>
            <span class="badge-tag ${room.hasPassword ? 'locked' : 'public'}">
              ${room.hasPassword ? '🔒 Terkunci' : '🔓 Publik'}
            </span>
          </div>
        </div>
        <button class="btn-join-room" ${isFull ? 'disabled style="background: #475569; cursor: not-allowed;"' : ''}>
          ${isFull ? 'Penuh' : 'Join Room'}
        </button>
      `;

      if (!isFull) {
        item.querySelector('.btn-join-room')?.addEventListener('click', () => {
          sounds.playClick();
          if (room.hasPassword) {
            this.pendingJoinRoomId = room.id;
            const desc = document.getElementById('password-room-desc');
            if (desc) desc.innerText = `Ruangan "${room.name}" dilindungi kata sandi.`;
            document.getElementById('input-join-password').value = '';
            this.openModal('room-password');
          } else {
            const res = this.roomManager.joinRoom(room.id);
            if (res.success) {
              this.enterWaitingRoom(res.room);
            }
          }
        });
      }

      container.appendChild(item);
    });
  }

  enterWaitingRoom(room) {
    this.roomManager.currentRoom = room;
    this.renderWaitingRoom();
    this.showScreen('waiting');
  }

  renderWaitingRoom() {
    const room = this.roomManager.currentRoom;
    if (!room) return;

    document.getElementById('waiting-room-title').innerText = room.name;
    document.getElementById('waiting-room-meta').innerText =
      `Maks ${room.maxPlayers} Pemain • ${room.hasPassword ? '🔒 Berkata Sandi' : '🔓 Publik'} • Host: ${room.hostName}`;

    const slotsGrid = document.getElementById('waiting-slots-grid');
    if (!slotsGrid) return;
    slotsGrid.innerHTML = '';

    const isHost = (room.hostId === this.roomManager.myPlayerId);
    const btnStart = document.getElementById('btn-start-room-game');
    const btnAddBot = document.getElementById('btn-add-ai-bot');

    if (btnStart) btnStart.style.display = isHost ? 'block' : 'none';
    if (btnAddBot) btnAddBot.style.display = isHost ? 'block' : 'none';

    for (let i = 0; i < room.maxPlayers; i++) {
      const player = room.players[i];
      const slotCard = document.createElement('div');

      if (player) {
        slotCard.className = 'player-slot-card filled';
        slotCard.innerHTML = `
          <img src="${player.avatar}" alt="${player.name}" class="slot-avatar">
          <div class="slot-name">${player.name}</div>
          <div class="slot-status ${player.isHost ? 'host' : (player.isReady ? 'ready' : '')}">
            ${player.isHost ? '👑 Host' : (player.isReady ? '✅ Siap' : '⏳ Menunggu')}
          </div>
          ${player.isAI ? '<span style="font-size: 0.75rem; color: #ffb74d; margin-top: 4px;">🤖 Bot AI</span>' : ''}
        `;
      } else {
        slotCard.className = 'player-slot-card';
        slotCard.innerHTML = `
          <div style="font-size: 2.2rem; opacity: 0.35; margin-bottom: 8px;">➕</div>
          <div class="slot-name" style="opacity: 0.6;">Slot Kosong</div>
          ${isHost ? '<button class="slot-empty-btn">+ Tambah Bot</button>' : ''}
        `;
        if (isHost) {
          slotCard.querySelector('.slot-empty-btn')?.addEventListener('click', () => {
            sounds.playClick();
            this.roomManager.addBotToRoom();
            this.renderWaitingRoom();
          });
        }
      }
      slotsGrid.appendChild(slotCard);
    }
  }

  onMultiplayerNetworkMessage(msg) {
    if (msg.type === 'ROOM_CREATED' || msg.type === 'ROOM_UPDATED') {
      if (this.screens.lobby?.classList.contains('active')) {
        this.renderLobbyRooms();
      }
      if (this.screens.waiting?.classList.contains('active')) {
        this.renderWaitingRoom();
      }
    } else if (msg.type === 'START_GAME' && this.roomManager.currentRoom?.id === msg.roomId) {
      this.initGameFromRoom(msg.room);
    }
  }

  startRoomGame() {
    const room = this.roomManager.currentRoom;
    if (!room) return;

    // If slots are not full and fillWithAI is true, fill them
    if (room.fillWithAI) {
      while (room.players.length < room.maxPlayers) {
        this.roomManager.addBotToRoom();
      }
    }

    if (room.players.length < 2) {
      alert('Minimal 2 pemain untuk memulai permainan!');
      return;
    }

    this.roomManager.broadcast({ type: 'START_GAME', roomId: room.id, room });
    this.initGameFromRoom(room);
  }

  initGameFromRoom(room) {
    const myId = this.roomManager.myPlayerId;
    const playersConfig = room.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHuman: (p.id === myId),
      isAI: p.isAI
    }));

    this.engine = new GameEngine(playersConfig);
    this.startMatch();
  }

  startBotMatch(playerCount = 4) {
    const botPresets = [
      { id: 'kuro', name: 'Kuro', avatar: 'assets/avatars/kuro.png', isHuman: false },
      { id: 'reyy', name: 'Reyy', avatar: 'assets/avatars/reyy.png', isHuman: false },
      { id: 'luna', name: 'Luna', avatar: 'assets/avatars/luna.png', isHuman: false }
    ];

    const playersConfig = [
      { id: 'you', name: 'You', avatar: 'assets/avatars/you.png', isHuman: true }
    ];

    if (playerCount === 2) {
      playersConfig.push(botPresets[1]); // You + Reyy (Top vs Bottom)
    } else if (playerCount === 3) {
      playersConfig.push(botPresets[2]); // Luna
      playersConfig.push(botPresets[1]); // Reyy
    } else {
      playersConfig.push(botPresets[0]); // Kuro
      playersConfig.push(botPresets[1]); // Reyy
      playersConfig.push(botPresets[2]); // Luna
    }

    this.engine = new GameEngine(playersConfig);
    this.startMatch();
  }

  startMatch() {
    this.engine.initGame();
    this.showScreen('game');
    this.setupPlayerStationsVisibility();
    this.render();
    sounds.playTurnSound();
    sounds.startBGM();
    this.showToast('Game Dimulai! Giliran Kamu!');
    this.handleNextTurn();
  }

  setupPlayerStationsVisibility() {
    // Hide or show player stations according to engine.players
    const allStations = ['station-you', 'station-luna', 'station-reyy', 'station-kuro'];
    allStations.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    const human = this.engine.players.find(p => p.isHuman) || this.engine.players[0];
    const opponents = this.engine.players.filter(p => p !== human);

    // You station is always visible
    const youStation = document.getElementById('station-you');
    if (youStation) {
      youStation.style.display = 'flex';
      const nameEl = youStation.querySelector('.player-name');
      const imgEl = youStation.querySelector('.avatar-img');
      if (nameEl) nameEl.innerText = human.name;
      if (imgEl) imgEl.src = human.avatar;
    }

    if (opponents.length === 1) {
      // 1v1: Top station only
      const reyyEl = document.getElementById('station-reyy');
      if (reyyEl) {
        reyyEl.style.display = 'flex';
        this.updateStationInfo(reyyEl, opponents[0]);
      }
    } else if (opponents.length === 2) {
      // 3 players: Left and Top
      const lunaEl = document.getElementById('station-luna');
      const reyyEl = document.getElementById('station-reyy');
      if (lunaEl) {
        lunaEl.style.display = 'flex';
        this.updateStationInfo(lunaEl, opponents[0]);
      }
      if (reyyEl) {
        reyyEl.style.display = 'flex';
        this.updateStationInfo(reyyEl, opponents[1]);
      }
    } else if (opponents.length >= 3) {
      // 4 players: Kuro (right), Reyy (top), Luna (left)
      const kuroEl = document.getElementById('station-kuro');
      const reyyEl = document.getElementById('station-reyy');
      const lunaEl = document.getElementById('station-luna');
      if (lunaEl) {
        lunaEl.style.display = 'flex';
        this.updateStationInfo(lunaEl, opponents[2] || opponents[0]);
      }
      if (reyyEl) {
        reyyEl.style.display = 'flex';
        this.updateStationInfo(reyyEl, opponents[1]);
      }
      if (kuroEl) {
        kuroEl.style.display = 'flex';
        this.updateStationInfo(kuroEl, opponents[0]);
      }
    }
  }

  updateStationInfo(stationEl, player) {
    const nameEl = stationEl.querySelector('.player-name');
    const imgEl = stationEl.querySelector('.avatar-img');
    if (nameEl) nameEl.innerText = player.name;
    if (imgEl) imgEl.src = player.avatar;
    stationEl.id = `station-${player.id}`;
  }

  render() {
    this.renderPlayerStations();
    this.renderCenterTable();
    this.renderPlayerHand();
    this.renderTurnIndicator();
  }

  renderCenterTable() {
    const top = this.engine.topDiscard;
    if (top && this.discardPileElem) {
      const img = this.discardPileElem.querySelector('img');
      if (img) img.src = top.image;
      this.discardPileElem.className = `pile discard-pile ${this.engine.activeColor || 'green'}`;
    }

    if (this.deckCountElem) {
      this.deckCountElem.innerText = this.engine.drawPile.length;
    }

    if (this.activeColorIndicator) {
      const colorMap = {
        green: '#4caf50',
        brown: '#8d6e63',
        purple: '#ab47bc',
        magenta: '#e91e63'
      };
      this.activeColorIndicator.style.backgroundColor = colorMap[this.engine.activeColor] || '#ffca28';
      this.activeColorIndicator.style.color = colorMap[this.engine.activeColor] || '#ffca28';
    }

    if (this.activeTurnText) {
      const curr = this.engine.currentPlayer;
      this.activeTurnText.innerText = curr.isHuman ? 'Giliran Kamu!' : `Giliran ${curr.name}...`;
    }
  }

  renderTurnIndicator() {
    const turnRing = document.querySelector('.turn-ring');
    if (turnRing) {
      turnRing.style.animationDirection = this.engine.direction === 1 ? 'normal' : 'reverse';
    }
  }

  renderPlayerStations() {
    this.engine.players.forEach((player, idx) => {
      const station = document.getElementById(`station-${player.id}`);
      if (!station) return;

      const isCurrent = (this.engine.turnIndex === idx);
      station.classList.toggle('active-turn', isCurrent);

      const countBadge = station.querySelector('.card-count-badge');
      if (countBadge) {
        countBadge.innerHTML = `🃏 ${player.hand.length}`;
      }

      if (!player.isHuman) {
        const fan = station.querySelector('.cards-opponent-fan');
        if (fan) {
          fan.innerHTML = '';
          const displayCount = Math.min(player.hand.length, 7);
          for (let i = 0; i < displayCount; i++) {
            const cardBack = document.createElement('img');
            cardBack.src = 'assets/cards/wild/back.png';
            cardBack.className = 'mini-card-back';
            fan.appendChild(cardBack);
          }
        }
      }
    });
  }

  renderPlayerHand() {
    const humanPlayer = this.engine.players.find(p => p.isHuman);
    if (!humanPlayer || !this.playerHandContainer) return;

    const fanContainer = this.playerHandContainer.querySelector('.player-cards-fan');
    if (!fanContainer) return;

    fanContainer.innerHTML = '';
    const isHumanTurn = this.engine.currentPlayer.isHuman && !this.engine.gameOver && !this.isBotThinking;

    if (humanPlayer.hand.length === 2 && isHumanTurn) {
      this.btnKura.classList.add('alert-pulse');
    } else if (humanPlayer.hand.length > 2) {
      this.btnKura.classList.remove('alert-pulse');
    }

    const totalCards = humanPlayer.hand.length;
    humanPlayer.hand.forEach((card, idx) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'hand-card';

      const isPlayable = isHumanTurn && this.engine.canPlayCard(card, humanPlayer.hand);
      if (isPlayable) {
        cardEl.classList.add('playable');
      } else if (isHumanTurn) {
        cardEl.classList.add('unplayable');
      }

      const angle = (idx - (totalCards - 1) / 2) * 4;
      const yOffset = Math.abs(idx - (totalCards - 1) / 2) * 2.5;
      cardEl.style.transform = `rotate(${angle}deg) translateY(${yOffset}px)`;
      cardEl.style.zIndex = idx + 1;

      const img = document.createElement('img');
      img.src = card.image;
      img.alt = this.engine.cardName(card);
      cardEl.appendChild(img);

      cardEl.addEventListener('click', () => {
        if (!isHumanTurn) return;
        if (!isPlayable) {
          if (card.type === 'shell' && humanPlayer.hand.length < 3) {
            this.showToast('Kartu Shell butuh minimal 3 kartu di tangan!');
          } else {
            this.showToast('Kartu ini tidak cocok dengan kartu di meja!');
          }
          return;
        }

        this.onHumanCardClicked(card);
      });

      fanContainer.appendChild(cardEl);
    });
  }

  onHumanCardClicked(card) {
    if (card.type === 'wild' || card.type === 'wild-draw4') {
      this.pendingWildCardId = card.id;
      this.openModal('color');
      return;
    }

    if (card.type === 'swap') {
      this.openSwapOpponentModal(card.id);
      return;
    }

    if (card.type === 'shell') {
      this.openShellCardModal(card.id);
      return;
    }

    this.executeHumanPlay(card.id);
  }

  openSwapOpponentModal(cardId) {
    const grid = document.getElementById('swap-opponent-grid');
    if (!grid) return;
    grid.innerHTML = '';

    this.engine.players.forEach((p, idx) => {
      if (!p.isHuman && p.hand.length > 0) {
        const item = document.createElement('div');
        item.className = 'opponent-target-card';
        item.innerHTML = `
          <img src="${p.avatar}" alt="${p.name}">
          <h4>${p.name}</h4>
          <span>🃏 ${p.hand.length} Kartu</span>
        `;
        item.addEventListener('click', () => {
          sounds.playSwapSound();
          this.closeModal('swap');
          this.executeHumanPlay(cardId, { swapTargetIndex: idx });
        });
        grid.appendChild(item);
      }
    });

    this.openModal('swap');
  }

  openShellCardModal(shellCardId) {
    const cardGrid = document.getElementById('shell-give-card-grid');
    const opponentGrid = document.getElementById('shell-opponent-grid');
    if (!cardGrid || !opponentGrid) return;

    cardGrid.innerHTML = '';
    opponentGrid.innerHTML = '';

    const humanPlayer = this.engine.players.find(p => p.isHuman);
    const handOptions = humanPlayer.hand.filter(c => c.id !== shellCardId);
    let chosenCardId = handOptions[0]?.id;

    handOptions.forEach(card => {
      const cardThumb = document.createElement('img');
      cardThumb.src = card.image;
      cardThumb.style.width = '64px';
      cardThumb.style.height = '80px';
      cardThumb.style.objectFit = 'contain';
      cardThumb.style.borderRadius = '8px';
      cardThumb.style.cursor = 'pointer';
      cardThumb.style.border = card.id === chosenCardId ? '3px solid #ff9800' : '2px solid transparent';
      cardThumb.style.transition = 'transform 0.2s';

      cardThumb.addEventListener('click', () => {
        sounds.playClick();
        chosenCardId = card.id;
        cardGrid.querySelectorAll('img').forEach(im => im.style.border = '2px solid transparent');
        cardThumb.style.border = '3px solid #ff9800';
      });

      cardGrid.appendChild(cardThumb);
    });

    this.engine.players.forEach((p, idx) => {
      if (!p.isHuman) {
        const item = document.createElement('div');
        item.className = 'opponent-target-card';
        item.innerHTML = `
          <img src="${p.avatar}" alt="${p.name}">
          <h4>${p.name}</h4>
          <span>🃏 ${p.hand.length} Kartu</span>
        `;
        item.addEventListener('click', () => {
          sounds.playShellSound();
          this.closeModal('shell');
          this.executeHumanPlay(shellCardId, {
            shellGiveCardId: chosenCardId,
            shellTargetIndex: idx
          });
        });
        opponentGrid.appendChild(item);
      }
    });

    this.openModal('shell');
  }

  executeHumanPlay(cardId, options = {}) {
    sounds.playCardSound();
    const humanPlayer = this.engine.players.find(p => p.isHuman);

    if (humanPlayer.hand.length === 2 && !humanPlayer.calledKura) {
      this.kuraTimeout = setTimeout(() => {
        if (humanPlayer.hand.length === 1 && !humanPlayer.calledKura) {
          sounds.playLoseSound();
          this.showSpeechBubble('kuro', 'Lupa teriak KURA! +2 Kartu!');
          this.showToast('Kamu lupa teriak KURA! Dikenai penalti +2 kartu!');
          humanPlayer.hand.push(this.engine.drawCardRaw());
          humanPlayer.hand.push(this.engine.drawCardRaw());
          this.render();
        }
      }, 3500);
    }

    const result = this.engine.playCard(humanPlayer, cardId, options);
    this.render();

    if (result.shieldTriggered) {
      this.handleShieldReactionPrompt(result.attacker, result.targetPlayer);
      return;
    }

    this.checkGameStatus();
    if (!this.engine.gameOver) {
      this.handleNextTurn();
    }
  }

  handleShieldReactionPrompt(attacker, targetPlayer) {
    if (targetPlayer.isHuman) {
      sounds.playTurnSound();
      const text = document.getElementById('shield-alert-text');
      if (text) {
        text.innerText = `Kamu diserang Wild +4 oleh ${attacker.name}! Gunakan kartu Shield untuk memantulkan +4 kembali ke ${attacker.name}?`;
      }

      const btnDeflect = document.getElementById('btn-shield-deflect');
      const btnAccept = document.getElementById('btn-shield-accept');

      const onDeflect = () => {
        sounds.playShieldSound();
        this.closeModal('shield');
        this.engine.resolveShieldReaction(true);
        this.showSpeechBubble('you', 'SHIELD REFLECT! 🛡️💥');
        this.showToast(`BOUNCE! +4 dipantulkan kembali ke ${attacker.name}!`);
        this.render();
        cleanup();
        this.handleNextTurn();
      };

      const onAccept = () => {
        sounds.playDrawSound();
        this.closeModal('shield');
        this.engine.resolveShieldReaction(false);
        this.showToast(`Kamu menerima 4 kartu.`);
        this.render();
        cleanup();
        this.handleNextTurn();
      };

      const cleanup = () => {
        btnDeflect?.removeEventListener('click', onDeflect);
        btnAccept?.removeEventListener('click', onAccept);
      };

      btnDeflect?.addEventListener('click', onDeflect, { once: true });
      btnAccept?.addEventListener('click', onAccept, { once: true });

      this.openModal('shield');
    } else {
      setTimeout(() => {
        sounds.playShieldSound();
        this.engine.resolveShieldReaction(true);
        this.showSpeechBubble(targetPlayer.id, 'SHIELD COUNTER! 🛡️⚡');
        this.showToast(`🛡️ ${targetPlayer.name} memantulkan Wild +4 kembali ke ${attacker.name}!`);
        this.render();
        this.handleNextTurn();
      }, 1000);
    }
  }

  handleNextTurn() {
    if (this.engine.gameOver) return;

    const curr = this.engine.currentPlayer;
    if (curr.isHuman) {
      this.isBotThinking = false;
      this.render();
      sounds.playTurnSound();
    } else {
      this.isBotThinking = true;
      this.render();
      const thinkTime = 900 + Math.random() * 600;

      setTimeout(() => {
        if (this.engine.gameOver) return;
        const decision = BotAI.decideTurn(this.engine, curr);

        if (decision.action === 'draw') {
          sounds.playDrawSound();
          const drawn = this.engine.drawForCurrentPlayer();
          this.render();

          if (drawn && this.engine.canPlayCard(drawn, curr.hand)) {
            setTimeout(() => {
              this.executeBotPlay(curr, drawn.id, decision.options);
            }, 600);
          } else {
            setTimeout(() => {
              this.engine.passTurn();
              this.render();
              this.handleNextTurn();
            }, 600);
          }
        } else if (decision.action === 'play') {
          this.executeBotPlay(curr, decision.cardId, decision.options);
        }
      }, thinkTime);
    }
  }

  executeBotPlay(botPlayer, cardId, options = {}) {
    sounds.playCardSound();
    const result = this.engine.playCard(botPlayer, cardId, options);
    this.render();

    if (botPlayer.hand.length === 1 && botPlayer.calledKura) {
      sounds.playKuraSound();
      this.showSpeechBubble(botPlayer.id, 'KURA! 🐢✨');
    }

    if (result.shieldTriggered) {
      this.handleShieldReactionPrompt(result.attacker, result.targetPlayer);
      return;
    }

    this.checkGameStatus();
    if (!this.engine.gameOver) {
      this.handleNextTurn();
    }
  }

  checkGameStatus() {
    if (this.engine.gameOver) {
      const winner = this.engine.winner;
      if (winner.isHuman) {
        sounds.playWinSound();
        this.triggerConfetti();
        this.showWinModal();
      } else {
        sounds.playLoseSound();
        this.showLoseModal(winner);
      }
    }
  }

  triggerConfetti() {
    const end = Date.now() + 3000;
    const colors = ['#ffca28', '#ff9800', '#4caf50', '#ab47bc', '#e91e63'];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }

  showWinModal() {
    const modal = document.getElementById('modal-result');
    const content = document.getElementById('result-content');
    if (!content) return;

    content.innerHTML = `
      <h2 class="win-banner">YOU WIN!</h2>
      <div class="result-avatar-halo win">
        <img src="assets/avatars/you.png" alt="You">
      </div>
      <p style="font-size: 1.15rem; color: #ffca28; font-weight: 700; margin-bottom: 24px;">
        Selamat! Kamu mengosongkan semua kartumu!
      </p>
      <button id="btn-result-restart" class="btn-result-action win-btn">Main Lagi</button>
      <button id="btn-result-continue" style="margin-top: 12px; background: transparent; border: none; color: #94a3b8; cursor: pointer; font-weight: 600;">
        Kembali ke Menu
      </button>
    `;

    document.getElementById('btn-result-restart')?.addEventListener('click', () => {
      this.closeModal('result');
      this.startBotMatch(this.selectedBotCount || 4);
    });
    document.getElementById('btn-result-continue')?.addEventListener('click', () => {
      this.closeModal('result');
      this.showScreen('menu');
    });

    this.openModal('result');
  }

  showLoseModal(winner) {
    const modal = document.getElementById('modal-result');
    const content = document.getElementById('result-content');
    if (!content) return;

    const rankings = [...this.engine.players].sort((a, b) => a.hand.length - b.hand.length);

    let rankingHTML = rankings.map((p, rank) => `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 6px 12px; background: rgba(255,255,255,0.06); border-radius: 10px; margin-bottom: 6px;">
        <span style="font-weight: 700;">#${rank + 1} ${p.name} ${p.id === winner.id ? '👑' : ''}</span>
        <span style="color: #ffb74d;">${p.hand.length} kartu</span>
      </div>
    `).join('');

    content.innerHTML = `
      <h2 class="lose-banner">YOU LOSE</h2>
      <div class="result-avatar-halo lose">
        <img src="${winner.avatar}" alt="${winner.name}">
      </div>
      <p style="color: #cbd5e1; margin-bottom: 16px;">
        ${winner.name} menang lebih dulu! Lebih beruntung lain kali!
      </p>
      <div style="width: 100%; margin-bottom: 20px;">
        ${rankingHTML}
      </div>
      <button id="btn-result-restart" class="btn-result-action lose-btn">Coba Lagi</button>
      <button id="btn-result-continue" style="margin-top: 12px; background: transparent; border: none; color: #94a3b8; cursor: pointer; font-weight: 600;">
        Kembali ke Lobby
      </button>
    `;

    document.getElementById('btn-result-restart')?.addEventListener('click', () => {
      this.closeModal('result');
      this.startBotMatch(this.selectedBotCount || 4);
    });
    document.getElementById('btn-result-continue')?.addEventListener('click', () => {
      this.closeModal('result');
      this.showScreen('menu');
    });

    this.openModal('result');
  }

  showToast(msg) {
    if (!this.actionToast) return;
    this.actionToast.innerText = msg;
    this.actionToast.classList.add('show');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.actionToast.classList.remove('show');
    }, 2800);
  }

  showSpeechBubble(playerId, text) {
    const bubble = document.getElementById(`bubble-${playerId}`);
    if (bubble) {
      bubble.innerText = text;
      bubble.classList.add('show');
      setTimeout(() => {
        bubble.classList.remove('show');
      }, 2500);
    }
  }
}
