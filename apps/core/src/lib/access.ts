// Permission gates shared by the UI resolvers and the Rovo/MCP actions (D15, D20, D21).
// The user's rights come from `GET /pages/{id}/operations` asUser; the D20 restriction check reads the
// page asApp (the app user gets 404 on pages with view restrictions, confirmed live 2026-11-11).
// Never trust client or LLM input for authorization.
import { getPageMeta, pageOperations } from './confluence';
import { MESSAGES, type Failure, type Gate } from './review-service';

/** api.asApp() or api.asUser(). */
type Requester = Parameters<typeof pageOperations>[0];

/** D20: true when the app user can't read the page (view restrictions). */
export async function appCannotRead(app: Requester, pageId: string): Promise<boolean> {
  const meta = await getPageMeta(app, pageId);
  return meta.status === 404 || meta.status === 403;
}

export const notVisible = (): Failure => ({ ok: false, error: 'not_visible', state: 'unknown', message: MESSAGES.notVisible });
export const restricted = (): Failure => ({ ok: false, error: 'restricted', restricted: true, message: MESSAGES.restricted });

/**
 * A gate that checks `user`'s rights on the page (`read` or `update`), then the D20 restriction check
 * with `app`. `needsEdit` overrides the message for a missing `update` right.
 */
export function makeGate(user: Requester, app: Requester, needsEdit: string = MESSAGES.needsEdit): Gate {
  return async (pageId, need) => {
    const ops = await pageOperations(user, pageId);
    if (ops.status >= 300 || !ops.ops.has('read')) return notVisible();
    if (need === 'update' && !ops.ops.has('update')) {
      console.log(`DDS_GATE_DENIED pageId=${pageId} need=${need}`);
      return { ok: false, error: 'forbidden', message: needsEdit };
    }
    if (await appCannotRead(app, pageId)) {
      console.log(`DDS_BYLINE_RESTRICTED pageId=${pageId}`);
      return restricted();
    }
    return null;
  };
}
