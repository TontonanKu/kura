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
    this.isMultiplayerMatch = false;

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
    this.btnSkipTurn = document.getElementById('btn-skip-turn');
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

    // Turn Countdown Timer Elements & State (Standard 15s UNO turn timer)
    this.turnTimerBadge = document.getElementById('turn-timer-badge');
    this.turnTimerSec = document.getElementById('turn-timer-sec');
    this.turnTimeLimit = 15;
    this.turnTimeRemaining = 15;
    this.turnTimerInterval = null;
  }

  bindEvents() {
    // Main Menu navigation
    document.getElementById('btn-play-menu')?.addEventListener('click', () => {
      sounds.playClick();
      this.showScreen('mode');
    });

    document.getElementById('btn-room-menu')?.addEventListener('click', () => {
      sounds.playClick();
      this.showToast('Mode Multiplayer (Main Bareng Teman) sedang dipersiapkan & segera hadir!');
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
      this.showToast('Mode Multiplayer (Main Bareng Teman) sedang dipersiapkan & segera hadir!');
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

    // Search room input
    document.getElementById('input-search-room')?.addEventListener('input', () => {
      this.renderLobbyRooms();
    });

    // Join by ID button
    document.getElementById('btn-join-by-id')?.addEventListener('click', () => {
      sounds.playClick();
      const query = document.getElementById('input-search-room')?.value;
      if (!query || !query.trim()) {
        this.showToast('Ketik ID Room atau nama ruangan terlebih dahulu!');
        return;
      }
      this.handleJoinRoomByQuery(query.trim());
    });

    // Copy Room ID in waiting room
    const copyIdHandler = () => {
      sounds.playClick();
      const room = this.roomManager.currentRoom;
      if (room) {
        const idToCopy = room.code || room.id;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(idToCopy).then(() => {
            this.showToast(`ID Room (${idToCopy}) disalin! Bagikan ke temanmu.`);
          }).catch(() => {
            this.showToast(`ID Room: ${idToCopy}`);
          });
        } else {
          this.showToast(`ID Room: ${idToCopy}`);
        }
      }
    };
    document.getElementById('btn-copy-room-id')?.addEventListener('click', copyIdHandler);
    document.getElementById('waiting-room-id-badge')?.addEventListener('click', copyIdHandler);

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

      this.roomManager.createRoom({
        name: nameInput,
        password: passInput,
        maxPlayers: this.selectedCreateMaxPlayers,
        fillWithAI: fillAI
      }, (res) => {
        if (res && res.success) {
          this.closeModal('create-room');
          this.enterWaitingRoom(res.room);
          this.showToast(`Room dibuat! ID: ${res.room.code || res.room.id}`);
        } else {
          alert(res?.reason || 'Gagal membuat ruangan!');
        }
      });
    });

    // Password Submit Join
    document.getElementById('btn-submit-password-join')?.addEventListener('click', () => {
      sounds.playClick();
      const passInput = document.getElementById('input-join-password')?.value;
      if (this.pendingJoinRoomId) {
        this.roomManager.joinRoom(this.pendingJoinRoomId, passInput, (res) => {
          if (res && res.success) {
            this.closeModal('room-password');
            this.enterWaitingRoom(res.room);
            this.pendingJoinRoomId = null;
          } else {
            alert(res?.reason || 'Kata sandi salah!');
          }
        });
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
        this.stopTurnTimer();
        this.showScreen('menu');
      }
    });

    // Draw pile click
    this.drawPileElem?.addEventListener('click', () => {
      if (this.engine.gameOver || this.isBotThinking) return;
      if (this.engine.currentPlayer.isHuman && !this.engine.hasDrawnThisTurn) {
        this.stopTurnTimer();
        sounds.playDrawSound();
        const drawn = this.engine.drawForCurrentPlayer();
        this.render();

        if (drawn && this.engine.canPlayCard(drawn, this.engine.currentPlayer.hand)) {
          this.showToast(`Kamu menarik ${this.engine.cardName(drawn)}. Bisa langsung dimainkan!`);
          this.startTurnTimer(8); // 8s to play the drawn card or pass
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
        this.showSpeechBubble('you', 'KURA!');
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

    // Cancel and Skip buttons in Wild Color modal (+4 or color change)
    document.getElementById('btn-cancel-color')?.addEventListener('click', () => {
      sounds.playClick();
      this.pendingWildCardId = null;
      this.closeModal('color');
      this.showToast('Batal memasang kartu.');
    });

    document.getElementById('btn-skip-from-color')?.addEventListener('click', () => {
      sounds.playClick();
      this.handlePlayerSkipTurn();
    });

    // Cancel in Swap and Shell modals
    document.getElementById('btn-cancel-swap')?.addEventListener('click', () => {
      sounds.playClick();
      this.closeModal('swap');
      this.showToast('Batal memasang kartu Swap.');
    });

    document.getElementById('btn-cancel-shell')?.addEventListener('click', () => {
      sounds.playClick();
      this.closeModal('shell');
      this.showToast('Batal memasang kartu Shell.');
    });

    // In-game Skip Turn button
    this.btnSkipTurn?.addEventListener('click', () => {
      sounds.playClick();
      this.handlePlayerSkipTurn();
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

    // Custom chat submit
    const formChat = document.getElementById('form-custom-chat');
    formChat?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('input-custom-chat');
      const text = input?.value.trim();
      if (!text) return;
      sounds.playClick();
      input.value = '';
      this.closeModal('chat');
      this.showCenterChatBanner('You', text, 'you');
      this.triggerBotChatReply(text);
    });

    // Chat emote clicks
    document.querySelectorAll('.chat-emote-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const emote = e.currentTarget.innerText.trim();
        sounds.playClick();
        this.closeModal('chat');
        this.showCenterChatBanner('You', emote, 'you');
        this.triggerBotChatReply(emote);
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

  handleJoinRoomByQuery(query) {
    if (!query) return;
    const cleanQuery = query.trim();
    const rooms = this.roomManager.getRooms();
    const found = rooms.find(r => 
      (r.code && r.code.toLowerCase() === cleanQuery.toLowerCase()) ||
      (r.id && r.id.toLowerCase() === cleanQuery.toLowerCase()) ||
      (r.name && r.name.toLowerCase().includes(cleanQuery.toLowerCase()))
    );

    if (found && found.hasPassword) {
      this.pendingJoinRoomId = found.id;
      const desc = document.getElementById('password-room-desc');
      if (desc) desc.innerText = `Ruangan "${found.name}" (#${found.code || found.id}) dilindungi kata sandi.`;
      const passInput = document.getElementById('input-join-password');
      if (passInput) passInput.value = '';
      this.openModal('room-password');
      return;
    }

    this.roomManager.joinRoom(cleanQuery, '', (res) => {
      if (res && res.success) {
        this.enterWaitingRoom(res.room);
        this.showToast(`Berhasil masuk ke room #${res.room.code || res.room.id}!`);
      } else {
        if (res && res.reason && res.reason.toLowerCase().includes('sandi')) {
          this.pendingJoinRoomId = cleanQuery;
          const desc = document.getElementById('password-room-desc');
          if (desc) desc.innerText = `Ruangan ini dilindungi kata sandi.`;
          const passInput = document.getElementById('input-join-password');
          if (passInput) passInput.value = '';
          this.openModal('room-password');
        } else {
          this.showToast(res?.reason || 'Room tidak ditemukan atau sudah penuh!');
        }
      }
    });
  }

  // Lobby & Room Rendering
  renderLobbyRooms() {
    const container = document.getElementById('lobby-room-container');
    if (!container) return;

    const searchInput = document.getElementById('input-search-room');
    const query = (searchInput?.value || '').trim().toLowerCase();

    let rooms = this.roomManager.getRooms();
    if (query) {
      rooms = rooms.filter(r => 
        (r.name && r.name.toLowerCase().includes(query)) ||
        (r.code && r.code.toLowerCase().includes(query)) ||
        (r.id && r.id.toLowerCase().includes(query)) ||
        (r.hostName && r.hostName.toLowerCase().includes(query))
      );
    }

    container.innerHTML = '';

    if (rooms.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 40px; font-family: var(--font-pixel); font-size: 1.3rem;">
        ${query ? `Tidak ada ruangan yang cocok dengan "${query}".` : 'Belum ada ruangan. Buat ruangan pertamamu!'}
      </div>`;
      return;
    }

    rooms.forEach(room => {
      const isFull = room.players.length >= room.maxPlayers;
      const item = document.createElement('div');
      item.className = 'lobby-room-item';

      // Clean display name
      const displayName = room.name.replace(/^[^\w\s]+\s*/, '');

      // Determine matching title icon
      let titleIconSvg = '';
      if (room.hasPassword || displayName.toLowerCase().includes('private') || displayName.toLowerCase().includes('vip')) {
        titleIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
      } else if (displayName.toLowerCase().includes('chill') || displayName.toLowerCase().includes('santai')) {
        titleIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" stroke-width="2.4"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`;
      } else {
        titleIconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#ffd54f"><path d="M2 19h20v2H2zM2 5l5 7 5-7 5 7 5-7v12H2z"></path></svg>`;
      }

      item.innerHTML = `
        <div class="lobby-room-info">
          <div class="lobby-room-title-wrap">
            <span class="lobby-room-title-icon">${titleIconSvg}</span>
            <h4 class="lobby-room-title">${displayName}</h4>
            <span class="room-code-chip">#${room.code || room.id}</span>
          </div>
          <div class="room-meta">
            <span class="room-meta-chip">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#ffd54f"><path d="M2 19h20v2H2zM2 5l5 7 5-7 5 7 5-7v12H2z"></path></svg>
              <span>Host: <strong>${room.hostName}</strong></span>
            </span>
            <span class="room-meta-chip">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
              <span>${room.players.length}/${room.maxPlayers} Pemain</span>
            </span>
            <span class="badge-tag ${room.hasPassword ? 'locked' : 'public'}">
              ${room.hasPassword ? 
                `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> <span>Terkunci</span>` : 
                `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg> <span>Publik</span>`
              }
            </span>
          </div>
        </div>
        <button class="btn-ticket-join ${isFull ? 'disabled' : ''}" ${isFull ? 'disabled' : ''}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
          </svg>
          <span>${isFull ? 'PENUH' : 'JOIN ROOM'}</span>
        </button>
      `;

      if (!isFull) {
        item.querySelector('.btn-ticket-join')?.addEventListener('click', () => {
          sounds.playClick();
          if (room.hasPassword) {
            this.pendingJoinRoomId = room.id;
            const desc = document.getElementById('password-room-desc');
            if (desc) desc.innerText = `Ruangan "${room.name}" (#${room.code || room.id}) dilindungi kata sandi.`;
            const passInput = document.getElementById('input-join-password');
            if (passInput) passInput.value = '';
            this.openModal('room-password');
          } else {
            this.roomManager.joinRoom(room.id, '', (res) => {
              if (res && res.success) {
                this.enterWaitingRoom(res.room);
              } else {
                this.showToast(res?.reason || 'Gagal bergabung ke ruangan!');
              }
            });
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
    const roomCodeElem = document.getElementById('waiting-room-id-text');
    if (roomCodeElem) {
      roomCodeElem.innerText = room.code || room.id;
    }

    const metaContainer = document.getElementById('waiting-room-meta');
    if (metaContainer) {
      metaContainer.innerHTML = `
        <span class="room-meta-pill">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
          Maks ${room.maxPlayers} Pemain
        </span>
        <span class="room-meta-pill">
          ${room.hasPassword ? 
            `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg><span style="color:#f59e0b">Berkata Sandi</span>` : 
            `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg><span style="color:#22c55e">Publik</span>`
          }
        </span>
        <span class="room-meta-pill">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#ffd54f"><path d="M2 19h20v2H2zM2 5l5 7 5-7 5 7 5-7v12H2z"></path></svg>
          Host: ${room.hostName}
        </span>
      `;
    }

    const slotsGrid = document.getElementById('waiting-slots-grid');
    if (!slotsGrid) return;
    slotsGrid.innerHTML = '';

    const isHost = (room.hostId === this.roomManager.myPlayerId);
    const btnStart = document.getElementById('btn-start-room-game');
    const btnAddBot = document.getElementById('btn-add-ai-bot');
    const btnToggleReady = document.getElementById('btn-toggle-ready');

    if (btnStart) btnStart.style.display = isHost ? 'inline-flex' : 'none';
    if (btnAddBot) btnAddBot.style.display = isHost ? 'inline-flex' : 'none';

    const me = room.players.find(p => p.id === this.roomManager.myPlayerId);
    if (btnToggleReady && me) {
      if (me.isReady) {
        btnToggleReady.className = 'btn-retro-ticket btn-ticket-ready is-ready';
        btnToggleReady.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Siap (Ready)</span>
        `;
      } else {
        btnToggleReady.className = 'btn-retro-ticket btn-ticket-ready not-ready';
        btnToggleReady.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>Belum Siap</span>
        `;
      }
    }

    for (let i = 0; i < room.maxPlayers; i++) {
      const player = room.players[i];
      const slotCard = document.createElement('div');

      if (player) {
        slotCard.className = 'player-slot-card filled';
        let statusHtml = '';
        if (player.isHost) {
          statusHtml = `
            <div class="slot-status host">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2 19h20v2H2zM2 5l5 7 5-7 5 7 5-7v12H2z"></path></svg>
              <span>Host</span>
            </div>
          `;
        } else if (player.isReady) {
          statusHtml = `
            <div class="slot-status ready">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Siap</span>
            </div>
          `;
        } else {
          statusHtml = `
            <div class="slot-status waiting">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>Menunggu</span>
            </div>
          `;
        }

        const botTagHtml = player.isAI ? `
          <div class="slot-ai-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="3"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8.01" y2="16"></line><line x1="16" y1="16" x2="16.01" y2="16"></line></svg>
            <span>Bot AI</span>
          </div>
        ` : '';

        slotCard.innerHTML = `
          <img src="${player.avatar}" alt="${player.name}" class="slot-avatar">
          <div class="slot-name">${player.name}</div>
          ${statusHtml}
          ${botTagHtml}
        `;
      } else {
        slotCard.className = 'player-slot-card empty';
        const emptyBtnHtml = isHost ? `
          <button class="slot-empty-btn" title="Tambah Bot ke Slot">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="3"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path></svg>
            <span>+ Tambah Bot</span>
          </button>
        ` : '';

        slotCard.innerHTML = `
          <div class="slot-empty-icon">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
          <div class="slot-name slot-empty-label">Slot Kosong</div>
          ${emptyBtnHtml}
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
    if (msg.type === 'ROOMS_LIST') {
      if (this.screens.lobby?.classList.contains('active')) {
        this.renderLobbyRooms();
      }
    } else if (msg.type === 'ROOM_CREATED' || msg.type === 'ROOM_UPDATED') {
      if (this.roomManager.currentRoom && msg.room && this.roomManager.currentRoom.id === msg.room.id) {
        this.roomManager.currentRoom = msg.room;
      }
      if (this.screens.lobby?.classList.contains('active')) {
        this.renderLobbyRooms();
      }
      if (this.screens.waiting?.classList.contains('active')) {
        this.renderWaitingRoom();
      }
    } else if (msg.type === 'START_GAME') {
      this.initGameFromRoom(msg.room);
    } else if (msg.type === 'SYNC_GAME_STATE') {
      const data = msg.data;
      if (!data || !this.engine) return;

      this.engine.topDiscard = data.topDiscard;
      this.engine.activeColor = data.activeColor;
      this.engine.turnIndex = data.turnIndex;
      this.engine.direction = data.direction;
      this.engine.hasDrawnThisTurn = data.hasDrawnThisTurn;
      if (data.deckCount !== undefined) {
        this.engine.drawPile = new Array(data.deckCount).fill(null);
      }

      if (data.players) {
        data.players.forEach(pInfo => {
          const existing = this.engine.players.find(p => p.id === pInfo.id);
          if (existing) {
            existing.calledKura = pInfo.calledKura;
            if (pInfo.id !== this.roomManager.myPlayerId) {
              existing.hand = new Array(pInfo.cardCount).fill(null);
            }
          }
        });
      }

      const human = this.engine.players.find(p => p.id === this.roomManager.myPlayerId);
      if (human && data.myHand) {
        human.hand = data.myHand;
      }

      if (data.lastAction === 'PLAY_CARD' || data.lastAction === 'BOT_PLAY') {
        sounds.playCardSound();
      } else if (data.lastAction === 'DRAW_CARD' || data.lastAction === 'BOT_DRAW') {
        sounds.playDrawSound();
      }

      this.render();

      const curr = this.engine.currentPlayer;
      if (curr && curr.id === this.roomManager.myPlayerId && !data.gameOver) {
        this.startTurnTimer(15);
        sounds.playTurnSound();
      } else {
        this.stopTurnTimer();
      }

      if (data.gameOver) {
        this.engine.gameOver = true;
        this.engine.winner = data.winner;
        this.stopTurnTimer();
        this.renderGameOverModal(data.winner);
      }
    } else if (msg.type === 'SHIELD_PROMPT') {
      const { attacker, targetPlayer } = msg.data;
      if (targetPlayer && targetPlayer.id === this.roomManager.myPlayerId) {
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
          this.roomManager.resolveShield(true);
          cleanup();
        };

        const onAccept = () => {
          sounds.playDrawSound();
          this.closeModal('shield');
          this.roomManager.resolveShield(false);
          cleanup();
        };

        const cleanup = () => {
          btnDeflect?.removeEventListener('click', onDeflect);
          btnAccept?.removeEventListener('click', onAccept);
        };

        btnDeflect?.addEventListener('click', onDeflect, { once: true });
        btnAccept?.addEventListener('click', onAccept, { once: true });

        this.openModal('shield');
      }
    } else if (msg.type === 'KURA_SHOUTED') {
      const { playerId, playerName } = msg.data;
      sounds.playKuraSound();
      this.showSpeechBubble(playerId, 'KURA!');
      this.showToast(`${playerName} meneriakkan KURA!`);
    } else if (msg.type === 'NEW_IN_GAME_CHAT') {
      const { senderName, senderId, text } = msg.data;
      this.showCenterChatBanner(senderName, text, senderId === this.roomManager.myPlayerId ? 'you' : senderId);
    }
  }

  startRoomGame() {
    const room = this.roomManager.currentRoom;
    if (!room) return;

    if (room.players.length < 2 && !room.fillWithAI) {
      alert('Minimal 2 pemain untuk memulai permainan!');
      return;
    }

    this.roomManager.startRoomGame();
  }

  initGameFromRoom(room) {
    this.isMultiplayerMatch = true;
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
    this.isMultiplayerMatch = false;
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

    if (!this.isMultiplayerMatch) {
      this.showToast('Game Dimulai! Giliran Kamu!');
      this.handleNextTurn();
    } else {
      this.showToast('Game Dimulai!');
    }
  }

  setupPlayerStationsVisibility() {
    const youEl = document.querySelector('.station-you');
    const leftEl = document.querySelector('.station-luna');
    const topEl = document.querySelector('.station-reyy');
    const rightEl = document.querySelector('.station-kuro');

    [youEl, leftEl, topEl, rightEl].forEach(el => {
      if (el) el.style.display = 'none';
    });

    const myId = this.isMultiplayerMatch ? this.roomManager.myPlayerId : 'you';
    const human = this.engine.players.find(p => p.id === myId) || this.engine.players.find(p => p.isHuman) || this.engine.players[0];
    const opponents = this.engine.players.filter(p => p.id !== human.id);

    // Bottom station is always the local player
    if (youEl) {
      youEl.id = `station-${human.id}`;
      youEl.style.display = 'flex';
      const nameEl = youEl.querySelector('.player-name');
      const imgEl = youEl.querySelector('.avatar-img');
      const bubbleEl = youEl.querySelector('.speech-bubble');
      if (nameEl) nameEl.innerText = human.name;
      if (imgEl) imgEl.src = human.avatar;
      if (bubbleEl) bubbleEl.id = `bubble-${human.id}`;
    }

    if (opponents.length === 1) {
      // 1v1: Top station only
      if (topEl) {
        topEl.style.display = 'flex';
        this.updateStationInfo(topEl, opponents[0]);
      }
    } else if (opponents.length === 2) {
      // 3 players: Left and Top
      if (leftEl) {
        leftEl.style.display = 'flex';
        this.updateStationInfo(leftEl, opponents[0]);
      }
      if (topEl) {
        topEl.style.display = 'flex';
        this.updateStationInfo(topEl, opponents[1]);
      }
    } else if (opponents.length >= 3) {
      // 4 players: Kuro (right), Reyy (top), Luna (left)
      if (leftEl) {
        leftEl.style.display = 'flex';
        this.updateStationInfo(leftEl, opponents[0]);
      }
      if (topEl) {
        topEl.style.display = 'flex';
        this.updateStationInfo(topEl, opponents[1]);
      }
      if (rightEl) {
        rightEl.style.display = 'flex';
        this.updateStationInfo(rightEl, opponents[2]);
      }
    }
  }

  updateStationInfo(stationEl, player) {
    const nameEl = stationEl.querySelector('.player-name');
    const imgEl = stationEl.querySelector('.avatar-img');
    const bubbleEl = stationEl.querySelector('.speech-bubble');
    if (nameEl) nameEl.innerText = player.name;
    if (imgEl) imgEl.src = player.avatar;
    stationEl.id = `station-${player.id}`;
    if (bubbleEl) bubbleEl.id = `bubble-${player.id}`;
  }

  render() {
    this.renderPlayerStations();
    this.renderCenterTable();
    this.renderPlayerHand();
    this.renderTurnIndicator();
    this.renderSkipButton();
  }

  renderSkipButton() {
    if (!this.btnSkipTurn || !this.engine) return;
    const myId = this.isMultiplayerMatch ? this.roomManager.myPlayerId : 'you';
    const isHumanTurn = (this.engine.currentPlayer?.id === myId || (this.engine.currentPlayer?.isHuman && !this.isMultiplayerMatch)) && !this.engine.gameOver && !this.isBotThinking;
    this.btnSkipTurn.disabled = !isHumanTurn;
    this.btnSkipTurn.classList.toggle('disabled', !isHumanTurn);

    const span = this.btnSkipTurn.querySelector('span');
    if (span) {
      if (this.engine.hasDrawnThisTurn) {
        span.innerText = 'PASS';
      } else {
        span.innerText = 'LEWATI';
      }
    }
  }

  renderCenterTable() {
    const top = this.engine.topDiscard;
    if (top && this.discardPileElem) {
      const img = this.discardPileElem.querySelector('img');
      if (img) img.src = top.image;
      this.discardPileElem.className = `pile discard-pile ${this.engine.activeColor || 'green'}`;
    }

    if (this.deckCountElem) {
      this.deckCountElem.innerText = this.engine.drawPile ? this.engine.drawPile.length : 0;
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
      if (curr) {
        const isMyTurn = this.isMultiplayerMatch ? (curr.id === this.roomManager.myPlayerId) : curr.isHuman;
        this.activeTurnText.innerText = isMyTurn ? 'Giliran Kamu!' : `Giliran ${curr.name}...`;
      }
    }
  }

  renderTurnIndicator() {
    const turnRing = document.querySelector('.turn-ring');
    if (turnRing) {
      turnRing.style.animationDirection = this.engine.direction === 1 ? 'normal' : 'reverse';
    }
  }

  renderPlayerStations() {
    const myId = this.isMultiplayerMatch ? this.roomManager.myPlayerId : 'you';
    this.engine.players.forEach((player, idx) => {
      const station = document.getElementById(`station-${player.id}`);
      if (!station) return;

      const isCurrent = (this.engine.turnIndex === idx);
      station.classList.toggle('active-turn', isCurrent);

      const countBadge = station.querySelector('.card-count-badge');
      if (countBadge) {
        const count = player.hand ? player.hand.length : 0;
        countBadge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-1px;"><rect x="4" y="2" width="16" height="20" rx="3"></rect></svg> ${count}`;
      }

      if (player.id !== myId) {
        const fan = station.querySelector('.cards-opponent-fan');
        if (fan) {
          fan.innerHTML = '';
          const cardCount = player.hand ? player.hand.length : 0;
          const displayCount = Math.min(cardCount, 7);
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
    const myId = this.isMultiplayerMatch ? this.roomManager.myPlayerId : 'you';
    const humanPlayer = this.engine.players.find(p => p.id === myId) || this.engine.players.find(p => p.isHuman);
    if (!humanPlayer || !this.playerHandContainer) return;

    const fanContainer = this.playerHandContainer.querySelector('.player-cards-fan');
    if (!fanContainer) return;

    fanContainer.innerHTML = '';
    const isHumanTurn = (this.engine.currentPlayer?.id === humanPlayer.id) && !this.engine.gameOver && !this.isBotThinking;

    if (humanPlayer.hand && humanPlayer.hand.length === 2 && isHumanTurn) {
      this.btnKura.classList.add('alert-pulse');
    } else if (humanPlayer.hand && humanPlayer.hand.length > 2) {
      this.btnKura.classList.remove('alert-pulse');
    }

    const totalCards = humanPlayer.hand ? humanPlayer.hand.length : 0;
    if (humanPlayer.hand) {
      humanPlayer.hand.forEach((card, idx) => {
        if (!card) return;
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

    const myId = this.isMultiplayerMatch ? this.roomManager.myPlayerId : 'you';
    this.engine.players.forEach((p, idx) => {
      const isOpponent = this.isMultiplayerMatch ? (p.id !== myId) : !p.isHuman;
      if (isOpponent && ((p.hand && p.hand.length > 0) || this.isMultiplayerMatch)) {
        const item = document.createElement('div');
        item.className = 'opponent-target-card';
        const cardCount = p.hand ? p.hand.length : 7;
        item.innerHTML = `
          <img src="${p.avatar}" alt="${p.name}">
          <h4>${p.name}</h4>
          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-1px;"><rect x="4" y="2" width="16" height="20" rx="3"></rect></svg> ${cardCount} Kartu</span>
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

    const myId = this.isMultiplayerMatch ? this.roomManager.myPlayerId : 'you';
    const humanPlayer = this.engine.players.find(p => p.id === myId) || this.engine.players.find(p => p.isHuman);
    const handOptions = humanPlayer ? humanPlayer.hand.filter(c => c && c.id !== shellCardId) : [];
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
      const isOpponent = this.isMultiplayerMatch ? (p.id !== myId) : !p.isHuman;
      if (isOpponent) {
        const item = document.createElement('div');
        item.className = 'opponent-target-card';
        const cardCount = p.hand ? p.hand.length : 7;
        item.innerHTML = `
          <img src="${p.avatar}" alt="${p.name}">
          <h4>${p.name}</h4>
          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-1px;"><rect x="4" y="2" width="16" height="20" rx="3"></rect></svg> ${cardCount} Kartu</span>
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

  handlePlayerSkipTurn() {
    if (!this.engine || this.engine.gameOver || this.isBotThinking) return;

    this.stopTurnTimer();
    this.closeModal('color');
    this.closeModal('swap');
    this.closeModal('shell');
    this.closeModal('chat');
    this.pendingWildCardId = null;

    if (this.isMultiplayerMatch) {
      const myId = this.roomManager.myPlayerId;
      if (this.engine.currentPlayer?.id === myId) {
        sounds.playClick();
        this.roomManager.skipTurn();
      }
      return;
    }

    const curr = this.engine.currentPlayer;
    if (!curr || !curr.isHuman) return;

    if (!this.engine.hasDrawnThisTurn) {
      // UNO rule: if player chooses not to play card, draw 1 card then pass turn
      sounds.playDrawSound();
      const drawn = this.engine.drawForCurrentPlayer();
      this.render();
      this.showToast('Kamu memilih lewati giliran (menarik 1 kartu).');

      setTimeout(() => {
        if (this.engine.gameOver) return;
        this.engine.passTurn();
        this.render();
        this.handleNextTurn();
      }, 700);
    } else {
      // Player already drew earlier this turn: pass turn immediately
      sounds.playClick();
      this.showToast('Kamu melewati giliran.');
      this.engine.passTurn();
      this.render();
      this.handleNextTurn();
    }
  }

  executeHumanPlay(cardId, options = {}) {
    this.stopTurnTimer();
    sounds.playCardSound();

    if (this.isMultiplayerMatch) {
      this.roomManager.playCard(cardId, options);
      return;
    }

    const humanPlayer = this.engine.players.find(p => p.isHuman);
    if (!humanPlayer) return;

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
        this.showSpeechBubble('you', 'SHIELD REFLECT!');
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
        this.showSpeechBubble(targetPlayer.id, 'SHIELD COUNTER!');
        this.showToast(`COUNTER! ${targetPlayer.name} memantulkan Wild +4 kembali ke ${attacker.name}!`);
        this.render();
        this.handleNextTurn();
      }, 1000);
    }
  }

  handleNextTurn() {
    if (this.engine.gameOver) {
      this.stopTurnTimer();
      return;
    }

    const curr = this.engine.currentPlayer;
    if (curr.isHuman) {
      this.isBotThinking = false;
      this.render();
      sounds.playTurnSound();
      this.startTurnTimer(15);
    } else {
      this.stopTurnTimer();
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
      this.showSpeechBubble(botPlayer.id, 'KURA!');
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
      this.stopTurnTimer();
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
      <button id="btn-result-restart" class="btn-retro-ticket btn-ticket-start" style="width: 100%; font-size: 1.6rem; padding: 14px;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
        <span>Main Lagi</span>
      </button>
      <button id="btn-result-continue" class="btn-retro-ticket btn-ticket-secondary" style="width: 100%; margin-top: 12px; font-size: 1.25rem; padding: 10px;">
        <span>Kembali ke Menu</span>
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
        <span style="font-weight: 700; display: flex; align-items: center; gap: 6px;">
          #${rank + 1} ${p.name}
          ${p.id === winner.id ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="#ffd54f"><path d="M2 19h20v2H2zM2 5l5 7 5-7 5 7 5-7v12H2z"></path></svg>' : ''}
        </span>
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
      <button id="btn-result-restart" class="btn-retro-ticket btn-ticket-start" style="width: 100%; font-size: 1.6rem; padding: 14px;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
        <span>Coba Lagi</span>
      </button>
      <button id="btn-result-continue" class="btn-retro-ticket btn-ticket-secondary" style="width: 100%; margin-top: 12px; font-size: 1.25rem; padding: 10px;">
        <span>Kembali ke Lobby</span>
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

  showCenterChatBanner(senderName, message, playerId = 'you') {
    const banner = document.getElementById('retro-chat-banner');
    const senderElem = document.getElementById('chat-banner-sender');
    const textElem = document.getElementById('chat-banner-text');
    if (!banner || !senderElem || !textElem) return;

    sounds.playTurnSound();

    senderElem.innerText = senderName;
    textElem.innerText = message;

    if (playerId) {
      this.showSpeechBubble(playerId, message);
    }

    banner.classList.remove('active');
    void banner.offsetWidth; // force reflow for pop animation
    banner.classList.add('active');

    clearTimeout(this.chatBannerTimeout);
    this.chatBannerTimeout = setTimeout(() => {
      banner.classList.remove('active');
    }, 3200);
  }

  triggerBotChatReply(userMsg) {
    if (!this.engine || this.engine.gameOver) return;
    const botPlayers = this.engine.players.filter(p => !p.isHuman);
    if (botPlayers.length === 0) return;

    // 65% chance for a bot to banter back after 1.6 - 2.8s
    if (Math.random() < 0.65) {
      setTimeout(() => {
        if (this.engine.gameOver) return;
        const randomBot = botPlayers[Math.floor(Math.random() * botPlayers.length)];
        const botResponses = [
          'Awas ya!',
          'Kura!',
          'Good luck!',
          'Gaspol!',
          'Hehe siap!',
          'Santai dulu!',
          'GG!',
          'Rasakan!'
        ];
        const reply = botResponses[Math.floor(Math.random() * botResponses.length)];
        this.showCenterChatBanner(randomBot.name, reply, randomBot.id);
      }, 1600 + Math.random() * 1200);
    }
  }

  startTurnTimer(seconds = 15) {
    this.stopTurnTimer();
    this.turnTimeLimit = seconds;
    this.turnTimeRemaining = seconds;

    if (this.turnTimerBadge) {
      this.turnTimerBadge.style.display = 'inline-flex';
      this.turnTimerBadge.classList.remove('warning');
    }
    if (this.turnTimerSec) {
      this.turnTimerSec.innerText = `${this.turnTimeRemaining}s`;
    }

    this.turnTimerInterval = setInterval(() => {
      this.turnTimeRemaining--;

      if (this.turnTimerSec) {
        this.turnTimerSec.innerText = `${this.turnTimeRemaining}s`;
      }

      if (this.turnTimeRemaining <= 5 && this.turnTimerBadge) {
        this.turnTimerBadge.classList.add('warning');
      }

      if (this.turnTimeRemaining <= 0) {
        this.stopTurnTimer();
        this.autoPlayForHuman();
      }
    }, 1000);
  }

  stopTurnTimer() {
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
      this.turnTimerInterval = null;
    }
    if (this.turnTimerBadge) {
      this.turnTimerBadge.style.display = 'none';
      this.turnTimerBadge.classList.remove('warning');
    }
  }

  autoPlayForHuman() {
    if (!this.engine || this.engine.gameOver) return;
    const curr = this.engine.currentPlayer;
    if (!curr) return;

    if (this.isMultiplayerMatch) {
      if (curr.id === this.roomManager.myPlayerId) {
        this.closeModal('color');
        this.closeModal('swap');
        this.closeModal('shell');
        this.closeModal('chat');
        this.showToast('Waktu habis! Melewati giliran...');
        this.roomManager.skipTurn();
      }
      return;
    }

    if (!curr.isHuman) return;

    // Close any selection modals that were currently open
    this.closeModal('color');
    this.closeModal('swap');
    this.closeModal('shell');
    this.closeModal('chat');

    // Case 1: Player already drew earlier this turn
    if (this.engine.hasDrawnThisTurn) {
      const playable = this.engine.getPlayableCards(curr);
      if (playable.length > 0) {
        const decision = BotAI.decideTurn(this.engine, curr);
        if (curr.hand.length === 2) {
          this.engine.callKura(curr);
          this.showSpeechBubble('you', 'KURA!');
          sounds.playKuraSound();
        }
        this.showToast('Waktu habis! Kartu dipasang otomatis.');
        this.executeHumanPlay(decision.cardId || playable[0].id, decision.options || {});
      } else {
        this.showToast('Waktu habis! Giliran dilewati.');
        this.engine.passTurn();
        this.render();
        this.handleNextTurn();
      }
      return;
    }

    // Case 2: Player has not drawn yet
    const decision = BotAI.decideTurn(this.engine, curr);

    if (decision.action === 'play') {
      if (curr.hand.length === 2) {
        this.engine.callKura(curr);
        this.showSpeechBubble('you', 'KURA!');
        sounds.playKuraSound();
      }
      this.showToast('Waktu habis! Kartu dipasang otomatis.');
      this.executeHumanPlay(decision.cardId, decision.options || {});
    } else {
      // Must draw
      this.showToast('Waktu habis! Menarik kartu otomatis.');
      sounds.playDrawSound();
      const drawn = this.engine.drawForCurrentPlayer();
      this.render();

      if (drawn && this.engine.canPlayCard(drawn, curr.hand)) {
        setTimeout(() => {
          if (this.engine.gameOver || !this.engine.currentPlayer.isHuman) return;
          const secondDecision = BotAI.decideTurn(this.engine, curr);
          if (curr.hand.length === 2) {
            this.engine.callKura(curr);
            this.showSpeechBubble('you', 'KURA!');
            sounds.playKuraSound();
          }
          this.showToast('Memasang kartu yang baru ditarik!');
          this.executeHumanPlay(drawn.id, secondDecision.options || {});
        }, 600);
      } else {
        setTimeout(() => {
          if (this.engine.gameOver) return;
          this.engine.passTurn();
          this.render();
          this.handleNextTurn();
        }, 600);
      }
    }
  }
}
