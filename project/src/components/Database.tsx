import React, {useEffect, useState, useMemo, useRef} from 'react';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
} from '@tanstack/react-table';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import logo from "../assets/ieumsae_logo.png";
import screenIcon from '../assets/screen.svg';
import databaseIcon from '../assets/database.svg';
import homeIcon from '../assets/home.svg';
import logoutIcon from "../assets/logout.svg";
import llm0lottie from '../assets/llm_normal.json';
import llm1lottie from '../assets/llm_oper.json';
import Lottie from "react-lottie-player";
import axios from 'axios';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';
import { Chart as ReactChart } from 'react-chartjs-2';

const LOCAL_LLM = "/interpret";
const SERVER_API = "/api/visualize_sql";

type RawLog = {
    timestamp: string; // 시간
    cam_id: string; // 카메라 아이디 (추가 시 필요)
    detection_class: string; // 객체 클래스
    object_id: string; // NANO-001 등
    confidence: number; // 객체 탐지 정확도
    signal_status: boolean; // 신호 상태
    event_flag: boolean; // 이벤트 발생
    date: string; // 날짜
    time: string; // 시간
};

ChartJS.register(
    MatrixController,
    MatrixElement,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
);

interface Detection {
    id: string;
    cam_id?: string;
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
        backgroundColor: string[] | string;
        borderColor?: string;
        tension?: number;
    }[];
}

interface FilterState {
    cameras: string[];
    objectTypes: string[];
    eventStatus: 'all' | 'occurred' | 'not_occurred';
    signalStatus: 'all' | 'active' | 'inactive';
    confidenceMin: number;
    dateFrom: string;
    dateTo: string;
    timeSlots: string[];
    objectIdSearch: string;
    sortBy: 'newest' | 'oldest' | 'confidence_high' | 'confidence_low';
}

interface GraphRecommendation {
    type: 'bar' | 'line' | 'pie' | 'heatmap' | 'timeline';
    label: string;
    description: string;
    requiredDataTypes: {
        numeric?: number;
        categorical?: number;
        temporal?: number;
        boolean?: number;
    };
    maxRows?: number;
}

interface DataTypeAnalysis {
    numeric: string[];
    categorical: string[];
    temporal: string[];
    boolean: string[];
}

const graphRecommendations: GraphRecommendation[] = [
    {
        type: 'bar',
        label: '막대 그래프',
        description: '카테고리별 수치 비교',
        requiredDataTypes: { categorical: 1, numeric: 1 }
    },
    {
        type: 'pie',
        label: '파이 차트',
        description: '전체 대비 비율',
        requiredDataTypes: { categorical: 1, numeric: 1 },
        maxRows: 10
    },
    {
        type: 'line',
        label: '라인 차트',
        description: '시간에 따른 변화',
        requiredDataTypes: { temporal: 1, numeric: 1 }
    },
    {
        type: 'heatmap',
        label: '히트맵',
        description: '두 카테고리 간 수치 분포',
        requiredDataTypes: { categorical: 2, numeric: 1 }
    }
];

const LABEL_TO_CLASS: Record<string, string> = {
    '보행자': 'person',
    '자전거': 'bicycle',
    '자동차': 'car',
    '휠체어': 'wheelchair'
};

const columnHelper = createColumnHelper<Detection>();

function Database({ onLogout }: { onLogout: () => void }) {
    const navigate = useNavigate();
    const [llmInput, setLlmInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<Detection[]>([]);
    const [chartData, setChartData] = useState<any>(null);
    const [lottieState, setLottieState] = useState<'normal' | 'operating'>('normal');
    const [showFilter, setShowFilter] = useState(false);
    const [rowSelection, setRowSelection] = useState<{ [key: string]: boolean }>({});
    const [showGraphModal, setShowGraphModal] = useState(false);
    const [availableGraphs, setAvailableGraphs] = useState<GraphRecommendation[]>([]);
    const [selectedGraphType, setSelectedGraphType] = useState<string>('');
    const [currentChartType, setCurrentChartType] = useState<'bar' | 'pie' | 'line' | 'heatmap'>('bar');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showLLMPanel, setShowLLMPanel] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isMobile, setIsMobile] = useState(false);

    const fetchCtrlRef = useRef<AbortController | null>(null);
    const stopRef = useRef(false);
    const visPauseRef = useRef(false);

    // 페이지네이션 상태 추가
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    const [heatmapAxes, setHeatmapAxes] = useState<{ x: string[]; y: string[] }>({ x: [], y: [] });

    // 필터 상태
    const [filters, setFilters] = useState<FilterState>({
        cameras: [],
        objectTypes: [],
        eventStatus: 'all',
        signalStatus: 'all',
        confidenceMin: 0,
        dateFrom: '',
        dateTo: '',
        timeSlots: [],
        objectIdSearch: '',
        sortBy: 'newest'
    });

    // 임시 필터 상태 (적용 전)
    const [tempFilters, setTempFilters] = useState<FilterState>(filters);

    const cameras = ['CAM1'];
    const objectTypes = ['보행자', '자전거', '휠체어', '자동차'];
    const timeSlots = [
        {id: 'morning', label: '출근 시간 (07:00-09:00)', range: [7, 9]},
        {id: 'lunch', label: '점심 시간 (12:00-13:00)', range: [12, 13]},
        {id: 'evening', label: '퇴근 시간 (18:00-20:00)', range: [18, 20]},
        {id: 'night', label: '야간 시간 (20:00-06:00)', range: [20, 6]}
    ];

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const columns = [
        columnHelper.display({
            id: 'select',
            header: ({table}) => (
                <input
                    type="checkbox"
                    checked={table.getIsAllRowsSelected()}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                />
            ),
            cell: ({row}) => (
                <input
                    type="checkbox"
                    checked={row.getIsSelected()}
                    onChange={row.getToggleSelectedHandler()}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                />
            ),
        }),
        columnHelper.accessor('cam_id', {
            header: '카메라',
            cell: i => i.getValue() || 'cam1',
        }),

        columnHelper.accessor('object_id', {
            header: '객체 ID',
            cell: info => info.getValue(),
        }),
        columnHelper.accessor('detection_class', {
            header: '객체',
            cell: info => info.getValue(),
        }),
        columnHelper.accessor('id', {
            header: '행 ID', // 내부 고유키
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
                    info.getValue() ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
        {info.getValue() ? '발생' : '정상'}
      </span>
            ),
        }),
        columnHelper.accessor('signal_status', {
            header: '신호 상태',
            cell: info => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    info.getValue() ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
        {info.getValue() ? '활성' : '비활성'}
      </span>
            ),
        }),
        columnHelper.accessor('time', {header: '시간', cell: i => i.getValue()}),
        columnHelper.accessor('date', {header: '날짜', cell: i => i.getValue()}),
    ];

    // 데이터 타입 분석 함수
    const analyzeDataTypes = (selectedData: Detection[]): DataTypeAnalysis => {
        const analysis: DataTypeAnalysis = {
            numeric: ['confidence'],
            categorical: ['object_id', 'detection_class'],
            temporal: ['date', 'time', 'timestamp'],
            boolean: ['event_flag', 'signal_status']
        };
        return analysis;
    };

    // 그래프 추천 함수
    const getAvailableGraphs = (selectedData: Detection[]): GraphRecommendation[] => {
        if (selectedData.length === 0) return [];

        const dataTypes = analyzeDataTypes(selectedData);
        const availableGraphsList: GraphRecommendation[] = [];

        graphRecommendations.forEach(graph => {
            let isAvailable = true;

            // 필요한 데이터 타입 체크
            if (graph.requiredDataTypes.numeric && dataTypes.numeric.length < graph.requiredDataTypes.numeric) {
                isAvailable = false;
            }
            if (graph.requiredDataTypes.categorical && dataTypes.categorical.length < graph.requiredDataTypes.categorical) {
                isAvailable = false;
            }
            if (graph.requiredDataTypes.temporal && dataTypes.temporal.length < graph.requiredDataTypes.temporal) {
                isAvailable = false;
            }
            if (graph.requiredDataTypes.boolean && dataTypes.boolean.length < graph.requiredDataTypes.boolean) {
                isAvailable = false;
            }

            // 최대 행 개수 체크
            if (graph.maxRows && selectedData.length > graph.maxRows) {
                isAvailable = false;
            }

            if (isAvailable) {
                availableGraphsList.push(graph);
            }
        });

        return availableGraphsList;
    };

    // 그래프 생성 함수
    const generateGraph = (type: string, selectedData: Detection[]) => {
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

        switch (type) {
            case 'bar':
                // 객체 유형별 카운트
                const classCounts: { [key: string]: number } = {};
                selectedData.forEach(item => {
                    classCounts[item.detection_class] = (classCounts[item.detection_class] || 0) + 1;
                });

                setChartData({
                    labels: Object.keys(classCounts),
                    datasets: [{
                        label: '검지 횟수',
                        data: Object.values(classCounts),
                        backgroundColor: colors
                    }]
                });
                setCurrentChartType('bar');
                break;

            case 'pie':
                // 이벤트 발생 비율
                const eventCount = selectedData.filter(item => item.event_flag).length;
                const normalCount = selectedData.length - eventCount;

                setChartData({
                    labels: ['이벤트 발생', '정상'],
                    datasets: [{
                        label: '이벤트 상태',
                        data: [eventCount, normalCount],
                        backgroundColor: ['#FF6384', '#36A2EB']
                    }]
                });
                setCurrentChartType('pie');
                break;

            case 'line':
                // 시간별 검지 수
                const timeData: { [key: string]: number } = {};
                selectedData.forEach(item => {
                    const hour = item.time.split(':')[0];
                    timeData[hour] = (timeData[hour] || 0) + 1;
                });

                const sortedHours = Object.keys(timeData).sort();
                setChartData({
                    labels: sortedHours.map(h => `${h}시`),
                    datasets: [{
                        label: '시간별 검지 수',
                        data: sortedHours.map(h => timeData[h]),
                        backgroundColor: '#36A2EB',
                        borderColor: '#36A2EB',
                        tension: 0.1
                    }]
                });
                setCurrentChartType('line');
                break;

            case 'heatmap': {
                // x축: 객체유형, y축: 객체ID
                const xCats = Array.from(new Set(selectedData.map(d => d.detection_class)));
                const yCats = Array.from(new Set(selectedData.map(d => d.object_id)));

                const counts: Record<string, number> = {};
                selectedData.forEach(d => {
                    const key = `${d.detection_class}|${d.object_id}`;
                    counts[key] = (counts[key] || 0) + 1;
                });

                const matrix = xCats.flatMap(xc =>
                    yCats.map(yc => ({ x: xc, y: yc, v: counts[`${xc}|${yc}`] || 0 }))
                );

                // 옵션에서 참조할 축 라벨 저장
                setHeatmapAxes({ x: xCats, y: yCats });

                // 히트맵 전용 데이터 (matrix controller는 {x,y,v} 배열을 받음)
                setChartData({
                    labels: [],
                    datasets: [{
                        label: '빈도',
                        data: matrix,
                        backgroundColor: (ctx: any) => {
                            const v = ctx.raw?.v ?? 0;
                            const alpha = Math.min(0.15 + v * 0.1, 1);
                            return `rgba(54,162,235,${alpha})`;
                        }
                    }]
                });
                setCurrentChartType('heatmap');
                break;
            }
            default:
                break;
        }
        setShowGraphModal(false);
        setRowSelection({});
    };

    // 필터가 변경될 때 그래프 제거
    useEffect(() => {
        if (!chartData) return;

        const palette = [
            '#FF6384', '#36A2EB', '#FFCE56',
            '#4BC0C0', '#9966FF', '#FF9F40'
        ];

        const patched = {
            ...chartData,
            datasets: chartData.datasets.map(ds => {
                const count = ds.data?.length || 1;

                // backgroundColor가 배열이 아니면 자동 생성
                const bg = Array.isArray(ds.backgroundColor)
                    ? ds.backgroundColor
                    : Array.from({ length: count }, (_, i) => palette[i % palette.length]);

                return { ...ds, backgroundColor: bg };
            })
        };

        setChartData(patched);
    }, [chartData]);

    // cam1 로그 불러오기 useEffect
    const dbStartedRef = useRef(false);

    useEffect(() => {
        if (dbStartedRef.current) return;
        dbStartedRef.current = true;

        const CAM_ID = 'CAM-01';
        const LIMIT = 200;

        const mapToDetection = (log: RawLog): Detection => {
            let displayDate = log.date;
            let displayTime = log.time;

            // log.timestamp (예: "2025-10-28T12:22:10")에 KST가 포함되어 있으므로 이를 파싱하여 날짜와 시간을 덮어씀
            if (log.timestamp) {
                try {
                    const parts = log.timestamp.split('T');
                    if (parts.length === 2) {
                        displayDate = parts[0]; // 날짜 부분 (예: "2025-10-28")

                        // 시간 부분 (예: "12:22:10") 밀리초(.123)나 타임존(Z, +09:00)이 붙어있을 경우를 대비해 HH:MM:SS만 추출
                        displayTime = parts[1].split('.')[0].split('+')[0].split('Z')[0];
                    }
                } catch (e) {
                        // 파싱 실패 시 원본 값(UTC)을 그대로 사용
                        console.warn("KST Timestamp parsing failed, falling back:", log.timestamp, e);
                        }
                    }

                    return {
                        id: `${log.detection_class}-${log.timestamp || 'no-ts'}`,
                        cam_id: log.cam_id,
                        confidence: log.confidence,
                        date: displayDate, // KST 기준 날짜
                        detection_class: log.detection_class,
                        event_flag: log.event_flag,
                        object_id: String(log.object_id),
                        signal_status: log.signal_status,
                        time: displayTime, // KST 기준 시간
                        timestamp: log.timestamp,
                        selected: false,
                    };
                };

        let ctrl: AbortController | null = null;
        let stopped = false;      // 언마운트/라우팅 시 종료 플래그
        let inflight = false;     // 요청 겹침 방지
        let hidden = false;       // 탭 가시성 상태

        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

        // 한 번만 요청
        const fetchOnce = async () => {
            if (stopped || inflight || hidden) return;
            inflight = true;
            try {
                ctrl = new AbortController();
                const res = await axios.get<RawLog[]>(
                    `/api/logs/latest?cam_id=${CAM_ID}&limit=${LIMIT}`,
                    { signal: ctrl.signal as any, timeout: 10000 } // 타임아웃 10초
                );
                const sorted = res.data
                    .slice()
                    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
                setData(sorted.map(mapToDetection));
            } catch (e: any) {
                // 숨김/취소는 정상
                if (!(e?.name === 'CanceledError' || axios.isCancel?.(e))) {
                    console.error('cam1 로그 실패:', e);
                    // 에러 때 바로 비우지 말고, 마지막 성공 데이터 유지
                    // setData([]);
                }
            } finally {
                inflight = false;
            }
        };

        // 끝날 때마다 1초 쉬고 다음 요청
        (async () => {
            await fetchOnce();
            while (!stopped) {
                await sleep(5000);
                await fetchOnce();
            }
        })();

        // 탭 숨기면 즉시 취소 + 재개는 다음 루프에서 자동
        const onVis = () => {
            hidden = document.hidden;
            if (hidden && ctrl) {
                try { ctrl.abort(); } catch {}
                inflight = false;
            } else {
                // 다시 보이면 즉시 한 번
                void fetchOnce();
            }
        };
        document.addEventListener('visibilitychange', onVis);

        return () => {
            stopped = true;
            if (ctrl) try { ctrl.abort(); } catch {}
            document.removeEventListener('visibilitychange', onVis);
            dbStartedRef.current = false;
        };
    }, []);

    // 필터링된 데이터 계산
    const filteredData = useMemo(() => {
        let result = data.slice();

        // 필터링된 데이터 계산 useMemo 내부
        if (filters.cameras.length > 0) {
            result = result.filter(item => filters.cameras.includes(item.cam_id ?? ''));
        }

        // 객체 유형 필터
        if (filters.objectTypes.length > 0) {
            const selectedClasses = new Set(
                filters.objectTypes.map(k => LABEL_TO_CLASS[k] ?? k) // 한글→영문 매핑
            );
            result = result.filter(item => selectedClasses.has(item.detection_class));
        }

        // 이벤트 상태 필터
        if (filters.eventStatus !== 'all') {
            result = result.filter(item =>
                filters.eventStatus === 'occurred' ? item.event_flag : !item.event_flag
            );
        }

        // 신호 상태 필터
        if (filters.signalStatus !== 'all') {
            result = result.filter(item =>
                filters.signalStatus === 'active' ? item.signal_status : !item.signal_status
            );
        }

        // 정확도 필터
        result = result.filter(item => {
            const confidence = item.confidence * 100;
            return confidence >= filters.confidenceMin;
        });

        // 날짜 필터
        if (filters.dateFrom) {
            result = result.filter(item => item.date >= filters.dateFrom);
        }
        if (filters.dateTo) {
            result = result.filter(item => item.date <= filters.dateTo);
        }

        // 시간대 필터
        if (filters.timeSlots.length > 0) {
            result = result.filter(item => {
                const hour = parseInt(item.time.split(':')[0]);
                return filters.timeSlots.some(slotId => {
                    const slot = timeSlots.find(s => s.id === slotId);
                    if (!slot) return false;
                    const [start, end] = slot.range;
                    if (start > end) { // 야간 시간대
                        return hour >= start || hour < end;
                    }
                    return hour >= start && hour < end;
                });
            });
        }

        // 객체 ID 검색
        if (filters.objectIdSearch) {
            result = result.filter(item =>
                (item.object_id || '').toLowerCase().includes(filters.objectIdSearch.toLowerCase())
                );
            }

        // 정렬
        switch (filters.sortBy) {
            case 'oldest':
                result.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
                break;
            case 'newest':
                result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
                break;
            case 'confidence_high':
                result.sort((a, b) => b.confidence - a.confidence);
                break;
            case 'confidence_low':
                result.sort((a, b) => a.confidence - b.confidence);
                break;
        }

        return result;
    }, [data, filters]);

    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleLogout = () => {
        sessionStorage.removeItem('token');
        onLogout();
        navigate('/');
    };

    const table = useReactTable({
        data: filteredData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(), // 페이지네이션 추가
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: setPagination, // 페이지네이션 상태 변경 핸들러
        state: {
            rowSelection,
            pagination, // 페이지네이션 상태 추가
        },
        autoResetPageIndex: false,
    });

    // 그래프 생성 버튼 핸들러
    const handleCreateGraph = () => {
        const selectedRows = Object.keys(rowSelection).filter(key => rowSelection[key]);
        const selectedData = selectedRows.map(index => filteredData[parseInt(index)]).filter(Boolean);

        if (selectedData.length === 0) {
            alert('그래프를 생성할 데이터를 선택해주세요.');
            return;
        }

        const available = getAvailableGraphs(selectedData);
        if (available.length === 0) {
            alert('선택한 데이터로 생성 가능한 그래프가 없습니다.');
            return;
        }

        setAvailableGraphs(available);
        setShowGraphModal(true);
    };

    const heatmapOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                callbacks: {
                    label: (ctx: any) => `${ctx.raw.y} × ${ctx.raw.x}: ${ctx.raw.v}`
                }
            }
        },
        scales: {
            x: { type: 'category', labels: heatmapAxes.x },
            y: { type: 'category', labels: heatmapAxes.y }
        }
    }), [heatmapAxes]);

    async function handleLLMSubmitTwoHop(userQuery: string) {
        setLoading(true);
        try {
            if (!userQuery || !userQuery.trim()) {
                alert("프롬프트를 입력해 주세요.");
                return;
            }

            // 프롬프트를 항상 '... 시각화해줘.' 로 끝나게 만들고, SELECT-only 가드는 끝나기 전에 끼워 넣는다.
            function normalizePrompt(q: string) {
                const raw = (q || "").trim();
                // 끝의 불필요한 구두점/공백/유사 표현 제거
                const core = raw
                        .replace(/\s+$/g, "")
                        .replace(/(시각화\s*해줘\.?)$/g, "") // 이미 있으면 제거해 코어만 남김
                        .replace(/[.]+$/g, "") // 끝의 점들 제거
                    .trim();
                const fallback = "오늘 객체 분포";
                return `${((core || fallback))} 시각화해줘.`;
            }

            // LLM 해석
            const r1 = await fetch(LOCAL_LLM, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ query: normalizePrompt(userQuery) })
            });

            if (!r1.ok) {
                            // 에러 JSON을 파싱하여 한글 메시지 추출
                            const t = await r1.text().catch(()=>"");
                            let error_message = t || "LLM 서버 오류"; // 기본 폴백

                            try {
                                // 텍스트가 JSON인지 파싱 시도
                                const error_json = JSON.parse(t);
                                // JSON 안에 'message' 필드가 있으면 그것을 에러 메시지로 사용
                                if (error_json && error_json.message) {
                                    error_message = error_json.message;
                                }
                            } catch (e) {
                                // 텍스트가 JSON이 아니어도(e.g., 500 HTML 에러) t를 그대로 사용
                            }

                            // 태그와 함께 버리기
                            throw new Error(`[STEP1 /interpret ${r1.status}] ${error_message}`);
                        }

            // 응답이 JSON인지 확인
            const ct1 = r1.headers.get("content-type") || "";
            const data1 = ct1.includes("application/json")
                ? await r1.json()
                : (()=>{ throw new Error("[STEP1] JSON 아님: " + ct1); })();

            const { sql, graph_type } = data1 ?? {};
            if (!sql) throw new Error("[STEP1] LLM이 SQL을 반환하지 않았습니다.");

            // 시각화 API
            const r2 = await fetch(SERVER_API, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({ sql, graph_type })
            });

            if (!r2.ok) {
                // HTML 에러 페이지일 수 있으니 text로 읽어 사용자에게 보여줌
                const t = await r2.text().catch(()=>"");
                throw new Error(`[STEP2 /api/visualize_sql ${r2.status}] ${t || "백엔드 처리 오류"}`);
            }

            const ct2 = r2.headers.get("content-type") || "";
            const data2 = ct2.includes("application/json")
                ? await r2.json()
                : (()=>{ throw new Error("[STEP2] JSON 아님: " + ct2); })();

            // 기대 스키마 검증
            if (!data2?.chartData || !data2.chartData.datasets) {
                 throw new Error("[STEP2] chartData 형식이 올바르지 않습니다.");
            }
            // 데이터셋의 데이터 배열 길이를 확인
            const hasData = data2.chartData.datasets[0]?.data?.length > 0;
            if (hasData) {
                // 데이터가 1건 이상 있으면 차트 그리기
                setChartData(data2.chartData);
                setCurrentChartType(graph_type || data2.graph_type || "bar");
            } else {
                // 데이터가 0건이면 기존 차트 비우기
                setChartData(null);
                alert("유효하지 않은 날짜이거나 해당 기간의 데이터가 없습니다.");
            }

        } catch (err:any) {
            alert(err?.message || String(err));
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    // 간단 fetchWithTimeout 유틸
    async function fetchWithTimeout(resource: RequestInfo, options: RequestInit & { timeout?: number } = {}) {
        const { timeout = 15000, ...opts } = options;
        const ctrl = new AbortController();
        const id = setTimeout(() => ctrl.abort(), timeout);
        try {
            return await fetch(resource, { ...opts, signal: ctrl.signal });
        } finally {
            clearTimeout(id);
        }
    }

    const handleLLMSubmit = async () => {
        setLoading(true);
        setLottieState('operating');
        try {
            const response = await fetch('/api/visualize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: llmInput })
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('LLM API error:', result);
                alert((result?.error || '서버 오류') + (result?.detail ? `\n\nDETAIL: ${result.detail}` : ''));
                setChartData(null);
            } else if (result.chartData && result.chartType) {
                setChartData(result.chartData);
                // 서버가 'bar' | 'pie' | 'line' | 'heatmap' 중 하나를 줌
                setCurrentChartType(result.chartType);
            } else {
                setChartData(null);
            }

            // 첫 페이지로
            setPagination({ pageIndex: 0, pageSize: 10 });
            setLlmInput('');
        } catch (e) {
            console.error('Error:', e);
            alert('서버 연결에 실패했습니다.');
        } finally {
            setLoading(false);
            setLottieState('normal');
        }
    };


    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: '객체 감지 비율',
            },
        },
        scales: currentChartType !== 'pie' ? {
            y: {
                beginAtZero: true,
                max: currentChartType === 'bar' && chartData?.datasets[0]?.label?.includes('비율') ? 100 : undefined,
                ticks: {
                    callback: function (value: any) {
                        return currentChartType === 'bar' && chartData?.datasets[0]?.label?.includes('비율')
                            ? value + '%'
                            : value;
                    }
                }
            }
        } : undefined
    };

    // 필터 초기화 - 자동 적용 및 팝업 닫기
    const handleResetFilters = () => {
        const initialFilters: FilterState = {
            cameras: [],
            objectTypes: [],
            eventStatus: 'all',
            signalStatus: 'all',
            confidenceMin: 0,
            dateFrom: '',
            dateTo: '',
            timeSlots: [],
            objectIdSearch: '',
            sortBy: 'newest'
        };
        setTempFilters(initialFilters);
        setFilters(initialFilters);
        setShowFilter(false);
        // 필터가 초기화되었으므로 첫 페이지로 이동
        setPagination({pageIndex: 0, pageSize: 10});
    };

    // 필터 적용
    const handleApplyFilters = () => {
        setFilters(tempFilters);
        setShowFilter(false);
        // 필터가 적용되었으므로 첫 페이지로 이동
        setPagination({pageIndex: 0, pageSize: 10});
    };

    // 필터 취소
    const handleCancelFilters = () => {
        setTempFilters(filters);
        setShowFilter(false);
    };


    return (
        <div className="min-h-screen bg-white text-black">
            <div className="lg:hidden flex flex-col h-screen">
                {/* 모바일 메뉴 버튼 */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="fixed top-4 left-4 z-50 p-2 bg-white border border-gray-300 rounded-lg shadow-lg"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                {/* 모바일 헤더 */}
                <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center">
                    <h1 className="text-lg font-bold ml-28">데이터베이스</h1>
                    <button
                        onClick={() => setShowLLMPanel(true)}
                        className="p-2 text-blue-600 font-semibold ml-10"
                    >
                        ✨LLM
                    </button>
                </div>

                {/* 모바일 사이드바 오버레이 */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-30"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* 모바일 사이드바 */}
                <div
                    className={`fixed left-0 top-0 h-screen w-24 bg-white border-r-2 border-gray-200 z-40 flex flex-col items-center py-6 justify-between transition-transform duration-300 ${
                        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                >
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

                {/* 모바일 콘텐츠 */}
                <div className="flex-1 overflow-y-auto p-4 pb-24">
                    {/* 검색 및 필터 */}
                    <div className="mb-4 space-y-2">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="객체 ID 검색"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={() => setShowFilter(true)}
                                className="px-4 py-2 bg-[#002B51] text-white rounded-lg text-sm font-medium hover:bg-[#00004F] transition-colors"
                            >
                                필터
                            </button>
                        </div>
                        <button
                            onClick={() => setShowGraphModal(true)}
                            className="w-full px-4 py-2 bg-[#002B51] text-white rounded-lg text-sm font-medium hover:bg-[#00004F] transition-colors"
                        >
                            + 그래프 생성
                        </button>
                    </div>

                    {/* 결과 통계 */}
                    <div className="mb-4 text-sm text-gray-600">
                        총 {filteredData.length}개의 결과
                    </div>

                    {/* 카드 뷰 */}
                    <div className="space-y-3 mb-6">
                        {paginatedData.map((item) => (
                            <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 text-sm">{item.object_id}</h3>
                                        <p className="text-xs text-gray-500 mt-1">{item.time}</p>
                                    </div>
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${
                                            item.event_flag
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-green-100 text-green-700'
                                        }`}
                                    >
                                    {item.event_flag ? '⚠️ 이벤트' : '✓ 정상'}
                                </span>
                                </div>

                                {/* 정보 그리드 */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="space-y-1">
                                        <p className="text-gray-500">카메라</p>
                                        <p className="font-medium text-gray-900">{item.cam_id}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-gray-500">객체</p>
                                        <p className="font-medium text-gray-900">{item.detection_class}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">정확도</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full"
                                                        style={{ width: `${item.confidence * 100}%` }}
                                                    />
                                                </div>
                                                <span className="font-medium text-gray-900 w-8 text-right">
                                                {(item.confidence * 100).toFixed(0)}%
                                            </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 페이지네이션 */}
                    <div className="flex items-center justify-between gap-2 mb-6 px-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm font-medium">
                        {currentPage} / {totalPages}
                    </span>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* 모바일 필터 모달 */}
                {showFilter && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
                        <div
                            className="flex-1 cursor-pointer"
                            onClick={() => setShowFilter(false)}
                        />
                        <div className="bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold">필터 설정</h2>
                                <button
                                    onClick={() => setShowFilter(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* 카메라 필터 */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">카메라</h3>
                                    <div className="space-y-2">
                                        {['CAM1'].map((cam) => (
                                            <label key={cam} className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" className="w-5 h-5 rounded border-gray-300" />
                                                <span className="text-sm text-gray-700">{cam}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* 객체 유형 필터 */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">객체 유형</h3>
                                    <div className="space-y-2">
                                        {['보행자', '자전거', '휠체어', '자동차'].map((type) => (
                                            <label key={type} className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" className="w-5 h-5 rounded border-gray-300" />
                                                <span className="text-sm text-gray-700">{type}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* 정확도 필터 */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">정확도: 70% 이상</h3>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        defaultValue="70"
                                        className="w-full"
                                    />
                                </div>

                                {/* 날짜 필터 */}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">날짜 범위</h3>
                                    <div className="space-y-2">
                                        <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                        <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                    </div>
                                </div>

                                {/* 버튼 */}
                                <div className="flex gap-2 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => setShowFilter(false)}
                                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={() => setShowFilter(false)}
                                        className="flex-1 px-4 py-3 bg-[#002B51] text-white rounded-lg text-sm font-medium hover:bg-[#00004F]"
                                    >
                                        적용
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 모바일 그래프 모달 */}
                {showGraphModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
                        <div
                            className="flex-1 cursor-pointer"
                            onClick={() => setShowGraphModal(false)}
                        />
                        <div className="bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold">그래프 유형 선택</h2>
                                <button
                                    onClick={() => setShowGraphModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-4 space-y-2">
                                {[
                                    { type: 'bar', label: '막대 그래프', desc: '카테고리별 비교' },
                                    { type: 'pie', label: '원형 그래프', desc: '구성비 표현' },
                                    { type: 'line', label: '라인 차트', desc: '시계열 데이터' },
                                    { type: 'heatmap', label: '히트맵', desc: '두 카테고리 간 수치 분포' },
                                ].map((graph) => (
                                    <button
                                        key={graph.type}
                                        onClick={() => setSelectedGraphType(graph.type)}
                                        className={`w-full text-left p-4 border rounded-lg transition-colors ${
                                            selectedGraphType === graph.type
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <h3 className="font-semibold text-gray-900 text-sm">{graph.label}</h3>
                                        <p className="text-xs text-gray-600 mt-1">{graph.desc}</p>
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-2 p-4 border-t border-gray-200">
                                <button
                                    onClick={() => setShowGraphModal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={() => {
                                        setShowGraphModal(false);
                                    }}
                                    disabled={!selectedGraphType}
                                    className="flex-1 px-4 py-3 bg-[#002B51] text-white rounded-lg text-sm font-medium hover:bg-[#00004F] disabled:opacity-50"
                                >
                                    생성
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 모바일 LLM 분석 패널 */}
                {showLLMPanel && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
                        <div
                            className="flex-1 cursor-pointer"
                            onClick={() => setShowLLMPanel(false)}
                        />
                        <div className="bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold">데이터 분석 도우미</h2>
                                <button
                                    onClick={() => setShowLLMPanel(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                <div className="text-center py-6">
                                    <div className="text-5xl mb-2">✨</div>
                                    <p className="text-sm text-gray-600">자연어로 데이터를 분석하세요</p>
                                </div>

                                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                                    <p className="font-semibold text-gray-900 mb-2">입력 예시:</p>
                                    <ul className="space-y-1 text-gray-700 text-xs">
                                        <li>• "2025-06-05일의 객체 비율"</li>
                                        <li>• "시간대별 감지 현황"</li>
                                        <li>• "카메라별 이벤트 발생 비율"</li>
                                    </ul>
                                </div>

                                <textarea
                                    value={llmInput}
                                    onChange={(e) => setLlmInput(e.target.value)}
                                    placeholder="시각화하여 분석하고 싶은 내용을 입력하세요"
                                    className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />

                                <button
                                    onClick={handleLLMSubmit}
                                    disabled={loading || !llmInput.trim()}
                                    className="w-full py-3 bg-[#002B51] text-white rounded-lg text-sm font-medium hover:bg-[#00004F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {loading ? '분석 중...' : '분석 시작'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="hidden lg:flex min-h-screen">
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

            {/* 메인 내용 */}
            <div className="flex-1 p-6 flex ml-24">
                {/* 테이블 */}
                <div className="flex-1 bg-white text-black rounded-lg p-6 mr-4 shadow-sm relative">
                    <div className="mb-6">
                        <h3 className="text-2xl lg:text-3xl font-bold">데이터베이스</h3>
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-gray-600">
                                총 {filteredData.length}개의 결과가 필터링되었습니다
                            </div>
                            <div className="flex items-center space-x-4">
                                <input
                                    type="text"
                                    placeholder="객체 ID 검색"
                                    value={filters.objectIdSearch}
                                    onChange={(e) => {
                                        setFilters({...filters, objectIdSearch: e.target.value});
                                        setChartData(null);
                                    }}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                    onClick={() => setShowFilter(!showFilter)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 relative">
                                    필터
                                    {(filters.cameras.length > 0 || filters.objectTypes.length > 0 ||
                                        filters.eventStatus !== 'all' || filters.signalStatus !== 'all' ||
                                        filters.confidenceMin > 0) && (
                                        <span
                                            className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                                    )}
                                </button>
                                <button
                                    className="px-5 py-2 bg-[#002B51] text-white rounded-md text-sm hover:bg-[#00004F] transition-colors">
                                    검색
                                </button>
                                <button
                                    onClick={handleCreateGraph}
                                    className="px-4 py-2 bg-[#002B51] text-white rounded-md text-sm hover:bg-[#00004F] transition-colors">
                                    + 그래프 생성
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 그래프 선택 모달 */}
                    {showGraphModal && (
                        <>
                            <div
                                className="fixed inset-0 bg-black bg-opacity-30 z-40"
                                onClick={() => setShowGraphModal(false)}
                            />
                            <div
                                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -top-0 w-[500px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-6">
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold">그래프 유형 선택</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        선택한 {Object.keys(rowSelection).filter(key => rowSelection[key]).length}개의 데이터로
                                        생성 가능한 그래프입니다.
                                    </p>
                                </div>

                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {availableGraphs.map(graph => (
                                        <div
                                            key={graph.type}
                                            onClick={() => setSelectedGraphType(graph.type)}
                                            className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                                selectedGraphType === graph.type
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-medium text-gray-900">{graph.label}</h4>
                                                    <p className="text-sm text-gray-600 mt-1">{graph.description}</p>
                                                </div>
                                                {selectedGraphType === graph.type && (
                                                    <div
                                                        className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                        <svg className="w-3 h-3 text-white" fill="currentColor"
                                                             viewBox="0 0 20 20">
                                                            <path fillRule="evenodd"
                                                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                  clipRule="evenodd"/>
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex space-x-2 mt-6">
                                    <button
                                        onClick={() => {
                                            setShowGraphModal(false);
                                            setSelectedGraphType('');
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors">
                                        취소
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (selectedGraphType) {
                                                const selectedRows = Object.keys(rowSelection).filter(key => rowSelection[key]);
                                                const selectedData = selectedRows.map(index => filteredData[parseInt(index)]).filter(Boolean);
                                                generateGraph(selectedGraphType, selectedData);
                                            }
                                        }}
                                        disabled={!selectedGraphType}
                                        className="flex-1 px-4 py-2 bg-[#002B51] text-white rounded-md text-sm hover:bg-[#00004F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                        생성
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* 필터 팝업 */}
                    {showFilter && (
                        <>
                            <div
                                className="fixed inset-0 bg-black bg-opacity-30 z-40"
                                onClick={handleCancelFilters}
                            />
                            <div
                                className="absolute top-20 right-6 w-[480px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">필터</h3>
                                    <button onClick={handleResetFilters}
                                            className="text-sm text-blue-600 hover:underline">
                                        초기화
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* 왼쪽 컬럼 */}
                                    <div>
                                        {/* 카메라 선택 */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">카메라</label>
                                            <div className="space-y-1">
                                                {cameras.map(camera => (
                                                    <label key={camera} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={tempFilters.cameras.includes(camera)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setTempFilters({
                                                                        ...tempFilters,
                                                                        cameras: [...tempFilters.cameras, camera]
                                                                    });
                                                                } else {
                                                                    setTempFilters({
                                                                        ...tempFilters,
                                                                        cameras: tempFilters.cameras.filter(c => c !== camera)
                                                                    });
                                                                }
                                                            }}
                                                            className="mr-2"
                                                        />
                                                        <span className="text-sm">{camera}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 객체 유형 */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">객체
                                                유형</label>
                                            <div className="space-y-1">
                                                {objectTypes.map(type => (
                                                    <label key={type} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={tempFilters.objectTypes.includes(type)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setTempFilters({
                                                                        ...tempFilters,
                                                                        objectTypes: [...tempFilters.objectTypes, type]
                                                                    });
                                                                } else {
                                                                    setTempFilters({
                                                                        ...tempFilters,
                                                                        objectTypes: tempFilters.objectTypes.filter(t => t !== type)
                                                                    });
                                                                }
                                                            }}
                                                            className="mr-2"
                                                        />
                                                        <span className="text-sm">{type}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 시간대 */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">시간대</label>
                                            <div className="space-y-1">
                                                {timeSlots.map(slot => (
                                                    <label key={slot.id} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={tempFilters.timeSlots.includes(slot.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setTempFilters({
                                                                        ...tempFilters,
                                                                        timeSlots: [...tempFilters.timeSlots, slot.id]
                                                                    });
                                                                } else {
                                                                    setTempFilters({
                                                                        ...tempFilters,
                                                                        timeSlots: tempFilters.timeSlots.filter(s => s !== slot.id)
                                                                    });
                                                                }
                                                            }}
                                                            className="mr-2"
                                                        />
                                                        <span className="text-sm">{slot.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 오른쪽 컬럼 */}
                                    <div>
                                        {/* 이벤트 상태 */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">이벤트
                                                상태</label>
                                            <select
                                                value={tempFilters.eventStatus}
                                                onChange={(e) => setTempFilters({
                                                    ...tempFilters,
                                                    eventStatus: e.target.value as any
                                                })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                                                <option value="all">전체</option>
                                                <option value="occurred">이벤트 발생</option>
                                                <option value="not_occurred">이벤트 미발생</option>
                                            </select>
                                        </div>

                                        {/* 신호 상태 */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">신호
                                                상태</label>
                                            <select
                                                value={tempFilters.signalStatus}
                                                onChange={(e) => setTempFilters({
                                                    ...tempFilters,
                                                    signalStatus: e.target.value as any
                                                })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                                                <option value="all">전체</option>
                                                <option value="active">활성</option>
                                                <option value="inactive">비활성</option>
                                            </select>
                                        </div>

                                        {/* 정확도 필터 */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                정확도: {tempFilters.confidenceMin}% 이상
                                            </label>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs text-gray-500">0%</span>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={tempFilters.confidenceMin}
                                                    onChange={(e) => setTempFilters({
                                                        ...tempFilters,
                                                        confidenceMin: parseInt(e.target.value)
                                                    })}
                                                    className="flex-1"
                                                />
                                                <span className="text-xs text-gray-500">100%</span>
                                            </div>
                                        </div>

                                        {/* 날짜 범위 */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">날짜
                                                범위</label>
                                            <div className="space-y-2">
                                                <input
                                                    type="date"
                                                    value={tempFilters.dateFrom}
                                                    onChange={(e) => setTempFilters({
                                                        ...tempFilters,
                                                        dateFrom: e.target.value
                                                    })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                />
                                                <input
                                                    type="date"
                                                    value={tempFilters.dateTo}
                                                    onChange={(e) => setTempFilters({
                                                        ...tempFilters,
                                                        dateTo: e.target.value
                                                    })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* 정렬 옵션 */}
                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">정렬</label>
                                            <select
                                                value={tempFilters.sortBy}
                                                onChange={(e) => setTempFilters({
                                                    ...tempFilters,
                                                    sortBy: e.target.value as any
                                                })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                                                <option value="newest">최신순</option>
                                                <option value="oldest">오래된순</option>
                                                <option value="confidence_high">정확도 높은순</option>
                                                <option value="confidence_low">정확도 낮은순</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* 버튼 */}
                                <div className="flex space-x-2 mt-4">
                                    <button
                                        onClick={handleCancelFilters}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors">
                                        취소
                                    </button>
                                    <button
                                        onClick={handleApplyFilters}
                                        className="flex-1 px-4 py-2 bg-[#002B51] text-white rounded-md text-sm hover:bg-[#00004F] transition-colors">
                                        적용
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {chartData && (
                        <div className="mb-8 h-[540px]">
                            {currentChartType === 'bar' && <Bar options={chartOptions} data={chartData} height={100}/>}
                            {currentChartType === 'pie' && <Pie options={chartOptions} data={chartData} height={100}/>}
                            {currentChartType === 'line' && (
                                <Line options={chartOptions} data={chartData} height={100}/>
                            )}
                            {currentChartType === 'heatmap' && (
                                <ReactChart type="matrix" data={chartData} options={heatmapOptions} height={100} />
                            )}
                        </div>
                    )}


                    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id}
                                            className="px-4 py-3 text-left text-xs font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap">
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
                                        <td key={cell.id}
                                            className="px-4 py-3 text-xs text-gray-700 border-b border-gray-100 whitespace-nowrap">
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

                        <div
                            className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="text-sm text-gray-600">
                                    페이지당
                                </div>
                                <select
                                    value={table.getState().pagination.pageSize}
                                    onChange={e => {
                                        table.setPageSize(Number(e.target.value))
                                    }}
                                    className="px-3 py-1 border border-gray-300 rounded text-sm">
                                    {[10, 20, 30, 40, 50].map(pageSize => (
                                        <option key={pageSize} value={pageSize}>
                                            {pageSize}개씩
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="text-sm text-gray-600">
                                총 {filteredData.length}건
                                중 {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredData.length)} 표시
                            </div>

                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => table.setPageIndex(0)}
                                    disabled={!table.getCanPreviousPage()}
                                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    처음
                                </button>
                                <button
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    이전
                                </button>

                                <span className="flex items-center gap-1 text-sm">
                                    <div>페이지</div>
                                    <strong>
                                        {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
                                    </strong>
                                </span>

                                <button
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    다음
                                </button>
                                <button
                                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                    disabled={!table.getCanNextPage()}
                                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    마지막
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* LLM 입력 */}
                <div className="w-96 bg-white text-black border border-gray-300 rounded-lg p-4">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold mb-2">데이터 분석 도우미</h2>
                        <div className="flex h-24 items-center justify-center ml-28 mb-12 me-[100px] my-16">
                            <Lottie
                                animationData={lottieState === 'normal' ? llm0lottie : llm1lottie}
                                loop
                                play
                                style={{width: 180, height: 180}}
                            />
                        </div>
                        <div className="mt-3 p-3 bg-gray-100 rounded-lg text-xs bg-[#002B51]">
                            <p className="text-sm text-black font-bold ml-4">
                                자연어로 데이터를 분석하고 시각화할 수 있습니다.<br/><br/>
                            </p>
                            <strong>입력 예시:</strong><br/>
                            • "2025-06-05일의 객체 비율 그래프로 시각화해줘."<br/>
                            • "시간대별 감지 현황 라인 차트로 시각화해줘."
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
                            onClick={() => handleLLMSubmitTwoHop(llmInput)}
                            disabled={loading}
                            className="w-full px-5 py-2 bg-[#002B51] text-white rounded-md text-sm hover:bg-[#00004F] transition-colors"
                        >
                            {loading ? '처리중...' : '입력'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
}

export default Database;