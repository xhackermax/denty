export function validateGraph(stages) {
  const ids = new Set(Object.keys(stages));

  for (const [id, stage] of Object.entries(stages)) {
    for (const dependency of stage.needs ?? []) {
      if (!ids.has(dependency)) {
        throw new Error(`Stage ${id} depends on unknown stage ${dependency}`);
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();

  function visit(id, stack = []) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(`Pipeline cycle detected: ${[...stack, id].join(" -> ")}`);
    }

    visiting.add(id);
    for (const dependency of stages[id].needs ?? []) {
      visit(dependency, [...stack, id]);
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of ids) visit(id);
}

export function planStages(stages, roots, assumed = []) {
  validateGraph(stages);
  const assumedSet = new Set(assumed);
  const planned = [];
  const added = new Set();

  function add(id) {
    if (assumedSet.has(id) || added.has(id)) return;
    const stage = stages[id];
    if (!stage) throw new Error(`Unknown pipeline stage: ${id}`);
    for (const dependency of stage.needs ?? []) add(dependency);
    added.add(id);
    planned.push(id);
  }

  for (const root of roots) add(root);
  return planned;
}
