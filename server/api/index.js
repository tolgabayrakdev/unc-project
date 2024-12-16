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

const corsOptions = {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
};

const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    cookie: {
        name: "io",
        httpOnly: true,
        sameSite: "none",
        secure: true
    }
});

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(cors(corsOptions));

// Aktif odaları tutacağımız obje
const activeRooms = new Map(); // {roomId: Set(socketIds)}

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

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

app.get('/', (req, res) => {
    res.send('Server is running');
});

server.listen(process.env.SERVER_PORT || 1234, () => {
    console.log(`Server running on port ${process.env.SERVER_PORT || 1234}`);
});
