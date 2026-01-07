'use client';

import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Package } from 'lucide-react';

export interface LoginScreenProps {
  onLogin: (role: 'admin' | 'staff') => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation - in production, this would validate against a backend
    if (username === 'admin' && password === 'admin123') {
      onLogin('admin');
    } else if (username === 'staff' && password === 'staff123') {
      onLogin('staff');
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Package className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-gray-900 mb-2">SIMS-AI</h1>
          <p className="text-gray-600">Smart Inventory Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          
          <Input
            label="Password"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-gray-700 mb-2">Demo Credentials:</p>
          <p className="text-gray-600">Admin: admin / admin123</p>
          <p className="text-gray-600">Staff: staff / staff123</p>
        </div>
      </div>
    </div>
  );
}