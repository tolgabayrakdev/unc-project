import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
    user: string;
    text: string;
    timestamp?: number;
}

interface UserColors {
    [key: string]: string;
}

const socket: Socket = io('http://localhost:1234', {
    withCredentials: true
});



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
    const [userColors, setUserColors] = useState<UserColors>({});

  

    const [userList, setUserList] = useState<string[]>([]);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        // Aktif odaları dinle
        socket.on('activeRooms', (rooms: string[]) => {
            console.log('Aktif odalar:', rooms); // Debug için
            setActiveRooms(rooms);
        });

        // Odaya katılma durumunu dinle
        socket.on('roomJoined', ({ room, userColor }: { room: string, userColor: string }) => {
            setRoom(room);
            setMessages([]); // Yeni odaya geçince mesajları temizle
            setUserColors(prev => ({
                ...prev,
                [username]: userColor
            }));
        });

        // Kullanıcı sayısını dinle
        socket.on('userCount', (count: number) => {
            setUserCount(count);
        });

        // Mesajları dinle
        socket.on('message', (msg: Message) => {
            setMessages((prev) => [...prev, msg]);
        });

        // Kullanıcı listesini dinle
        socket.on('userList', (users: string[]) => {
            setUserList(users);
        });

        // Oda hatalarını dinle
        socket.on('roomError', ({ message }: { message: string }) => {
            setError(message);
        });

        // Kullanıcı renklerini dinle
        socket.on('userColors', (colors: UserColors) => {
            setUserColors(colors);
        });

        return () => {
            socket.off('activeRooms');
            socket.off('roomJoined');
            socket.off('userCount');
            socket.off('message');
            socket.off('userList');
            socket.off('roomError');
            socket.off('userColors');
        };
    }, [username]);

    const handleSetUsername = (e: React.FormEvent) => {
        e.preventDefault();
        if (usernameInput.trim()) {
            setUsername(usernameInput.trim());
            setIsUsernameSet(true);
        }
    };

    const createRoom = () => {
        socket.emit('createRoom', username);
    };

    const joinRoom = (roomId: string) => {
        socket.emit('joinRoom', { roomId, username });
    };

    const sendMessage = () => {
        if (input.trim() && room) {
            const message: Message = { 
                user: username, 
                text: input,
                timestamp: Date.now()
            };
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
        {
            error && <div className="text-red-500">{error}</div>
        }
            <div className="w-full max-w-4xl bg-white shadow-md rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-gray-800">Oda: {room}</h1>
                    <div className="flex items-center space-x-2">
                        <span className="bg-green-500 text-white px-2 py-1 rounded">
                            {userCount} Kullanıcı
                        </span>
                    </div>
                </div>
                <div className="flex gap-4">
                    {/* Kullanıcı listesi */}
                    <div className="w-1/4 border-r pr-4">
                        <h2 className="text-lg font-semibold mb-2">Kullanıcılar</h2>
                        <ul className="space-y-1">
                            {userList.map((user, index) => (
                                <li
                                    key={index}
                                    className="p-2 rounded-lg shadow-sm flex items-center space-x-2"
                                    style={{
                                        backgroundColor: '#f3f4f6',
                                        borderLeft: `4px solid ${userColors[user] || '#808080'}`
                                    }}
                                >
                                    <span className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: userColors[user] || '#808080' }}
                                    />
                                    <span className="text-gray-700">{user}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    
                    {/* Mesajlaşma alanı */}
                    <div className="flex-1">
                        <div className="h-[500px] overflow-y-auto border border-gray-300 rounded-md p-2 mb-4">
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`p-3 mb-2 rounded-lg shadow-md ${
                                        msg.user === username ? 'ml-auto bg-blue-600' : 'bg-gray-700'
                                    }`}
                                    style={{ 
                                        maxWidth: '80%',
                                        position: 'relative',
                                        borderLeft: `4px solid ${userColors[msg.user] || '#808080'}`
                                    }}
                                >
                                    <div className="text-xs text-gray-300 mb-1">
                                        {msg.user}
                                    </div>
                                    <div className="text-white">
                                        {msg.text}
                                    </div>
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
            </div>
        </div>
    );
};

export default Home;
