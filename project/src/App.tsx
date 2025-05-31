import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './components/Login'
import Home from './components/Home'
import Dashboard from './components/Dashboard'
import HLSPlayer from "./components/HLSPlayer"
import Database from "./components/Database.tsx";

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(!!sessionStorage.getItem('token'))

    // 인증 상태가 바뀌는 걸 감지하도록 Storage 이벤트 처리
    useEffect(() => {
        const checkAuth = () => setIsAuthenticated(!!sessionStorage.getItem('token'))
        window.addEventListener('storage', checkAuth)
        return () => window.removeEventListener('storage', checkAuth)
    }, [])

    return (
        <Router>
            <Routes>
                <Route
                    path="/"
                    element={
                        isAuthenticated ? <Navigate to="/home" /> : <Login onLogin={() => setIsAuthenticated(true)} />
                    }
                />
                <Route
                    path="/home"
                    element={
                        isAuthenticated
                            ? <Home onLogout={() => setIsAuthenticated(false)} />
                            : <Navigate to="/" />
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        isAuthenticated ? <Dashboard onLogout={() => setIsAuthenticated(false)} /> : <Navigate to="/" />
                    }
                />
                <Route
                    path="/hls"
                    element={
                        isAuthenticated ? <HLSPlayer /> : <Navigate to="/" />
                    }
                />
                <Route
                    path="/database"
                    element={
                        isAuthenticated ? <Database /> : <Navigate to="/" />
                    }
                />
            </Routes>
        </Router>
    )
}

export default App
