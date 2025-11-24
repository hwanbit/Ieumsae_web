// src/components/Dashboard.tsx

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import screenIcon from '../assets/screen.svg';
import databaseIcon from '../assets/database.svg';
import homeIcon from '../assets/home.svg';
import { useNavigate } from 'react-router-dom';
import weatherDescKo from '../weatherDescKo.ts';
import logo from "../assets/ieumsae_logo.png";
import logoutIcon from "../assets/logout.svg";
import ieumsaeVideo from "../assets/ieumsae_video.mp4"
import Hls from 'hls.js';
import * as ort from 'onnxruntime-web';

const BACKEND =
    (import.meta as any).env?.VITE_BACKEND_BASE ||
    (import.meta as any).env?.VITE_BACKEND_URL ||
    window.location.origin;

axios.defaults.baseURL = BACKEND;
axios.defaults.timeout = 1_200_000; // 20분
// 스트림/엔드포인트 상수
const CAM1_MJPEG = `${BACKEND}/udp_stream.mjpg`;
const SHOW_CCTV = false;
const CCTV_HLS = (import.meta as any).env?.VITE_CCTV_HLS || `${BACKEND}/hls/cctv.m3u8`;

interface DetectionLog {
    timestamp: string;
    cam_id: string;
    detection_class: string;
    object_id: string;
    confidence: number;
    signal_status: boolean;
    event_flag: boolean;
    bbox_x?: number;
    bbox_y?: number;
    bbox_w?: number;
    bbox_h?: number;
    norm?: boolean; // true면 0~1 정규화 좌표로 해석
}

interface WeatherData {
    temperature: number;
    description: string;
    timestamp: string;
    icon: string;
    id: number;
    location: string;
}

type Point = [number, number]; // [x, y]
type ROI = { norm?: boolean; points: Point[] };

function CanvasOverlay({
                           videoOrImgRef,
                           logs,
                           roi,
                           stroke = 2,
                           color = 'rgba(255,0,0,0.9)',
                           roiColor = 'rgba(0,128,255,0.8)',
                       }: {
    videoOrImgRef: React.RefObject<HTMLVideoElement | HTMLImageElement>;
    logs: DetectionLog[];
    roi: ROI | null;
    stroke?: number;
    color?: string;
    roiColor?: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        let raf = 0;
        const el = videoOrImgRef.current;
        const canvas = canvasRef.current;
        if (!el || !canvas) return;

        const ctx = canvas.getContext('2d')!;
        const draw = () => {
            const cw = el.clientWidth || 1;
            const ch = el.clientHeight || 1;
            const vw = (el as HTMLVideoElement).videoWidth || (el as HTMLImageElement).naturalWidth || cw;
            const vh = (el as HTMLVideoElement).videoHeight || (el as HTMLImageElement).naturalHeight || ch;

            canvas.width = cw;
            canvas.height = ch;
            ctx.clearRect(0, 0, cw, ch);

            const scaleX = cw / (vw || 1);
            const scaleY = ch / (vh || 1);

            // ROI 폴리곤
            if (roi?.points?.length) {
                ctx.save();
                ctx.lineWidth = stroke;
                ctx.strokeStyle = roiColor;
                ctx.beginPath();
                roi.points.forEach(([x, y], i) => {
                    const px = roi.norm ? x * cw : x * scaleX;
                    const py = roi.norm ? y * ch : y * scaleY;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                });
                ctx.closePath();
                ctx.stroke();
                ctx.restore();
            }

            // 최근 5초 내 로그만 표시
            const cutoff = Date.now() - 5000;
            const recent = logs.filter(l => new Date(l.timestamp).getTime() >= cutoff);

            // 바운딩 박스
            ctx.save();
            ctx.lineWidth = stroke;
            ctx.strokeStyle = color;
            ctx.font = '12px sans-serif';
            ctx.fillStyle = color;
            recent.forEach(l => {
                if (l.bbox_w && l.bbox_h && l.bbox_x !== undefined && l.bbox_y !== undefined) {
                    const useNorm = l.norm === true;
                    const x = useNorm ? (l.bbox_x * cw) : (l.bbox_x * scaleX);
                    const y = useNorm ? (l.bbox_y * ch) : (l.bbox_y * scaleY);
                    const w = useNorm ? (l.bbox_w * cw) : (l.bbox_w * scaleX);
                    const h = useNorm ? (l.bbox_h * ch) : (l.bbox_h * scaleY);
                    ctx.strokeRect(x, y, w, h);
                    const label = `${l.detection_class} #${l.object_id} ${(l.confidence * 100) | 0}%`;
                    ctx.fillText(label, x + 4, Math.max(12, y - 4));
                }
            });
            ctx.restore();

            raf = requestAnimationFrame(draw);
        };

        const ready = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(draw);
        };

        el.addEventListener('loadedmetadata', ready);
        el.addEventListener('load', ready as any);
        window.addEventListener('resize', ready);
        ready();

        return () => {
            cancelAnimationFrame(raf);
            el.removeEventListener('loadedmetadata', ready);
            el.removeEventListener('load', ready as any);
            window.removeEventListener('resize', ready);
        };
    }, [videoOrImgRef, logs, roi, stroke, color, roiColor]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
        />
    );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
    const navigate = useNavigate();
    const [logs1, setLogs1] = useState<DetectionLog[]>([]);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [weatherError, setWeatherError] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [lastCam1LogTs, setLastCam1LogTs] = useState<number>(Date.now());
    const [cam1Key, setCam1Key] = useState<number>(Date.now()); // HLS 재연결 트리거
    const cam1ImgRef = useRef<HTMLImageElement | null>(null);
    const cctvVideoRef = useRef<HTMLVideoElement | null>(null);
    const cctvCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [roi1, setRoi1] = useState<ROI | null>(null);
    const camId1 = "CAM-01";

    const handleLogout = () => {
        sessionStorage.removeItem('token');
        onLogout();
        navigate('/');
    };

    const startedRef = useRef(false);

    // 10초마다 cam1 재마운트 → HLS 재연결 유도
    useEffect(() => {
        const id = setInterval(() => setCam1Key(Date.now()), 10_000);
        return () => clearInterval(id);
    }, []);

    // ROI 불러오기(옵셔널 API, 없으면 무시)
    useEffect(() => {
        (async () => {
            try {
                const r = await axios.get(`/api/roi?cam_id=${camId1}`);
                setRoi1(r.data as ROI);
            } catch {
                setRoi1(null);
            }
        })();
    }, [camId1]);

    // 날씨 ID → 한글 설명
    const getKoreanWeatherDesc = (id: number): string => {
        const w = weatherDescKo.find((item) => item[id]);
        return w ? w[id] : '서울';
    };

//     // 좌표 → 주소 (Kakao)
//     const getKoreanAddress = async (lat: number, lon: number): Promise<string> => {
//         const KAKAO_API_KEY = `KakaoAK ${import.meta.env.VITE_KAKAO_REST_API_KEY}`;
//         try {
//             const response = await axios.get(
//                 `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lon}&y=${lat}`,
//                 { headers: { Authorization: KAKAO_API_KEY } }
//             );
//             const result = response.data.documents[0];
//             return `${result.region_1depth_name} ${result.region_2depth_name}`;
//         } catch (error) {
//             console.error('주소 변환 실패:', error);
//             return '서울';
//         }
//     };

    // 날씨 API
    useEffect(() => {
        const fetchWeather = async (lat: number, lon: number) => {
            const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
            if (!API_KEY) {
                setWeatherError('OpenWeatherMap API key가 없습니다. .env에 VITE_WEATHER_API_KEY를 설정하세요.');
                return;
            }
            try {
                const weatherResponse = await axios.get(
                    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
                );
                const weatherId = weatherResponse.data.weather[0].id;
                const description = getKoreanWeatherDesc(weatherId);
                const temperature = Math.round(weatherResponse.data.main.temp);
                const icon = weatherResponse.data.weather[0].icon;
                const timestamp = new Date().toISOString();
                const location = weatherResponse.data?.name || '현재위치';
//                 const location = await getKoreanAddress(lat, lon);

                setWeather({ temperature, description, icon, id: weatherId, location, timestamp });
            } catch (error) {
                console.error('날씨 정보 불러오기 실패:', error);
                setWeatherError('날씨 정보를 불러올 수 없습니다.');
            }
        };

        const getUserLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        fetchWeather(latitude, longitude);
                    },
                    (error) => {
                        console.error('위치 정보를 불러오지 못했습니다:', error);
                        setWeatherError('위치 권한을 허용해주세요.');
                    }
                );
            } else {
                setWeatherError('이 브라우저는 위치 정보를 지원하지 않습니다.');
            }
        };

        getUserLocation();
        const weatherInterval = setInterval(getUserLocation, 300000);
        return () => clearInterval(weatherInterval);
    }, []);

    // 로그 폴링 (+ 요청 취소)
    useEffect(() => {
        if (startedRef.current) return;   // 🔒 중복 생성 방지
        startedRef.current = true;

        let ctrl1: AbortController | null = null;

        const fetchCameraLogs = async (
            cameraId: string,
            setLogs: React.Dispatch<React.SetStateAction<DetectionLog[]>>,
            slot: 1
        ) => {
            if (slot === 1 && ctrl1) ctrl1.abort();

            const ctrl = new AbortController();
            if (slot === 1) ctrl1 = ctrl;

            try {
                const res = await axios.get(
                    `/api/logs/latest?cam_id=${cameraId}&limit=30`,
                    { signal: ctrl.signal as any}
                );
                const arr = res.data as DetectionLog[];
                setLogs(arr);
                if (cameraId === camId1 && arr.length) {
                    const t = new Date(arr[arr.length - 1].timestamp).getTime();
                    setLastCam1LogTs(t);
                }
            } catch (e: any) {
                if (e?.name === 'CanceledError' || axios.isCancel?.(e)) {
                    // 정상 취소
                } else {
                    console.warn('카메라 ${cameraId} 로그 일시 실패(유지):', e?.message || e);
                }
            }
        };

        // 초기 호출 + 인터벌
        fetchCameraLogs(camId1, setLogs1, 1);
        const iv1 = setInterval(() => fetchCameraLogs(camId1, setLogs1, 1), 8000);

        // 페이지 숨김/표시 시 폴링 일시정지 (리소스 보호)
        const onVis = () => {
            const hidden = document.hidden;
            if (hidden) {
                if (ctrl1) ctrl1.abort();
            }
        };
        document.addEventListener('visibilitychange', onVis);

        return () => {
            clearInterval(iv1);
            if (ctrl1) ctrl1.abort();
            document.removeEventListener('visibilitychange', onVis);
            startedRef.current = false;     // 언마운트 시 가드 해제
        };
    }, []);

    useEffect(() => {
        return () => {
            if (cam1ImgRef.current) {
                cam1ImgRef.current.removeAttribute('src');
                cam1ImgRef.current.src = 'about:blank';
            }
        };
    }, []);

    // CCTV HLS attach + YOLO 모델/라벨 로딩
    useEffect(() => {
        if (!SHOW_CCTV) return;
        const video = cctvVideoRef.current;
        if (!video) return;

        let hls: Hls | null = null;
        if (Hls.isSupported()) {
            hls = new Hls({ enableWorker: true, lowLatencyMode: true });
            hls.loadSource(CCTV_HLS);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(()=>{}); });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = CCTV_HLS; video.play().catch(()=>{});
        }

        return () => { if (hls) hls.destroy(); };
    }, [SHOW_CCTV]);

    useEffect(() => {
        if (!SHOW_CCTV) return;

        const video = cctvVideoRef.current;
        const canvas = cctvCanvasRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let raf = 0;
        const loop = async () => {
            if (video.readyState < 2) { raf = requestAnimationFrame(loop); return; }

            // 렌더 크기 동기화
            const vw = video.videoWidth || 640; const vh = video.videoHeight || 480;
            const rect = video.getBoundingClientRect();
            canvas.width = rect.width || vw;
            canvas.height = rect.height || vh;

            ctx.clearRect(0,0,canvas.width,canvas.height);

            raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [SHOW_CCTV]);



    // 연결 상태
    const [connectionStatus, setConnectionStatus] = useState({
        camera1: true,
        camera3: true,
    });
    useEffect(() => {
        const interval = setInterval(() => {
            setConnectionStatus(prev => ({ ...prev }));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // cam1 로그가 15초 이상 멈추면 재연결
    useEffect(() => {
        const stallTimer = setInterval(() => {
            if (Date.now() - lastCam1LogTs > 15_000) {
                console.warn("Camera1 stall detected → forcing reconnect");
                setCam1Key(Date.now());
            }
        }, 5000);
        return () => clearInterval(stallTimer);
    }, [lastCam1LogTs]);

    return (
        <div className="min-h-screen bg-white text-black flex flex-col lg:flex">
            {/* 모바일 메뉴 버튼 */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-gray-300 rounded-lg shadow-lg"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* 모바일 헤더 */}
            <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-5 flex items-center justify-center">
                <h1 className="text-lg font-bold ml-3">관리자 모드</h1>
            </div>

            {/* 사이드 메뉴 */}
            <div className={`
        w-24 h-screen bg-white border-r-2 border-gray-200 fixed top-0 left-0 flex flex-col items-center py-6 justify-between z-40
        lg:translate-x-0 transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
                <div>
                    <img src={logo} alt="logo" className="w-10 h-10" />
                </div>
                <nav className="flex flex-col items-center space-y-8">
                    <button onClick={() => navigate('/dashboard')}
                            className="p-3 hover:bg-[rgba(112,174,248,0.3)] rounded-lg transition-colors">
                        <img src={screenIcon} alt="Monitor" className="w-8 h-8" />
                    </button>
                    <button onClick={() => navigate('/database')}
                            className="p-3 hover:bg-[rgba(112,174,248,0.3)] rounded-lg transition-colors">
                        <img src={databaseIcon} alt="Database" className="w-8 h-8" />
                    </button>
                </nav>
                <div>
                    <nav className="flex flex-col items-center space-y-8">
                        <button onClick={() => navigate('/home')}
                                className="p-3 hover:bg-[rgba(112,174,248,0.3)] rounded-lg transition-colors">
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

            {/* 모바일 오버레이 */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <div className="flex-1 min-h-screen lg:pl-24 xl:pr-[400px] py-6 px-4 lg:px-0 lg:pt-6">
                <header className="mb-2 hidden lg:block">
                    <h3 className="text-2xl lg:text-3xl font-bold lg:ml-12 mt-12 lg:mt-0">관리자 모드</h3>
                    <div className="text-sm text-gray-600 lg:ml-12 mt-2 lg:mt-2">
                        실시간 교차로 객체 감지 영상을 확인할 수 있습니다.
                    </div>
                </header>

                {/* 카메라 1 */}
                <div>
                    <div className="p-4 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                            <h3 className="text-sm lg:text-base font-semibold">CAMERA</h3>
                            <span className={`px-2 py-1 rounded text-xs w-fit ${connectionStatus.camera1 ? 'bg-green-600' : 'bg-red-600'}`}>
                                {connectionStatus.camera1 ? '연결됨' : '연결 안됨'}
                            </span>
                        </div>

                        {/* 고정 높이 컨테이너: 확대/축소 시 화면 전체를 먹지 않도록 */}
                        <div className="relative w-full max-w-full bg-black rounded-lg overflow-hidden h-[360px] sm:h-[400px] lg:h-[500px]">
                            {connectionStatus.camera1 ? (
                                <>
                                    <img
                                        src={`${CAM1_MJPEG}?ts=${cam1Key}`}
                                        ref={cam1ImgRef}
                                        alt="Camera 1"
                                        className="absolute inset-0 w-full h-full object-contain bg-black"
                                        loading="eager"
                                        onError={(e) => {
                                            const el = e.currentTarget as HTMLImageElement;
                                            // 네트워크 에러시 재시도
                                            setTimeout(() => {
                                                el.src = `${CAM1_MJPEG}?ts=${Date.now()}`;
                                            }, 2000);
                                        }}
                                    />
                                    <CanvasOverlay videoOrImgRef={cam1ImgRef} logs={logs1} roi={roi1} />
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <p className="text-red-500">연결 시도 중...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* cam1 감지 로그 */}
                    <div className="p-4">
                        <div className="border border-gray-500 h-52 lg:h-56 overflow-y-auto rounded-lg bg-white text-black">
                            <header className="sticky top-0 z-10 flex justify-between items-center px-4 py-2 bg-[#003366]">
                                <h3 className="font-semibold text-white text-sm lg:text-base">객체 감지 로그</h3>
                            </header>
                            <div className="p-4 text-xs lg:text-sm text-black">
                                {logs1.map((log, index) => (
                                    <div key={index} className="mb-2 text-black">
                                        <span className="text-black">{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                                        <span className="ml-2 text-black">{log.detection_class} (ID: {log.object_id})</span>
                                        {log.event_flag && <span className="ml-2 text-red-500 font-bold">🚨 이벤트 발생!</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Sidebar - Weather & CCTV (데스크톱) */}
            <div className="hidden xl:block w-[400px] h-screen bg-white border-l-2 border-gray-200 fixed top-0 right-0 py-6 px-4">
                <div className="w-full mt-3">
                    <div className="border border-b-gray-500 p-4 rounded-lg h-[215px] text-center">
                        <h3 className="mb-2 text-sm">실시간 {weather?.location || '서울'}의 날씨</h3>
                        {weatherError ? (
                            <p className="text-red-500">{weatherError}</p>
                        ) : weather ? (
                            <div>
                                <img
                                    src={`http://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                                    alt={weather.description}
                                    className="mx-auto w-16 h-16 mb-2"
                                />
                                <div className="text-2xl font-bold mb-2">{weather.temperature}°C</div>
                                <div className="text-black text-sm capitalize">{weather.description}</div>
                                <div className="text-xs text-gray-700 mt-2">
                                    {format(new Date(weather.timestamp), 'HH:mm 업데이트')}
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-400">날씨 데이터를 로드 중...</p>
                        )}
                    </div>

                    {/* 이음새 영상 */}
                    <div className="w-96 pl-0 pr-4 rounded-lg mb-4 overflow-y-auto ml-auto">
                        <div className="flex justify-between items-center mb-2 mt-10">
                            <h3 className="text-sm font-semibold">Ieumsae Project</h3>
                        </div>

                        <div
                            className="relative w-full max-w-full bg-black rounded-lg overflow-hidden h-[300px] sm:h-[260px] lg:h-[230px] mt-2">
                            {connectionStatus.camera3 ? (
                                <>
                                    {SHOW_CCTV ? (
                                        <>
                                            <video
                                                ref={cctvVideoRef}
                                                className="absolute inset-0 w-full h-full object-contain bg-black"
                                                autoPlay
                                                muted
                                                playsInline
                                            />
                                        </>
                                    ) : (
                                        <video
                                            src={ieumsaeVideo}
                                            className="absolute inset-0 w-full h-full object-contain bg-black"
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                        />
                                    )}
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <p className="text-red-500">연결 시도 중...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;