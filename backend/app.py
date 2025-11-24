from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import os
import sqlite3
from typing import Dict, Optional
import uuid

app = Flask(__name__)
CORS(app)

# Database initialization
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'calendar.db')

def init_db():
    """Initialize SQLite database with events table"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            description TEXT,
            location TEXT,
            color TEXT,
            is_recurring BOOLEAN DEFAULT 0,
            recurrence_rule TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create index for faster date queries
    c.execute('CREATE INDEX IF NOT EXISTS idx_date ON events(date)')
    
    conn.commit()
    conn.close()

def get_db_connection():
    """Create database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def validate_event_data(data: Dict) -> tuple[bool, Optional[str]]:
    """Validate event data and normalize keys from frontend."""

    # Frontend sends startTime/endTime; accept both camelCase and snake_case.
    title = data.get('title')
    date_val = data.get('date')
    start_time = data.get('start_time') or data.get('startTime')
    end_time = data.get('end_time') or data.get('endTime')

    if not title:
        return False, "Missing required field: title"
    if not date_val:
        return False, "Missing required field: date"
    if not start_time:
        return False, "Missing required field: start_time"
    if not end_time:
        return False, "Missing required field: end_time"

    # Validate date format
    try:
        datetime.strptime(date_val, '%Y-%m-%d')
    except ValueError:
        return False, "Invalid date format. Use YYYY-MM-DD"

    # Validate time format and ordering
    try:
        start = datetime.strptime(start_time, '%H:%M')
        end = datetime.strptime(end_time, '%H:%M')

        if end <= start:
            return False, "End time must be after start time"
    except ValueError:
        return False, "Invalid time format. Use HH:MM"

    # Normalize back to snake_case for the rest of the code.
    data['start_time'] = start_time
    data['end_time'] = end_time

    return True, None

def check_event_overlap(date: str, start_time: str, end_time: str, exclude_id: Optional[str] = None) -> bool:
    """Check if event overlaps with existing events"""
    conn = get_db_connection()
    query = 'SELECT * FROM events WHERE date = ?'
    params = [date]
    
    if exclude_id:
        query += ' AND id != ?'
        params.append(exclude_id)
    
    events = conn.execute(query, params).fetchall()
    conn.close()
    
    start = datetime.strptime(start_time, '%H:%M')
    end = datetime.strptime(end_time, '%H:%M')
    
    for event in events:
        event_start = datetime.strptime(event['start_time'], '%H:%M')
        event_end = datetime.strptime(event['end_time'], '%H:%M')
        
        # Check for overlap
        if (start < event_end and end > event_start):
            return True
    
    return False

@app.route('/api/events', methods=['GET'])
def get_events():
    """Get all events or filter by date range"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    conn = get_db_connection()
    
    if start_date and end_date:
        events = conn.execute(
            'SELECT * FROM events WHERE date BETWEEN ? AND ? ORDER BY date, start_time',
            (start_date, end_date)
        ).fetchall()
    else:
        events = conn.execute(
            'SELECT * FROM events ORDER BY date, start_time'
        ).fetchall()
    
    conn.close()
    
    return jsonify([dict(event) for event in events])

@app.route('/api/events/<event_id>', methods=['GET'])
def get_event(event_id):
    """Get a specific event by ID"""
    conn = get_db_connection()
    event = conn.execute('SELECT * FROM events WHERE id = ?', (event_id,)).fetchone()
    conn.close()
    
    if event is None:
        return jsonify({'error': 'Event not found'}), 404
    
    return jsonify(dict(event))

@app.route('/api/events', methods=['POST'])
def create_event():
    """Create a new event"""
    data = request.json
    
    # Validate data
    is_valid, error = validate_event_data(data)
    if not is_valid:
        return jsonify({'error': error}), 400
    
    # Check for overlaps (optional - can be disabled based on requirements)
    warn_overlap = request.args.get('warn_overlap', 'false').lower() == 'true'
    if warn_overlap and check_event_overlap(data['date'], data['start_time'], data['end_time']):
        return jsonify({'error': 'Event overlaps with existing event', 'warning': True}), 409
    
    event_id = str(uuid.uuid4())
    
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO events (id, title, date, start_time, end_time, description, location, color)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        event_id,
        data['title'],
        data['date'],
        data['start_time'],
        data['end_time'],
        data.get('description', ''),
        data.get('location', ''),
        data.get('color', '#1a73e8')
    ))
    conn.commit()
    
    event = conn.execute('SELECT * FROM events WHERE id = ?', (event_id,)).fetchone()
    conn.close()
    
    return jsonify(dict(event)), 201

@app.route('/api/events/<event_id>', methods=['PUT'])
def update_event(event_id):
    """Update an existing event"""
    data = request.json
    
    # Validate data
    is_valid, error = validate_event_data(data)
    if not is_valid:
        return jsonify({'error': error}), 400
    
    # Check for overlaps (excluding current event)
    warn_overlap = request.args.get('warn_overlap', 'false').lower() == 'true'
    if warn_overlap and check_event_overlap(
        data['date'], 
        data['start_time'], 
        data['end_time'], 
        exclude_id=event_id
    ):
        return jsonify({'error': 'Event overlaps with existing event', 'warning': True}), 409
    
    conn = get_db_connection()
    
    # Check if event exists
    event = conn.execute('SELECT * FROM events WHERE id = ?', (event_id,)).fetchone()
    if event is None:
        conn.close()
        return jsonify({'error': 'Event not found'}), 404
    
    conn.execute('''
        UPDATE events 
        SET title = ?, date = ?, start_time = ?, end_time = ?, 
            description = ?, location = ?, color = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (
        data['title'],
        data['date'],
        data['start_time'],
        data['end_time'],
        data.get('description', ''),
        data.get('location', ''),
        data.get('color', '#1a73e8'),
        event_id
    ))
    conn.commit()
    
    updated_event = conn.execute('SELECT * FROM events WHERE id = ?', (event_id,)).fetchone()
    conn.close()
    
    return jsonify(dict(updated_event))

@app.route('/api/events/<event_id>', methods=['DELETE'])
def delete_event(event_id):
    """Delete an event"""
    conn = get_db_connection()
    
    # Check if event exists
    event = conn.execute('SELECT * FROM events WHERE id = ?', (event_id,)).fetchone()
    if event is None:
        conn.close()
        return jsonify({'error': 'Event not found'}), 404
    
    conn.execute('DELETE FROM events WHERE id = ?', (event_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Event deleted successfully'}), 200

@app.route('/api/events/date/<date>', methods=['GET'])
def get_events_by_date(date):
    """Get all events for a specific date"""
    conn = get_db_connection()
    events = conn.execute(
        'SELECT * FROM events WHERE date = ? ORDER BY start_time',
        (date,)
    ).fetchall()
    conn.close()
    
    return jsonify([dict(event) for event in events])

@app.route('/api/events/conflicts', methods=['POST'])
def check_conflicts():
    """Check for scheduling conflicts"""
    data = request.json
    
    is_valid, error = validate_event_data(data)
    if not is_valid:
        return jsonify({'error': error}), 400
    
    has_conflict = check_event_overlap(
        data['date'], 
        data['start_time'], 
        data['end_time'],
        exclude_id=data.get('event_id')
    )
    
    return jsonify({'has_conflict': has_conflict})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get calendar statistics"""
    conn = get_db_connection()
    
    total_events = conn.execute('SELECT COUNT(*) FROM events').fetchone()[0]
    
    today = datetime.now().strftime('%Y-%m-%d')
    today_events = conn.execute(
        'SELECT COUNT(*) FROM events WHERE date = ?',
        (today,)
    ).fetchone()[0]
    
    upcoming_events = conn.execute(
        'SELECT COUNT(*) FROM events WHERE date > ?',
        (today,)
    ).fetchone()[0]
    
    conn.close()
    
    return jsonify({
        'total_events': total_events,
        'today_events': today_events,
        'upcoming_events': upcoming_events
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

# Ensure database is initialized whenever the app module is imported
init_db()

if __name__ == '__main__':
    app.run(debug=True, port=5000)