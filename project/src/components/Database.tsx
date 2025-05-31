import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import logo from "../assets/ieumsae_logo.png";
import screenIcon from '../assets/screen.svg';
import databaseIcon from '../assets/database.svg';
import homeIcon from '../assets/home.svg';
import logoutIcon from "../assets/logout.svg";
import llm0lottie from '../assets/llm_normal.json';
import llm1lottie from '../assets/llm_oper.json';
import Lottie from "react-lottie-player";
import alarmlottie from "../assets/alarm_lottie.json";


interface Detection {
    id: string;
    confidence: number;
    camera_id: string;
    timestamp: string;
    date: string;
    object_type: string;
}

const columnHelper = createColumnHelper<Detection>();

const columns = [
    columnHelper.accessor('object_type', {
        header: '객체',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('confidence', {
        header: '정확도',
        cell: info => `${(info.getValue() * 100).toFixed(0)}%`,
    }),
    columnHelper.accessor('camera_id', {
        header: '카메라',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('timestamp', {
        header: '시간',
        cell: info => info.getValue(),
    }),
    columnHelper.accessor('date', {
        header: '날짜',
        cell: info => info.getValue(),
    }),
];

function Database({ onLogout }: { onLogout: () => void }) {
    const navigate = useNavigate();
    const [llmInput, setLlmInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Detection[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);

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
        try {
            const response = await fetch('http://localhost:5000/api/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: llmInput }),
            });

            const result = await response.json();
            setData(result.data);
            setChartData(result.chartData);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
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
            <div className="flex-1 p-6 flex">
                {/* Table Section */}
                <div className="flex-1 bg-white text-black border border-gray-600 rounded-lg p-4 mr-4">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id} className="px-4 py-2 text-left">
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                            </thead>
                            <tbody>
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id}>
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="px-4 py-2">
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
                    </div>

                    {chartData.length > 0 && (
                        <div className="mt-6">
                            <BarChart width={600} height={300} data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="value" fill="#0099ff" />
                            </BarChart>
                        </div>
                    )}
                </div>

                {/* LLM Input Section */}
                <div className="w-96 bg-white text-black border border-gray-600 rounded-lg p-4">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold mb-2">데이터 분석 도우미</h2>
                        <div className="flex h-24 items-center justify-center ml-28 mb-12 me-[100px] my-16">
                            <Lottie
                                animationData={llm0lottie}
                                loop
                                play
                                style={{ width: 180, height: 180 }}
                            />
                        </div>
                        <p className="text-sm text-gray-400">
                            자연어로 데이터를 분석하고 시각화할 수 있습니다.
                        </p>
                    </div>
                    <div className="space-y-4">
            <textarea
                value={llmInput}
                onChange={(e) => setLlmInput(e.target.value)}
                placeholder="시각화하고 싶은 데이터를 입력해 주세요."
                className="w-full h-32 px-4 py-2 bg-white text-black border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
                        <button
                            onClick={handleLLMSubmit}
                            disabled={loading}
                            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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