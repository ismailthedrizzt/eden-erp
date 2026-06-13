'use client'
/**
 * ImageSlotUploader Demo Page
 * 
 * Shows the component in multiple states:
 * 1. Empty State
 * 2. Uploaded State
 * 3. Multiple Slots with Navigation
 * 4. Read-only Mode
 * 5. Extra Slot (Custom Name)
 */

import { useState } from 'react'
import { ImageSlotUploader, ImageSlot, SlotImage } from '@/components/ui/ImageSlotUploader'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Demo data - Empty state
const emptySlots: ImageSlot[] = [
  { id: 'photo', title: 'Employee Photo', required: true },
  { id: 'id_card', title: 'ID Card Photo', required: true, description: 'Front side of ID' },
  { id: 'signature', title: 'Signature Image', required: false },
]

// Demo data - Pre-filled images
const uploadedImages: SlotImage[] = [
  {
    slotId: 'photo',
    previewUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    name: 'john_doe_photo.jpg',
    size: 2450000,
    uploadedAt: new Date()
  },
  {
    slotId: 'id_card',
    previewUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=250&fit=crop',
    name: 'id_card_scan.jpg',
    size: 1800000,
    uploadedAt: new Date()
  },
]

export default function ImageSlotUploaderDemo() {
  // State for interactive demo
  const [demoImages, setDemoImages] = useState<SlotImage[]>([])
  const [readonlyImages] = useState<SlotImage[]>(uploadedImages)

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
          ImageSlotUploader Component
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enterprise-grade image upload component for ERP systems
        </p>
      </div>

      {/* Demo Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* State 1: Empty State */}
        <DemoCard 
          title="1. Empty State" 
          description="Initial state with placeholder and upload prompt"
        >
          <ImageSlotUploader
            slots={[{ id: 'empty_demo', title: 'Employee Photo', required: true }]}
            images={[]}
            onChange={() => {}}
            allowExtraSlots={false}
          />
        </DemoCard>

        {/* State 2: Uploaded State */}
        <DemoCard 
          title="2. Uploaded State" 
          description="Image uploaded with hover actions (View, Replace, Delete)"
        >
          <ImageSlotUploader
            slots={[{ id: 'uploaded_demo', title: 'ID Card', required: true }]}
            images={[
              {
                slotId: 'uploaded_demo',
                previewUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=250&fit=crop',
                name: 'id_scan.jpg',
                size: 2100000,
                uploadedAt: new Date()
              }
            ]}
            onChange={() => {}}
            allowExtraSlots={false}
          />
        </DemoCard>

        {/* State 3: Multiple Slots with Navigation */}
        <DemoCard 
          title="3. Multiple Slots" 
          description="Navigate between different image slots with arrow buttons"
        >
          <ImageSlotUploader
            slots={emptySlots}
            images={uploadedImages}
            onChange={() => {}}
            allowExtraSlots={false}
          />
        </DemoCard>

        {/* State 4: Interactive Demo */}
        <DemoCard 
          title="4. Interactive Demo" 
          description="Try it yourself - upload images and navigate between slots"
        >
          <ImageSlotUploader
            slots={emptySlots}
            images={demoImages}
            onChange={setDemoImages}
            allowExtraSlots={true}
          />
          <p className="text-xs text-gray-500 mt-3 text-center">
            {demoImages.length} image(s) uploaded
          </p>
        </DemoCard>

        {/* State 5: Read-only Mode */}
        <DemoCard 
          title="5. View Mode" 
          description="Read-only state for viewing existing images (no upload/delete)"
        >
          <ImageSlotUploader
            slots={emptySlots}
            images={readonlyImages}
            onChange={() => {}}
            allowExtraSlots={false}
            readOnly={true}
          />
        </DemoCard>

        {/* State 6: Extra Slot (Custom Name) */}
        <DemoCard 
          title="6. Custom Slot" 
          description="Add additional images with custom names"
        >
          <ImageSlotUploader
            slots={emptySlots}
            images={[
              ...uploadedImages,
              {
                slotId: 'extra_1',
                previewUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop',
                name: 'Employment Contract',
                size: 3200000,
                uploadedAt: new Date()
              }
            ]}
            onChange={() => {}}
            allowExtraSlots={true}
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
            description="Fixed 1:1.414 ratio (240x170px) for professional document-like appearance"
          />
          <FeatureCard
            title="Drag & Drop"
            description="Native drag and drop support with visual feedback during drag"
          />
          <FeatureCard
            title="Slot Navigation"
            description="Arrow buttons and keyboard navigation (Left/Right arrows)"
          />
          <FeatureCard
            title="Upload Progress"
            description="Visual progress indicator during file upload"
          />
          <FeatureCard
            title="Hover Actions"
            description="View, Replace, and Delete actions on image hover"
          />
          <FeatureCard
            title="Extra Slots"
            description="Dynamic slots for additional images with custom names"
          />
          <FeatureCard
            title="Modal Preview"
            description="Fullscreen image preview with click-to-zoom"
          />
          <FeatureCard
            title="Validation"
            description="File type and size validation with user-friendly errors"
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
{`import { ImageSlotUploader, ImageSlot, SlotImage } from '@/components/ui/ImageSlotUploader'

// Define slots
const slots: ImageSlot[] = [
  { id: 'photo', title: 'Employee Photo', required: true },
  { id: 'id_card', title: 'ID Card', required: true },
  { id: 'signature', title: 'Signature', required: false },
]

// Usage in form
<ImageSlotUploader
  slots={slots}
  images={images}
  onChange={handleImagesChange}
  allowExtraSlots={true}
  readOnly={false}
/>`}
        </pre>
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
