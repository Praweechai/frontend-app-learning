import { UPSTREAM_STATUSES, finishedCertificateHref, recordState } from './CourseFinishedPage';

describe('S-77 helpers', () => {
  it('links the certificate only when it can be viewed', () => {
    expect(finishedCertificateHref({ certStatus: 'downloadable', certWebViewUrl: '/certificates/abc' }))
      .toBe('/learner-dashboard/certificates');
    expect(finishedCertificateHref({ certStatus: 'earned_but_not_available', certWebViewUrl: '/x' }))
      .toBeUndefined();
    expect(finishedCertificateHref(undefined)).toBeUndefined();
  });

  it('reports the Portal refresh', () => {
    expect(recordState(undefined)).toBe('updating');
    expect(recordState({ data: { refreshed: true } })).toBe('updated');
    expect(recordState({ data: { refreshed: false, reason: 'too_soon' } })).toBe('later');
    expect(recordState(null)).toBe('later');
  });

  it('leaves certificate requests to the upstream screen', () => {
    expect(UPSTREAM_STATUSES).toEqual(['requesting', 'unverified']);
  });
});
