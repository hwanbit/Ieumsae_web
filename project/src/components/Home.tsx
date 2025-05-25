import Lottie from "react-lottie-player";

import { useNavigate } from 'react-router-dom'
import screenIcon from '../assets/screen.svg'
import databaseIcon from '../assets/database.svg'
import homeIcon from '../assets/home.svg'
import logoutIcon from '../assets/logout.svg'

import logo from '../assets/ieumsae_logo.png'
import member from '../assets/ieumsae_person.png'
import buslottie from '../assets/bus_lottie.json' // 로티 사용법 확인하기

function Home({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    onLogout()
    navigate('/')
  }

  return (
      <div className="min-h-screen bg-white text-black flex">
        {/* Left Menu Bar */}
        <div className="w-20 bg-gray-100 flex flex-col items-center py-6 space-y-8">
          <img src={logo} alt="logo" className="w-8 h-8"/>
          <nav className="flex flex-col space-y-6">
            <button className="p-3 hover:bg-[rgba(112,174,248,0.3)] rounded-lg transition-colors">
              <img src={screenIcon} alt="Monitor" className="w-6 h-6"/>
            </button>
            <button className="p-3 hover:bg-[rgba(112,174,248,0.3)] rounded-lg transition-colors">
              <img src={databaseIcon} alt="Database" className="w-6 h-6"/>
            </button>
            <button className="p-3 hover:bg-[rgba(112,174,248,0.3)] rounded-lg transition-colors">
              <img src={homeIcon} alt="Home" className="w-6 h-6"/>
            </button>
            <button
                onClick={handleLogout}
                className="p-3 hover:bg-[rgba(112,174,248,0.3)] rounded-lg transition-colors">
              <img src={logoutIcon} alt="Logout" className="w-6 h-6"/>
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <header className="flex justify-between items-center p-4">
          <div className="text-xs">VER 1.0.1</div>
        <button
          onClick={handleLogout}
          className="bg-[rgb(0,0,79)] px-4 py-2 rounded-md hover:bg-blue-800 text-white text-sm"
        >
          Logout
        </button>
      </header>

      {/* Main Content */}
          <main className="p-8">
            <div className="flex items-center justify-center mb-12">
              <Lottie
                  animationData={buslottie}
                  loop
                  play
                  style={{width: 180, height: 180}}
              />
              <h1 className="text-2xl ml-4">오늘도, 당신의 안전을 지키는 이음새입니다.</h1>
            </div>

            <div className="bg-white p-6 rounded-lg mb-8">
              <h2 className="text-xl mb-4">"사이드 메뉴를 통해 시스템의 주요 기능에 빠르게 접근할 수 있습니다. 각 아이콘은 다음과 같은 기능을 제공합니다."</h2>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <img src={screenIcon} alt="Screen" className="w-6 h-6 mr-3"/>
                  <span>대시보드 - 실시간 감지 화면과 객체 인식 결과를 한눈에 확인할 수 있는 종합 모니터링 공간입니다.</span>
                </li>
                <li className="flex items-center">
                  <img src={databaseIcon} alt="Database" className="w-6 h-6 mr-3"/>
                  <span>데이터베이스 - 날짜, 카메라, 객체 유형별로 감지 로그를 검색하고 필터링할 수 있는 상세 데이터 조회 공간입니다.</span>
                </li>
                <li className="flex items-center">
                  <img src={homeIcon} alt="Home" className="w-6 h-6 mr-3"/>
                  <span>홈 - 이음새 시스템의 기본 정보와 공지사항을 확인할 수 있는 메인 화면입니다.</span>
                </li>
                <li className="flex items-center">
                  <img src={logoutIcon} alt="Logout" className="w-6 h-6 mr-3"/>
                  <span>로그아웃 - 시스템 사용을 종료하고 안전하게 로그아웃합니다.</span>
                </li>
              </ul>
            </div>

            <div className="bg-[rgb(0,0,79)] text-white flex justify-center space-x-12 mt-8">
              <p className="text-center text-sm mb-4">본 시스템은 교차로 안전을 위한 연구 프로젝트의 일환으로 개발되었습니다.</p>
              <p className="text-center text-sm">이음새 connection@office.kopo.ac.kr ©2025 IEUMSAE Team. All rights
                reserved.</p>
              <div className="flex justify-center space-x-12 mt-8">
                      <span><img src={member} alt="member" width="300px"/></span>
                    </div>
              </div>
          </main>
        </div>
      </div>
)
}

export default Home