import { TestBed } from '@angular/core/testing';
import { World } from '../../world/models/world';
import { Skill } from '../models/skill';
import { SkillEditorBusiness } from './skill-editor.business';

const world = {
  attributes: [{ name: 'Life' }, { name: 'Mana' }],
  combat: {
    actionTypes: [
      { name: 'Action', count: 1, movement: false },
      { name: 'Movement', count: 1, movement: true },
      { name: 'Reaction', count: 2, movement: false },
    ],
  },
} as unknown as World;

const skill: Skill = {
  id: 's1',
  name: 'Dash',
  description: '',
  rarity: 'common',
  type: 'active',
  maxLevel: 1,
  pointCost: 1,
  target: 'self',
  cooldown: 0,
  actionType: 'Movement',
  effects: [],
};

describe('SkillEditorBusiness action types', () => {
  let editor: SkillEditorBusiness;

  beforeEach(() => {
    editor = TestBed.inject(SkillEditorBusiness);
  });

  it('offers the names of the world combat action types, in order', () => {
    expect(editor.actionTypeOptions(world)).toEqual(['Action', 'Movement', 'Reaction']);
  });

  it('a new skill has no action type', () => {
    expect(editor.empty().actionType).toBeUndefined();
  });

  it('writes the action type in the JSON and reads it back', () => {
    const text = editor.toJson(skill);

    expect(JSON.parse(text).actionType).toBe('Movement');
    expect(editor.parse(text, skill, world).skill?.actionType).toBe('Movement');
  });

  it('refuses a passive skill that names an action type', () => {
    const issues = editor.validate({ ...skill, type: 'passive', target: undefined }, world);

    expect(issues).toEqual([{ field: 'actionType', code: 'invalid' }]);
  });
});
