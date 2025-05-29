import { useState, useEffect } from 'react'
import ReactPlayer from 'react-player'
import axios from 'axios'
import { format } from 'date-fns'
import screenIcon from '../assets/screen.svg'
import databaseIcon from '../assets/database.svg'
import homeIcon from '../assets/home.svg'
import { useNavigate } from 'react-router-dom'
import weatherDescKo from '../weatherDescKo.ts';
import logo from "../assets/ieumsae_logo.png";
import logoutIcon from "../assets/logout.svg";

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
    id: number; // Add id field for weather condition code
    location: string; // Add location field for city name
}

function Dashboard({ onLogout }: { onLogout: () => void }) {

    const navigate = useNavigate()

    const [logs1, setLogs1] = useState<DetectionLog[]>([])
    const [logs2, setLogs2] = useState<DetectionLog[]>([])
    const [logs3, setLogs3] = useState<DetectionLog[]>([])
    const [weather, setWeather] = useState<WeatherData | null>(null)
    const [weatherError, setWeatherError] = useState<string | null>(null)

    const handleLogout = () => {
        sessionStorage.removeItem('token')
        onLogout()
        navigate('/')
    }

    // Jetson Orin Nano의 IP 주소 설정
    const jetsonIP = "192.168.25.141" // Jetson의 실제 IP 주소로 변경하세요, 아래도!

    // RTSP 스트림 URL
    const rtspStream1 = `rtsp://${jetsonIP}:8554/webcam2`
    const rtspStream2 = `rtsp://${jetsonIP}:8554/webcam2`
    // 세 번째 카메라는 기존 설정 유지
    const rtspStream3 = "rtsp://127.128.56.07/stream"

    // Map weather condition ID to Korean description
    const getKoreanWeatherDesc = (id: number): string => {
        const weather = weatherDescKo.find((item) => item[id]);
        return weather ? weather[id] : '서울'; // Fallback if ID not found
    };

    useEffect(() => {
        const fetchWeather = async (lat?: number, lon?: number) => {
            const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
            if (!API_KEY) {
                setWeatherError('OpenWeatherMap API key is missing. Please set REACT_APP_OPENWEATHER_API_KEY in .env file.');
                return;
            }

            try {
                // Use lat/lon if provided, otherwise fall back to Seoul
                const url = lat && lon
                    ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
                    : `https://api.openweathermap.org/data/2.5/weather?q=Seoul&appid=${API_KEY}&units=metric`;

                const response = await axios.get(url);
                const weatherId = response.data.weather[0].id;
                setWeather({
                    temperature: Math.round(response.data.main.temp),
                    description: getKoreanWeatherDesc(weatherId), // Use Korean description
                    timestamp: new Date().toISOString(),
                    icon: response.data.weather[0].icon,
                    id: weatherId,
                    location: response.data.name || '서울', // Use city name or fallback
                });
            } catch (error) {
                console.error('Error fetching weather:', error);
                setWeather({
                    temperature: 22,
                    description: '맑음',
                    timestamp: new Date().toISOString(),
                    icon: '01d',
                    id: 800,
                    location: '서울', // Fallback location
                });
            }
        };

        // Get user's location
        const getUserLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        fetchWeather(latitude, longitude);
                    },
                    (error) => {
                        console.error('Error getting location:', error);
                        // Fallback to Seoul if geolocation fails
                        fetchWeather();
                    }
                );
            } else {
                console.error('Geolocation is not supported by this browser.');
                // Fallback to Seoul if geolocation is unsupported
                fetchWeather();
            }
        };

        getUserLocation();
        const weatherInterval = setInterval(getUserLocation, 300000); // Update every 5 minutes

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
                ...prev.slice(0, 29)
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
        <div className="min-h-screen bg-white text-black flex">
            {/* Left Menu Bar */}
            <div className="w-24 h-screen bg-white border-r-2 border-gray-100 fixed top-0 left-0 flex flex-col items-center py-6 justify-between z-50">
                <div>
                    <img src={logo} alt="logo" className="w-10 h-10" />
                </div>
                <nav className="flex flex-col items-center space-y-8">
                    <button className="p-3 hover:bg-[rgba(112,174,248,0.3)] rounded-lg transition-colors">
                        <img src={screenIcon} alt="Monitor" className="w-8 h-8" />
                    </button>
                    <button className="p-3 hover:bg-[rgba(112,174,248,0.3)] rounded-lg transition-colors">
                        <img src={databaseIcon} alt="Database" className="w-8 h-8" />
                    </button>
                </nav>
                <div>
                    <nav className="flex flex-col items-center space-y-8">
                        <button className="p-3 hover:bg-[rgba(112,174,248,0.3)] rounded-lg transition-colors">
                            <img src={homeIcon} alt="Home" className="w-8 h-8" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-3 hover:bg-[rgba(112,174,248,0.3)] rounded-lg transition-colors">
                            <img src={logoutIcon} alt="Logout" className="w-8 h-8" />
                        </button>
                    </nav>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-screen pl-24 pr-[400px] py-6">
                <header className="mb-6">
                    <h3 className="text-3xl font-bold ml-12">관리자 모드</h3>
                </header>

                <div className="grid grid-cols-2 pr-[50px] gap-6 ml-12">
                    {/* 카메라 1 */}
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <h3>CAMERA ID: 127.128.56.05</h3>
                                <span className={`px-2 py-1 rounded text-xs ${connectionStatus.camera1 ? 'bg-green-600' : 'bg-red-600'}`}>
                {connectionStatus.camera1 ? '연결됨' : '연결 안됨'}
              </span>
                            </div>
                            <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                {connectionStatus.camera1 ? (
                                    <ReactPlayer url={rtspStream1} playing width="100%" height="100%" controls />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <p className="text-red-500">연결 시도 중...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="border border-gray-500 w-[619px] h-96 ml-4 overflow-y-auto rounded-lg bg-white text-black">
                            {/* 상단 헤더: 감지 로그 + CAMERA ID */}
                            <header className="sticky top-0 z-10 flex justify-between items-center px-4 py-2 bg-[#003366]">
                                <h3 className="font-semibold text-white">감지 로그</h3>
                                <span className="text-sm text-white">CAMERA ID: 127.128.56.05</span>
                            </header>

                            {/* 로그 리스트 영역 */}
                            <div className="p-4 text-sm text-black">
                                {logs1.map((log, index) => (
                                    <div key={index} className="mb-2 text-black">
                                        <span className="text-black">{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                                        <span className="ml-2 text-black">{log.objects.join(', ')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 카메라 2 */}
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <h3>CAMERA ID: 127.128.56.06</h3>
                                <span className={`px-2 py-1 rounded text-xs ${connectionStatus.camera2 ? 'bg-green-600' : 'bg-red-600'}`}>
                {connectionStatus.camera2 ? '연결됨' : '연결 안됨'}
              </span>
                            </div>
                            <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                {connectionStatus.camera2 ? (
                                    <ReactPlayer url={rtspStream2} playing width="100%" height="100%" controls />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <p className="text-red-500">연결 시도 중...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="border border-gray-500 w-[619px] h-96 ml-4 overflow-y-auto rounded-lg bg-white text-black">
                            {/* 상단 헤더: 감지 로그 + CAMERA ID */}
                            <header className="sticky top-0 z-10 flex justify-between items-center px-4 py-2 bg-[#003366]">
                                <h3 className="font-semibold text-white">감지 로그</h3>
                                <span className="text-sm text-white">CAMERA ID: 127.128.56.06</span>
                            </header>

                            {/* 로그 리스트 영역 */}
                            <div className="p-4 text-sm text-black">
                                {logs2.map((log, index) => (
                                    <div key={index} className="mb-2 text-black">
                                        <span className="text-black">{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                                        <span className="ml-2 text-black">{log.objects.join(', ')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Sidebar - Weather & Camera 3 */}
            <div className="w-[400px] h-screen bg-white border-l-2 border-gray-100 fixed top-0 right-0 flex flex-col items-center py-6 justify-between px-4 overflow-y-auto">
                <div className="w-full space-y-4">
                    <div className="border border-b-gray-500 p-4 rounded-lg text-center">
                        <h3 className="mb-2">실시간 {weather?.location || '서울'}의 날씨</h3>
                        {weatherError ? (
                            <p className="text-red-500">{weatherError}</p>
                        ) : weather ? (
                            <div>
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
                        ) : (
                            <p className="text-gray-400">날씨 데이터를 로드 중...</p>
                        )}
                    </div>

                    <div className="border border-b-gray-500 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <h3>CAMERA ID: 127.128.56.07</h3>
                            <span className={`px-2 py-1 rounded text-xs ${connectionStatus.camera3 ? 'bg-green-600' : 'bg-red-600'}`}>
              {connectionStatus.camera3 ? '연결됨' : '연결 안됨'}
            </span>
                        </div>
                        <div className="aspect-video bg-black rounded-lg overflow-hidden">
                            {connectionStatus.camera3 ? (
                                <ReactPlayer url={rtspStream3} playing width="100%" height="100%" controls />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <p className="text-red-500">연결 시도 중...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border border-b-gray-500 p-4 rounded-lg h-64 overflow-y-auto">
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
    );
}

export default Dashboard