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
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

import { Bar, Line, Pie } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

import logo from "../assets/ieumsae_logo.png";
import screenIcon from '../assets/screen.svg';
import databaseIcon from '../assets/database.svg';
import homeIcon from '../assets/home.svg';
import logoutIcon from "../assets/logout.svg";
import llm0lottie from '../assets/llm_normal.json';
import llm1lottie from '../assets/llm_oper.json';
import Lottie from "react-lottie-player";

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

// ChartData 이름 충돌 해결
interface CustomChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        backgroundColor: string[];
        borderColor?: string[];
        borderWidth?: number;
    }[];
}

// API 응답 타입 정의
interface ApiResponse {
    success: boolean;
    message?: string;
    data?: any[];
    llm_response: {
        graph_type: 'bar' | 'line' | 'pie' | 'heatmap';
        reason?: string;
    };
}

// // Mock 데이터 차트 타입
// interface MockChartDataPoint {
//     name: string;
//     value: number;
// }

const columnHelper = createColumnHelper<Detection>();

const columns = [
    columnHelper.display({
        id: 'select',
        header: '',
        cell: ({ row }) => (
            <input
                type="checkbox"
                checked={row.original.selected || false}
                onChange={() => {
                    // 체크박스 상태 업데이트 로직
                    // 실제 구현시 setData를 통해 해당 row의 selected 값을 토글
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

// // 목업 데이터 생성 함수 (DB 연동 후 사용하지 않음)
// const generateMockData = (query: string): {
//     data: Detection[],
//     chartData?: MockChartDataPoint[]
// } => {
//     if (query.includes('2025-06-05') && query.includes('객체') && query.includes('비율')) {
//         const mockDetections: Detection[] = [
//             ...Array.from({ length: 14 }, (_, i) => ({
//                 id: `car_obj_${i + 1}`,
//                 confidence: 0.85 + Math.random() * 0.1,
//                 date: '2025-06-05',
//                 detection_class: '자동차',
//                 event_flag: Math.random() > 0.8,
//                 object_id: `NANO-00${Math.floor(Math.random() * 9) + 1}`,
//                 signal_status: Math.random() > 0.1,
//                 time: `18:0${Math.floor(Math.random() * 6)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
//                 timestamp: `2025-06-05T18:0${Math.floor(Math.random() * 6)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
//                 selected: false
//             })),
//             ...Array.from({ length: 4 }, (_, i) => ({
//                 id: `person_obj_${i + 1}`,
//                 confidence: 0.78 + Math.random() * 0.15,
//                 date: '2025-06-05',
//                 detection_class: '사람',
//                 event_flag: Math.random() > 0.7,
//                 object_id: `NANO-00${Math.floor(Math.random() * 9) + 1}`,
//                 signal_status: Math.random() > 0.1,
//                 time: `18:0${Math.floor(Math.random() * 6)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
//                 timestamp: `2025-06-05T18:0${Math.floor(Math.random() * 6)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
//                 selected: false
//             })),
//             ...Array.from({ length: 2 }, (_, i) => ({
//                 id: `bike_obj_${i + 1}`,
//                 confidence: 0.72 + Math.random() * 0.2,
//                 date: '2025-06-05',
//                 detection_class: '자전거',
//                 event_flag: Math.random() > 0.6,
//                 object_id: `NANO-00${Math.floor(Math.random() * 9) + 1}`,
//                 signal_status: Math.random() > 0.1,
//                 time: `18:0${Math.floor(Math.random() * 6)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
//                 timestamp: `2025-06-05T18:0${Math.floor(Math.random() * 6)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
//                 selected: false
//             }))
//         ];
//
//         const chartData: MockChartDataPoint[] = [
//             { name: '자동차', value: 70 },
//             { name: '사람', value: 20 },
//             { name: '자전거', value: 10 }
//         ];
//
//         return { data: mockDetections, chartData };
//     }
//
//     if (query.includes('시간대별') || query.includes('hourly')) {
//         const mockDetections: Detection[] = Array.from({ length: 8 }, (_, i) => ({
//             id: `detection_obj_${i + 1}`,
//             confidence: 0.8 + Math.random() * 0.15,
//             date: '2025-06-05',
//             detection_class: ['자동차', '사람', '자전거'][Math.floor(Math.random() * 3)],
//             event_flag: Math.random() > 0.7,
//             object_id: `NANO-00${Math.floor(Math.random() * 9) + 1}`,
//             signal_status: Math.random() > 0.1,
//             time: `18:0${Math.floor(Math.random() * 6)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
//             timestamp: `2025-06-05T18:0${Math.floor(Math.random() * 6)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`,
//             selected: false
//         }));
//
//         const chartData: MockChartDataPoint[] = [
//             { name: '09:00', value: 5 },
//             { name: '10:00', value: 8 },
//             { name: '11:00', value: 12 },
//             { name: '12:00', value: 15 },
//             { name: '13:00', value: 20 },
//             { name: '14:00', value: 18 },
//             { name: '15:00', value: 14 },
//             { name: '16:00', value: 10 }
//         ];
//
//         return { data: mockDetections, chartData };
//     }
//
//     return { data: [] };
// };

function Database({ onLogout }: { onLogout: () => void }) {
    const navigate = useNavigate();
    const [llmInput, setLlmInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Detection[]>([]);
    const [chartData, setChartData] = useState<CustomChartData | null>(null);
    const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | null>(null);
    const [chartTitle, setChartTitle] = useState('');
    const [lottieState, setLottieState] = useState<'normal' | 'operating'>('normal');
    const [error, setError] = useState<string | null>(null);

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
        if (!llmInput.trim()) {
            setError('질문을 입력해주세요.');
            return;
        }
        setLoading(true);
        setLottieState('operating');
        setError(null);
        setChartData(null);

        try {
            const response = await fetch('http://localhost:5000/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: llmInput }),
            });

            const result: ApiResponse = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'API 요청 처리 중 오류가 발생했습니다.');
            }

            setData(result.data || []);

            if (result.data && result.data.length > 0) {
                const graphType = result.llm_response.graph_type;
                const keys = Object.keys(result.data[0]);
                const labelKey = keys[0];
                const valueKey = keys.length > 1 ? keys[1] : keys[0];

                const labels = result.data.map((item: any) => String(item[labelKey]));
                const values = result.data.map((item: any) => Number(item[valueKey]));

                const colors = ['rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 0.5)', 'rgba(255, 206, 86, 0.5)', 'rgba(75, 192, 192, 0.5)', 'rgba(153, 102, 255, 0.5)', 'rgba(255, 159, 64, 0.5)'];
                const borderColors = ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)', 'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(255, 159, 64, 1)'];

                setChartData({
                    labels,
                    datasets: [{
                        label: llmInput,
                        data: values,
                        backgroundColor: colors.slice(0, values.length),
                        borderColor: borderColors.slice(0, values.length),
                        borderWidth: 1,
                    }]
                });
                setChartType(graphType === 'heatmap' ? 'bar' : graphType);
                setChartTitle(result.llm_response.reason || '데이터 시각화');
            } else {
                setData([]);
                setError('시각화할 데이터가 없습니다.');
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        } finally {
            setLoading(false);
            setLottieState('normal');
        }
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' as const },
            title: { display: true, text: chartTitle },
        },
        scales: { y: { beginAtZero: true } }
    };

    const renderChart = (): React.JSX.Element | null => {
        if (!chartData) return null;
        switch (chartType) {
            case 'bar': return <Bar options={chartOptions} data={chartData} height={100} />;
            case 'line': return <Line options={chartOptions} data={chartData} height={100} />;
            case 'pie': return <Pie data={chartData} options={{...chartOptions, scales: undefined}} height={100} />;
            default: return <Bar options={chartOptions} data={chartData} height={100} />;
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

                    {error && (
                        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    {chartData && (
                        <div className="mb-8">
                            {renderChart()}
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
                            {table.getRowModel().rows.map((row) => (
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
                            <p className="text-sm text-black font-bold">
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