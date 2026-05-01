# Eden ERP Süreç Motoru Mimarisi

## Genel Bakış

Eden ERP'nin süreç motoru, formlar üzerinden veri girişi/düzenlemesi işlemlerini onay süreçlerinden geçirmek için tasarlanmıştır. Süreçler, teşkilat yapısındaki kişi, kadro veya roller bazlı olarak tanımlanabilir.

## Temel İlkeler

### 1. Form = SQL Arayüzü
- Formlar, SQL sorgularının kullanıcı dostu arayüz karşılığıdır
- Her form bir veritabanı tablosu/entity ile eşleşir
- Süreçler form submit işlemlerini (INSERT/UPDATE) intercept eder

### 2. Onay Nesneleri
- Veritabanı satırı oluşturma (INSERT)
- Veritabanı satırı düzenleme (UPDATE)
- Form submit işlemi süreç onayından geçer

### 3. Açık Kaynak BPM Motoru
- **Camunda BPMN** veya **Flowable** tercih edilebilir
- BPMN 2.0 standardı desteklenir
- JSON-based süreç tanımları kullanılabilir (sadeleştirilmiş)

## Süreç Tanımı Yapısı

### Süreç Başlık Bilgileri

```typescript
interface WorkflowDefinition {
  id: string
  company_id: string           // Hangi şirket için
  form_id: string              // Hangi form
  mode: 'create' | 'update' | 'both'  // Hangi mod/lar
  
  name: string
  description?: string
  is_active: boolean
  priority: 'low' | 'normal' | 'high' | 'critical'
  
  created_at: Date
  updated_at: Date
  created_by: string
}
```

### Süreç Aşamaları (Steps)

```typescript
interface WorkflowStep {
  id: string
  workflow_id: string
  
  order_index: number          // Sıralama (1, 2, 3...)
  name: string                 // "Birim Amiri Onayı"
  description?: string
  
  // Onaylayıcı Tipi
  approver_type: 'person' | 'position' | 'role'
  
  // Onaylayıcı Tanımı
  approver_config: {
    // Tip: person
    person_id?: string
    
    // Tip: position (Kadro)
    position_id?: string
    relative_rule?: 'self' | 'parent' | 'sibling' | 'child' | number  // nispi kural
    // Örnek: 'parent' = üst birim amiri, 2 = 2 seviye yukarıdaki amir
    
    // Tip: role
    role_id?: string
    scope?: 'company' | 'department' | 'tree'  // rolün geçerlilik alanı
  }
  
  // Onay Mantığı (Kadro/Rol için)
  approval_logic: 'any' | 'all' | 'percentage'
  approval_threshold?: number  // percentage için (örn: 50 = %50'si)
  
  // Zaman Aşımı
  timeout_hours?: number       // 48 = 2 gün
  timeout_action: 'escalate' | 'auto_approve' | 'reject'
  escalate_to?: string         // timeout'ta kime gitmeli (position/role/person)
  
  // Koşullu Geçiş
  condition?: string          // JSON Logic: {"and": [{"var": "amount"}, {">": 10000}]}
  
  // Aksiyonlar
  actions: {
    on_approve: WorkflowAction[]
    on_reject: WorkflowAction[]
    on_timeout: WorkflowAction[]
  }
}
```

### Kadro Nispi Kuralları

```typescript
// Örnek: Personelin kendi kadrosu
relative_rule: 'self'

// Örnek: Üst birim amiri (bir seviye yukarı)
relative_rule: 'parent'

// Örnek: İki seviye yukarıdaki amir
relative_rule: 2

// Örnek: Aynı seviyedeki eşdeğer kadro
relative_rule: 'sibling'

// Örnek: Alt birim amiri
relative_rule: 'child'
```

## Teşkilat Yapısı (Süreç Motoru İçin)

### Birimler (Departments)
- Hiyerarşik ağaç yapısı
- Her birimin bir "parent_id" si olabilir
- Şirket bazlı izolasyon

### Kadrolar (Positions)
- Birimlere bağlı
- Nispi kurallar için kullanılır
- Örnek: "Yazılım Birim Amiri", "Finans Müdürü"

### Roller (Roles)
- Kadrolardan bağımsız yetki grupları
- Kişilere atanır
- Örnek: "Sistem Yöneticisi", "Onay Yetkilisi"

### Kadro-Rol İlişkisi
```typescript
// Bir kişinin hem kadrosu hem rol(ler)i olabilir
interface PersonAssignment {
  person_id: string
  company_id: string
  
  // Aktif kadro atamaları
  positions: {
    position_id: string
    department_id: string
    is_primary: boolean      // Ana kadro mu?
    start_date: Date
    end_date?: Date
  }[]
  
  // Rol atamaları
  roles: {
    role_id: string
    scope_department_id?: string  // Rolün geçerli olduğu birim
    start_date: Date
    end_date?: Date
  }[]
}
```

## Süreç Çalışma Mantığı

### 1. Süreç Başlatma
```typescript
// Form submit edildiğinde
async function onFormSubmit(formData: FormData, mode: 'create' | 'update') {
  // 1. Bu form için aktif süreç var mı?
  const workflow = await getActiveWorkflow(formId, companyId, mode)
  
  if (!workflow) {
    // Süreç yoksa direkt kaydet
    return await saveToDatabase(formData, mode)
  }
  
  // 2. Süreç instance'ı oluştur
  const instance = await createWorkflowInstance({
    workflow_id: workflow.id,
    form_data: formData,
    submit_mode: mode,
    submitted_by: currentUser.id,
    status: 'pending'
  })
  
  // 3. İlk aşamayı hesapla ve onaylayıcıları bul
  await activateStep(instance.id, workflow.steps[0])
}
```

### 2. Aşama Aktivasyonu
```typescript
async function activateStep(instanceId: string, step: WorkflowStep) {
  // Onaylayıcıları belirle
  const approvers = await resolveApprovers(step, instance.form_data)
  
  // Onay kayıtları oluştur
  for (const approver of approvers) {
    await createApprovalTask({
      instance_id: instanceId,
      step_id: step.id,
      approver_type: step.approver_type,
      approver_id: approver.id,
      status: 'pending',
      due_date: calculateDueDate(step.timeout_hours)
    })
  }
  
  // Bildirim gönder
  await sendNotifications(approvers, instanceId, step)
}
```

### 3. Onaylayıcı Çözümleme
```typescript
async function resolveApprovers(step: WorkflowStep, formData: any) {
  switch (step.approver_type) {
    case 'person':
      return [await getPerson(step.approver_config.person_id)]
      
    case 'position':
      // Nispi kuralı uygula
      const targetPosition = await resolveRelativePosition(
        step.approver_config.position_id,
        step.approver_config.relative_rule,
        formData.submitter_department_id
      )
      return await getPersonsInPosition(targetPosition.id)
      
    case 'role':
      return await getPersonsWithRole(
        step.approver_config.role_id,
        step.approver_config.scope,
        formData.submitter_department_id
      )
  }
}
```

### 4. Onay/Red İşlemi
```typescript
async function processApproval(
  taskId: string, 
  decision: 'approve' | 'reject',
  comment?: string
) {
  // 1. Task'i güncelle
  await updateTask(taskId, {
    status: decision,
    comment,
    decided_at: new Date(),
    decided_by: currentUser.id
  })
  
  // 2. Aşamanın durumunu kontrol et
  const stepStatus = await checkStepCompletion(taskId)
  
  if (stepStatus === 'completed') {
    // 3. Sonraki aşamaya geç veya süreci tamamla
    await proceedToNextStep(taskId)
  } else if (stepStatus === 'rejected') {
    // 4. Süreci reddet
    await rejectWorkflow(taskId)
  }
  // 'pending' = hala bekleniyor (çoklu onay durumu)
}
```

## Bildirim Sistemi

### Header Bildirim Çanı
```typescript
// Realtime bildirimler (WebSocket / Server-Sent Events)
interface Notification {
  id: string
  type: 'approval_required' | 'approved' | 'rejected' | 'timeout' | 'escalated'
  
  // İçerik
  title: string
  message: string
  
  // Bağlantı
  workflow_instance_id: string
  target_url: string           // "/app/ik/personel" gibi
  
  // Durum
  is_read: boolean
  created_at: Date
  
  // Actor
  actor_name?: string          // Kim onayladı/reddetti
}
```

### Bildirim Listesi Ekranı
Çan ikonuna tıklandığında açılan dropdown:
- Bekleyen onaylar (pending approval tasks)
- Son bildirimler (read/unread)
- "Tümünü Gör" linki → Detaylı bildirim sayfası

### Bildirim Tipleri
1. **approval_required**: Size atanmış onay bekleyen süreç
2. **approved**: Takip ettiğiniz süreç onaylandı
3. **rejected**: Takip ettiğiniz süreç reddedildi
4. **timeout**: Onay süreniz doldu, eskalasyon yapıldı
5. **escalated**: Size eskale edilmiş süreç

## BPM Motor Entegrasyonu

### Seçenek 1: Camunda BPMN
```typescript
// Camunda REST API entegrasyonu
class CamundaWorkflowEngine {
  async deployProcess(bpmnXml: string) {
    // BPMN XML'i deploy et
  }
  
  async startProcess(processKey: string, variables: any) {
    // Süreç başlat
  }
  
  async completeTask(taskId: string, variables: any) {
    // User task'i tamamla
  }
}
```

### Seçenek 2: Flowable
```typescript
// Flowable REST API
class FlowableWorkflowEngine {
  // Benzer API
}
```

### Seçenek 3: Özel Basit Motor (JSON-based)
Süreçler basit kalacaksa özel bir implementasyon:
```typescript
// Veritabanı tabanlı state machine
class SimpleWorkflowEngine {
  // Süreç durumlarını DB'de tut
  // Step geçişlerini manuel yönet
}
```

## Veritabanı Şeması

### Ana Tablolar
```sql
-- Süreç Tanımları
CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  form_id VARCHAR(100),          -- Entity/form adı
  mode VARCHAR(20),              -- 'create', 'update', 'both'
  name VARCHAR(200),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  priority VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Süreç Aşamaları
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  order_index INTEGER,
  name VARCHAR(200),
  description TEXT,
  approver_type VARCHAR(20),     -- 'person', 'position', 'role'
  approver_config JSONB,         -- Detay yapılandırma
  approval_logic VARCHAR(20) DEFAULT 'any',  -- 'any', 'all', 'percentage'
  approval_threshold INTEGER,    -- Yüzde için
  timeout_hours INTEGER,
  timeout_action VARCHAR(20),    -- 'escalate', 'auto_approve', 'reject'
  escalate_to JSONB,             -- Eskalasyon hedefi
  condition JSONB,               -- Koşullu geçiş
  actions JSONB                  -- Aksiyonlar
);

-- Süreç Instance'ları
CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id),
  company_id UUID REFERENCES companies(id),
  
  -- Form verisi
  form_id VARCHAR(100),
  form_data JSONB,               -- Formun tam içeriği
  submit_mode VARCHAR(20),       -- 'create' veya 'update'
  
  -- Durum
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'timeout'
  current_step_id UUID,
  
  -- Actorler
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMP DEFAULT NOW(),
  
  completed_at TIMESTAMP,
  final_action VARCHAR(20),      -- 'approved', 'rejected'
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Onay Görevleri
CREATE TABLE approval_tasks (
  id UUID PRIMARY KEY,
  instance_id UUID REFERENCES workflow_instances(id),
  step_id UUID REFERENCES workflow_steps(id),
  
  -- Onaylayıcı
  approver_type VARCHAR(20),
  approver_id UUID,              -- person, position veya role ID
  
  -- Durum
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'timeout'
  
  -- Karar
  decision VARCHAR(20),          -- 'approve', 'reject'
  comment TEXT,
  decided_at TIMESTAMP,
  decided_by UUID REFERENCES auth.users(id),
  
  -- Zaman
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bildirimler
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type VARCHAR(50),
  
  title VARCHAR(200),
  message TEXT,
  
  instance_id UUID REFERENCES workflow_instances(id),
  target_url VARCHAR(500),
  
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

-- Kadro Atamaları (Mevcut tabloya eklenecek)
ALTER TABLE personel_positions ADD COLUMN IF NOT EXISTS relative_level INTEGER DEFAULT 0;
-- 0 = kendi birimi, 1 = üst birim, -1 = alt birim
```

## Implementasyon Adımları

### Faz 1: Temel Altyapı
1. Teşkilat tablolarını tamamla (birimler, kadrolar)
2. Rol yönetimi modülünü oluştur
3. Personel-kadro-rol atama ilişkisini kur

### Faz 2: Süreç Motoru
4. BPM motor seçimi ve entegrasyonu
5. Süreç tanımı UI'sı (Form → Süreç eşleştirme)
6. Aşama tanımı ekranı

### Faz 3: Çalışma Zamanı
7. Form submit interceptor
8. Süreç instance oluşturma
9. Onaylayıcı çözümleme mantığı

### Faz 4: Bildirimler
10. Bildirim servisi
11. Header bildirim çanı
12. Onay listesi ekranı

### Faz 5: İlerletme
13. Zaman aşımı yönetimi
14. Eskalasyon mekanizması
15. Raporlama ve dashboard

## Notlar

- **Çok Şirketli**: Her şirket kendi süreç tanımlarını yapabilir
- **Form Versiyonlama**: Form yapısı değişirse mevcut süreçler nasıl davranacak?
- **Performans**: Çoklu onay durumları için batch işlemler optimize edilmeli
- **Audit Log**: Tüm onay/red kararları detaylı loglanmalı (SOX uyumluluğu için)
