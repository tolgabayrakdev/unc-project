import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
    user: string;
    text: string;
}

const socket: Socket = io('https://unc-project-9xtu.vercel.app', {
    withCredentials: true,
    transports: ['polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
});

// Socket bağlantı durumunu izle
socket.on('connect_error', (error) => {
    console.error('Bağlantı hatası:', error);
});

socket.on('connect', () => {
    console.log('Sunucuya bağlandı');
});

socket.on('disconnect', (reason) => {
    console.log('Sunucudan ayrıldı:', reason);
});

// Kullanıcı adından renk üretme fonksiyonu
const generateColorFromUsername = (username: string): string => {
    const colors = [
        'bg-blue-500',
        'bg-purple-500',
        'bg-pink-500',
        'bg-green-500',
        'bg-yellow-500',
        'bg-red-500',
        'bg-indigo-500',
        'bg-teal-500'
    ];
    
    // Kullanıcı adının harflerinin ASCII değerlerinin toplamını al
    const sum = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Toplam değeri renk dizisinin uzunluğuna göre modunu al
    return colors[sum % colors.length];
};

const Home: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [usernameInput, setUsernameInput] = useState<string>('');
    const [room, setRoom] = useState<string | null>(null);
    const [activeRooms, setActiveRooms] = useState<string[]>([]);
    const [userCount, setUserCount] = useState<number>(0);
    const [isUsernameSet, setIsUsernameSet] = useState<boolean>(false);

    // Kullanıcıların renklerini saklayacak bir Map oluştur
    const [userColors] = useState<Map<string, string>>(new Map());

    // Mesaj gönderen her kullanıcı için renk ata
    const getColorForUser = (user: string): string => {
        if (!userColors.has(user)) {
            userColors.set(user, generateColorFromUsername(user));
        }
        return userColors.get(user) || 'bg-gray-500';
    };

    useEffect(() => {
        // Aktif odaları dinle
        socket.on('activeRooms', (rooms: string[]) => {
            setActiveRooms(rooms);
        });

        // Odaya katılma durumunu dinle
        socket.on('roomJoined', ({ room }: { room: string }) => {
            setRoom(room);
            setMessages([]); // Yeni odaya geçince mesajları temizle
        });

        // Kullanıcı sayısını dinle
        socket.on('userCount', (count: number) => {
            setUserCount(count);
        });

        // Mesajları dinle
        socket.on('message', (msg: Message) => {
            setMessages((prev) => [...prev, msg]);
        });

        return () => {
            socket.off('activeRooms');
            socket.off('roomJoined');
            socket.off('userCount');
            socket.off('message');
        };
    }, []);

    const handleSetUsername = (e: React.FormEvent) => {
        e.preventDefault();
        if (usernameInput.trim()) {
            setUsername(usernameInput.trim());
            setIsUsernameSet(true);
        }
    };

    const createRoom = () => {
        socket.emit('createRoom');
    };

    const joinRoom = (roomId: string) => {
        socket.emit('joinRoom', roomId);
    };

    const sendMessage = () => {
        if (input.trim() && room) {
            const message: Message = { user: username, text: input };
            socket.emit('message', { room, ...message });
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    // Kullanıcı adı belirlenmemişse giriş ekranını göster
    if (!isUsernameSet) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                    <h2 className="text-2xl font-bold text-center mb-6">Sohbete Katıl</h2>
                    <form onSubmit={handleSetUsername} className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                                Kullanıcı Adı
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={usernameInput}
                                onChange={(e) => setUsernameInput(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Kullanıcı adınızı girin"
                                required
                                minLength={3}
                                maxLength={20}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-200"
                        >
                            Devam Et
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Oda seçim ekranı
    if (!room) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
                <div className="mb-4 text-xl font-semibold text-gray-800">
                    Hoş geldin, {username}!
                </div>
                <button
                    onClick={createRoom}
                    className="mb-4 px-4 py-2 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600"
                >
                    Yeni Oda Oluştur
                </button>
                
                {activeRooms.length > 0 && (
                    <div className="w-full max-w-md">
                        <h2 className="text-xl font-bold mb-2">Aktif Odalar:</h2>
                        <div className="space-y-2">
                            {activeRooms.map((roomId) => (
                                <button
                                    key={roomId}
                                    onClick={() => joinRoom(roomId)}
                                    className="w-full px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600"
                                >
                                    {roomId}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Sohbet ekranı
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md bg-white shadow-md rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-gray-800">Oda: {room}</h1>
                    <span className="bg-green-500 text-white px-2 py-1 rounded">
                        {userCount} Kullanıcı
                    </span>
                </div>
                <div className="h-64 overflow-y-auto border border-gray-300 rounded-md p-2 mb-4">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`p-2 mb-2 rounded-md text-white ${
                                msg.user === username ? 'ml-auto' : ''
                            } ${getColorForUser(msg.user)}`}
                            style={{ maxWidth: '80%' }}
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
                        onKeyDown={handleKeyDown}
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
