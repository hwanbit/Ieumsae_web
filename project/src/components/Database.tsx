import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import logo from "../assets/ieumsae_logo.png";
import screenIcon from '../assets/screen.svg';
import databaseIcon from '../assets/database.svg';
import homeIcon from '../assets/home.svg';
import logoutIcon from "../assets/logout.svg";
import llm0lottie from '../assets/llm_normal.json';
import llm1lottie from '../assets/llm_oper.json';
import Lottie from "react-lottie-player";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface Detection {
    id: string;
    confidence: number;
    date: string;
    detection_class: string;
    event_flag: boolean;
    object_id: string;
    signal_status: boolean;
    time: string;
    timestamp: string;
    selected?: boolean;
}

interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        backgroundColor: string[];
    }[];
}

const columnHelper = createColumnHelper<Detection>();

const columns = [
    columnHelper.display({
        id: 'select',
        header: '',
        cell: ({ row }) => (
            <input
                type="checkbox"
                checked={row.original.selected || false}
                onChange={(e) => {
                    // 체크박스 상태 업데이트 로직
                }}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
            />
        ),
    }),
    columnHelper.accessor('object_id', {
        header: '카메라',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('detection_class', {
        header: '객체',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('id', {
        header: '객체 ID',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('confidence', {
        header: '정확도',
        cell: info => `${(info.getValue() * 100).toFixed(0)}%`,
    }),
    columnHelper.accessor('event_flag', {
        header: '이벤트 발생',
        cell: info => (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                info.getValue()
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
            }`}>
                {info.getValue() ? '발생' : '정상'}
            </span>
        ),
    }),
    columnHelper.accessor('signal_status', {
        header: '신호 상태',
        cell: info => (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                info.getValue()
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
            }`}>
                {info.getValue() ? '활성' : '비활성'}
            </span>
        ),
    }),
    columnHelper.accessor('time', {
        header: '시간',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('date', {
        header: '날짜',
        cell: info => info.getValue(),
    }),
];

// 목업 데이터 생성 함수
const generateMockData = (query: string): { data: Detection[], chartData?: any } => {
    // 2025-06-05 객체 비율 그래프 요청 감지
    if (query.includes('2025-06-05') && query.includes('객체') && query.includes('비율')) {
        const mockDetections: Detection[] = [
            // 자동차 데이터 (70% = 14개)
            ...Array.from({ length: 14 }, (_, i) => ({
                id: `car_obj_${i + 1}`,
                confidence: 0.85 + Math.random() * 0.1,
                date: '2025-06-05',
                detection_class: '자동차',
                event_flag: Math.random() > 0.8,
                object_id: `NANO-00${Math.floor(Math.random() * 9) + 1}`,
                signal_status: Math.random() > 0.1,
                time: `18:0${Math.floor(Math.random() * 6)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
                timestamp: `2025-06-05T18:0${Math.floor(Math.random() * 6)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
                selected: false
            })),
            // 사람 데이터 (20% = 4개)
            ...Array.from({ length: 4 }, (_, i) => ({
                id: `person_obj_${i + 1}`,
                confidence: 0.78 + Math.random() * 0.15,
                date: '2025-06-05',
                detection_class: '사람',
                event_flag: Math.random() > 0.7,
                object_id: `NANO-00${Math.floor(Math.random() * 9) + 1}`,
                signal_status: Math.random() > 0.1,
                time: `18:0${Math.floor(Math.random() * 6)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
                timestamp: `2025-06-05T18:0${Math.floor(Math.random() * 6)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
                selected: false
            })),
            // 자전거 데이터 (10% = 2개)
            ...Array.from({ length: 2 }, (_, i) => ({
                id: `bike_obj_${i + 1}`,
                confidence: 0.72 + Math.random() * 0.2,
                date: '2025-06-05',
                detection_class: '자전거',
                event_flag: Math.random() > 0.6,
                object_id: `NANO-00${Math.floor(Math.random() * 9) + 1}`,
                signal_status: Math.random() > 0.1,
                time: `18:0${Math.floor(Math.random() * 6)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
                timestamp: `2025-06-05T18:0${Math.floor(Math.random() * 6)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
                selected: false
            }))
        ];

        const chartData = [
            { name: '자동차', value: 70 },
            { name: '사람', value: 20 },
            { name: '자전거', value: 10 }
        ];

        return { data: mockDetections, chartData };
    }

    // 다른 테스트 케이스들도 추가 가능
    if (query.includes('시간대별') || query.includes('hourly')) {
        const mockDetections: Detection[] = Array.from({ length: 8 }, (_, i) => ({
            id: `detection_obj_${i + 1}`,
            confidence: 0.8 + Math.random() * 0.15,
            date: '2025-06-05',
            detection_class: ['자동차', '사람', '자전거'][Math.floor(Math.random() * 3)],
            event_flag: Math.random() > 0.7,
            object_id: `NANO-00${Math.floor(Math.random() * 9) + 1}`,
            signal_status: Math.random() > 0.1,
            time: `18:0${Math.floor(Math.random() * 6)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
            timestamp: `2025-06-05T18:0${Math.floor(Math.random() * 6)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
            selected: false
        }));

        const chartData = [
            { name: '09:00', value: 5 },
            { name: '10:00', value: 8 },
            { name: '11:00', value: 12 },
            { name: '12:00', value: 15 },
            { name: '13:00', value: 20 },
            { name: '14:00', value: 18 },
            { name: '15:00', value: 14 },
            { name: '16:00', value: 10 }
        ];

        return { data: mockDetections, chartData };
    }

    // 기본 빈 응답
    return { data: [] };
};

function Database({ onLogout }: { onLogout: () => void }) {
    const navigate = useNavigate();
    const [llmInput, setLlmInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Detection[]>([]);
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [lottieState, setLottieState] = useState<'normal' | 'operating'>('normal');

    const handleLogout = () => {
        sessionStorage.removeItem('token')
        onLogout()
        navigate('/')
    }

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const handleLLMSubmit = async () => {
        setLoading(true);
        setLottieState('operating');

        try {
            // LLM api 호출
            //     const response = await fetch('http://localhost:5000/api/query', {
            //         method: 'POST',
            //         headers: {
            //             'Content-Type': 'application/json',
            //         },
            //         body: JSON.stringify({ query: llmInput }),
            //     });
            //
            //     const result = await response.json();
            //     setData(result.data); // 테이블 데이터 업데이트

            // 실제 API 호출 대신 목업 데이터 사용
            await new Promise(resolve => setTimeout(resolve, 1500)); // 실제 API 호출 시뮬레이션

            const result = generateMockData(llmInput);
            setData(result.data);

            if (result.chartData) {
                // 차트 색상 배열
                const colors = [
                    '#FF6384', // 빨간색
                    '#36A2EB', // 파란색
                    '#FFCE56', // 노란색
                    '#4BC0C0', // 청록색
                    '#9966FF', // 보라색
                    '#FF9F40'  // 주황색
                ];

                setChartData({
                    labels: result.chartData.map((item: any) => item.name),
                    datasets: [{
                        label: '감지 비율 (%)',
                        data: result.chartData.map((item: any) => item.value),
                        backgroundColor: colors.slice(0, result.chartData.length),
                    }]
                });
            } else {
                setChartData(null);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
            setLottieState('normal');
        }
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: '2025-06-05 객체 감지 비율',
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                ticks: {
                    callback: function(value: any) {
                        return value + '%';
                    }
                }
            }
        }
    };

    return (
        <div className="min-h-screen bg-white text-black flex">
            {/* 사이드 메뉴 고정 */}
            <div className="w-24 h-screen bg-white border-r-2 border-gray-100 fixed top-0 left-0 flex flex-col items-center py-6 justify-between z-50">
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

            {/* Main Content */}
            <div className="flex-1 p-6 flex ml-24">
                {/* Table Section */}
                <div className="flex-1 bg-white text-black rounded-lg p-6 mr-4 shadow-sm">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">데이터베이스</h2>
                        <div className="flex items-center justify-between mt-4 ml-[800px]">
                            <div className="flex items-center space-x-4">
                                <input
                                    type="text"
                                    placeholder="검색"
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <select className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option>필터</option>
                                </select>
                                <button className="px-5 py-2 bg-[#002B51] text-white rounded-md text-sm hover:bg-[#00004F] transition-colors">
                                    검색
                                </button>
                            </div>
                            <button className="px-4 py-2 bg-[#002B51] text-white rounded-md text-sm hover:bg-[#00004F] transition-colors">
                                + 그래프 생성
                            </button>
                        </div>
                    </div>

                    {chartData && (
                        <div className="mb-8">
                            <Bar options={chartOptions} data={chartData} height={100} />
                        </div>
                    )}

                    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id} className="px-4 py-3 text-left text-xs font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                            </thead>
                            <tbody className="bg-white">
                            {table.getRowModel().rows.map((row, index) => (
                                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="px-4 py-3 text-xs text-gray-700 border-b border-gray-100 whitespace-nowrap">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                총 {data.length} 건의 데이터가 {data.length} 중 표시됨
                            </div>
                            <div className="flex items-center space-x-2">
                                <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors">
                                    이전
                                </button>
                                <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors">
                                    다음
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* LLM Input Section */}
                <div className="w-96 bg-white text-black border border-gray-300 rounded-lg p-4">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold mb-2">데이터 분석 도우미</h2>
                        <div className="flex h-24 items-center justify-center ml-28 mb-12 me-[100px] my-16">
                            <Lottie
                                animationData={lottieState === 'normal' ? llm0lottie : llm1lottie}
                                loop
                                play
                                style={{ width: 180, height: 180 }}
                            />
                        </div>
                        <div className="mt-3 p-3 bg-gray-100 rounded-lg text-xs bg-[#002B51]">
                            <p className="text-sm text-black" font-bold>
                                자연어로 데이터를 분석하고 시각화할 수 있습니다.<br/><br/>
                            </p>
                            <strong>테스트 예시:</strong><br/>
                            • "2025-06-05일의 객체 비율 그래프로 시각화해줘."<br/>
                            • "시간대별 감지 현황 보여줘"
                        </div>
                    </div>
                    <div className="space-y-4">
                        <textarea
                            value={llmInput}
                            onChange={(e) => setLlmInput(e.target.value)}
                            placeholder="시각화하고 싶은 데이터를 입력해 주세요."
                            className="w-full h-32 px-4 py-2 bg-white text-black border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleLLMSubmit}
                            disabled={loading}
                            className="w-full py-2 bg-[#002B51] text-white rounded-lg hover:bg-[#00004F] transition-colors disabled:opacity-50"
                        >
                            {loading ? '처리중...' : '입력'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Database;