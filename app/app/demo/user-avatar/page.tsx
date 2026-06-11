'use client'


import { appDemoUserAvatarPageContract } from '@/contracts/pages/generated/app-demo-user-avatar.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appDemoUserAvatarContractReady = requirePageContract(appDemoUserAvatarPageContract)
void appDemoUserAvatarContractReady

/**
 * UserAvatar Demo Page
 * 
 * Shows the component in multiple variations:
 * 1. Image avatar
 * 2. Initial avatar
 * 3. Different sizes
 * 4. Hover state with tooltip
 * 5. Status badges
 * 6. Avatar stack
 */

import { UserAvatar, AvatarStack, AvatarSize, AvatarStatus } from '@/components/ui/UserAvatar'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Demo users
const demoUsers = [
  { name: 'Ahmet Yılmaz', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
  { name: 'Mehmet Demir', photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face' },
  { name: 'Ayşe Kaya', photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face' },
  { name: 'Fatma Şahin', photoUrl: null },
  { name: 'Can Yıldız', photoUrl: null },
  { name: 'Burak Korkmaz', photoUrl: null },
  { name: 'Zeynep Aydın', photoUrl: null },
  { name: 'Emre Özdemir', photoUrl: null },
]

const statusOptions: AvatarStatus[] = ['online', 'offline', 'busy', 'away']
const sizeOptions: AvatarSize[] = ['xs', 'sm', 'md', 'lg', 'xl']

export default function UserAvatarDemo() {
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
          UserAvatar Component
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Circular avatar with image support, initials fallback, and status indicators
        </p>
      </div>

      <div className="max-w-6xl mx-auto space-y-12">

        {/* Section 1: Image vs Initial Avatar */}
        <DemoSection title="1. Image vs Initial Avatar" description="Photo display with automatic initials fallback">
          <div className="flex items-center gap-8">
            <DemoItem label="With Photo">
              <UserAvatar 
                name="Ahmet Yılmaz" 
                photoUrl={demoUsers[0].photoUrl}
                size="md"
              />
            </DemoItem>
            <DemoItem label="No Photo (Initials)">
              <UserAvatar 
                name="Fatma Şahin"
                size="md"
              />
            </DemoItem>
            <DemoItem label="Custom Initials">
              <UserAvatar 
                name="Company Name"
                initials="CN"
                size="md"
              />
            </DemoItem>
          </div>
        </DemoSection>

        {/* Section 2: All Sizes */}
        <DemoSection title="2. Size Variations" description="From xs (24px) to xl (64px)">
          <div className="flex items-end gap-6">
            {sizeOptions.map((size) => (
              <DemoItem key={size} label={size.toUpperCase()}>
                <UserAvatar 
                  name="John Doe"
                  photoUrl={demoUsers[0].photoUrl}
                  size={size}
                />
              </DemoItem>
            ))}
          </div>
        </DemoSection>

        {/* Section 3: Status Badges */}
        <DemoSection title="3. Status Badges" description="Online, offline, busy, and away indicators">
          <div className="flex items-center gap-8">
            {statusOptions.map((status) => (
              <DemoItem key={status} label={status.charAt(0).toUpperCase() + status.slice(1)}>
                <UserAvatar 
                  name="User Name"
                  photoUrl={demoUsers[1].photoUrl}
                  size="md"
                  status={status}
                />
              </DemoItem>
            ))}
          </div>
        </DemoSection>

        {/* Section 4: Initials with Colors */}
        <DemoSection title="4. Initial Avatar Colors" description="Consistent colors based on name hash">
          <div className="flex items-center gap-4 flex-wrap">
            {demoUsers.slice(3).map((user, index) => (
              <DemoItem key={index} label={user.name.split(' ')[0]}>
                <UserAvatar 
                  name={user.name}
                  size="md"
                />
              </DemoItem>
            ))}
          </div>
        </DemoSection>

        {/* Section 5: Hover Tooltips */}
        <DemoSection title="5. Hover Tooltips" description="Full name and status on hover (hover to see)">
          <div className="flex items-center gap-8">
            <DemoItem label="With Photo">
              <UserAvatar 
                name="Ahmet Yılmaz"
                photoUrl={demoUsers[0].photoUrl}
                size="md"
                status="online"
                showTooltip
              />
            </DemoItem>
            <DemoItem label="Initials Only">
              <UserAvatar 
                name="Mehmet Demir"
                size="md"
                status="busy"
                showTooltip
              />
            </DemoItem>
            <DemoItem label="No Status">
              <UserAvatar 
                name="Ayşe Kaya"
                photoUrl={demoUsers[2].photoUrl}
                size="md"
                showTooltip
              />
            </DemoItem>
          </div>
        </DemoSection>

        {/* Section 6: Clickable */}
        <DemoSection title="6. Clickable Avatar" description="With hover scale and shadow effect">
          <div className="flex items-center gap-8">
            <DemoItem label="Clickable">
              <UserAvatar 
                name="Click Me!"
                photoUrl={demoUsers[0].photoUrl}
                size="lg"
                onClick={() => alert('Avatar clicked!')}
                showTooltip
              />
            </DemoItem>
            <DemoItem label="Not Clickable">
              <UserAvatar 
                name="Read Only"
                photoUrl={demoUsers[1].photoUrl}
                size="lg"
                showTooltip
              />
            </DemoItem>
          </div>
        </DemoSection>

        {/* Section 7: Avatar Stack */}
        <DemoSection title="7. Avatar Stack" description="Multiple avatars grouped with overlap">
          <div className="flex flex-col gap-6">
            <DemoItem label="3 Users (Horizontal)">
              <AvatarStack 
                users={demoUsers.slice(0, 3)}
                size="md"
                maxDisplay={3}
              />
            </DemoItem>
            <DemoItem label="5 Users (+2 overflow)">
              <AvatarStack 
                users={demoUsers.slice(0, 5)}
                size="md"
                maxDisplay={3}
              />
            </DemoItem>
            <DemoItem label="Small Stack">
              <AvatarStack 
                users={demoUsers.slice(0, 4)}
                size="sm"
                maxDisplay={4}
              />
            </DemoItem>
            <DemoItem label="Large Stack">
              <AvatarStack 
                users={demoUsers.slice(0, 4)}
                size="lg"
                maxDisplay={4}
              />
            </DemoItem>
          </div>
        </DemoSection>

        {/* Section 8: Real-world Examples */}
        <DemoSection title="8. Real-world Usage Examples" description="Common patterns in ERP interfaces">
          
          {/* Table Row Example */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Employee Table Row</h4>
            <div className="flex items-center gap-3">
              <UserAvatar 
                name="Ahmet Yılmaz"
                photoUrl={demoUsers[0].photoUrl}
                size="sm"
                status="online"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Ahmet Yılmaz</p>
                <p className="text-xs text-gray-500">Software Engineer</p>
              </div>
            </div>
          </div>

          {/* Comment Example */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Comment Thread</h4>
            <div className="flex gap-3">
              <UserAvatar 
                name="Mehmet Demir"
                photoUrl={demoUsers[1].photoUrl}
                size="md"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Mehmet Demir</span>
                  <span className="text-xs text-gray-500">2 hours ago</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Approved the budget request. Please proceed with the purchase order.
                </p>
              </div>
            </div>
          </div>

          {/* Task Assignment Example */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Task Assignees</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Q1 Financial Report</p>
                <p className="text-xs text-gray-500">Due in 3 days</p>
              </div>
              <AvatarStack 
                users={demoUsers.slice(0, 3)}
                size="sm"
                maxDisplay={3}
              />
            </div>
          </div>

          {/* Activity Log Example */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Activity Log</h4>
            <div className="space-y-3">
              {[
                { user: demoUsers[0], action: 'created', target: 'Project Alpha', time: '10 min ago' },
                { user: demoUsers[1], action: 'updated', target: 'Budget 2024', time: '1 hour ago' },
                { user: demoUsers[2], action: 'approved', target: 'Leave Request', time: '3 hours ago' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <UserAvatar 
                    name={item.user.name}
                    photoUrl={item.user.photoUrl}
                    size="xs"
                  />
                  <div className="flex-1 text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">{item.user.name.split(' ')[0]}</span>
                    <span className="text-gray-600 dark:text-gray-400"> {item.action} </span>
                    <span className="text-gray-900 dark:text-white">{item.target}</span>
                  </div>
                  <span className="text-xs text-gray-400">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </DemoSection>

        {/* Usage Code Example */}
        <div className="bg-gray-900 text-gray-100 p-6 rounded-xl overflow-x-auto">
          <h3 className="text-lg font-semibold mb-4 text-white">Usage Example</h3>
          <pre className="text-sm">
{`import { UserAvatar, AvatarStack } from '@/components/ui/UserAvatar'

// Single avatar with photo
<UserAvatar 
  name="Ahmet Yılmaz" 
  photoUrl="/avatar.jpg"
  size="md"
  status="online"
  showTooltip
/>

// Initials only (auto-generated from name)
<UserAvatar 
  name="Fatma Şahin"
  size="lg"
/>

// Clickable avatar
<UserAvatar 
  name="John Doe"
  photoUrl="/avatar.jpg"
  size="md"
  onClick={() => navigate('/profile')}
/>

// Avatar stack
<AvatarStack 
  users={[
    { name: 'User 1', photoUrl: '/avatar1.jpg' },
    { name: 'User 2', photoUrl: null }, // Shows initials
    { name: 'User 3' }
  ]}
  size="sm"
  maxDisplay={3}
/>`}
          </pre>
        </div>

      </div>
    </div>
  )
}

// Demo Section Component
function DemoSection({ 
  title, 
  description, 
  children 
}: { 
  title: string
  description: string
  children: React.ReactNode 
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {description}
        </p>
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  )
}

// Demo Item Component
function DemoItem({ 
  label, 
  children 
}: { 
  label: string
  children: React.ReactNode 
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {children}
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  )
}
