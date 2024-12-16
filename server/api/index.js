import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { Server } from "socket.io";
import "dotenv/config";

const app = express();
const server = http.createServer(app);

const ALLOWED_ORIGINS = [
    "https://unc-project.vercel.app",
    "http://localhost:5173"
];

app.use(cors({
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"],
        credentials: true,
    },
    allowEIO3: true,
    transports: ['polling', 'websocket'],
    pingInterval: 10000,
    pingTimeout: 5000,
    cookie: false
});

// Aktif odaları tutacağımız obje
const activeRooms = new Map();

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    // Bağlantı başarılı olduğunda bir onay gönder
    socket.emit('connectionEstablished', { id: socket.id });

    // Mevcut odaları istemciye gönder
    socket.emit('activeRooms', Array.from(activeRooms.keys()));

    // Yeni oda oluşturma isteği
    socket.on('createRoom', () => {
        const roomId = `Room-${Date.now()}`;
        activeRooms.set(roomId, new Set([socket.id]));
        socket.join(roomId);
        socket.emit('roomJoined', { room: roomId });
        io.emit('activeRooms', Array.from(activeRooms.keys()));
    });

    // Odaya katılma isteği
    socket.on('joinRoom', (roomId) => {
        const room = activeRooms.get(roomId);
        if (room) {
            room.add(socket.id);
            socket.join(roomId);
            socket.emit('roomJoined', { room: roomId });
            
            // Odadaki kullanıcı sayısını güncelle
            io.to(roomId).emit('userCount', room.size);
        }
    });

    // Mesaj gönderme
    socket.on('message', ({ room, user, text }) => {
        io.to(room).emit('message', { user, text });
    });

    // Kullanıcı ayrılırsa
    socket.on('disconnect', () => {
        console.log('Bir kullanıcı ayrıldı:', socket.id);
        
        // Kullanıcının bulunduğu odayı bul ve güncelle
        activeRooms.forEach((users, roomId) => {
            if (users.has(socket.id)) {
                users.delete(socket.id);
                
                // Odada kimse kalmadıysa odayı sil
                if (users.size === 0) {
                    activeRooms.delete(roomId);
                    io.emit('activeRooms', Array.from(activeRooms.keys()));
                } else {
                    // Odadaki kullanıcı sayısını güncelle
                    io.to(roomId).emit('userCount', users.size);
                }
            }
        });
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT || 1234;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
