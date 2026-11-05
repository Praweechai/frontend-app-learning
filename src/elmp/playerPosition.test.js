import { playerPosition } from './playerPosition';
import { routeKind } from './LearningHeader';

jest.mock('@elmp/classroom-kit', () => ({}));

const state = (outline) => ({
  courseware: { courseId: 'c1', courseStatus: 'loaded', courseOutline: outline },
  models: {
    coursewareMeta: { c1: { sectionIds: ['s1', 's2'] } },
    sections: { s1: { sequenceIds: ['q1'] }, s2: { sequenceIds: ['q2'] } },
    sequences: { q1: { unitIds: ['u1', 'u2'] }, q2: { unitIds: ['u3', 'u4', 'u5'] } },
  },
});

describe('playerPosition (S-76 "Unit 4 of 8")', () => {
  it('counts units across the whole course and the % done', () => {
    const outline = {
      sequences: { q1: { unitIds: ['u1', 'u2'] }, q2: { unitIds: ['u3', 'u4', 'u5'] } },
      units: { u1: { complete: true }, u2: { complete: true }, u3: { complete: false } },
    };
    expect(playerPosition(state(outline), 'q2', 'u4')).toEqual({ unitIndex: 4, unitCount: 5, progress: 40 });
  });

  it('falls back to the current subsection before the outline loads', () => {
    expect(playerPosition(state({}), 'q2', 'u4')).toEqual({ unitIndex: 2, unitCount: 3 });
  });

  it('returns nothing when nothing is known', () => {
    expect(playerPosition({}, 'x', 'y')).toEqual({});
  });
});

describe('routeKind', () => {
  it('tells course pages from the player', () => {
    expect(routeKind('/course/course-v1:A+B+C/home').kind).toBe('page');
    expect(routeKind('/course/course-v1:A+B+C/progress').kind).toBe('page');
    expect(routeKind('/course/course-v1:A+B+C/course-end').kind).toBe('page');
    expect(routeKind('/course/course-v1:A+B+C/block-v1:seq/block-v1:unit')).toMatchObject({
      kind: 'player', sequenceId: 'block-v1:seq', unitId: 'block-v1:unit',
    });
  });
});
