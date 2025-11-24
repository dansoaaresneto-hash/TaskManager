import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPickerProps {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({ selectedDate, onSelect, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  const onNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const onPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="absolute z-50 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 w-72 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={(e) => { e.preventDefault(); onPrevMonth(); }}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="font-bold text-gray-700 dark:text-gray-200">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button 
           onClick={(e) => { e.preventDefault(); onNextMonth(); }}
           className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <button
              key={idx}
              onClick={(e) => {
                e.preventDefault();
                onSelect(day);
                onClose();
              }}
              className={`
                h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-all
                ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-200'}
                ${isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400'}
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarPicker;