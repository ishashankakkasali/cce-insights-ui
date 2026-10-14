/**
 * Builds the Service Workflow Compliance tree from the flat step-analytics rows + the protocol's
 * action order, to any depth.
 *
 * Protocols can chain steps several levels deep (e.g. Kenya SHA: consent-request →
 * consent-verification → visit-encounter → medication-request → medication-dispense). Only
 * steps with data are shown; each one is nested under its **nearest ancestor that has data**, and
 * becomes top-level when no ancestor has data — so no data-bearing step is ever hidden.
 */
export interface WorkflowStepInput {
  actionId: string;
  totalInstances: number;
}

export interface WorkflowOrderEntry {
  actionId: string;
  parentActionId: string | null;
}

export interface WorkflowNode<T extends WorkflowStepInput> {
  step: T;
  children: WorkflowNode<T>[];
}

export function buildWorkflowTree<T extends WorkflowStepInput>(
  steps: T[],
  order: WorkflowOrderEntry[],
): WorkflowNode<T>[] {
  const orderMap = new Map(order.map((e, i) => [e.actionId, i] as const));
  const parentOf = new Map(order.map((e) => [e.actionId, e.parentActionId ?? null] as const));
  const orderIdx = (id: string) => orderMap.get(id) ?? 999;

  const withData = steps
    .filter((s) => s.totalInstances > 0)
    .sort((a, b) => orderIdx(a.actionId) - orderIdx(b.actionId));
  const nodes = new Map(withData.map((s) => [s.actionId, { step: s, children: [] } as WorkflowNode<T>]));

  // Walk up the parent chain to the first ancestor that has data (guarding against cycles).
  const shownAncestor = (id: string): string | null => {
    const seen = new Set([id]);
    let p = parentOf.get(id) ?? null;
    while (p && !seen.has(p)) {
      if (nodes.has(p)) return p;
      seen.add(p);
      p = parentOf.get(p) ?? null;
    }
    return null;
  };

  const roots: WorkflowNode<T>[] = [];
  for (const s of withData) {
    const node = nodes.get(s.actionId)!;
    const anc = shownAncestor(s.actionId);
    if (anc) nodes.get(anc)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** Number of nodes below `node`, at every depth. */
export function countDescendants<T extends WorkflowStepInput>(node: WorkflowNode<T>): number {
  return node.children.reduce((n, c) => n + 1 + countDescendants(c), 0);
}
