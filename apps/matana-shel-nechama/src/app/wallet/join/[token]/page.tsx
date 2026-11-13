import type { Metadata } from "next";
import { acceptInviteAction } from "../../actions";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { errText } from "../../../../../messages/he";

export const metadata: Metadata = { title: "הצטרפות לארנק" };

export default async function JoinPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await params; const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md py-8 text-center">
      <h1 className="text-3xl">הצטרפות לארנק משפחתי</h1>
      <p className="mt-2 text-muted">הוזמנתם לראות ולהציג את השוברים של המשפחה.</p>
      {sp.error && <div className="mt-4 text-start"><Alert kind="danger">{errText(sp.error)}</Alert></div>}
      <form action={acceptInviteAction} className="mt-6"><input type="hidden" name="token" value={token} /><SubmitButton className="btn btn-primary w-full">הצטרפות</SubmitButton></form>
    </div>
  );
}
