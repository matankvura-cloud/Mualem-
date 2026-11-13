import { he } from "../../../messages/he";
export function TestBanner() {
  if (process.env.APP_ENV === "production") return null;
  return (
    <div className="bg-warn-soft text-warn text-center text-[12.5px] py-1.5 px-4 border-b border-warn/20" role="status">
      {he.testBanner}
    </div>
  );
}
