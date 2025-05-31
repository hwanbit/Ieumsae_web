import Lottie from "react-lottie-player";

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

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    onLogout()
    navigate('/')
  }

  return (
      <div className="min-h-screen flex bg-white text-black">
        {/* 사이드 메뉴 고정 */}
        <div className="w-24 h-screen bg-white border-r-2 border-gray-200 fixed top-0 left-0 flex flex-col items-center py-6 justify-between">
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

        {/* 우측 메인 콘텐츠 */}
        <div className="flex flex-col flex-1 ml-24 min-h-screen">
          {/* 헤더 */}
          <header className="flex justify-between items-center p-4">
            <div className="text-xs">v1.0.1 (Beta)</div>
            <button
                onClick={handleLogout}
                className="bg-[rgb(0,0,79)] px-4 py-2 rounded-md hover:bg-blue-800 text-white text-sm"
            >
              Logout
            </button>
          </header>

          {/* 메인 콘텐츠 */}
          <main className="flex-grow px-8">
            <div className="flex items-center justify-center mb-12 me-[580px] my-16">
              <Lottie
                  animationData={buslottie}
                  loop
                  play
                  style={{ width: 180, height: 180 }}
              />
              <h1 className="text-4xl font-bold ml-4">
                오늘도, 당신의 안전을 지키는 이음새입니다.
              </h1>
            </div>

            <div className="bg-white p-6 rounded-lg mb-8 ms-[160px] my-8">
              <h2 className="text-xl font-bold mb-4">
                "사이드 메뉴를 통해 시스템의 주요 기능에 빠르게 접근할 수 있습니다. 각 아이콘은 다음과 같은 기능을 제공합니다."
              </h2>
              <ul className="space-y-4">
                <li className="flex items-center">
                  <img src={screenIcon} alt="Screen" className="w-6 h-6 mr-3" />
                  <span>
                대시보드 - 실시간 감지 화면과 객체 인식 결과를 한눈에 확인할 수 있는 종합 모니터링 공간입니다.
              </span>
                </li>
                <li className="flex items-center">
                  <img src={databaseIcon} alt="Database" className="w-6 h-6 mr-3" />
                  <span>
                데이터베이스 - 날짜, 카메라, 객체 유형별로 감지 로그를 검색하고 필터링할 수 있는 상세 데이터 조회 공간입니다.
              </span>
                </li>
                <li className="flex items-center">
                  <img src={homeIcon} alt="Home" className="w-6 h-6 mr-3" />
                  <span>
                홈 - 이음새 시스템의 기본 정보와 공지사항을 확인할 수 있는 메인 화면입니다.
              </span>
                </li>
                <li className="flex items-center">
                  <img src={logoutIcon} alt="Logout" className="w-6 h-6 mr-3" />
                  <span>
                로그아웃 - 시스템 사용을 종료하고 안전하게 로그아웃합니다.
              </span>
                </li>
              </ul>
            </div>
          </main>

          {/* 푸터 */}
          <footer className="bg-[rgb(0,0,79)] text-white px-4 py-6">
            <div className="text-center text-sm mb-2">
              본 시스템은 교차로 안전을 위한 연구 프로젝트의 일환으로 개발되었습니다.
            </div>
            <div className="text-center text-sm">
              이음새 connection@kopo.ac.kr © 2025 IEUMSAE Team. All rights reserved.
            </div>
            <div className="flex justify-center mt-4">
              <img src={member} alt="member" width="300px" />
            </div>
          </footer>
        </div>
      </div>
  );
}

export default Home