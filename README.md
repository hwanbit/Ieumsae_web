# 🚦 이음새 (Ieumsae) - 딥러닝기반 보행자 추적 모델을 적용한 교차로 안전 강화 시스템 개발

이음새는 딥러닝 모델을 통해 횡단보도의 객체(사람, 차량 등)를 실시간으로 탐지하고 수집된 데이터를 시각화하여 보여주는 프로젝트이며, 해당 코드는 관리자용 웹 대시보드입니다.

## ✨ 주요 기능

- **객체 탐지 현황**: 딥러닝 모델이 탐지한 사람, 차량, 버스 등의 객체 수를 실시간으로 집계하여 보여줍니다.
- **데이터 시각화**: 탐지된 객체 데이터를 시간대별, 날짜별로 집계하여 차트로 시각화합니다.
- **로그 데이터베이스**: 탐지된 모든 이벤트의 로그가 데이터베이스에 저장되고, 대시보드에서 조회할 수 있습니다.
- **날씨 및 상태 정보**: 대시보드에서 현재 위치의 날씨를 확인할 수 있습니다.

## 🛠️ 사용 기술

### Frontend (`/project`)

- **Framework**: React 19.1.0
- **Language**: TypeScript 5.8.3
- **Build Tool**: Vite 6.3.5
- **Styling**: Tailwind CSS 3.4.1
- **Routing**: React Router DOM 6.30.0
- **Data Fetching**: Axios 1.9.0
- **Data Visualization**: 
  - Chart.js 4.4.1
  - react-chartjs-2 5.2.0
  - Recharts 2.12.0
- **Animation**: lottie-web 5.13.0
- **Real-time Communication**: Socket.IO Client 4.8.1
- **Video Streaming**: 
  - react-player 2.16.0
  - hls.js 1.6.2
- **Utilities**:
  - date-fns 3.6.0
  - dotenv 16.5.0

### Backend (`/project/backend`)

- **Framework**: Flask 3.0.2
- **Database**: 
  - Flask-SQLAlchemy 3.1.1
  - mysql-connector-python 8.3.0
- **API**: RESTful API
- **Authentication**: PyJWT 2.8.1
- **Dependencies**:
  - Flask-Cors 4.0.0
  - python-dotenv 1.0.1

## 📂 프로젝트 구조

```
ieumsae_web/
└── project/
    ├── backend/             # Python Flask 서버
    │   ├── app.py           # 메인 Flask 애플리케이션
    │   └── requirements.txt # 백엔드 의존성
    ├── src/                 # React 프론트엔드 소스코드
    │   ├── components/      # React 컴포넌트 (대시보드, 로그인, DB 등)
    │   ├── assets/          # 로고, 아이콘, Lottie 애니메이션 파일
    │   └── App.tsx          # 메인 애플리케이션 컴포넌트
    ├── package.json         # 프론트엔드 의존성 및 스크립트
    └── tailwind.config.js   # Tailwind CSS 설정
```

## 🚀 시작하기

### 1. 사전 준비: OpenWeatherMap API 키 발급

이 프로젝트는 대시보드에 현재 날씨 정보를 표시하기 위해 OpenWeatherMap API를 사용합니다. 정상적인 실행을 위해서는 API 키를 발급받아 설정해야 합니다.

1. [OpenWeatherMap](https://openweathermap.org/) 사이트에 접속하여 회원가입 후, 무료 API 키를 발급받으세요.
2. 프론트엔드 프로젝트의 루트 디렉토리 (`/project`)에 `.env` 파일을 생성합니다.
3. 생성한 `.env` 파일에 아래와 같이 발급받은 API 키를 추가합니다.

```env
VITE_OPENWEATHERMAP_API_KEY="여기에_발급받은_API_키를_입력하세요"
```

> ⚠️ **중요**: `.env` 파일에 `VITE_` 접두사를 붙여야 React(Vite) 환경에서 환경 변수를 정상적으로 인식할 수 있습니다. `Dashboard.tsx` 파일 내에서 이 키를 사용하여 날씨 데이터를 호출합니다.

### 2. 레포지토리 클론

```bash
git clone <https://github.com/hwanbit/Ieumsae_web.git>
cd ieumsae_web/project
```

### 3. 백엔드 서버 실행

```bash
# 1. 백엔드 디렉토리로 이동
cd backend

# 2. conda 가상환경 생성 및 활성화 (권장)
conda create -n ieumsae python=3.10
conda activate ieumsae

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 서버 실행
flask run
```

### 4. 프론트엔드 실행

```bash
# 1. 프론트엔드 루트 디렉토리(/project)로 이동
cd ..

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행
npm run dev
```

이제 브라우저에서 `http://localhost:5173` (Vite 기본 포트)으로 접속하여 대시보드를 확인할 수 있습니다.

## 📊 주요 컴포넌트

- **Home**: 프로젝트 설명 페이지
- **Login**: 관리자 로그인 페이지
- **Dashboard**: 실시간 객체 탐지 현황 및 실시간 로그 확인
- **Database**: 로그 데이터베이스 조회 및 데이터 시각화

## 🔌 API 구조

백엔드 Flask 서버는 RESTful API를 제공하며, 프론트엔드에서 Axios를 통해 데이터를 요청합니다.

- 객체 탐지 데이터 조회
- 로그 데이터 저장 및 조회
- 시스템 상태 정보 제공

---

<img height="50" alt="Image" src="https://github.com/user-attachments/assets/7f4e2e8c-5341-4ac7-9147-19801dcaca51" />
