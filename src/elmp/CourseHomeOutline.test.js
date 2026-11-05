import { outlineSections } from './CourseHomeOutline';

describe('outlineSections (S-75 course outline)', () => {
  const sections = {
    a: {
      id: 'a', title: '1. Basics', sequenceIds: ['s1', 's2'], resumeBlock: false,
    },
    b: {
      id: 'b', title: '2. Isolation', sequenceIds: ['s3', 's4', 's5'], resumeBlock: true,
    },
    h: {
      id: 'h', title: 'Hidden', sequenceIds: [], hideFromTOC: true,
    },
  };
  const seq = (id, extra) => ({
    id, title: `Seq ${id}`, showLink: true, complete: false, ...extra,
  });
  const sequences = {
    s1: seq('s1', { complete: true, effortTime: 361 }),
    s2: seq('s2', { complete: true }),
    s3: seq('s3', { complete: true }),
    s4: seq('s4'),
    s5: seq('s5', { showLink: false }),
  };

  it('maps sections and subsections, marks the resume point, drops hidden blocks', () => {
    const out = outlineSections({
      courseId: 'course-v1:MH+INF101+2026', sectionIds: ['a', 'b', 'h'], sections, sequences,
    });
    expect(out.map((s) => s.id)).toEqual(['a', 'b']);
    expect(out[0].items[0]).toEqual({
      id: 's1',
      title: 'Seq s1',
      href: '/course/course-v1:MH+INF101+2026/s1',
      complete: true,
      current: false,
      locked: false,
      minutes: 7,
    });
    expect(out[1].items.filter((i) => i.current).map((i) => i.id)).toEqual(['s4']);
    expect(out[1].items[2]).toMatchObject({ locked: true, href: undefined });
  });

  it('copes with missing data', () => {
    expect(outlineSections({ courseId: 'x' })).toEqual([]);
    expect(outlineSections({ courseId: 'x', sectionIds: ['a'], sections })[0].items).toEqual([]);
  });
});
