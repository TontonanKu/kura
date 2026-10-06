// Multiplayer Room Manager using Socket.IO
// Connects multiple devices anywhere via network/internet in real-time

import { io } from 'socket.io-client';

export class RoomManager {
  constructor(onUpdateCallback) {
    this.onUpdate = onUpdateCallback || (() => {});
    this.currentRoom = null;
    this.myPlayerId = this.getOrCreatePlayerId();
    this.myPlayerName = localStorage.getItem('kura_player_name') || 'Player_' + Math.floor(1000 + Math.random() * 9000);
    this.myAvatar = 'assets/avatars/you.png';
    this.roomsCache = [];
    this.isConnected = false;

    // Connect to WebSocket server
    this.initSocket();
  }

  getOrCreatePlayerId() {
    let id = sessionStorage.getItem('kura_tab_player_id');
    if (!id) {
      id = 'usr_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('kura_tab_player_id', id);
    }
    return id;
  }

  initSocket() {
    // Connect to current host/origin (works for localhost, IP 192.168.x.x, or public domains like render/tunnel)
    const socketUrl = window.location.origin;
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('✅ Terhubung ke Server Multiplayer Kura Card! Socket ID:', this.socket.id);
      this.onUpdate({ type: 'SOCKET_CONNECTED' });
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.warn('⚠️ Terputus dari Server Multiplayer.');
      this.onUpdate({ type: 'SOCKET_DISCONNECTED' });
    });

    // Receive updated list of rooms
    this.socket.on('ROOMS_LIST', (rooms) => {
      this.roomsCache = rooms || [];
      this.onUpdate({ type: 'ROOMS_LIST', rooms: this.roomsCache });
    });

    // Receive updates about the room player is currently in
    this.socket.on('ROOM_UPDATE', (room) => {
      if (this.currentRoom && this.currentRoom.id === room.id) {
        this.currentRoom = room;
      }
      this.onUpdate({ type: 'ROOM_UPDATED', room });
    });

    // Match started trigger
    this.socket.on('MATCH_STARTED', (data) => {
      if (this.currentRoom && this.currentRoom.id === data.roomId) {
        this.currentRoom = data.room;
        this.onUpdate({ type: 'START_GAME', roomId: data.roomId, room: data.room });
      }
    });

    // Realtime Game State Sync
    this.socket.on('SYNC_GAME_STATE', (data) => {
      this.onUpdate({ type: 'SYNC_GAME_STATE', data });
    });

    // Shield Counter Prompt for defender
    this.socket.on('SHIELD_PROMPT', (data) => {
      this.onUpdate({ type: 'SHIELD_PROMPT', data });
    });

    // Kura shout event
    this.socket.on('KURA_SHOUTED', (data) => {
      this.onUpdate({ type: 'KURA_SHOUTED', data });
    });

    // In-game chat broadcast
    this.socket.on('NEW_IN_GAME_CHAT', (data) => {
      this.onUpdate({ type: 'NEW_IN_GAME_CHAT', data });
    });
  }

  getRooms() {
    return this.roomsCache;
  }

  createRoom({ name, password, maxPlayers = 4, fillWithAI = true }, callback) {
    const payload = {
      name: name || `${this.myPlayerName}'s Room`,
      password: password ? password.trim() : '',
      maxPlayers: parseInt(maxPlayers) || 4,
      fillWithAI: Boolean(fillWithAI),
      player: {
        id: this.myPlayerId,
        name: this.myPlayerName,
        avatar: this.myAvatar
      }
    };

    if (this.socket && this.socket.connected) {
      this.socket.emit('CREATE_ROOM', payload, (res) => {
        if (res && res.success) {
          this.currentRoom = res.room;
        }
        if (typeof callback === 'function') callback(res);
      });
    } else {
      if (typeof callback === 'function') callback({ success: false, reason: 'Belum terhubung ke server!' });
    }
  }

  joinRoom(query, passwordInput = '', callback) {
    const payload = {
      query: (query || '').trim(),
      passwordInput: (passwordInput || '').trim(),
      player: {
        id: this.myPlayerId,
        name: this.myPlayerName,
        avatar: this.myAvatar
      }
    };

    if (this.socket && this.socket.connected) {
      this.socket.emit('JOIN_ROOM', payload, (res) => {
        if (res && res.success) {
          this.currentRoom = res.room;
        }
        if (typeof callback === 'function') callback(res);
      });
    } else {
      if (typeof callback === 'function') callback({ success: false, reason: 'Belum terhubung ke server!' });
    }
  }

  addBotToRoom() {
    if (!this.currentRoom || !this.socket) return;
    this.socket.emit('ADD_BOT_AI', { roomId: this.currentRoom.id });
  }

  removePlayer(playerId) {
    if (!this.currentRoom || !this.socket) return;
    this.socket.emit('LEAVE_ROOM', { roomId: this.currentRoom.id, playerId });
    this.currentRoom = null;
  }

  toggleReady() {
    if (!this.currentRoom || !this.socket) return;
    this.socket.emit('TOGGLE_READY', {
      roomId: this.currentRoom.id,
      playerId: this.myPlayerId
    });
  }

  startRoomGame() {
    if (!this.currentRoom || !this.socket) return;
    this.socket.emit('START_MATCH', { roomId: this.currentRoom.id });
  }

  // Gameplay Actions
  playCard(cardId, options = {}) {
    if (!this.currentRoom || !this.socket) return;
    this.socket.emit('PLAY_CARD', {
      roomId: this.currentRoom.id,
      playerId: this.myPlayerId,
      cardId,
      options
    });
  }

  drawCard() {
    if (!this.currentRoom || !this.socket) return;
    this.socket.emit('DRAW_CARD', {
      roomId: this.currentRoom.id,
      playerId: this.myPlayerId
    });
  }

  skipTurn() {
    if (!this.currentRoom || !this.socket) return;
    this.socket.emit('SKIP_TURN', {
      roomId: this.currentRoom.id,
      playerId: this.myPlayerId
    });
  }

  shoutKura() {
    if (!this.currentRoom || !this.socket) return;
    this.socket.emit('SHOUT_KURA', {
      roomId: this.currentRoom.id,
      playerId: this.myPlayerId
    });
  }

  resolveShield(deflect = true) {
    if (!this.currentRoom || !this.socket) return;
    this.socket.emit('RESOLVE_SHIELD', {
      roomId: this.currentRoom.id,
      playerId: this.myPlayerId,
      deflect
    });
  }

  sendInGameChat(text) {
    if (!this.currentRoom || !this.socket) return;
    this.socket.emit('SEND_IN_GAME_CHAT', {
      roomId: this.currentRoom.id,
      senderName: this.myPlayerName,
      senderId: this.myPlayerId,
      text
    });
  }
}
