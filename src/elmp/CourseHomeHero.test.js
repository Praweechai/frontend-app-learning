import { certificateHref, heroData } from './CourseHomeHero';

describe('heroData (S-75 hero)', () => {
  const sections = {
    a: { sequenceIds: ['s1', 's2'] },
    b: { sequenceIds: ['s3'], hideFromTOC: true },
  };
  const sequences = {
    s1: { complete: true, effortTime: 1800 },
    s2: { complete: false, effortTime: 1200 },
    s3: { complete: false, effortTime: 600 },
  };
  const context = {
    ce_hours: 3,
    required_by: [
      { assignment_id: 1, status: 'completed', due_at: '2026-09-01T00:00:00+07:00' },
      { assignment_id: 2, status: 'overdue', due_at: '2026-10-31T23:59:59+07:00' },
    ],
  };

  it('counts visible subsections, time and progress, and picks the next due assignment', () => {
    const out = heroData({
      sectionIds: ['a', 'b'], sections, sequences, resumeCourse: { hasVisitedCourse: true, url: '/jump' }, context,
    });
    expect(out).toMatchObject({
      total: 2, done: 1, minutes: 50, ceHours: 3, nextDue: { assignment_id: 2 },
    });
    expect(out.progress).toEqual({
      percent: 50, done: 1, total: 2, href: '/jump', action: 'resume',
    });
    expect(out.requiredBy).toHaveLength(2);
  });

  it('says start before the first visit and review when everything is done; no Portal data is fine', () => {
    expect(heroData({ sectionIds: ['a'], sections, sequences }).progress.action).toBe('start');
    const allDone = { s1: { complete: true }, s2: { complete: true } };
    expect(heroData({
      sectionIds: ['a'], sections, sequences: allDone, resumeCourse: { hasVisitedCourse: true },
    }).progress).toMatchObject({ action: 'review', percent: 100, href: undefined });
    expect(heroData({})).toMatchObject({ total: 0, requiredBy: [], nextDue: undefined });
  });
});

describe('certificateHref', () => {
  it('earned → Classroom Certificates page (Portal PDF, Plan 4 F-113), nothing before', () => {
    expect(certificateHref({ certWebViewUrl: '/certificates/abc' })).toBe('/learner-dashboard/certificates');
    expect(certificateHref({ certStatus: 'notpassing' })).toBeUndefined();
    expect(certificateHref(undefined)).toBeUndefined();
  });
});
