'use client'

/**
 * DocumentSlotUploader Demo Page
 * 
 * Shows the component in multiple states:
 * 1. Empty State
 * 2. Uploaded State (with file type icons)
 * 3. Multiple Slots with Navigation
 * 4. Interactive Demo
 * 5. Read-only Mode
 * 6. Extra Slot (Custom Name)
 */

import { useState } from 'react'
import { DocumentSlotUploader, DocumentSlot, SlotDocument } from '@/components/ui/DocumentSlotUploader'
import { ArrowLeft, FileText, FileSpreadsheet, Presentation, FileArchive } from 'lucide-react'
import Link from 'next/link'

// Demo slots
const documentSlots: DocumentSlot[] = [
  { 
    id: 'contract', 
    title: 'Employment Contract', 
    required: true,
    description: 'Signed employment agreement'
  },
  { 
    id: 'nda', 
    title: 'NDA Agreement', 
    required: true,
    description: 'Non-disclosure agreement'
  },
  { 
    id: 'id_doc', 
    title: 'Identity Document', 
    required: false,
    description: 'ID card or passport'
  },
  { 
    id: 'cv', 
    title: 'CV / Resume', 
    required: false,
    description: 'Current resume'
  },
]

// Demo uploaded documents
const uploadedDocuments: SlotDocument[] = [
  {
    slotId: 'contract',
    name: 'Employment_Contract_2024.pdf',
    size: 2450000,
    type: 'application/pdf',
    uploadedAt: new Date('2024-01-15')
  },
  {
    slotId: 'nda',
    name: 'NDA_Agreement_Jan2024.docx',
    size: 125000,
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    uploadedAt: new Date('2024-01-10')
  },
]

export default function DocumentSlotUploaderDemo() {
  // State for interactive demo
  const [demoDocuments, setDemoDocuments] = useState<SlotDocument[]>([])
  const [readonlyDocuments] = useState<SlotDocument[]>(uploadedDocuments)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft size={20} />
          Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          DocumentSlotUploader Component
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enterprise-grade document upload component for ERP systems
        </p>
      </div>

      {/* File Type Legend */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Supported File Types
          </h3>
          <div className="flex flex-wrap gap-4">
            <FileTypeBadge 
              icon={FileText} 
              label="PDF" 
              color="text-red-600" 
              bgColor="bg-red-50 dark:bg-red-900/20" 
            />
            <FileTypeBadge 
              icon={FileText} 
              label="Word" 
              color="text-blue-600" 
              bgColor="bg-blue-50 dark:bg-blue-900/20" 
            />
            <FileTypeBadge 
              icon={FileSpreadsheet} 
              label="Excel" 
              color="text-green-600" 
              bgColor="bg-green-50 dark:bg-green-900/20" 
            />
            <FileTypeBadge 
              icon={Presentation} 
              label="PowerPoint" 
              color="text-orange-600" 
              bgColor="bg-orange-50 dark:bg-orange-900/20" 
            />
            <FileTypeBadge 
              icon={FileArchive} 
              label="ZIP" 
              color="text-purple-600" 
              bgColor="bg-purple-50 dark:bg-purple-900/20" 
            />
          </div>
        </div>
      </div>

      {/* Demo Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* State 1: Empty State */}
        <DemoCard 
          title="1. Empty State" 
          description="Initial state with document icon and upload prompt"
        >
          <DocumentSlotUploader
            slots={[{ id: 'empty_demo', title: 'Employment Contract', required: true }]}
            documents={[]}
            onChange={() => {}}
            allowExtraSlots={false}
          />
        </DemoCard>

        {/* State 2: Uploaded PDF */}
        <DemoCard 
          title="2. PDF Document" 
          description="PDF file with red icon - hover for actions"
        >
          <DocumentSlotUploader
            slots={[{ id: 'pdf_demo', title: 'Contract', required: true }]}
            documents={[
              {
                slotId: 'pdf_demo',
                name: 'Employment_Contract_2024.pdf',
                size: 2450000,
                type: 'application/pdf',
                uploadedAt: new Date()
              }
            ]}
            onChange={() => {}}
            allowExtraSlots={false}
          />
        </DemoCard>

        {/* State 3: Uploaded Word Doc */}
        <DemoCard 
          title="3. Word Document" 
          description="DOCX file with blue icon and file size display"
        >
          <DocumentSlotUploader
            slots={[{ id: 'word_demo', title: 'NDA Agreement', required: true }]}
            documents={[
              {
                slotId: 'word_demo',
                name: 'NDA_Confidential.docx',
                size: 125000,
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                uploadedAt: new Date()
              }
            ]}
            onChange={() => {}}
            allowExtraSlots={false}
          />
        </DemoCard>

        {/* State 4: Multiple Slots */}
        <DemoCard 
          title="4. Multiple Slots" 
          description="Navigate between different document slots with filled/empty indicators"
        >
          <DocumentSlotUploader
            slots={documentSlots}
            documents={uploadedDocuments}
            onChange={() => {}}
            allowExtraSlots={false}
          />
        </DemoCard>

        {/* State 5: Interactive Demo */}
        <DemoCard 
          title="5. Interactive Demo" 
          description="Try it yourself - upload documents and navigate between slots"
        >
          <DocumentSlotUploader
            slots={documentSlots}
            documents={demoDocuments}
            onChange={setDemoDocuments}
            allowExtraSlots={true}
          />
          <p className="text-xs text-gray-500 mt-3 text-center">
            {demoDocuments.length} document(s) uploaded
          </p>
        </DemoCard>

        {/* State 6: Read-only Mode */}
        <DemoCard 
          title="6. View Mode" 
          description="Read-only state for viewing existing documents (no upload/delete)"
        >
          <DocumentSlotUploader
            slots={documentSlots}
            documents={readonlyDocuments}
            onChange={() => {}}
            allowExtraSlots={false}
            readOnly={true}
          />
        </DemoCard>

        {/* State 7: Excel Document */}
        <DemoCard 
          title="7. Excel Spreadsheet" 
          description="XLSX file with green icon for financial documents"
        >
          <DocumentSlotUploader
            slots={[{ id: 'excel_demo', title: 'Salary Details', required: false }]}
            documents={[
              {
                slotId: 'excel_demo',
                name: 'Salary_Breakdown_Q1.xlsx',
                size: 45000,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                uploadedAt: new Date()
              }
            ]}
            onChange={() => {}}
            allowExtraSlots={false}
          />
        </DemoCard>

        {/* State 8: Extra Document Slot */}
        <DemoCard 
          title="8. Extra Documents" 
          description="Custom named slots for additional documents"
        >
          <DocumentSlotUploader
            slots={documentSlots}
            documents={[
              ...uploadedDocuments,
              {
                slotId: 'extra_insurance',
                name: 'Health Insurance Policy',
                size: 890000,
                type: 'application/pdf',
                uploadedAt: new Date()
              },
              {
                slotId: 'extra_certification',
                name: 'AWS Certification',
                size: 1200000,
                type: 'application/pdf',
                uploadedAt: new Date()
              }
            ]}
            onChange={() => {}}
            allowExtraSlots={true}
          />
        </DemoCard>

        {/* State 9: Archive/ZIP */}
        <DemoCard 
          title="9. Archive File" 
          description="ZIP file with purple icon for bundled documents"
        >
          <DocumentSlotUploader
            slots={[{ id: 'zip_demo', title: 'Document Archive', required: false }]}
            documents={[
              {
                slotId: 'zip_demo',
                name: 'Employee_Docs_2024.zip',
                size: 15240000,
                type: 'application/zip',
                uploadedAt: new Date()
              }
            ]}
            onChange={() => {}}
            allowExtraSlots={false}
          />
        </DemoCard>

      </div>

      {/* Feature List */}
      <div className="max-w-6xl mx-auto mt-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Component Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            title="A4 Aspect Ratio"
            description="Fixed 1:1.414 ratio (240x170px) matching document proportions"
          />
          <FeatureCard
            title="File Type Icons"
            description="Color-coded icons for PDF (red), Word (blue), Excel (green), PPT (orange), ZIP (purple)"
          />
          <FeatureCard
            title="Drag & Drop"
            description="Native drag and drop with visual feedback and type validation"
          />
          <FeatureCard
            title="Slot Navigation"
            description="Arrow buttons and keyboard navigation (Left/Right arrows)"
          />
          <FeatureCard
            title="Upload Progress"
            description="Visual progress bar during file upload"
          />
          <FeatureCard
            title="Hover Actions"
            description="View, Replace, Download, and Delete actions on hover"
          />
          <FeatureCard
            title="File Size Display"
            description="Human-readable file size (KB, MB, GB) formatting"
          />
          <FeatureCard
            title="Preview Modal"
            description="Fullscreen preview with download option for all file types"
          />
          <FeatureCard
            title="Extra Slots"
            description="Dynamic slots for additional documents with custom names"
          />
          <FeatureCard
            title="Validation"
            description="File type and size validation with user-friendly alerts"
          />
          <FeatureCard
            title="Required Fields"
            description="Visual indicators for mandatory document slots"
          />
          <FeatureCard
            title="Enterprise UI"
            description="Clean, minimal design matching modern SaaS tools"
          />
        </div>
      </div>

      {/* Code Example */}
      <div className="max-w-6xl mx-auto mt-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Usage Example
        </h2>
        <pre className="bg-gray-900 text-gray-100 p-6 rounded-xl overflow-x-auto text-sm">
{`import { DocumentSlotUploader, DocumentSlot, SlotDocument } from '@/components/ui/DocumentSlotUploader'

// Define document slots
const slots: DocumentSlot[] = [
  { id: 'contract', title: 'Employment Contract', required: true },
  { id: 'nda', title: 'NDA Agreement', required: true },
  { id: 'id_doc', title: 'Identity Document', required: false },
]

// Usage in form
<DocumentSlotUploader
  slots={slots}
  documents={documents}
  onChange={handleDocumentsChange}
  allowExtraSlots={true}
  readOnly={false}
/>`}
        </pre>
      </div>

      {/* Supported Types */}
      <div className="max-w-6xl mx-auto mt-12 mb-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Supported File Types
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <h4 className="font-medium text-red-600 mb-2">PDF Documents</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• .pdf</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-600 mb-2">Microsoft Word</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• .doc</li>
                <li>• .docx</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-green-600 mb-2">Microsoft Excel</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• .xls</li>
                <li>• .xlsx</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-orange-600 mb-2">Microsoft PowerPoint</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• .ppt</li>
                <li>• .pptx</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-purple-600 mb-2">Archives</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• .zip</li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Maximum file size: 20MB per document (configurable per slot)
          </p>
        </div>
      </div>
    </div>
  )
}

// Demo Card Component
function DemoCard({ 
  title, 
  description, 
  children 
}: { 
  title: string
  description: string
  children: React.ReactNode 
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
      <div className="flex justify-center">
        {children}
      </div>
    </div>
  )
}

// Feature Card Component
function FeatureCard({ title, description }: { title: string, description: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
        {title}
      </h4>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  )
}

// File Type Badge Component
function FileTypeBadge({ 
  icon: Icon, 
  label, 
  color, 
  bgColor 
}: { 
  icon: React.ElementType
  label: string
  color: string
  bgColor: string
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${bgColor}`}>
      <Icon size={18} className={color} />
      <span className={`text-sm font-medium ${color}`}>{label}</span>
    </div>
  )
}
