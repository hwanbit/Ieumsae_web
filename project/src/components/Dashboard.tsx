import { useState, useEffect } from 'react'
import ReactPlayer from 'react-player'
import axios from 'axios'
import { format } from 'date-fns'
import busLogo from '../assets/iumsae_logo.png'
import screenIcon from '../assets/screen.svg'
import databaseIcon from '../assets/database.svg'
import homeIcon from '../assets/home.svg'
import { useNavigate } from 'react-router-dom'
import weatherDescKo from '../weatherDescKo.ts';

interface DetectionLog {
    timestamp: string
    camera_id: string
    objects: string[]
}

interface WeatherData {
    temperature: number;
    description: string;
    timestamp: string;
    icon: string;
    id?: number; // Add id field for weather condition code
}

function Dashboard() {
    const navigate = useNavigate()
    const [logs1, setLogs1] = useState<DetectionLog[]>([])
    const [logs2, setLogs2] = useState<DetectionLog[]>([])
    const [logs3, setLogs3] = useState<DetectionLog[]>([])
    const [weather, setWeather] = useState<WeatherData | null>(null)

    // Jetson Orin Nano의 IP 주소 설정
    const jetsonIP = "192.168.0.100" // Jetson의 실제 IP 주소로 변경하세요, 아래도!

    // RTSP 스트림 URL
    const rtspStream1 = `rtsp://192.168.0.30:8554/stream`
    const rtspStream2 = `rtsp://${jetsonIP}:8554/webcam2`
    // 세 번째 카메라는 기존 설정 유지
    const rtspStream3 = "rtsp://127.128.56.07/stream"

    // Map weather condition ID to Korean description
    const getKoreanWeatherDesc = (id: number): string => {
        const weather = weatherDescKo.find((item) => item[id]);
        return weather ? weather[id] : '알 수 없는 날씨'; // Fallback if ID not found
    };

    useEffect(() => {
        const fetchWeather = async () => {
            const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
            if (!API_KEY) {
                console.error('OpenWeatherMap API key is missing. Please set REACT_APP_OPENWEATHER_API_KEY in .env file.');
                setWeather({
                    temperature: 22,
                    description: '맑음',
                    timestamp: new Date().toISOString(),
                    icon: '01d',
                    id: 800,
                });
                return;
            }

            try {
                const response = await axios.get(
                    `https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=${API_KEY}&units=metric&lang=kr`
                );
                const weatherId = response.data.weather[0].id; // Get weather condition ID
                setWeather({
                    temperature: Math.round(response.data.main.temp),
                    description: getKoreanWeatherDesc(weatherId), // Use Korean description
                    timestamp: new Date().toISOString(),
                    icon: response.data.weather[0].icon,
                    id: weatherId,
                });
            } catch (error) {
                console.error('ēdError fetching weather:', error);
                setWeather({
                    temperature: 22,
                    description: '맑음',
                    timestamp: new Date().toISOString(),
                    icon: '01d',
                    id: 800,
                });
            }
        };

        fetchWeather();
        const weatherInterval = setInterval(fetchWeather, 300000); // Update every 5 minutes

        return () => clearInterval(weatherInterval);
    }, []);

    // 객체 감지 로그 시뮬레이션 (실제 프로덕션에서는 백엔드 API 또는 WebSocket으로 대체)
    useEffect(() => {
        const simulateLogUpdate = (setLogs: React.Dispatch<React.SetStateAction<DetectionLog[]>>, cameraId: string) => {
            setLogs(prev => [
                {
                    timestamp: new Date().toISOString(),
                    camera_id: cameraId,
                    objects: ['person', 'car', 'truck', 'bicycle', 'bus'].sort(() => Math.random() - 0.5).slice(0, 2)
                },
                ...prev.slice(0, 29) // Keep last 10 logs
            ])
        }

        const intervals = [
            setInterval(() => simulateLogUpdate(setLogs1, rtspStream1), 3000),
            setInterval(() => simulateLogUpdate(setLogs2, rtspStream2), 3000),
            setInterval(() => simulateLogUpdate(setLogs3, rtspStream3), 3000)
        ]

        return () => intervals.forEach(clearInterval)
    }, [rtspStream1, rtspStream2, rtspStream3])

    // 연결 상태 확인 기능
    const [connectionStatus, setConnectionStatus] = useState({
        camera1: false,
        camera2: false,
        camera3: false,
    });

    useEffect(() => {
        const checkConnection = () => {
            setConnectionStatus({
                camera1: Math.random() > 0.1,
                camera2: Math.random() > 0.1,
                camera3: Math.random() > 0.2,
            });
        };

        checkConnection();
        const interval = setInterval(checkConnection, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-navy-900 text-white flex">
            {/* Left Menu Bar */}
            <div className="w-20 bg-navy-800 flex flex-col items-center py-6 space-y-8">
                <img src={busLogo} alt="Logo" className="w-12 h-12" />
                <nav className="flex flex-col space-y-6">
                    <button className="p-3 bg-blue-900 rounded-lg transition-colors">
                        <img src={screenIcon} alt="Monitor" className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => navigate('/database')}
                        className="p-3 hover:bg-blue-900 rounded-lg transition-colors"
                    >
                        <img src={databaseIcon} alt="Database" className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => navigate('/home')}
                        className="p-3 hover:bg-blue-900 rounded-lg transition-colors"
                    >
                        <img src={homeIcon} alt="Home" className="w-6 h-6" />
                    </button>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6">
                <div className="grid grid-cols-3 gap-6">
                    {/* Left Column - Camera 1 */}
                    <div className="space-y-4">
                        <div className="bg-navy-800 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <h3>웹캠 1: {rtspStream1}</h3>
                                <span
                                    className={`px-2 py-1 rounded text-xs ${
                                        connectionStatus.camera1 ? 'bg-green-600' : 'bg-red-600'
                                    }`}
                                >
                  {connectionStatus.camera1 ? '연결됨' : '연결 안됨'}
                </span>
                            </div>
                            <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                {connectionStatus.camera1 ? (
                                    <ReactPlayer
                                        url={rtspStream1}
                                        playing
                                        width="100%"
                                        height="100%"
                                        controls
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <p className="text-red-500">연결 시도 중...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-navy-800 p-4 rounded-lg h-64 overflow-y-auto">
                            <h3 className="mb-2">감지 로그</h3>
                            {logs1.map((log, index) => (
                                <div key={index} className="text-sm mb-2">
                                    <span className="text-gray-400">{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                                    <span className="ml-2">{log.objects.join(', ')}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Middle Column - Camera 2 */}
                    <div className="space-y-4">
                        <div className="bg-navy-800 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <h3>웹캠 2: {rtspStream2}</h3>
                                <span
                                    className={`px-2 py-1 rounded text-xs ${
                                        connectionStatus.camera2 ? 'bg-green-600' : 'bg-red-600'
                                    }`}
                                >
                  {connectionStatus.camera2 ? '연결됨' : '연결 안됨'}
                </span>
                            </div>
                            <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                {connectionStatus.camera2 ? (
                                    <ReactPlayer
                                        url={rtspStream2}
                                        playing
                                        width="100%"
                                        height="100%"
                                        controls
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <p className="text-red-500">연결 시도 중...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-navy-800 p-4 rounded-lg h-64 overflow-y-auto">
                            <h3 className="mb-2">감지 로그</h3>
                            {logs2.map((log, index) => (
                                <div key={index} className="text-sm mb-2">
                                    <span className="text-gray-400">{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                                    <span className="ml-2">{log.objects.join(', ')}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column - Weather and Camera 3 */}
                    <div className="space-y-4">
                        <div className="bg-navy-800 p-4 rounded-lg">
                            <h3 className="mb-2 text-center">실시간 날씨</h3>
                            {weather && (
                                <div className="text-center">
                                    <img
                                        src={`http://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                                        alt={weather.description}
                                        className="mx-auto w-16 h-16 mb-2"
                                    />
                                    <div className="text-4xl font-bold mb-2">{weather.temperature}°C</div>
                                    <div className="text-gray-400 capitalize">{weather.description}</div>
                                    <div className="text-sm text-gray-400 mt-2">
                                        {format(new Date(weather.timestamp), 'HH:mm 업데이트')}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="bg-navy-800 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <h3>카메라 3: {rtspStream3}</h3>
                                <span
                                    className={`px-2 py-1 rounded text-xs ${
                                        connectionStatus.camera3 ? 'bg-green-600' : 'bg-red-600'
                                    }`}
                                >
                  {connectionStatus.camera3 ? '연결됨' : '연결 안됨'}
                </span>
                            </div>
                            <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                {connectionStatus.camera3 ? (
                                    <ReactPlayer
                                        url={rtspStream3}
                                        playing
                                        width="100%"
                                        height="100%"
                                        controls
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <p className="text-red-500">연결 시도 중...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-navy-800 p-4 rounded-lg h-64 overflow-y-auto">
                            <h3 className="mb-2">감지 로그</h3>
                            {logs3.map((log, index) => (
                                <div key={index} className="text-sm mb-2">
                                    <span className="text-gray-400">{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                                    <span className="ml-2">{log.objects.join(', ')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;