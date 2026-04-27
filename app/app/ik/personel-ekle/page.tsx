'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePersonel } from '@/hooks/usePersonel'
import { useTeskilat } from '@/hooks/useTeskilat'
import { ibanToBanka } from '@/lib/utils'
import { Check, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const STEPS = [
  'Kişisel Bilgiler', 'İletişim', 'Eğitim',
  'İş Bilgileri', 'Aile', 'Kıyafet & Beden', 'Banka', 'Notlar'
]

const INP = 'w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-eden-navy text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-eden-blue/20 transition-all'
const SEL = INP
const LBL = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5'
const REQ = <span className="text-red-500 ml-0.5">*</span>

type FormData = Record<string, string | boolean>

export default function PersonelEklePage() {
  const router = useRouter()
  const { ekle } = usePersonel()
  const { birimler } = useTeskilat()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState<FormData>({
    ad:'', soyad:'', uyruk:'tc', tc_kimlik:'', cinsiyet:'erkek',
    dogum_yeri:'', dogum_tarihi:'', kan_grubu:'', askerlik_durumu:'',
    engellilik: false, hukumluluk: false,
    cep_telefonu:'', is_telefonu:'', ev_telefonu:'', email:'',
    adres:'', il:'', ilce:'',
    acil_kisi_ad:'', acil_kisi_soyad:'', acil_kisi_yakinlik:'', acil_kisi_telefon:'',
    sgk_giris:'', calisma_durumu:'gorevde', birim_id:'',
    ust_beden:'', alt_beden:'', ayakkabi:'', kep:'',
    iban:'', notlar:'',
  })
  const [ibanBanka, setIbanBanka] = useState('')

  function set(k: string, v: string | boolean) { setForm(f => ({...f, [k]: v})) }

  function goNext() {
    setDone(d => new Set(d).add(step))
    if (step < STEPS.length - 1) setStep(step + 1)
  }

  async function handleSave() {
    if (!form.ad || !form.soyad || !form.cinsiyet) {
      setErr('Ad, Soyad ve Cinsiyet zorunludur.'); return
    }
    setSaving(true)
    try {
      await ekle(form as any)
      router.push('/ik/personel')
    } catch (e: any) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const step0 = (
    <div className="grid grid-cols-2 gap-4">
      {[['ad','Adı',true],['soyad','Soyadı',true]].map(([k,l,r])=>(
        <div key={k as string}><label className={LBL}>{l as string}{r&&REQ}</label>
          <input className={INP} value={form[k as string] as string} onChange={e=>set(k as string,e.target.value)}/></div>
      ))}
      <div><label className={LBL}>Uyruğu{REQ}</label>
        <select className={SEL} value={form.uyruk as string} onChange={e=>set('uyruk',e.target.value)}>
          <option value="tc">T.C.</option><option value="yabanci">Yabancı Uyruklu</option>
        </select>
      </div>
      <div><label className={LBL}>TC Kimlik / Pasaport No{REQ}</label>
        <input className={INP} value={form.tc_kimlik as string} onChange={e=>set('tc_kimlik',e.target.value)} maxLength={11}/>
      </div>
      <div><label className={LBL}>Cinsiyeti{REQ}</label>
        <select className={SEL} value={form.cinsiyet as string} onChange={e=>set('cinsiyet',e.target.value)}>
          <option value="kadin">Kadın</option><option value="erkek">Erkek</option>
        </select>
      </div>
      <div><label className={LBL}>Askerlik Durumu</label>
        <select className={SEL} value={form.askerlik_durumu as string} onChange={e=>set('askerlik_durumu',e.target.value)}>
          <option value="">—</option>
          {['muaf','caginda_degil','tecilli','belirsiz','bakaya','yapti'].map(v=>(
            <option key={v} value={v}>{v.replace('_',' ')}</option>
          ))}
        </select>
      </div>
      <div><label className={LBL}>Doğum Yeri</label>
        <input className={INP} value={form.dogum_yeri as string} onChange={e=>set('dogum_yeri',e.target.value)}/>
      </div>
      <div><label className={LBL}>Doğum Tarihi</label>
        <input type="date" className={INP} value={form.dogum_tarihi as string} onChange={e=>set('dogum_tarihi',e.target.value)}/>
      </div>
      <div><label className={LBL}>Kan Grubu</label>
        <select className={SEL} value={form.kan_grubu as string} onChange={e=>set('kan_grubu',e.target.value)}>
          <option value="">—</option>
          {['A+','A-','B+','B-','AB+','AB-','0+','0-'].map(v=><option key={v}>{v}</option>)}
        </select>
      </div>
      <div><label className={LBL}>Engellilik Durumu</label>
        <select className={SEL} value={form.engellilik?'evet':'hayir'} onChange={e=>set('engellilik',e.target.value==='evet')}>
          <option value="hayir">Yok</option><option value="evet">Var</option>
        </select>
      </div>
      <div><label className={LBL}>Hükümlülük</label>
        <select className={SEL} value={form.hukumluluk?'evet':'hayir'} onChange={e=>set('hukumluluk',e.target.value==='evet')}>
          <option value="hayir">Hayır</option><option value="evet">Evet</option>
        </select>
      </div>
    </div>
  )

  const step1 = (
    <div className="grid grid-cols-2 gap-4">
      {[['cep_telefonu','Cep Telefonu','tel'],['is_telefonu','İş Telefonu','tel'],['ev_telefonu','Ev Telefonu','tel'],['email','E-posta','email']].map(([k,l,t])=>(
        <div key={k}><label className={LBL}>{l}</label>
          <input type={t} className={INP} value={form[k] as string} onChange={e=>set(k,e.target.value)}/></div>
      ))}
      <div className="col-span-2"><label className={LBL}>Ev Adresi</label>
        <input className={INP} value={form.adres as string} onChange={e=>set('adres',e.target.value)}/></div>
      <div><label className={LBL}>İl</label>
        <input className={INP} value={form.il as string} onChange={e=>set('il',e.target.value)}/></div>
      <div><label className={LBL}>İlçe</label>
        <input className={INP} value={form.ilce as string} onChange={e=>set('ilce',e.target.value)}/></div>
      <div className="col-span-2 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Acil Durumda Ulaşılacak Kişi</div>
        <div className="grid grid-cols-2 gap-4">
          {[['acil_kisi_ad','Adı',true],['acil_kisi_soyad','Soyadı',true],['acil_kisi_telefon','Telefon',true]].map(([k,l,r])=>(
            <div key={k as string}><label className={LBL}>{l as string}{r&&REQ}</label>
              <input className={INP} value={form[k as string] as string} onChange={e=>set(k as string,e.target.value)}/></div>
          ))}
          <div><label className={LBL}>Yakınlık{REQ}</label>
            <select className={SEL} value={form.acil_kisi_yakinlik as string} onChange={e=>set('acil_kisi_yakinlik',e.target.value)}>
              <option value="">—</option>
              {['Eş','Anne','Baba','Kardeş','Çocuk','Diğer'].map(v=><option key={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  )

  const step3 = (
    <div className="grid grid-cols-2 gap-4">
      <div><label className={LBL}>SGK Giriş Tarihi</label>
        <input type="date" className={INP} value={form.sgk_giris as string} onChange={e=>set('sgk_giris',e.target.value)}/>
      </div>
      <div><label className={LBL}>Çalışma Durumu</label>
        <select className={SEL} value={form.calisma_durumu as string} onChange={e=>set('calisma_durumu',e.target.value)}>
          <option value="gorevde">Görevde</option><option value="izinde">İzinde</option>
          <option value="ayrilmis">Ayrılmış</option><option value="askida">Askıda</option>
        </select>
      </div>
      <div><label className={LBL}>Birim</label>
        <select className={SEL} value={form.birim_id as string} onChange={e=>set('birim_id',e.target.value)}>
          <option value="">— Seçiniz —</option>
          {birimler.map(b=><option key={b.id} value={b.id}>{b.ad}</option>)}
        </select>
      </div>
    </div>
  )

  const step5 = (
    <div className="grid grid-cols-2 gap-4 max-w-sm">
      {[['ust_beden','Üst Beden'],['alt_beden','Alt Beden (32/32)'],['ayakkabi','Ayakkabı No'],['kep','Kep Ölçüsü']].map(([k,l])=>(
        <div key={k}><label className={LBL}>{l}</label>
          <input className={INP} value={form[k] as string} onChange={e=>set(k,e.target.value)}/></div>
      ))}
    </div>
  )

  const step6 = (
    <div className="max-w-sm space-y-3">
      <div><label className={LBL}>IBAN{REQ}</label>
        <input className={INP} value={form.iban as string} placeholder="TR00 0000 0000 0000 0000 0000 00"
          onChange={e=>{set('iban',e.target.value);setIbanBanka(ibanToBanka(e.target.value))}}/>
        {ibanBanka && (
          <div className="mt-2 text-xs px-3 py-2 bg-eden-green-lt text-green-800 rounded-lg">
            🏦 {ibanBanka}
          </div>
        )}
      </div>
    </div>
  )

  const step7 = (
    <div><label className={LBL}>Notlar</label>
      <textarea rows={5} className={`${INP} resize-none`} value={form.notlar as string}
        onChange={e=>set('notlar',e.target.value)} placeholder="Personelle ilgili serbest metin notlar..."/>
    </div>
  )

  const CONTENTS = [step0, step1,
    <div key="2" className="text-sm text-gray-400 py-8 text-center">Okul, yabancı dil ve sertifika bilgileri bu adımda tanımlanır.</div>,
    step3,
    <div key="4" className="text-sm text-gray-400 py-8 text-center">Medeni durum ve yakın bilgileri bu adımda tanımlanır.</div>,
    step5, step6, step7
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/ik/personel" className="btn btn-sm"><ArrowLeft size={13}/> Listeye Dön</Link>
        <h1 className="text-xl font-bold font-display text-gray-900 dark:text-white">Yeni Personel Ekle</h1>
      </div>

      <div className="card">
        {/* Wizard Steps */}
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 px-2">
          {STEPS.map((s, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap
                ${i === step ? 'border-eden-blue text-eden-blue'
                  : done.has(i) ? 'border-eden-green text-eden-green'
                  : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0
                ${i === step ? 'bg-eden-blue text-white'
                  : done.has(i) ? 'bg-eden-green text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                {done.has(i) ? <Check size={8}/> : i + 1}
              </span>
              {s}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">{CONTENTS[step]}</div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-400">
            {step + 1} / {STEPS.length} adım
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="btn">← Geri</button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={goNext} className="btn btn-primary">Kaydet ve İlerle →</button>
            ) : (
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Kaydediliyor...' : '✓ Personeli Kaydet'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
