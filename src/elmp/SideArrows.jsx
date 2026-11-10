import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from '@openedx/paragon/icons';
import { KitIcon, messages, useClassroomIntl } from '@elmp/classroom-kit';

// Plan 5 S-105 (F-136): big Previous / Next arrows at both sides of the lesson (NetAcad arrangement).
// They press the app's own bottom buttons, which keep the section-to-section and course-end logic.
const isOff = (cls) => {
  const b = document.querySelector(`.unit-navigation .${cls}`);
  return !b || b.disabled || b.getAttribute('aria-disabled') === 'true';
};

const SideArrows = ({ onPrev, onNext }) => {
  const intl = useClassroomIntl();
  const { pathname } = useLocation();
  const [off, setOff] = useState({ prev: true, next: true });
  useEffect(() => {
    // the bottom bar renders with the unit; read it once it is on the page
    const read = () => setOff({ prev: isOff('previous-button'), next: isOff('next-button') });
    read();
    const id = setTimeout(read, 400);
    return () => clearTimeout(id);
  }, [pathname]);
  return (
    <div className="elmp-side-arrows">
      <button
        type="button"
        className="cls3-arrow cls3-arrow--prev"
        aria-label={intl.formatMessage(messages.pl3Prev)}
        disabled={off.prev}
        onClick={onPrev}
      >
        <KitIcon src={ChevronLeft} size={32} />
      </button>
      <button
        type="button"
        className="cls3-arrow cls3-arrow--next"
        aria-label={intl.formatMessage(messages.pl3Next)}
        disabled={off.next}
        onClick={onNext}
      >
        <KitIcon src={ChevronRight} size={32} />
      </button>
    </div>
  );
};

SideArrows.propTypes = { onPrev: PropTypes.func.isRequired, onNext: PropTypes.func.isRequired };

export default SideArrows;
