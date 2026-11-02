// ספקים שמקבלים את כרטיס המשפחה, וההסדר של כל אחד. בשלב זה רשימה קבועה
// שמתן עורך כאן; כשיהיו עשרות ספקים זה יעבור לטבלה ולמסך ניהול.
// example: true מסמן ספק לדוגמה שמוצג עד שיש הסדרים אמיתיים.
export type Supplier = {
  id: string; name: string; category: string; benefit: string; description: string;
  phone?: string; city?: string; icon: 'meal' | 'chairs' | 'stone' | 'home' | 'flowers' | 'transport'; example?: boolean;
};

export const SUPPLIERS: Supplier[] = [
  { id: 'meals', name: 'ארוחות למשפחה', category: 'שבעה', benefit: 'הסדר לדוגמה', icon: 'meal', example: true,
    description: 'מגוון ארוחות חמות, טריות ומשפחתיות, מגיעות לבית בתקופת השבעה.' },
  { id: 'shiva', name: 'ציוד לשבעה', category: 'שבעה', benefit: 'הסדר לדוגמה', icon: 'chairs', example: true,
    description: 'שולחנות, כיסאות, אוהלים וציוד לשבעה, עד הבית ובחזרה.' },
  { id: 'stone', name: 'מצבות והנצחה', category: 'הנצחה', benefit: 'הסדר לדוגמה', icon: 'stone', example: true,
    description: 'מצבה, חריטה והתקנה, בתיאום עם בית העלמין.' },
  { id: 'home', name: 'עזרה בבית', category: 'שבעה', benefit: 'הסדר לדוגמה', icon: 'home', example: true,
    description: 'ניקיון וסידור הבית לפני ואחרי השבעה.' },
];
