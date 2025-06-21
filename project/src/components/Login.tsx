import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import logo from '../assets/ieumsae_logo.png'

interface LoginFormData {
  username: string
  password: string
}

interface LoginResponse {
  token: string
  message: string
}

interface LoginProps {
  onLogin: () => void  // 부모로부터 받는 인증 갱신 콜백
}

function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: ''
  })
  const [error, setError] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch('http://192.168.24.183:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data: LoginResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Login failed')
      }

      sessionStorage.setItem('token', data.token)
      onLogin()  // 인증 상태 갱신
      navigate('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md p-8 space-y-6">
          <div className="flex justify-center mb-8">
            <img src={logo} alt="logo" width="100px" style={{ border: "1px solid white" }} />
          </div>

          {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="USERNAME"
                  className="w-full px-4 py-3 bg-[#002B51] bg-opacity-10 border border-white border-opacity-20 rounded text-white text-sm placeholder-white placeholder-opacity-50 focus:outline-none focus:border-opacity-50"
              />
            </div>

            <div>
              <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="PASSWORD"
                  className="w-full px-4 py-3 bg-[#002B51] bg-opacity-10 border border-white border-opacity-20 rounded text-white text-sm placeholder-white placeholder-opacity-50 focus:outline-none focus:border-opacity-50"
              />
            </div>

            <button
                type="submit"
                className="w-full py-3 bg-white text-secondary text-sm font-bold rounded hover:bg-opacity-90 transition-colors"
            >
              LOGIN
            </button>
          </form>

          <p className="text-center text-white text-opacity-100 text-sm">
            로그인 문의 : connection@office.kopo.ac.kr
          </p>
        </div>
      </div>
  )
}

export default Login