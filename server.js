// Node.js + Express + Socket.IO Backend Server for Kura Card Multiplayer
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { GameEngine, COLORS } from './src/engine.js';
import { BotAI } from './src/botAI.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// In-memory room store & game engines
// rooms: { [roomId]: { id, name, code, password, hasPassword, maxPlayers, fillWithAI, hostId, hostName, status, players: [] } }
const rooms = new Map();
const roomEngines = new Map(); // roomId -> { engine, botInterval }

// Generate human-friendly Room Code (e.g., KURA-7492)
function generateRoomCode() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `KURA-${num}`;
}

// Clean room payload for clients
function serializeRoom(room) {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    hasPassword: Boolean(room.hasPassword),
    maxPlayers: room.maxPlayers,
    fillWithAI: room.fillWithAI,
    hostId: room.hostId,
    hostName: room.hostName,
    status: room.status,
    playerCount: room.players.length,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.isHost,
      isAI: p.isAI,
      isReady: p.isReady
    }))
  };
}

function getPublicRoomsList() {
  const list = [];
  for (const r of rooms.values()) {
    list.push(serializeRoom(r));
  }
  return list;
}

// Default initial practice rooms
function initDefaultServerRooms() {
  if (rooms.size === 0) {
    const defaultList = [
      {
        id: 'room_reyy',
        code: 'KURA-1001',
        name: "Reyy's Arena",
        hasPassword: false,
        password: '',
        maxPlayers: 4,
        fillWithAI: true,
        hostId: 'bot_reyy',
        hostName: 'Reyy',
        status: 'waiting',
        players: [
          { id: 'bot_reyy', name: 'Reyy', avatar: 'assets/avatars/reyy.png', isHost: true, isAI: true, isReady: true },
          { id: 'bot_luna', name: 'Luna', avatar: 'assets/avatars/luna.png', isHost: false, isAI: true, isReady: true }
        ]
      },
      {
        id: 'room_chill',
        code: 'KURA-2022',
        name: 'Chill Room',
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
      }
    ];
    for (const r of defaultList) {
      rooms.set(r.id, r);
    }
  }
}
initDefaultServerRooms();

// API endpoint for quick status check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    roomsCount: rooms.size,
    timestamp: Date.now()
  });
});

// Socket.io Realtime Events
io.on('connection', (socket) => {
  let currentPlayerId = null;
  let currentRoomId = null;

  // Send current rooms list upon connection
  socket.emit('ROOMS_LIST', getPublicRoomsList());

  // 1. Create Room
  socket.on('CREATE_ROOM', (data, callback) => {
    const { name, password, maxPlayers, fillWithAI, player } = data;
    const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const code = generateRoomCode();

    currentPlayerId = player.id;
    currentRoomId = roomId;

    const newRoom = {
      id: roomId,
      code,
      name: name || `${player.name}'s Room`,
      hasPassword: Boolean(password && password.trim().length > 0),
      password: password ? password.trim() : '',
      maxPlayers: parseInt(maxPlayers) || 4,
      fillWithAI: Boolean(fillWithAI),
      hostId: player.id,
      hostName: player.name,
      status: 'waiting',
      players: [
        {
          id: player.id,
          name: player.name,
          avatar: player.avatar || 'assets/avatars/you.png',
          isHost: true,
          isAI: false,
          isReady: true,
          socketId: socket.id
        }
      ]
    };

    rooms.set(roomId, newRoom);
    socket.join(roomId);

    io.emit('ROOMS_LIST', getPublicRoomsList());
    if (typeof callback === 'function') {
      callback({ success: true, room: serializeRoom(newRoom) });
    }
  });

  // 2. Join Room (by ID or Code)
  socket.on('JOIN_ROOM', (data, callback) => {
    const { query, passwordInput, player } = data;
    // query can be roomId or roomCode
    let room = rooms.get(query);
    if (!room) {
      // Search by code (case-insensitive) or name
      const normalized = query ? query.trim().toUpperCase() : '';
      for (const r of rooms.values()) {
        if (r.code.toUpperCase() === normalized || r.id === query) {
          room = r;
          break;
        }
      }
    }

    if (!room) {
      if (typeof callback === 'function') callback({ success: false, reason: 'Ruangan atau ID Room tidak ditemukan!' });
      return;
    }

    if (room.hasPassword && room.password !== passwordInput) {
      if (typeof callback === 'function') callback({ success: false, reason: 'Kata sandi salah!', requirePassword: true });
      return;
    }

    if (room.status === 'playing') {
      if (typeof callback === 'function') callback({ success: false, reason: 'Permainan di ruangan ini sudah dimulai!' });
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      if (typeof callback === 'function') callback({ success: false, reason: 'Ruangan sudah penuh!' });
      return;
    }

    currentPlayerId = player.id;
    currentRoomId = room.id;

    // Check if player already exists in room
    const existingIdx = room.players.findIndex(p => p.id === player.id);
    if (existingIdx !== -1) {
      room.players[existingIdx].socketId = socket.id;
    } else {
      room.players.push({
        id: player.id,
        name: player.name,
        avatar: player.avatar || 'assets/avatars/you.png',
        isHost: false,
        isAI: false,
        isReady: false,
        socketId: socket.id
      });
    }

    socket.join(room.id);
    io.to(room.id).emit('ROOM_UPDATE', serializeRoom(room));
    io.emit('ROOMS_LIST', getPublicRoomsList());

    if (typeof callback === 'function') {
      callback({ success: true, room: serializeRoom(room) });
    }
  });

  // 3. Toggle Ready
  socket.on('TOGGLE_READY', ({ roomId, playerId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.isReady = !player.isReady;
      io.to(roomId).emit('ROOM_UPDATE', serializeRoom(room));
    }
  });

  // 4. Add Bot AI
  socket.on('ADD_BOT_AI', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.players.length >= room.maxPlayers) return;

    const botAvatars = [
      { name: 'Luna', avatar: 'assets/avatars/luna.png' },
      { name: 'Reyy', avatar: 'assets/avatars/reyy.png' },
      { name: 'Kuro', avatar: 'assets/avatars/kuro.png' }
    ];
    const usedNames = room.players.map(p => p.name);
    const choice = botAvatars.find(b => !usedNames.includes(b.name)) || {
      name: `KuraBot_${Math.floor(Math.random() * 100)}`,
      avatar: 'assets/avatars/reyy.png'
    };

    room.players.push({
      id: 'bot_' + Math.random().toString(36).substring(2, 7),
      name: choice.name,
      avatar: choice.avatar,
      isHost: false,
      isAI: true,
      isReady: true
    });

    io.to(roomId).emit('ROOM_UPDATE', serializeRoom(room));
    io.emit('ROOMS_LIST', getPublicRoomsList());
  });

  // 5. Leave Room
  socket.on('LEAVE_ROOM', ({ roomId, playerId }) => {
    handlePlayerLeave(roomId, playerId, socket);
  });

  // 6. Start Room Match
  socket.on('START_MATCH', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // Fill remaining with AI if requested
    if (room.fillWithAI) {
      const botAvatars = [
        { name: 'Luna', avatar: 'assets/avatars/luna.png' },
        { name: 'Reyy', avatar: 'assets/avatars/reyy.png' },
        { name: 'Kuro', avatar: 'assets/avatars/kuro.png' }
      ];
      while (room.players.length < room.maxPlayers) {
        const used = room.players.map(p => p.name);
        const choice = botAvatars.find(b => !used.includes(b.name)) || {
          name: `Bot_${Math.floor(Math.random() * 99)}`,
          avatar: 'assets/avatars/reyy.png'
        };
        room.players.push({
          id: 'bot_' + Math.random().toString(36).substring(2, 7),
          name: choice.name,
          avatar: choice.avatar,
          isHost: false,
          isAI: true,
          isReady: true
        });
      }
    }

    if (room.players.length < 2) return;

    room.status = 'playing';

    // Initialize authoritative server engine
    const playersConfig = room.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHuman: !p.isAI,
      isAI: p.isAI
    }));

    const engine = new GameEngine(playersConfig);
    engine.initGame();
    roomEngines.set(roomId, { engine });

    // Broadcast GAME_STARTED with initial states
    io.to(roomId).emit('MATCH_STARTED', {
      roomId,
      room: serializeRoom(room)
    });

    broadcastGameState(roomId);
  });

  // 7. Gameplay: Play Card
  socket.on('PLAY_CARD', ({ roomId, playerId, cardId, options }) => {
    const roomData = roomEngines.get(roomId);
    if (!roomData) return;
    const { engine } = roomData;
    if (engine.gameOver) return;

    const curr = engine.currentPlayer;
    if (curr.id !== playerId) return;

    const result = engine.playCard(curr, cardId, options || {});
    broadcastGameState(roomId, { lastAction: 'PLAY_CARD', playerId, cardId, result });

    if (result.shieldTriggered) {
      // Notify target player of shield reaction prompt
      io.to(roomId).emit('SHIELD_PROMPT', {
        attacker: result.attacker,
        targetPlayer: result.targetPlayer
      });
      return;
    }

    checkBotTurn(roomId);
  });

  // 8. Gameplay: Draw Card
  socket.on('DRAW_CARD', ({ roomId, playerId }) => {
    const roomData = roomEngines.get(roomId);
    if (!roomData) return;
    const { engine } = roomData;
    if (engine.gameOver) return;

    const curr = engine.currentPlayer;
    if (curr.id !== playerId || engine.hasDrawnThisTurn) return;

    const drawn = engine.drawForCurrentPlayer();
    broadcastGameState(roomId, { lastAction: 'DRAW_CARD', playerId, drawnCard: drawn });
  });

  // 9. Gameplay: Skip / Pass Turn
  socket.on('SKIP_TURN', ({ roomId, playerId }) => {
    const roomData = roomEngines.get(roomId);
    if (!roomData) return;
    const { engine } = roomData;
    if (engine.gameOver) return;

    const curr = engine.currentPlayer;
    if (curr.id !== playerId) return;

    if (!engine.hasDrawnThisTurn) {
      engine.drawForCurrentPlayer();
    }
    engine.passTurn();
    broadcastGameState(roomId, { lastAction: 'SKIP_TURN', playerId });
    checkBotTurn(roomId);
  });

  // 10. Gameplay: Shout KURA
  socket.on('SHOUT_KURA', ({ roomId, playerId }) => {
    const roomData = roomEngines.get(roomId);
    if (!roomData) return;
    const { engine } = roomData;

    const p = engine.players.find(x => x.id === playerId);
    if (p) {
      engine.callKura(p);
      io.to(roomId).emit('KURA_SHOUTED', { playerId, playerName: p.name });
    }
  });

  // 11. Gameplay: Resolve Shield Reaction
  socket.on('RESOLVE_SHIELD', ({ roomId, playerId, deflect }) => {
    const roomData = roomEngines.get(roomId);
    if (!roomData) return;
    const { engine } = roomData;

    engine.resolveShieldReaction(deflect);
    broadcastGameState(roomId, { lastAction: 'SHIELD_RESOLVED', playerId, deflect });
    checkBotTurn(roomId);
  });

  // 12. Gameplay: In-Game Chat Banner
  socket.on('SEND_IN_GAME_CHAT', ({ roomId, senderName, senderId, text }) => {
    io.to(roomId).emit('NEW_IN_GAME_CHAT', {
      senderName,
      senderId,
      text
    });
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    if (currentRoomId && currentPlayerId) {
      handlePlayerLeave(currentRoomId, currentPlayerId, socket);
    }
  });
});

function handlePlayerLeave(roomId, playerId, socket) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.players = room.players.filter(p => p.id !== playerId);
  socket.leave(roomId);

  if (room.players.length === 0 || room.players.every(p => p.isAI)) {
    rooms.delete(roomId);
    roomEngines.delete(roomId);
  } else {
    // Reassign host if host left
    if (room.hostId === playerId) {
      const nextHuman = room.players.find(p => !p.isAI) || room.players[0];
      room.hostId = nextHuman.id;
      room.hostName = nextHuman.name;
      nextHuman.isHost = true;
    }
    io.to(roomId).emit('ROOM_UPDATE', serializeRoom(room));
  }

  io.emit('ROOMS_LIST', getPublicRoomsList());
}

// Broadcast game state to each player in room
function broadcastGameState(roomId, extraData = {}) {
  const room = rooms.get(roomId);
  const roomData = roomEngines.get(roomId);
  if (!room || !roomData) return;
  const { engine } = roomData;

  const publicInfo = {
    topDiscard: engine.topDiscard,
    activeColor: engine.activeColor,
    turnIndex: engine.turnIndex,
    direction: engine.direction,
    currentPlayerId: engine.currentPlayer?.id,
    deckCount: engine.drawPile.length,
    gameOver: engine.gameOver,
    winner: engine.winner,
    hasDrawnThisTurn: engine.hasDrawnThisTurn,
    players: engine.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      cardCount: p.hand.length,
      isHuman: p.isHuman,
      calledKura: p.calledKura
    })),
    ...extraData
  };

  // For each human socket, send public info + their private hand
  for (const player of room.players) {
    if (!player.isAI && player.socketId) {
      const enginePlayer = engine.players.find(p => p.id === player.id);
      io.to(player.socketId).emit('SYNC_GAME_STATE', {
        ...publicInfo,
        myHand: enginePlayer ? enginePlayer.hand : []
      });
    }
  }
}

// Check if current turn is AI Bot, and make intelligent turn decision
function checkBotTurn(roomId) {
  const roomData = roomEngines.get(roomId);
  if (!roomData) return;
  const { engine } = roomData;
  if (engine.gameOver) return;

  const curr = engine.currentPlayer;
  if (!curr || curr.isHuman) return;

  setTimeout(() => {
    if (engine.gameOver) return;
    const decision = BotAI.decideTurn(engine, curr);

    if (decision.action === 'draw') {
      const drawn = engine.drawForCurrentPlayer();
      broadcastGameState(roomId, { lastAction: 'BOT_DRAW', playerId: curr.id });

      if (drawn && engine.canPlayCard(drawn, curr.hand)) {
        setTimeout(() => {
          engine.playCard(curr, drawn.id, decision.options || {});
          broadcastGameState(roomId, { lastAction: 'BOT_PLAY', playerId: curr.id });
          checkBotTurn(roomId);
        }, 700);
      } else {
        setTimeout(() => {
          engine.passTurn();
          broadcastGameState(roomId, { lastAction: 'BOT_PASS', playerId: curr.id });
          checkBotTurn(roomId);
        }, 700);
      }
    } else if (decision.action === 'play') {
      const result = engine.playCard(curr, decision.cardId, decision.options || {});
      broadcastGameState(roomId, { lastAction: 'BOT_PLAY', playerId: curr.id });

      if (result.shieldTriggered) {
        io.to(roomId).emit('SHIELD_PROMPT', {
          attacker: result.attacker,
          targetPlayer: result.targetPlayer
        });
        return;
      }

      checkBotTurn(roomId);
    }
  }, 1000 + Math.random() * 500);
}

// Setup Vite dev server middleware or serve dist
async function startServer() {
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'dist'));

  if (process.env.NODE_ENV !== 'production' && !process.env.SERVE_DIST) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`   🎮 KURA CARD MULTIPLAYER SERVER BERJALAN!`);
    console.log(`   ------------------------------------------------------`);
    console.log(`   ➜ Local:   http://localhost:${PORT}`);
    console.log(`   ➜ Network: http://0.0.0.0:${PORT} (Semua perangkat di WiFi)`);
    console.log(`======================================================\n`);
  });
}

startServer();
