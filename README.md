# Eden Teknoloji ERP

Next.js + Supabase ile gelistirilmis kurumsal ERP uygulamasi.

## Gereksinimler

- Node.js 24 LTS
- npm 10+

## Yerel Calistirma

```bash
npm install
npm run dev
```

Tarayicida ac:

- `http://localhost:3000`
- `http://localhost:3000/login`

## Ortam Degiskenleri

`.env.local.example` dosyasini `.env.local` olarak kopyalayip doldurun:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`

## Dogrulama

```bash
npm run lint
npm run typecheck
npm run build
```

## Teknoloji Yigini

- Next.js 15
- React 19
- Supabase
- Tailwind CSS
- TypeScript

## Visual Studio

Visual Studio 2022 ile [eden-erp.esproj](C:/Users/ismai/Desktop/eden-erp/eden-erp.esproj) dosyasini acip `Start` ile calistirabilirsiniz.
