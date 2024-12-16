import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { Server } from "socket.io";
import "dotenv/config";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173  ",
        methods: ["GET", "POST"],
    }
});

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(cors({ origin: true, credentials: true }));

let waitingUser = null; // Eşleştirme için bekleyen kullanıcı

io.on('connection', (socket) => {
    console.log('Bir kullanıcı bağlandı:', socket.id);

    // Kullanıcı odaya atanır
    if (waitingUser) {
        const room = `Room-${waitingUser.id}-${socket.id}`;
        socket.join(room);
        waitingUser.join(room);

        // İki kullanıcıya oda bilgisi gönderilir
        socket.emit('roomAssigned', { room });
        waitingUser.emit('roomAssigned', { room });

        console.log(`Oda oluşturuldu: ${room}`);
        waitingUser = null; // Bekleyen kullanıcı sıfırlanır
    } else {
        waitingUser = socket; // İlk kullanıcı beklemeye alınır
        console.log('Kullanıcı eşleşme bekliyor:', socket.id);
    }

    // Mesaj gönderme
    socket.on('message', ({ room, user, text }) => {
        io.to(room).emit('message', { user, text });
    });

    // Kullanıcı ayrılırsa
    socket.on('disconnect', () => {
        console.log('Bir kullanıcı ayrıldı:', socket.id);
        if (waitingUser && waitingUser.id === socket.id) {
            waitingUser = null; // Bekleyen kullanıcı ayrılırsa sıfırlanır
        }
    });
});

server.listen(process.env.SERVER_PORT || 1234, () => {
    console.log(`Server running on port ${process.env.SERVER_PORT || 1234}`);
});

