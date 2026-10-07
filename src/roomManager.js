// Room Manager (Multiplayer Mode Coming Soon)
export class RoomManager {
  constructor(onUpdateCallback) {
    this.onUpdate = onUpdateCallback || (() => {});
    this.currentRoom = null;
    this.myPlayerId = 'you';
    this.myPlayerName = localStorage.getItem('kura_player_name') || 'You';
    this.myAvatar = 'assets/avatars/you.png';
    this.roomsCache = [];
    this.isConnected = false;
  }

  getRooms() {
    return [];
  }

  createRoom(data, callback) {
    if (typeof callback === 'function') {
      callback({ success: false, reason: 'Mode Multiplayer sedang dalam pengembangan & segera hadir!' });
    }
  }

  joinRoom(query, passwordInput, callback) {
    if (typeof callback === 'function') {
      callback({ success: false, reason: 'Mode Multiplayer sedang dalam pengembangan & segera hadir!' });
    }
  }

  addBotToRoom() {}
  removePlayer() {}
  toggleReady() {}
  startRoomGame() {}
  playCard() {}
  drawCard() {}
  skipTurn() {}
  shoutKura() {}
  resolveShield() {}
  sendInGameChat() {}
}
