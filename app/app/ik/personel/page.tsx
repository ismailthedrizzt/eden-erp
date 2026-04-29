'use client'

import { useState } from 'react'

export default function CalisanlarPage() {
  const [modalOpen, setModalOpen] = useState(false)

  console.log('=== CalisanlarPage RENDER EDILDI - DOĞRU DOSYA ===')

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-4 text-red-600">ÇALIŞANLAR - DOĞRU DOSYA</h1>
      
      <button
        onClick={() => {
          console.log('=== BUTONA TIKLANDI ===')
          setModalOpen(true)
        }}
        className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold text-lg"
      >
        PERSONEL EKLE
      </button>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold mb-4">Personel Ekle</h2>
            <p className="mb-6">Personel ekleme modalı açıldı!</p>
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
