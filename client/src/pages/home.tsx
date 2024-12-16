import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
    user: string;
    text: string;
}

const socket: Socket = io('https://unc-project-9xtu.vercel.app' ,{
    withCredentials: true
});

// Rastgele kullanıcı adı oluştur
const generateRandomName = (): string => `User${Math.floor(1000 + Math.random() * 9000)}`;

const Home: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>('');
    const [username] = useState<string>(generateRandomName());
    const [room, setRoom] = useState<string | null>(null);

    useEffect(() => {
        // Sunucudan oda bilgisi alınır
        socket.on('roomAssigned', ({ room }: { room: string }) => {
            setRoom(room);
            console.log(`Odaya atandınız: ${room}`); // Burada oda adı yazdırılabilir
        });
    
        // Sunucudan gelen mesajlar dinlenir
        socket.on('message', (msg: Message) => {
            setMessages((prev) => [...prev, msg]);
        });
    
        // Temizlik
        return () => {
            socket.off('roomAssigned');
            socket.off('message');
        };
    }, []);
    

    const sendMessage = () => {
        if (input.trim() && room) {
            const message: Message = { user: username, text: input };
            socket.emit('message', { room, ...message }); // Mesaj gönder
            setInput(''); // Giriş kutusunu temizle
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    if (!room) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-xl font-bold text-gray-800">Eşleşme bekleniyor...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md bg-white shadow-md rounded-lg p-4">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Oda: {room}</h1>
                <div className="h-64 overflow-y-auto border border-gray-300 rounded-md p-2 mb-4">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`p-2 mb-2 rounded-md text-white ${
                                msg.user === username ? 'bg-blue-500 self-end' : 'bg-red-500 self-start'
                            }`}
                        >
                            <strong>{msg.user}: </strong>
                            {msg.text}
                        </div>
                    ))}
                </div>
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown} // Enter tuşuna basıldığında mesaj gönder
                        placeholder="Mesaj yazın"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
                    />
                    <button
                        onClick={sendMessage}
                        className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600"
                    >
                        Gönder
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Home;
