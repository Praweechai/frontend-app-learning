// "Unit 4 of 8" and the course's % done for the S-76 top bar, from data the app already loaded
// (course section order + the outline sidebar's completion flags). Missing data: fields left undefined.
export const playerPosition = (state, sequenceId, unitId) => {
  const out = {};
  const { courseware = {}, models = {} } = state || {};
  const meta = models.coursewareMeta?.[courseware.courseId];
  const outline = courseware.courseOutline || {};
  if (courseware.courseStatus === 'loaded' && meta?.sectionIds && outline.sequences) {
    const sequenceIds = meta.sectionIds.flatMap((id) => models.sections?.[id]?.sequenceIds || []);
    const unitIds = sequenceIds.flatMap((id) => outline.sequences[id]?.unitIds || models.sequences?.[id]?.unitIds || []);
    if (unitIds.length) {
      const i = unitIds.indexOf(unitId);
      out.unitCount = unitIds.length;
      if (i >= 0) { out.unitIndex = i + 1; }
      const done = unitIds.filter((id) => outline.units?.[id]?.complete).length;
      out.progress = Math.round((done * 100) / unitIds.length);
      return out;
    }
  }
  // Before the outline loads: position inside the current subsection only, no progress line.
  const seq = models.sequences?.[sequenceId];
  if (seq?.unitIds?.length) {
    out.unitCount = seq.unitIds.length;
    const i = seq.unitIds.indexOf(unitId);
    if (i >= 0) { out.unitIndex = i + 1; }
  }
  return out;
};

export default playerPosition;
