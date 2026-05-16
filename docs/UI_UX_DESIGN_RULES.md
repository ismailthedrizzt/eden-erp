# Eden ERP - UI/UX Design Rules

**Purpose**: Living document for UI/UX standards established throughout development. Updated via user directives or `/add_ux_rule` command.

**Last Updated**: 2026-05-16

---

## Global Design Principles

### 1. Visual Hierarchy
- **Primary Action**: Blue (`eden-blue` #216688)
- **Success/Positive**: Green (`eden-green` #0d9488)
- **Danger/Negative**: Red (Tailwind `red-600`)
- **Warning/Accent**: Gold (`eden-gold` #c49a10)
- **Neutral**: Gray scale (100-900)

### 2. Layout Standards
- **Page Padding**: `p-4` or `px-4 py-6` for content areas
- **Card Padding**: `p-4` or `p-6`
- **Section Spacing**: `gap-4` (16px) or `gap-6` (24px)
- **Max Width**: Full width with responsive constraints
- **Border Radius**: `rounded-lg` (8px) for cards, `rounded-xl` (12px) for modals

### 3. Typography
- **Headings**: `font-semibold` or `font-bold`
- **Body**: Default font weight (400)
- **Small/Labels**: `text-sm`, `text-xs`
- **Monospace**: For amounts, codes (`font-mono`)
- **Font Family**: System font stack

---

## Component-Specific Rules

### SmartDataTable

#### Column Display
1. **Headers**: Center-aligned (`text-center`)
2. **Image Column**: 
   - Fixed width: 60px
   - Circular avatar with fallback to initials
   - Multiple fallback keys: `profileImage`, `image`, `photo`, `avatar`, `foto`
   - Initials fallback: `firstName[0]`, `name[0]`, `ad[0]`

3. **Font Sizing** (Responsive based on column width):
   - `< 100px`: `text-xs`
   - `100-150px`: `text-sm`
   - `> 150px`: `text-base`

4. **Value Formatting**:
   - **Nationality**: Convert to demonym (e.g., "Türkiye" → "Türk", "TC" → "Türk")
   - **Gender**: Capitalized ("Erkek", "Kadın")
   - **Dates**: `formatDate()` utility
   - **Currency**: `formatTRY()` with monospace

5. **Rightmost Column**:
   - Header must be "İşlem" (not empty)
   - Contains action buttons

6. **Row Interaction**:
   - Full row clickable to open view mode
   - Action buttons use `pointer-events-auto`
   - Row uses `pointer-events-none` on cells to allow click propagation

#### Card View Mode
1. **Layout**: Horizontal split
   - **Left**: Photo area (4x current size, ~120px)
   - **Right**: Required fields only

2. **Photo Display**:
   - Large circular avatar
   - Same fallback logic as table

3. **Field Display**:
   - Only fields with `required: true` shown
   - Label + value format
   - Truncation with ellipsis for long values

#### Column Selector
1. **Grouping**: By `category` property
2. **Visual Groups**: Distinct background colors per category
3. **Close Behavior**: Close on outside click (useRef + useEffect)

#### Toolbar Features
1. **AI Assistant Button**: Sparkles icon next to widget toggle
2. **Refresh Button**: RotateCw icon next to widget toggle
3. **CSV Export**: Download filtered/visible data
4. **Widget Toggle**: Always visible, shows placeholder if empty

---

### EntityForm

#### Hero Section Layout
```
┌─────────────────────────────────────────────┐
│  ┌──────────────┐  ┌──────────────────────┐  │
│  │              │  │  Required Field 1    │  │
│  │    Photo     │  │  Required Field 2    │  │
│  │   (Left)     │  │  Required Field 3    │  │
│  │              │  │                      │  │
│  └──────────────┘  │  [Save] [Cancel]     │  │
│                    └──────────────────────┘  │
└─────────────────────────────────────────────┘
```

1. **Left Panel**: Photo/Documents (custom content via `heroLeftPanel`)
2. **Right Panel**: Required fields + action buttons
3. **Tabs Below**: Detailed fields organized by category

#### Form Modes
- **Create**: All fields editable, "Kaydet" button
- **View**: All fields read-only, "Düzenle" button
- **Edit**: All fields editable, "Kaydet" + "İptal" buttons

#### History Display
- Show historical values with dates
- Use `&quot;` for quotes in JSX (not literal ")

---

### PageBanner

#### Required Props
- `mode`: "list" | "form" (MANDATORY - no exceptions)
- `title`: Page title
- `icon`: Lucide icon component

#### List Mode
- Shows "Add" button (plus icon)
- Props: `onAddClick`, `addButtonText`

#### Form Mode
- Shows "Back" button (arrow icon)
- Props: `onBackClick`, `backButtonText`

#### Visual
- Background: White (light) / Dark navy (dark)
- Border bottom: Gray-200 (light) / Gray-800 (dark)
- Padding: `px-6 py-4`

---

### Toast Notifications

#### Types
- **Success**: Green background, check icon
- **Error**: Red background, X icon
- **Info**: Blue background, info icon

#### Position
- Top-right of content area
- Auto-dismiss after 5 seconds
- Manual close button

---

## Dark Mode Standards

### Color Mapping
| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Background | `bg-white` | `dark:bg-gray-900` |
| Card | `bg-white` | `dark:bg-gray-800` |
| Text Primary | `text-gray-900` | `dark:text-white` |
| Text Secondary | `text-gray-500` | `dark:text-gray-400` |
| Border | `border-gray-200` | `dark:border-gray-700` |
| Input BG | `bg-white` | `dark:bg-eden-navy` |

### Mandatory Implementation
- EVERY component must support dark mode
- ALWAYS test both themes
- NEVER skip `dark:` prefixes

---

## Form Input Standards

### Shared Form Control Contract
- All text input, select, textarea, IBAN, list-row editor and custom-rendered form controls must receive their visual classes from `EntityForm` or `formControlClass`.
- Required field visual state is centralized: required + empty is invalid/red, required + filled is valid/green. A template-derived page must not reimplement this rule locally.
- `FormField.render` custom renderers must use the `className` and `validationState` props provided by `EntityForm`. Local renderers may define behavior and layout, but not their own input border/background/text color contract.
- Disabled and read-only controls must remain readable in light and dark mode. Do not use local `disabled:bg-gray-*`, `disabled:text-white`, `dark:text-white` or similar combinations on form controls unless they are composed through `formControlClass`.
- Custom module pages define only their own fields, data bindings and domain behavior. They must not hardcode ad-hoc Tailwind strings for text/select/textarea visuals when the same control belongs to the shared ERP form template.

### Text Inputs
- Border: `border-gray-200 dark:border-gray-700`
- Background: `bg-white dark:bg-eden-navy`
- Text: `text-gray-900 dark:text-gray-100`
- Focus: `focus:ring-2 focus:ring-eden-blue/20`
- Border radius: `rounded-lg`

### Selects
- Same styling as inputs
- Custom dropdown arrow via CSS

### Checkboxes/Radios
- Primary color for checked state
- Visible focus ring

### Labels
- `text-sm font-medium`
- `text-gray-700 dark:text-gray-300`
- Required indicator: Red asterisk

---

## Button Standards

### Primary (Save, Confirm)
```
bg-blue-600 text-white hover:bg-blue-700
dark:bg-blue-600 dark:hover:bg-blue-500
px-4 py-2 rounded-lg
```

### Secondary (Cancel, Back)
```
border border-gray-300 text-gray-700 hover:bg-gray-50
dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800
px-4 py-2 rounded-lg
```

### Danger (Delete)
```
text-red-600 hover:bg-red-50
dark:text-red-400 dark:hover:bg-red-900/20
```

### Icon Buttons
- Size: `p-2` (40px touch target)
- Hover: Background change
- Active: Scale down slightly

---

## Table Standards

### Header
- Background: `bg-gray-50 dark:bg-gray-800`
- Text: `text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase`
- Padding: `px-4 py-3`

### Cells
- Padding: `px-4 py-3`
- Border right: `border-r border-gray-100 dark:border-gray-800`
- Last cell: `last:border-r-0`

### Row Hover
- `hover:bg-gray-50 dark:hover:bg-gray-800/50`

### Zebra Striping (Optional)
- Even rows: `bg-gray-50/50 dark:bg-gray-800/30`

---

## Modal/Dialog Standards

### Overlay
- `bg-black/50` backdrop
- Click outside to close (configurable)

### Container
- `bg-white dark:bg-eden-navy-2 rounded-xl`
- Max width: `max-w-md` (small), `max-w-2xl` (medium), `max-w-4xl` (large)
- Padding: `p-6`

### Header
- Title: `text-lg font-semibold`
- Close button: Top-right, X icon

### Actions
- Footer with right-aligned buttons
- Primary action rightmost

---

## Animation Standards

### Transitions
- Duration: `duration-200` (fast), `duration-300` (normal)
- Easing: Default Tailwind ease
- Properties: `transition-colors`, `transition-all`

### Loading States
- Spinner: `Loader2` icon with `animate-spin`
- Skeleton: `animate-pulse` with gray backgrounds

### Micro-interactions
- Buttons: `hover:scale-105` (subtle)
- Cards: `hover:shadow-md` on lift

---

## Mobile/Responsive Rules

### Breakpoints
- Mobile: Default (< 640px)
- Tablet: `sm:` (640px+)
- Desktop: `lg:` (1024px+)
- Wide: `xl:` (1280px+)

### Touch Targets
- Minimum: 44px × 44px
- Buttons: `p-2` or larger

### Table Responsive
- Horizontal scroll: `overflow-x-auto`
- Card view for mobile (optional)

### Sidebar
- Desktop: Fixed, expanded
- Mobile: Collapsible, overlay

---

## Icon Usage

### Icon Library
- **Primary**: Lucide React
- **Size**: 20px (default), 24px (headers), 16px (inline)

### Common Icons
- Add: `Plus`
- Edit: `Edit3` or `Pencil`
- Delete: `Trash2`
- Save: `Save`
- Cancel: `X` or `ArrowLeft`
- View: `Eye`
- Search: `Search`
- Filter: `Filter`
- More: `MoreVertical` or `MoreHorizontal`
- Notification: `Bell`
- Settings: `Settings` or `Cog`
- User: `User`
- Company: `Building2`
- Dashboard: `LayoutDashboard` or `Home`

---

## Accessibility Standards

### Minimum Requirements
- Focus indicators on all interactive elements
- Proper heading hierarchy (h1 → h2 → h3)
- Alt text for images
- Sufficient color contrast (WCAG AA)

### Form Accessibility
- Label association with inputs
- Error messages linked to fields
- Keyboard navigation support

---

## Command: Add New UX Rule

**Usage**: User says `/add_ux_rule` or "Yeni UX kuralı ekle"

**Format**:
```markdown
### [Rule Name]
**Added**: [Date]
**Context**: [Where it applies]

[Detailed description of the rule]

**Example**:
```tsx
[Code example]
```
```

**AI Action**:
1. Read current `UI_UX_DESIGN_RULES.md`
2. Append new rule to relevant section
3. Update "Last Updated" date
4. Commit with message: `docs: Add UX rule - [Rule Name]`

---

## Established UX Rules Log

### Rule 1: SmartDataTable Nationality Conversion
**Added**: 2024-05-01
**Context**: Data display in SmartDataTable

Nationality values must be converted to demonyms (ethnic names):
- "Türkiye" → "Türk"
- "TC" → "Türk"
- "Turkey" → "Türk"

Implementation uses mapping with multiple fallback variations.

---

### Rule 2: SmartDataTable Font Sizing
**Added**: 2024-05-01
**Context**: Table cell text sizing

Font size must be responsive to column width:
- `< 100px`: `text-xs`
- `100-150px`: `text-sm`
- `> 150px`: `text-base`

---

### Rule 3: SmartDataTable Photo Fallback
**Added**: 2024-05-01
**Context**: Image display in tables/cards

Multiple fallback keys must be checked:
1. Direct column value
2. `row.profileImage`
3. `row.image`
4. `row.photo`
5. `row.avatar`
6. `row.foto`

Final fallback: Initials from `firstName`, `name`, or `ad`.

---

### Rule 4: PageBanner Mode Prop
**Added**: 2024-05-01
**Context**: Page headers

`mode` prop is **MANDATORY** and must be either:
- `"list"`: Shows add button
- `"form"`: Shows back button

No exceptions. Build will fail without this prop.

---

### Rule 5: Card View Required Fields Only
**Added**: 2024-05-01
**Context**: SmartDataTable card view

Card view must display only fields marked with `required: true` in column definitions. Photo must be 4x larger than default.

---

### Rule 6: Table Header Alignment
**Added**: 2024-05-01
**Context**: Table headers

All table headers (`<th>`) must be center-aligned: `text-center`.

---

### Rule 7: Action Column Header
**Added**: 2024-05-01
**Context**: Rightmost table column

Rightmost action column header must be labeled "İşlem" (not empty).

---

### Rule 8: Row Click Propagation
**Added**: 2024-05-01
**Context**: Table row interactions

To enable row clicks while keeping action buttons clickable:
- `<td>`: `pointer-events-none`
- Inner content div: `pointer-events-auto` with `stopPropagation`

---

### Rule 9: Column Selector Grouping
**Added**: 2024-05-01
**Context**: Column visibility panel

Columns must be grouped by `category` property with distinct visual styling per group.

---

### Rule 10: Widget Overlay Always Visible
**Added**: 2024-05-01
**Context**: SmartDataTable toolbar

Widget overlay panel must open even when no widgets exist, showing placeholder text.

---

*End of Document*
