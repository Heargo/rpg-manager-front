export interface ActionCounter {
  name: string;
  count: number;
  used: number;
  movement: boolean;
}

export interface ActionTab<S extends object> extends ActionCounter {
  left: number;
  skills: S[];
}

/** One tab per action type, in order; a skill goes to the tab of its type, else to the first one. */
export function actionTabs<S extends object>(
  actions: ActionCounter[],
  skills: S[],
): ActionTab<S>[] {
  const tabs = actions.map((a) => ({
    name: a.name,
    count: a.count,
    used: a.used,
    movement: a.movement,
    left: a.count - a.used,
    skills: [] as S[],
  }));
  const fallback = tabs.find((t) => !t.movement) ?? tabs[0];
  for (const skill of skills) {
    const tab =
      tabs.find(
        (t) => t.name === (skill as { actionType?: string }).actionType,
      ) ?? fallback;
    tab?.skills.push(skill);
  }
  return tabs;
}
