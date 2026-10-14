import { describe, it, expect } from 'vitest';
import { buildWorkflowTree, countDescendants, type WorkflowNode, type WorkflowStepInput } from './serviceWorkflow';

// Kenya SHA NSHR Outpatient Visit Protocol action order (as served by /action-order on dev)
const kenyaOrder = [
  { actionId: 'consent-request', parentActionId: null },
  { actionId: 'consent-verification', parentActionId: 'consent-request' },
  { actionId: 'visit-encounter', parentActionId: 'consent-verification' },
  { actionId: 'vitals-recording', parentActionId: 'visit-encounter' },
  { actionId: 'diagnosis', parentActionId: 'visit-encounter' },
  { actionId: 'medication-request', parentActionId: 'visit-encounter' },
  { actionId: 'medication-dispense', parentActionId: 'medication-request' },
  { actionId: 'lab-order-request', parentActionId: 'visit-encounter' },
  { actionId: 'lab-results', parentActionId: 'lab-order-request' },
  { actionId: 'procedure-order-request', parentActionId: 'visit-encounter' },
  { actionId: 'procedure', parentActionId: 'procedure-order-request' },
];

const s = (actionId: string, totalInstances = 1): WorkflowStepInput => ({ actionId, totalInstances });

// Render a tree as "id(child,child(grandchild))" for compact assertions.
const shape = (nodes: WorkflowNode<WorkflowStepInput>[]): string =>
  nodes.map((n) => n.step.actionId + (n.children.length ? `(${shape(n.children)})` : '')).join(',');

describe('buildWorkflowTree', () => {
  it('nests a deep protocol chain to every level, in action order', () => {
    // API returns steps in arbitrary order
    const steps = ['vitals-recording', 'visit-encounter', 'lab-results', 'procedure', 'consent-request', 'diagnosis',
      'medication-request', 'lab-order-request', 'consent-verification', 'procedure-order-request', 'medication-dispense'].map((id) => s(id));
    const tree = buildWorkflowTree(steps, kenyaOrder);
    expect(shape(tree)).toBe(
      'consent-request(consent-verification(visit-encounter(vitals-recording,diagnosis,' +
        'medication-request(medication-dispense),lab-order-request(lab-results),procedure-order-request(procedure))))',
    );
    expect(countDescendants(tree[0])).toBe(10);
  });

  it('hangs a step on its nearest ancestor with data when its parent has none', () => {
    const tree = buildWorkflowTree([s('consent-request'), s('diagnosis'), s('medication-dispense')], kenyaOrder);
    expect(shape(tree)).toBe('consent-request(diagnosis,medication-dispense)');
  });

  it('makes a step top-level when no ancestor has data', () => {
    const tree = buildWorkflowTree([s('procedure'), s('lab-results')], kenyaOrder);
    expect(shape(tree)).toBe('lab-results,procedure');
  });

  it('drops steps without data and keeps steps missing from the action order as top-level', () => {
    const tree = buildWorkflowTree([s('consent-request'), s('consent-verification', 0), s('unknown-step')], kenyaOrder);
    expect(shape(tree)).toBe('consent-request,unknown-step');
  });

  it('does not loop on a cyclic action order', () => {
    const order = [{ actionId: 'a', parentActionId: 'b' }, { actionId: 'b', parentActionId: 'c' }, { actionId: 'c', parentActionId: 'b' }];
    expect(shape(buildWorkflowTree([s('a')], order))).toBe('a');
  });
});
