import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { Server } from "socket.io";
import "dotenv/config";

const app = express();
const server = http.createServer(app);

const corsOptions = {
    origin: ["https://unc-project.vercel.app", "https://unc-project-9xtu.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true
};

const io = new Server(server, {
    cors: corsOptions,
});

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(cors(corsOptions));

// Aktif odaları tutacağımız obje
const activeRooms = new Map(); // {roomId: { users: Set(socketIds), usernames: Set(usernames), colors: Map(username, color) }}

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    // Mevcut odaları istemciye gönder
    socket.emit('activeRooms', Array.from(activeRooms.keys()));

    // Yeni oda oluşturma isteği
    socket.on('createRoom', (username) => {
        const roomId = `Room-${Date.now()}`;
        const userColor = generateColor(); // Yeni bir renk oluştur
        
        activeRooms.set(roomId, {
            users: new Set([socket.id]),
            usernames: new Set([username]),
            colors: new Map([[username, userColor]])
        });
        
        socket.join(roomId);
        socket.emit('roomJoined', { 
            room: roomId,
            userColor: userColor
        });
        
        // Tüm kullanıcılara güncel oda listesini gönder
        io.emit('activeRooms', Array.from(activeRooms.keys()));
    });

    // Odaya katılma isteği
    socket.on('joinRoom', ({ roomId, username }) => {
        const room = activeRooms.get(roomId);
        if (room) {
            if (room.users.size >= 10) {
                socket.emit('roomError', { message: 'Oda maksimum kapasiteye ulaştı!' });
                return;
            }

            const userColor = generateColor(); // Yeni kullanıcı için renk oluştur
            room.users.add(socket.id);
            room.usernames.add(username);
            room.colors.set(username, userColor);
            
            socket.join(roomId);
            socket.emit('roomJoined', { 
                room: roomId,
                userColor: userColor
            });

            // Odadaki tüm kullanıcılara güncel bilgileri gönder
            io.to(roomId).emit('userCount', room.users.size);
            io.to(roomId).emit('userList', Array.from(room.usernames));
            io.to(roomId).emit('userColors', Object.fromEntries(room.colors));
        }
    });

    // Renk üretme fonksiyonu
    function generateColor() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
            '#D4A5A5', '#9B59B6', '#3498DB', '#E74C3C', '#2ECC71'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Mesaj gönderme
    socket.on('message', ({ room, user, text }) => {
        io.to(room).emit('message', { user, text });
    });

    // Kullanıcı ayrılırsa
    socket.on('disconnect', () => {
        console.log('Bir kullanıcı ayrıldı:', socket.id);
        
        activeRooms.forEach((roomData, roomId) => {
            if (roomData.users.has(socket.id)) {
                roomData.users.delete(socket.id);
                
                // Odada kimse kalmadıysa odayı sil
                if (roomData.users.size === 0) {
                    activeRooms.delete(roomId);
                    io.emit('activeRooms', Array.from(activeRooms.keys()));
                } else {
                    // Odadaki kullanıcı sayısını ve listesini güncelle
                    io.to(roomId).emit('userCount', roomData.users.size);
                    io.to(roomId).emit('userList', Array.from(roomData.usernames));
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
