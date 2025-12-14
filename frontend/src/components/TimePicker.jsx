import { useState, useEffect } from 'react';
import './TimePicker.css';

export default function TimePicker({ value, onChange, disabled }) {
  const [hour, setHour] = useState('20');
  const [minute, setMinute] = useState('00');
  const [showPicker, setShowPicker] = useState(false);

  // Parse the value (HH:MM format) when it changes
  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');
      setHour(h.padStart(2, '0'));
      setMinute(m.padStart(2, '0'));
    }
  }, [value]);

  const handleTimeChange = (newHour, newMinute) => {
    const timeString = `${newHour.padStart(2, '0')}:${newMinute.padStart(2, '0')}`;
    onChange(timeString);
  };

  const handleHourChange = (newHour) => {
    setHour(newHour);
    handleTimeChange(newHour, minute);
  };

  const handleMinuteChange = (newMinute) => {
    setMinute(newMinute);
    handleTimeChange(hour, newMinute);
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <div className="time-picker-container">
      <div
        className={`time-display ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setShowPicker(!showPicker)}
      >
        <i className="fas fa-clock"></i>
        <span className="time-value">{hour}:{minute}</span>
        <i className={`fas fa-chevron-${showPicker ? 'up' : 'down'}`}></i>
      </div>

      {showPicker && !disabled && (
        <div className="time-picker-dropdown">
          <div className="time-selectors">
            <div className="time-selector">
              <label>שעה</label>
              <select value={hour} onChange={(e) => handleHourChange(e.target.value)}>
                {hours.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="time-separator">:</div>

            <div className="time-selector">
              <label>דקה</label>
              <select value={minute} onChange={(e) => handleMinuteChange(e.target.value)}>
                {minutes.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="time-picker-close"
            onClick={() => setShowPicker(false)}
          >
            סגור
          </button>
        </div>
      )}
    </div>
  );
}
