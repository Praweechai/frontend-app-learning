import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { UnitTitle } from '@elmp/classroom-kit';

// ELMP: UnitTitleSlot widget. Subsection name + unit title as the page H1 (S-76). The top Previous/Next
// buttons are left out on purpose: the bottom bar is the one navigation (doc 04 §5.12).
const UnitHeading = ({ unit }) => {
  const section = useSelector((state) => state.models.sequences?.[unit?.sequenceId]?.title);
  if (!unit?.title) { return null; }
  return <UnitTitle title={unit.title} section={section || undefined} />;
};

UnitHeading.propTypes = { unit: PropTypes.shape({ title: PropTypes.string, sequenceId: PropTypes.string }) };

export default UnitHeading;
