'use client'
import { useState } from 'react'

export default function TestPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-4">Test Sayfası</h1>
      
      <button
        onClick={() => setModalOpen(true)}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold text-lg"
      >
        MODAL AÇ
      </button>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold mb-4">Test Modal</h2>
            <p className="mb-6">Bu modal açıldı!</p>
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
