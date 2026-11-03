'use client';
import { useEffect, useState } from 'react';

/** תמונת QR שמתחדשת כל דקה (החתימה בקישור תקפה שלוש דקות). */
export default function LiveQr({ src, size = 160 }: { src: string; size?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => { const id = setInterval(() => setN((x) => x + 1), 50_000); return () => clearInterval(id); }, []);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${src}${src.includes('?') ? '&' : '?'}v=${n}`} alt="QR של כרטיס המשפחה, מתחדש אוטומטית" width={size} height={size} />;
}
