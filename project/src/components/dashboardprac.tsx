// import { useState, useEffect } from 'react'
// import ReactPlayer from 'react-player'
// import axios from 'axios'
// import { format } from 'date-fns'
// import busLogo from '../assets/iumsae_logo.png'
// import screenIcon from '../assets/screen.svg'
// import databaseIcon from '../assets/database.svg'
// import homeIcon from '../assets/home.svg'
// import { useNavigate } from 'react-router-dom'
//
// interface DetectionLog {
//     timestamp: string
//     camera_id: string
//     objects: string[]
// }
//
// interface WeatherData {
//     temperature: number
//     description: string
//     timestamp: string
// }
//
// function Dashboard() {
//     const navigate = useNavigate()
//     const [logs1, setLogs1] = useState<DetectionLog[]>([])
//     const [logs2, setLogs2] = useState<DetectionLog[]>([])
//     const [logs3, setLogs3] = useState<DetectionLog[]>([])
//     const [weather, setWeather] = useState<WeatherData | null>(null)
//
//     useEffect(() => {
//         // Fetch weather data
//         const fetchWeather = async () => {
//             try {
//                 const response = await axios.get('YOUR_WEATHER_API_ENDPOINT')
//                 setWeather({
//                     temperature: response.data.temperature,
//                     description: response.data.description,
//                     timestamp: new Date().toISOString()
//                 })
//             } catch (error) {
//                 console.error('Error fetching weather:', error)
//             }
//         }
//
//         fetchWeather()
//         const weatherInterval = setInterval(fetchWeather, 300000) // Update every 5 minutes
//
//         return () => clearInterval(weatherInterval)
//     }, [])
//
//     // Simulated log updates - replace with your actual WebSocket or API calls
//     useEffect(() => {
//         const simulateLogUpdate = (setLogs: React.Dispatch<React.SetStateAction<DetectionLog[]>>, cameraId: string) => {
//             setLogs(prev => [
//                 {
//                     timestamp: new Date().toISOString(),
//                     camera_id: cameraId,
//                     objects: ['person', 'car', 'truck'].sort(() => Math.random() - 0.5).slice(0, 2)
//                 },
//                 ...prev.slice(0, 9) // Keep last 10 logs
//             ])
//         }
//
//         const intervals = [
//             setInterval(() => simulateLogUpdate(setLogs1, 'rtsp://192.168.0.30:8554/stream'), 3000),
//             setInterval(() => simulateLogUpdate(setLogs2, '127.128.56.06'), 3000),
//             setInterval(() => simulateLogUpdate(setLogs3, '127.128.56.07'), 3000)
//         ]
//
//         return () => intervals.forEach(clearInterval)
//     }, [])
//
//     return (
//         <div className="min-h-screen bg-navy-900 text-white flex">
//             {/* Left Menu Bar */}
//             <div className="w-20 bg-navy-800 flex flex-col items-center py-6 space-y-8">
//                 <img src={busLogo} alt="Logo" className="w-12 h-12" />
//                 <nav className="flex flex-col space-y-6">
//                     <button className="p-3 bg-blue-900 rounded-lg transition-colors">
//                         <img src={screenIcon} alt="Monitor" className="w-6 h-6" />
//                     </button>
//                     <button
//                         onClick={() => navigate('/database')}
//                         className="p-3 hover:bg-blue-900 rounded-lg transition-colors"
//                     >
//                         <img src={databaseIcon} alt="Database" className="w-6 h-6" />
//                     </button>
//                     <button
//                         onClick={() => navigate('/home')}
//                         className="p-3 hover:bg-blue-900 rounded-lg transition-colors"
//                     >
//                         <img src={homeIcon} alt="Home" className="w-6 h-6" />
//                     </button>
//                 </nav>
//             </div>
//
//             {/* Main Content */}
//             <div className="flex-1 p-6">
//                 <div className="grid grid-cols-3 gap-6">
//                     {/* Left Column - Camera 1 */}
//                     <div className="space-y-4">
//                         <div className="bg-navy-800 p-4 rounded-lg">
//                             <h3 className="mb-2">CAMERA ID: 127.128.56.05</h3>
//                             <div className="aspect-video bg-black rounded-lg overflow-hidden">
//                                 <ReactPlayer
//                                     url="rtsp://127.128.56.05/stream"
//                                     playing
//                                     width="100%"
//                                     height="100%"
//                                     controls
//                                 />
//                             </div>
//                         </div>
//                         <div className="bg-navy-800 p-4 rounded-lg h-64 overflow-y-auto">
//                             <h3 className="mb-2">Detection Log</h3>
//                             {logs1.map((log, index) => (
//                                 <div key={index} className="text-sm mb-2">
//                                     <span className="text-gray-400">{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
//                                     <span className="ml-2">{log.objects.join(', ')}</span>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//
//                     {/* Middle Column - Camera 2 */}
//                     <div className="space-y-4">
//                         <div className="bg-navy-800 p-4 rounded-lg">
//                             <h3 className="mb-2">CAMERA ID: 127.128.56.06</h3>
//                             <div className="aspect-video bg-black rounded-lg overflow-hidden">
//                                 <ReactPlayer
//                                     url="rtsp://127.128.56.06/stream"
//                                     playing
//                                     width="100%"
//                                     height="100%"
//                                     controls
//                                 />
//                             </div>
//                         </div>
//                         <div className="bg-navy-800 p-4 rounded-lg h-64 overflow-y-auto">
//                             <h3 className="mb-2">Detection Log</h3>
//                             {logs2.map((log, index) => (
//                                 <div key={index} className="text-sm mb-2">
//                                     <span className="text-gray-400">{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
//                                     <span className="ml-2">{log.objects.join(', ')}</span>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//
//                     {/* Right Column - Weather and Camera 3 */}
//                     <div className="space-y-4">
//                         <div className="bg-navy-800 p-4 rounded-lg">
//                             <h3 className="mb-2">실시간 날씨</h3>
//                             {weather && (
//                                 <div className="text-center">
//                                     <div className="text-4xl font-bold mb-2">{weather.temperature}°C</div>
//                                     <div className="text-gray-400">{weather.description}</div>
//                                     <div className="text-sm text-gray-400 mt-2">
//                                         {format(new Date(weather.timestamp), 'HH:mm 업데이트')}
//                                     </div>
//                                 </div>
//                             )}
//                         </div>
//                         <div className="bg-navy-800 p-4 rounded-lg">
//                             <h3 className="mb-2">CAMERA ID: 127.128.56.07</h3>
//                             <div className="aspect-video bg-black rounded-lg overflow-hidden">
//                                 <ReactPlayer
//                                     url="rtsp://127.128.56.07/stream"
//                                     playing
//                                     width="100%"
//                                     height="100%"
//                                     controls
//                                 />
//                             </div>
//                         </div>
//                         <div className="bg-navy-800 p-4 rounded-lg h-64 overflow-y-auto">
//                             <h3 className="mb-2">Detection Log</h3>
//                             {logs3.map((log, index) => (
//                                 <div key={index} className="text-sm mb-2">
//                                     <span className="text-gray-400">{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
//                                     <span className="ml-2">{log.objects.join(', ')}</span>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     )
// }
//
// export default Dashboard