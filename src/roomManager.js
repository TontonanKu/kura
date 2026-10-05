// Multiplayer Room Manager using BroadcastChannel & localStorage
// Allows instant multi-tab & multi-window multiplayer + AI bot fill

export class RoomManager {
  constructor(onUpdateCallback) {
    this.onUpdate = onUpdateCallback || (() => {});
    this.currentRoom = null;
    this.myPlayerId = this.getOrCreatePlayerId();
    this.myPlayerName = localStorage.getItem('kura_player_name') || 'Player_' + Math.floor(1000 + Math.random() * 9000);
    this.myAvatar = 'assets/avatars/you.png';

    // BroadcastChannel for cross-tab realtime messaging
    this.channel = null;
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('kura_cards_network');
      this.channel.onmessage = (event) => this.handleNetworkMessage(event.data);
    }

    // Default simulated rooms if none exist
    this.initDefaultRooms();
  }

  getOrCreatePlayerId() {
    let id = sessionStorage.getItem('kura_tab_player_id');
    if (!id) {
      id = 'usr_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('kura_tab_player_id', id);
    }
    return id;
  }

  initDefaultRooms() {
    const existing = this.getRooms();
    if (existing.length === 0) {
      const defaults = [
        {
          id: 'room_reyy',
          name: "👑 Reyy's Arena",
          hasPassword: false,
          password: '',
          maxPlayers: 4,
          fillWithAI: true,
          hostId: 'bot_reyy',
          hostName: 'Reyy',
          status: 'waiting', // 'waiting' | 'playing'
          players: [
            { id: 'bot_reyy', name: 'Reyy', avatar: 'assets/avatars/reyy.png', isHost: true, isAI: true, isReady: true },
            { id: 'bot_luna', name: 'Luna', avatar: 'assets/avatars/luna.png', isHost: false, isAI: true, isReady: true }
          ]
        },
        {
          id: 'room_chill',
          name: "🍵 Chill Room",
          hasPassword: false,
          password: '',
          maxPlayers: 4,
          fillWithAI: true,
          hostId: 'bot_kuro',
          hostName: 'Kuro',
          status: 'waiting',
          players: [
            { id: 'bot_kuro', name: 'Kuro', avatar: 'assets/avatars/kuro.png', isHost: true, isAI: true, isReady: true }
          ]
        },
        {
          id: 'room_vip',
          name: "🔒 Private Match VIP",
          hasPassword: true,
          password: '123',
          maxPlayers: 3,
          fillWithAI: true,
          hostId: 'bot_vip',
          hostName: 'Master_Kura',
          status: 'waiting',
          players: [
            { id: 'bot_vip', name: 'Master_Kura', avatar: 'assets/avatars/reyy.png', isHost: true, isAI: true, isReady: true }
          ]
        }
      ];
      this.saveRooms(defaults);
    }
  }

  getRooms() {
    try {
      const data = localStorage.getItem('kura_rooms');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveRooms(rooms) {
    localStorage.setItem('kura_rooms', JSON.stringify(rooms));
  }

  createRoom({ name, password, maxPlayers = 4, fillWithAI = true }) {
    const roomId = 'room_' + Date.now();
    const newRoom = {
      id: roomId,
      name: name || `${this.myPlayerName}'s Room`,
      hasPassword: Boolean(password && password.trim().length > 0),
      password: password ? password.trim() : '',
      maxPlayers: parseInt(maxPlayers) || 4,
      fillWithAI: Boolean(fillWithAI),
      hostId: this.myPlayerId,
      hostName: this.myPlayerName,
      status: 'waiting',
      players: [
        {
          id: this.myPlayerId,
          name: this.myPlayerName,
          avatar: this.myAvatar,
          isHost: true,
          isAI: false,
          isReady: true
        }
      ]
    };

    const rooms = this.getRooms();
    rooms.unshift(newRoom);
    this.saveRooms(rooms);

    this.currentRoom = newRoom;
    this.broadcast({ type: 'ROOM_CREATED', room: newRoom });
    return newRoom;
  }

  joinRoom(roomId, passwordInput = '') {
    const rooms = this.getRooms();
    const room = rooms.find(r => r.id === roomId);
    if (!room) return { success: false, reason: 'Ruangan tidak ditemukan!' };

    if (room.hasPassword && room.password !== passwordInput) {
      return { success: false, reason: 'Kata sandi salah!' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, reason: 'Ruangan sudah penuh!' };
    }

    // Add player if not already in room
    const existing = room.players.find(p => p.id === this.myPlayerId);
    if (!existing) {
      room.players.push({
        id: this.myPlayerId,
        name: this.myPlayerName,
        avatar: this.myAvatar,
        isHost: false,
        isAI: false,
        isReady: false
      });
      this.saveRooms(rooms);
      this.broadcast({ type: 'ROOM_UPDATED', room });
    }

    this.currentRoom = room;
    return { success: true, room };
  }

  addBotToRoom() {
    if (!this.currentRoom) return null;
    if (this.currentRoom.players.length >= this.currentRoom.maxPlayers) return null;

    const botAvatars = [
      { name: 'Luna', avatar: 'assets/avatars/luna.png' },
      { name: 'Reyy', avatar: 'assets/avatars/reyy.png' },
      { name: 'Kuro', avatar: 'assets/avatars/kuro.png' }
    ];

    // Pick a bot name not already in room
    const usedNames = this.currentRoom.players.map(p => p.name);
    let botChoice = botAvatars.find(b => !usedNames.includes(b.name)) || {
      name: `KuraBot_${Math.floor(Math.random() * 100)}`,
      avatar: 'assets/avatars/reyy.png'
    };

    const newBot = {
      id: 'bot_' + Math.random().toString(36).substring(2, 7),
      name: botChoice.name,
      avatar: botChoice.avatar,
      isHost: false,
      isAI: true,
      isReady: true
    };

    this.currentRoom.players.push(newBot);

    const rooms = this.getRooms();
    const idx = rooms.findIndex(r => r.id === this.currentRoom.id);
    if (idx !== -1) {
      rooms[idx] = this.currentRoom;
      this.saveRooms(rooms);
    }

    this.broadcast({ type: 'ROOM_UPDATED', room: this.currentRoom });
    return this.currentRoom;
  }

  removePlayer(playerId) {
    if (!this.currentRoom) return;
    this.currentRoom.players = this.currentRoom.players.filter(p => p.id !== playerId);

    const rooms = this.getRooms();
    const idx = rooms.findIndex(r => r.id === this.currentRoom.id);
    if (idx !== -1) {
      if (this.currentRoom.players.length === 0) {
        rooms.splice(idx, 1);
        this.currentRoom = null;
      } else {
        // If host left, assign new host
        if (this.currentRoom.hostId === playerId) {
          this.currentRoom.hostId = this.currentRoom.players[0].id;
          this.currentRoom.hostName = this.currentRoom.players[0].name;
          this.currentRoom.players[0].isHost = true;
        }
        rooms[idx] = this.currentRoom;
      }
      this.saveRooms(rooms);
    }
    this.broadcast({ type: 'ROOM_UPDATED', room: this.currentRoom });
  }

  toggleReady() {
    if (!this.currentRoom) return;
    const player = this.currentRoom.players.find(p => p.id === this.myPlayerId);
    if (player) {
      player.isReady = !player.isReady;
      const rooms = this.getRooms();
      const idx = rooms.findIndex(r => r.id === this.currentRoom.id);
      if (idx !== -1) {
        rooms[idx] = this.currentRoom;
        this.saveRooms(rooms);
      }
      this.broadcast({ type: 'ROOM_UPDATED', room: this.currentRoom });
    }
  }

  broadcast(message) {
    if (this.channel) {
      this.channel.postMessage(message);
    }
    this.onUpdate(message);
  }

  handleNetworkMessage(data) {
    if (!data) return;
    if (data.type === 'ROOM_UPDATED' || data.type === 'ROOM_CREATED') {
      if (this.currentRoom && data.room && data.room.id === this.currentRoom.id) {
        this.currentRoom = data.room;
      }
    }
    this.onUpdate(data);
  }
}
