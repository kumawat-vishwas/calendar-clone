const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const api = {
  async getEvents(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await fetch(`${API_BASE}/events?${params}`);
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },

  async createEvent(eventData) {
    const response = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
    if (!response.ok) throw new Error('Failed to create event');
    return response.json();
  },

  async updateEvent(eventId, eventData) {
    const response = await fetch(`${API_BASE}/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
    if (!response.ok) throw new Error('Failed to update event');
    return response.json();
  },

  async deleteEvent(eventId) {
    const response = await fetch(`${API_BASE}/events/${eventId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete event');
    return response.json();
  },

  async checkConflicts(eventData) {
    const response = await fetch(`${API_BASE}/events/conflicts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
    if (!response.ok) throw new Error('Failed to check conflicts');
    return response.json();
  }
};