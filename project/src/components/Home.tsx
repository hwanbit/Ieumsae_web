import Lottie from "react-lottie-player";

import {useState} from "react";
import { useNavigate } from 'react-router-dom'
import screenIcon from '../assets/screen.svg'
import databaseIcon from '../assets/database.svg'
import homeIcon from '../assets/home.svg'
import logoutIcon from '../assets/logout.svg'

import logo from '../assets/ieumsae_logo.png'
import member from '../assets/ieumsae_person.png'
import buslottie from '../assets/bus_lottie.json'

function Home({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    onLogout()
    navigate('/')
  }

  return (
      <div className="min-h-screen bg-white text-black flex">
        {/* 모바일 메뉴 버튼 */}
        <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-gray-300 rounded-lg shadow-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

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

        {/* 메인 콘텐츠 */}
        <div className="flex flex-col flex-1 lg:ml-24 min-h-screen">
          {/* 헤더 */}
          <header className="flex justify-between items-center p-4 pt-16 lg:pt-4">
            <div className="text-xs">v1.0.1 (Beta)</div>
            <button
                onClick={handleLogout}
                className="bg-[rgb(0,0,79)] px-4 py-2 rounded-md hover:bg-blue-800 text-white text-sm"
            >
              Logout
            </button>
          </header>

          {/* 메인 콘텐츠 */}
          <main className="flex-grow px-4 lg:px-8">
            {/* 타이틀 섹션 */}
            <div className="flex flex-col lg:flex-row items-center justify-center mb-8 lg:mb-12 lg:mr-[580px] my-8 lg:my-16">
              <div className="mb-4 lg:mb-0">
                <Lottie
                    animationData={buslottie}
                    loop
                    play
                    style={{
                      width: window.innerWidth < 768 ? 120 : 180,
                      height: window.innerWidth < 768 ? 120 : 180
                    }}
                />
              </div>
              <h1 className="text-xl lg:text-4xl font-bold lg:ml-4 text-center lg:text-left">
                오늘도, 당신의 안전을 지키는 이음새입니다.
              </h1>
            </div>

            {/* 기능 설명 섹션 */}
            <div className="bg-white p-4 lg:p-6 rounded-lg mb-8 lg:ml-[160px] my-8 shadow-sm border border-gray-100">
              <h2 className="text-sm lg:text-xl font-bold mb-4 text-center lg:text-left">
                "사이드 메뉴를 통해 시스템의 주요 기능에 빠르게 접근할 수 있습니다. 각 아이콘은 다음과 같은 기능을 제공합니다."
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start lg:items-center">
                  <img src={screenIcon} alt="Screen" className="w-6 h-6 mr-3 flex-shrink-0 mt-1 lg:mt-0" />
                  <span className="text-sm lg:text-base leading-relaxed">
                  대시보드 - 실시간 감지 화면과 객체 인식 결과를 한눈에 확인할 수 있는 종합 모니터링 공간입니다.
                </span>
                </li>
                <li className="flex items-start lg:items-center">
                  <img src={databaseIcon} alt="Database" className="w-6 h-6 mr-3 flex-shrink-0 mt-1 lg:mt-0" />
                  <span className="text-sm lg:text-base leading-relaxed">
                  데이터베이스 - 날짜, 카메라, 객체 유형별로 감지 로그를 검색하고 필터링할 수 있는 상세 데이터 조회 공간입니다.
                </span>
                </li>
                <li className="flex items-start lg:items-center">
                  <img src={homeIcon} alt="Home" className="w-6 h-6 mr-3 flex-shrink-0 mt-1 lg:mt-0" />
                  <span className="text-sm lg:text-base leading-relaxed">
                  홈 - 이음새 시스템의 기본 정보와 공지사항을 확인할 수 있는 메인 화면입니다.
                </span>
                </li>
                <li className="flex items-start lg:items-center">
                  <img src={logoutIcon} alt="Logout" className="w-6 h-6 mr-3 flex-shrink-0 mt-1 lg:mt-0" />
                  <span className="text-sm lg:text-base leading-relaxed">
                  로그아웃 - 시스템 사용을 종료하고 안전하게 로그아웃합니다.
                </span>
                </li>
              </ul>
            </div>
          </main>

          {/* 푸터 */}
          <footer className="bg-[rgb(0,0,79)] text-white px-4 py-4 lg:py-6">
            <div className="text-center text-xs lg:text-sm mb-2">
              본 시스템은 교차로 안전을 위한 연구 프로젝트의 일환으로 개발되었습니다.
            </div>
            <div className="text-center text-xs lg:text-sm mb-4">
              <div className="block lg:inline">이음새: connection@office.kopo.ac.kr</div>
              <div className="block lg:inline lg:ml-4">© 2025 IEUMSAE Team. All rights reserved.</div>
            </div>
            <div className="flex justify-center">
              <img
                  src={member}
                  alt="member"
                  className="w-full max-w-[200px] lg:max-w-[300px] h-auto"
              />
            </div>
          </footer>
        </div>
      </div>
  );
}

export default Home