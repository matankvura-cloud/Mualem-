'use server';
import { revalidatePath } from 'next/cache';
import { many } from '@/lib/db';
import { fundByManage } from '@/lib/funds';
import { TOKEN_RE } from '@/lib/tokens';
import { PLANS } from '@/data/now';

async function own(manage: string) {
  if (!TOKEN_RE.test(manage)) return null;
  return fundByManage(manage);
}

export async function setSituation(manage: string, fd: FormData) {
  const fund = await own(manage);
  if (!fund) return;
  const s = String(fd.get('situation') || '');
  const ok = PLANS.some((p) => p.key === s) ? s : null;
  await many(`UPDATE funds SET situation = $2, updated_at = now() WHERE id = $1`, [fund.id, ok]);
  revalidatePath(`/m/${manage}/now`); revalidatePath(`/m/${manage}`);
}

export async function toggleTask(manage: string, key: string, done: boolean) {
  const fund = await own(manage);
  if (!fund || !/^[a-z0-9-]{1,40}$/.test(key)) return;
  if (done) await many(`INSERT INTO tasks_done (fund_id, task_key) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [fund.id, key]);
  else await many(`DELETE FROM tasks_done WHERE fund_id = $1 AND task_key = $2`, [fund.id, key]);
  revalidatePath(`/m/${manage}/now`); revalidatePath(`/m/${manage}`);
}

export async function deleteDocument(manage: string, id: string) {
  const fund = await own(manage);
  if (!fund || !/^[0-9a-f-]{36}$/i.test(id)) return;
  await many(`DELETE FROM documents WHERE id = $1 AND fund_id = $2`, [id, fund.id]);
  revalidatePath(`/m/${manage}/file`); revalidatePath(`/m/${manage}`);
}
