import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin, Trash2 } from 'lucide-react';
import './App.css';
import './index.css';
import { api } from './utils/api';

const App = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week, day
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [error, setError] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    startTime: '09:00',
    endTime: '10:00',
    description: '',
    location: '',
    color: '#1a73e8'
  });

  // Load events from backend API
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoadingEvents(true);
        setError(null);
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const eventsFromApi = await api.getEvents(
          formatDate(startDate),
          formatDate(endDate)
        );
        // Map backend fields (snake_case) to frontend camelCase
        const normalized = eventsFromApi.map((e) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          startTime: e.start_time,
          endTime: e.end_time,
          description: e.description || '',
          location: e.location || '',
          color: e.color || '#1a73e8',
        }));
        setEvents(normalized);
      } catch (err) {
        console.error('Error loading events:', err);
        setError('Failed to load events');
      } finally {
        setLoadingEvents(false);
      }
    };

    loadEvents();
  }, [currentDate]);

  const colors = [
    { name: 'Blue', value: '#1a73e8' },
    { name: 'Red', value: '#d50000' },
    { name: 'Green', value: '#0b8043' },
    { name: 'Purple', value: '#8e24aa' },
    { name: 'Orange', value: '#e67c73' }
  ];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push({ date: prevMonthDay, isCurrentMonth: false });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  };

  const getWeekDays = (date) => {
    const day = date.getDay();
    const diff = date.getDate() - day;
    const sunday = new Date(date.setDate(diff));
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d;
    });
  };

  // const formatDate = (date) => {
  //   return date.toISOString().split('T')[0];
  // };
  const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // 1-12
  const day = String(date.getDate()).padStart(2, '0');        // 1-31
  return `${year}-${month}-${day}`;
};
  const getEventsForDate = (date) => {
    const dateStr = formatDate(date);
    return events.filter(e => e.date === dateStr).sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    );
  };

  const handleCreateEvent = (date = null, startTime = '09:00') => {
    setIsEditing(false);
    setSelectedEvent(null);

    const baseDate = date || selectedDate || currentDate;

    let [startHour, startMin] = startTime.split(':').map(Number);
    let endHour = startHour + 1;
    let endMin = startMin;

    if (endHour >= 24) {
      endHour = 23;
      endMin = 59;
    }

    const endTime = `${endHour.toString().padStart(2, '0')}:${endMin
      .toString()
      .padStart(2, '0')}`;

    setEventForm({
      title: '',
      date: formatDate(baseDate),
      startTime,
      endTime,
      description: '',
      location: '',
      color: '#1a73e8'
    });
    setShowEventModal(true);
  };

  const handleEditEvent = (event) => {
    setIsEditing(true);
    setSelectedEvent(event);
    setEventForm(event);
    setShowEventModal(true);
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title || !eventForm.date) return;

    const payload = {
      title: eventForm.title,
      date: eventForm.date,
      start_time: eventForm.startTime,
      end_time: eventForm.endTime,
      description: eventForm.description,
      location: eventForm.location,
      color: eventForm.color,
    };

    try {
      setSavingEvent(true);
      setError(null);

      let saved;
      if (isEditing && selectedEvent) {
        saved = await api.updateEvent(selectedEvent.id, payload);
      } else {
        saved = await api.createEvent(payload);
      }

      const normalized = {
        id: saved.id,
        title: saved.title,
        date: saved.date,
        startTime: saved.start_time,
        endTime: saved.end_time,
        description: saved.description || '',
        location: saved.location || '',
        color: saved.color || '#1a73e8',
      };

      setEvents((prev) => {
        if (isEditing && selectedEvent) {
          return prev.map((e) => (e.id === normalized.id ? normalized : e));
        }
        return [...prev, normalized];
      });

      setShowEventModal(false);
    } catch (err) {
      console.error('Error saving event:', err);
      setError('Failed to save event');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      setSavingEvent(true);
      setError(null);

      await api.deleteEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setShowEventModal(false);
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Failed to delete event');
    } finally {
      setSavingEvent(false);
    }
  };

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const navigateDay = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  const handleNavigate = (direction) => {
    if (view === 'month') navigateMonth(direction);
    else if (view === 'week') navigateWeek(direction);
    else navigateDay(direction);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getTimeSlots = () => {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, '0');
      return `${hour}:00`;
    });
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="flex-1 bg-white">
        <div className="grid grid-cols-7 border-b">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr" style={{ height: 'calc(100vh - 180px)' }}>
          {days.map((day, idx) => {
            const dayEvents = getEventsForDate(day.date);
            return (
              <div
                key={idx}
                className={`border-r border-b p-1 cursor-pointer hover:bg-gray-50 transition-colors flex flex-col overflow-hidden ${
                  !day.isCurrentMonth ? 'bg-gray-50' : ''
                }`}
                onClick={() => {
                  setSelectedDate(day.date);
                  handleCreateEvent(day.date);
                }}
              >
                <div className={`text-xs mb-1 flex-shrink-0 text-right ${
                  isToday(day.date)
                    ? 'text-blue-600 font-semibold'
                    : day.isCurrentMonth
                      ? 'text-gray-900'
                      : 'text-gray-400'
                }`}>
                  {day.date.getDate()}
                </div>
                <div className="space-y-0.5 mt-0.5 flex-1 min-h-0 overflow-hidden flex flex-col text-xs">
                  <div className="space-y-0.5 flex-1 min-h-0">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        className="px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: event.color, color: 'white' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEvent(event);
                        }}
                      >
                        {event.startTime} {event.title}
                      </div>
                    ))}
                  </div>
                  {dayEvents.length > 2 && (
                    <div className="text-[11px] text-gray-500 px-1 truncate flex-shrink-0">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(new Date(currentDate));
    const timeSlots = getTimeSlots();

    return (
      <div className="flex-1 bg-white overflow-auto">
        <div className="flex border-b sticky top-0 bg-white z-10">
          <div className="w-16 p-2 border-r"></div>
          <div className="flex flex-1">
            {weekDays.map(day => (
              <div key={day.toISOString()} className="flex-1 p-2 text-center border-r">
                <div className="text-xs text-gray-600">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className={`text-lg font-semibold ${
                  isToday(day) ? 'bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''
                }`}>
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex">
          <div className="w-16 border-r">
            {timeSlots.map(time => (
              <div key={time} className="h-12 border-b text-xs text-gray-500 pr-2 pt-1 text-right">
                {time}
              </div>
            ))}
          </div>
          {weekDays.map(day => {
            const dayEvents = getEventsForDate(day);
            return (
              <div key={day.toISOString()} className="flex-1 border-r relative">
                {timeSlots.map(time => (
                  <div
                    key={time}
                    className="h-12 border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedDate(day);
                      handleCreateEvent(day, time);
                    }}
                  />
                ))}
                {dayEvents
                  .slice()
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((event, index, sortedEvents) => {
                    const [startHour, startMin] = event.startTime.split(':').map(Number);
                    const [endHour, endMin] = event.endTime.split(':').map(Number);
                    const top = (startHour + startMin / 60) * 48;
                    const height = ((endHour + endMin / 60) - (startHour + startMin / 60)) * 48;

                    const sameStartEvents = sortedEvents.filter(
                      e => e.startTime === event.startTime && e.date === event.date
                    );
                    const sameStartIndex = sameStartEvents.findIndex(e => e.id === event.id);
                    const columnCount = sameStartEvents.length;

                    const widthPercent = 100 / columnCount;
                    const leftPercent = widthPercent * sameStartIndex;

                    return (
                      <div
                        key={event.id}
                        className="absolute mx-0.5 rounded px-1 text-white text-xs cursor-pointer hover:opacity-90"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          left: `${leftPercent}%`,
                          width: `calc(${widthPercent}% - 4px)`,
                          backgroundColor: event.color
                        }}
                        onClick={() => handleEditEvent(event)}
                      >
                        <div className="font-semibold">{event.title}</div>
                        <div>{event.startTime} - {event.endTime}</div>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const timeSlots = getTimeSlots();
    const dayEvents = getEventsForDate(currentDate);

    return (
      <div className="flex-1 bg-white overflow-auto">
        <div className="border-b p-4 sticky top-0 bg-white">
          <div className="text-xs text-gray-600">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <div className={`text-2xl font-semibold ${
            isToday(currentDate) ? 'text-blue-600' : ''
          }`}>
            {currentDate.getDate()}
          </div>
        </div>
        <div className="grid grid-cols-12">
          <div className="col-span-2 border-r">
            {timeSlots.map(time => (
              <div key={time} className="h-16 border-b text-xs text-gray-500 pr-2 pt-1 text-right">
                {time}
              </div>
            ))}
          </div>
          <div className="col-span-10 relative">
            {timeSlots.map(time => (
              <div
                key={time}
                className="h-16 border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  handleCreateEvent(currentDate, time);
                }}
              />
            ))}
            {dayEvents
              .slice()
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((event, index, sortedEvents) => {
                const [startHour, startMin] = event.startTime.split(':').map(Number);
                const [endHour, endMin] = event.endTime.split(':').map(Number);
                const top = (startHour + startMin / 60) * 64;
                const height = ((endHour + endMin / 60) - (startHour + startMin / 60)) * 64;

                const sameStartEvents = sortedEvents.filter(
                  e => e.startTime === event.startTime && e.date === event.date
                );
                const sameStartIndex = sameStartEvents.findIndex(e => e.id === event.id);
                const columnCount = sameStartEvents.length;

                const widthPercent = 100 / columnCount;
                const leftPercent = widthPercent * sameStartIndex;

                return (
                  <div
                    key={event.id}
                    className="absolute mx-2 rounded p-2 text-white cursor-pointer hover:opacity-90"
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: `${leftPercent}%`,
                      width: `calc(${widthPercent}% - 8px)`,
                      backgroundColor: event.color
                    }}
                    onClick={() => handleEditEvent(event)}
                  >
                    <div className="font-semibold text-sm">{event.title}</div>
                    <div className="text-xs">{event.startTime} - {event.endTime}</div>
                    {event.location && (
                      <div className="text-xs mt-1 opacity-90">{event.location}</div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <div className="text-2xl">📅</div>
            </div>
            <h1 className="text-xl font-normal text-gray-700">Calendar</h1>
          </div>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-1.5 border rounded hover:bg-gray-50 text-sm font-medium"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleNavigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleNavigate(1)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-xl font-normal">
            {view === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            {view === 'week' && `Week of ${getWeekDays(new Date(currentDate))[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            {view === 'day' && currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded overflow-hidden">
            <button
              onClick={() => setView('day')}
              className={`px-4 py-1.5 text-sm ${view === 'day' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              Day
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-4 py-1.5 text-sm border-x ${view === 'week' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-4 py-1.5 text-sm ${view === 'month' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              Month
            </button>
          </div>
          <button
            onClick={() => {
              setSelectedDate(null);
              handleCreateEvent();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Error / loading indicators */}
      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-700 text-sm">{error}</div>
      )}
      {loadingEvents && (
        <div className="px-4 py-2 text-gray-500 text-sm">Loading events...</div>
      )}

      {/* Calendar View */}
      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}
      {view === 'day' && renderDayView()}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-normal">
                  {isEditing ? 'Edit Event' : 'Create Event'}
                </h2>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Add title"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full text-2xl border-b-2 border-gray-200 focus:border-blue-600 outline-none pb-2"
                />

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="date"
                      value={eventForm.date}
                      onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                      className="border rounded px-3 py-2"
                    />
                    <input
                      type="time"
                      value={eventForm.startTime}
                      onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                      className="border rounded px-3 py-2"
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={eventForm.endTime}
                      onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                      className="border rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-600" />
                  <input
                    type="text"
                    placeholder="Add location"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    className="flex-1 border rounded px-3 py-2"
                  />
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 text-gray-600 mt-2">📝</div>
                  <textarea
                    placeholder="Add description"
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    className="flex-1 border rounded px-3 py-2 min-h-[100px]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 text-gray-600">🎨</div>
                  <div className="flex gap-2">
                    {colors.map(color => (
                      <button
                        key={color.value}
                        onClick={() => setEventForm({ ...eventForm, color: color.value })}
                        className={`w-8 h-8 rounded-full ${
                          eventForm.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                        }`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                {isEditing ? (
                  <button
                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="px-6 py-2 border rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEvent}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                    disabled={savingEvent}
                  >
                    {savingEvent ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;