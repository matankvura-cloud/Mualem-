// המסמכים והזכויות: מה צריך, מי מנפיק, ואיפה פונים. קישורים לגורמים הרשמיים בלבד.
export type DocKind = { key: string; name: string; who: string; why: string; link?: string };
export const DOC_KINDS: DocKind[] = [
  { key: 'death-notice', name: 'הודעת פטירה', who: 'רופא או פרמדיק מוסמך', why: 'המסמך הראשון. בלעדיו אין קבורה ואין תעודת פטירה.' },
  { key: 'id', name: 'תעודת זהות של הנפטר/ת', who: 'בידי המשפחה', why: 'נדרשת לחברת הקבורה, למשרד הפנים ולביטוח לאומי.' },
  { key: 'burial', name: 'רישיון קבורה / אישור חברת הקבורה', who: 'חברת הקבורה המורשית', why: 'מועד, חלקה ואישור הקבורה.' },
  { key: 'death-cert', name: 'תעודת פטירה', who: 'משרד הפנים', why: 'נדרשת לכל גוף: בנקים, ביטוח לאומי, ירושה. מזמינים אונליין.', link: 'https://www.gov.il/he/service/post-death-accompaniment' },
  { key: 'will', name: 'צוואה (אם יש)', who: 'בידי המשפחה או מופקדת אצל רשם הירושה', why: 'קובעת מי יורש. בלי צוואה: צו ירושה לפי החוק.' },
  { key: 'inheritance', name: 'צו ירושה / צו קיום צוואה', who: 'רשם לענייני ירושה, משרד המשפטים', why: 'נדרש לשחרור כספים ונכסים.', link: 'https://www.gov.il/he/service/inheritance_order' },
  { key: 'btl', name: 'תביעה לקצבת שאירים / מענק פטירה', who: 'המוסד לביטוח לאומי', why: 'קצבה חודשית או מענק חד-פעמי, לפי הזכאות.', link: 'https://www.btl.gov.il/benefits/Survivors_%20Insurance/Pages/default.aspx' },
  { key: 'insurance', name: 'פוליסות ביטוח וחיסכון', who: 'הר הביטוח והר הכסף', why: 'איתור פוליסות, קופות וחשבונות על שם הנפטר/ת.', link: 'https://harb.cma.gov.il/' },
  { key: 'other', name: 'מסמך אחר', who: '', why: 'קבלות מספקים, אישורים, מכתבים.' },
];
export const RIGHTS = [
  { name: 'ליווי לאחר פטירה (צעד אחר צעד)', who: 'מערך הדיגיטל הלאומי', url: 'https://www.gov.il/he/service/post-death-accompaniment', text: 'שירות אישי לקרובים מדרגה ראשונה: תעודת פטירה, צו ירושה, וזכויות לפי המקרה.' },
  { name: 'מחשבון זכאות לקצבת שאירים', who: 'ביטוח לאומי', url: 'https://www.btl.gov.il/Simulators/Pages/SherimCalc.aspx', text: 'תשובה מיידית, בלי הזדהות.' },
  { name: 'מענק פטירה לבני משפחה', who: 'ביטוח לאומי', url: 'https://www.btl.gov.il/benefits/Survivors_%20Insurance/Pages/%D7%9E%D7%A2%D7%A0%D7%A7%20%D7%A4%D7%98%D7%99%D7%A8%D7%94.aspx', text: 'מענק חד-פעמי, לפי תנאי הזכאות.' },
  { name: 'הר הכסף', who: 'משרד האוצר ובנק ישראל', url: 'https://itur.mof.gov.il/', text: 'מסלול "חסכונות על שם קרוב שנפטר": פנסיה, ביטוח חיים וחשבונות בנק.' },
  { name: 'הר הביטוח', who: 'רשות שוק ההון', url: 'https://harb.cma.gov.il/', text: 'כל הפוליסות בכל חברות הביטוח, בהזדהות ממשלתית.' },
  { name: 'רשם הירושה', who: 'משרד המשפטים', url: 'https://www.gov.il/he/service/inheritance_order', text: 'בקשה לצו ירושה או לצו קיום צוואה, אונליין. מוקד 2416*.' },
];
