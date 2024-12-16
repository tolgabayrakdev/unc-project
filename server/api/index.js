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
        origin: ["https://unc-project.vercel.app", "https://unc-project-9xtu.vercel.app"],
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

    // Eğer bekleyen bir kullanıcı varsa
    if (waitingUser) {
        // Oda ismi oluşturuluyor, her iki kullanıcıyı aynı odaya katıyoruz
        const room = `Room-${waitingUser.id}-${socket.id}`;
        console.log(`Oda oluşturuldu: ${room}`);

        // Her iki kullanıcıyı aynı odaya katıyoruz
        socket.join(room);
        waitingUser.join(room);

        // Oda bilgisi gönderilir
        socket.emit('roomAssigned', { room });
        waitingUser.emit('roomAssigned', { room });

        // Eşleşme tamamlandıktan sonra waitingUser sıfırlanır
        waitingUser = null;
    } else {
        // İlk kullanıcı beklemeye alınır
        waitingUser = socket; 
        console.log('Kullanıcı eşleşme bekliyor:', socket.id);
    }

    // Mesaj gönderme işlemi
    socket.on('message', ({ room, user, text }) => {
        io.to(room).emit('message', { user, text });
    });

    // Kullanıcı ayrıldığında
    socket.on('disconnect', () => {
        console.log('Bir kullanıcı ayrıldı:', socket.id);
        if (waitingUser && waitingUser.id === socket.id) {
            waitingUser = null; // Bekleyen kullanıcı ayrılırsa sıfırlanır
        }
    });
});

app.get('/', (req, res) => {
    res.send('Server is running');
});

server.listen(process.env.SERVER_PORT || 1234, () => {
    console.log(`Server running on port ${process.env.SERVER_PORT || 1234}`);
});
