// ניקוי שדות הפרופיל של ספק מטופס (הצטרפות, פורטל). משותף לשרת בלבד.
import { BUSINESS_TYPES } from './supplier-consts';

const str = (fd: FormData, k: string, max: number) => String(fd.get(k) || '').trim().slice(0, max) || null;

export function cleanProfile(fd: FormData) {
  const bt = String(fd.get('business_type') || '');
  const year = Number(fd.get('founded_year'));
  const website = str(fd, 'website', 200);
  return {
    legal_name: str(fd, 'legal_name', 160), business_id: (str(fd, 'business_id', 20) || '').replace(/\D/g, '') || null,
    business_type: bt in BUSINESS_TYPES ? bt : null, contact_name: str(fd, 'contact_name', 80), address: str(fd, 'address', 200),
    city: str(fd, 'city', 80), areas: str(fd, 'areas', 200), hours: str(fd, 'hours', 160), description: str(fd, 'description', 600),
    services: str(fd, 'services', 1000), instagram: str(fd, 'instagram', 120), facebook: str(fd, 'facebook', 200), kosher: str(fd, 'kosher', 120),
    payment_methods: str(fd, 'payment_methods', 160), delivery: str(fd, 'delivery', 160),
    founded_year: year >= 1950 && year <= 2030 ? Math.round(year) : null,
    phone: str(fd, 'phone', 30), email: str(fd, 'email', 160), website: website && !/^https?:\/\//.test(website) ? `https://${website}` : website,
  };
}

export const PROFILE_SET = `legal_name = $2, business_id = $3, business_type = $4, contact_name = $5, address = $6, city = $7, areas = $8, hours = $9, description = $10, services = $11, instagram = $12, facebook = $13, kosher = $14, payment_methods = $15, delivery = $16, founded_year = $17, phone = $18, email = $19, website = $20, updated_at = now()`;
export const profileParams = (p: ReturnType<typeof cleanProfile>) => [p.legal_name, p.business_id, p.business_type, p.contact_name, p.address, p.city, p.areas, p.hours, p.description, p.services, p.instagram, p.facebook, p.kosher, p.payment_methods, p.delivery, p.founded_year, p.phone, p.email, p.website];
