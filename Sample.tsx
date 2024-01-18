import { useEffect, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from 'react-i18next';
import timezone from 'dayjs/plugin/timezone';
import Modal from 'react-modal';
import classes from './CalendarModal.module.css';
import { LeftCalendarModal } from './LeftCalendarModal';
import { RightCalendarModal } from './RightCalendarModal/RightCalendarModal';
import SuccessAnimation from './SuccessAnimation/SuccessAnimation';
import {
  useAddSchedulesByCpsMutation,
  useGetSchedulesByCpsQuery,
} from '../../../store/modules/candidate-schedule';
import Spinner from '../../Spinner/Spinner';
import { TIMEZONES } from '../../../constants/datetimes';
import { diffOffset } from '../../../utils/utcDifference';
import { useAppDispatch } from '../../../hooks';
import { companiesApi } from '../../../store/modules/companies';

dayjs.extend(utc);
dayjs.extend(timezone);

interface CalendarModalProps {
  candidateId: number;
  positionId: number;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSwitchingId: React.Dispatch<React.SetStateAction<number | null>>;
}
export const CalendarModal = ({
  candidateId,
  positionId,
  isOpen,
  setIsOpen,
  setSwitchingId,
}: CalendarModalProps) => {
  Modal.setAppElement(document.getElementById('root') as HTMLElement);
  const [schedules, setSchedules] = useState<Dayjs[]>([]);
  const [done, setDone] = useState(false);
  const [timeZone, setTimeZone] = useState(TIMEZONES.EASTERN);
  const [, i18next] = useTranslation('global');
  const { data, isLoading } = useGetSchedulesByCpsQuery({
    candidateId,
    positionId,
  });
  const [addSchedulesByCps] = useAddSchedulesByCpsMutation();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!isLoading) {
      const parsedData = data?.map((schedule) => {
        const difference = diffOffset(
          timeZone,
          schedule.Timezone === null ? TIMEZONES.EASTERN : schedule.Timezone
        );

        return dayjs(schedule.Date.replace('Z', ''))
          .add(difference, 'h')
          .tz(timeZone, true);
      });

      setSchedules(parsedData ?? []);
    }
  }, [isLoading, data, timeZone]);

  const submitSchedules = () => {
    const parsedSchedules = schedules.map((schedule) => {
      return {
        Date: `${schedule.format().replace(/-\d{2}:\d{2}$/, '')}Z`,
        Timezone: timeZone,
      };
    });
    addSchedulesByCps({
      lang: i18next.language as 'en' | 'es',
      data: {
        positionId,
        candidateId,
        schedules: parsedSchedules,
      },
    }).then(() => {
      dispatch(companiesApi.util.invalidateTags(['PositionsList']));
    });
    setDone(true);
    setTimeout(() => {
      setSwitchingId(candidateId);
      setIsOpen(false);
    }, 1000);
  };

  const handleClose = () => {
    setIsOpen(false);
    setDone(false);
  };
  return (
    <Modal
      className={classes.modal}
      overlayClassName={classes.overlay}
      isOpen={isOpen}
      onRequestClose={handleClose}
      ariaHideApp={false}
    >
      {!isLoading && (
        <div className={classes.container}>
          {!done ? (
            <>
              <LeftCalendarModal
                setSchedules={setSchedules}
                schedules={schedules}
                setTimezone={setTimeZone}
                timezone={timeZone}
              />
              <div className={classes.divider} />
              <RightCalendarModal
                schedules={schedules}
                setSchedules={setSchedules}
                submitSchedules={submitSchedules}
              />
            </>
          ) : (
            <SuccessAnimation />
          )}
        </div>
      )}
      {isLoading && (
        <div
          style={{ display: 'flex', justifyContent: 'center', height: '100%' }}
        >
          <Spinner height="35rem" />
        </div>
      )}
    </Modal>
  );
};
