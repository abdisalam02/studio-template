import { Resend } from 'resend';
import fs from 'node:fs';
import path from 'node:path';

// Load .env.local if not already loaded in process.env
if (!process.env.RESEND_API_KEY) {
  const envPath = path.resolve(process.cwd(), 'site/.env.local');
  const altEnvPath = path.resolve(process.cwd(), '.env.local');
  const targetEnv = fs.existsSync(envPath) ? envPath : (fs.existsSync(altEnvPath) ? altEnvPath : null);
  
  if (targetEnv) {
    const envContent = fs.readFileSync(targetEnv, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        process.env[k.trim()] = v.join('=').trim();
      }
    });
  }
}

const resend = new Resend(process.env.RESEND_API_KEY);

async function runDiagnosis() {
  console.log('--- TESTING RESEND DISPATCH ---');
  console.log('API Key Present:', !!process.env.RESEND_API_KEY);

  // Test with primary recipient
  const targetEmail = process.argv[2] || 'niwache12@gmail.com';
  console.log(`Sending from: Gangina Beauty Studio <booking@agure.space>`);
  console.log(`Sending to: ${targetEmail}`);

  const res = await resend.emails.send({
    from: 'Gangina Beauty Studio <booking@agure.space>',
    to: targetEmail,
    replyTo: 'ganginabeauty@gmail.com',
    subject: 'Diagnosetest: Gangina Beauty Studio',
    html: '<p>Dette er en diagnosetest for å bekrefte at agure.space leverer e-post.</p>'
  });

  if (res.error) {
    console.error('❌ RESEND API REJECTION:');
    console.error('Name:', res.error.name);
    console.error('Message:', res.error.message);
    console.error('Status / Details:', res.error);
    process.exit(1);
  }

  console.log('✔ RESEND ACCEPTED DISPATCH! Email ID:', res.data.id);
}

runDiagnosis();
