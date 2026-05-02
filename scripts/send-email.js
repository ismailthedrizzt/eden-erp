// scripts/send-email.js
// Supabase üzerinden veri çekip e-posta olarak gönderen betik

const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

// Supabase bağlantısı
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// E-posta ayarları (örnek: Gmail SMTP)
// NOT: Gerçek kullanımda güvenli bir SMTP servisi kullanın
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Gmail adresi
    pass: process.env.EMAIL_PASS, // Gmail uygulama şifresi
  },
});

async function sendEmailWithData() {
  try {
    // Supabase'den veri çek (örnek: employees tablosu)
    const { data: employeeData, error } = await supabase
      .from('employees')
      .select('*')
      .limit(10); // İlk 10 kayıt

    if (error) throw error;

    // Veri JSON olarak formatla
    const emailContent = `
      <h2>Supabase Personel Verisi</h2>
      <pre>${JSON.stringify(employeeData, null, 2)}</pre>
    `;

    // E-posta gönder
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'recipient@example.com', // Alıcı adresi
      subject: 'Supabase Verisi - Personel',
      html: emailContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('E-posta gönderildi:', info.messageId);
  } catch (error) {
    console.error('Hata:', error);
  }
}

// Çalıştır
sendEmailWithData();
