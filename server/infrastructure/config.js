import dotenv from 'dotenv';

dotenv.config();

export function loadConfig() {
  const port = Number(process.env.PORT || 3000);
  const allowedUniversityDomains = process.env.ALLOWED_UNIVERSITY_DOMAINS || '';
  const adminBootstrapEmails = String(process.env.ADMIN_BOOTSTRAP_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const sessionSecret = process.env.SESSION_SECRET || '';
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    port,
    allowedUniversityDomains,
    adminBootstrapEmails,
    sessionSecret,
    isProduction,
  };
}
