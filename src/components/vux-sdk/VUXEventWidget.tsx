import React, { useState } from 'react';

interface UserData {
  name: string;
  email: string;
}

export interface VUXEventWidgetProps {
  apiKey: string | undefined;
  eventId: string;
  currentUser?: UserData;
  theme?: 'dark' | 'light';
}

export function VUXEventWidget({ apiKey, eventId, currentUser, theme = 'dark' }: VUXEventWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<'idle' | 'success' | 'error'>('idle');

  if (!apiKey) {
    return <div style={{ color: 'red', padding: '1rem', border: '1px solid red' }}>Error: VUX API Key missing.</div>;
  }

  const handleRsvp = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // TODO: Connect to VUX Events REST API
      console.log(`Sending RSVP for ${currentUser.email} to VUX API for event ${eventId}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setRsvpStatus('success');
    } catch (error) {
      console.error(error);
      setRsvpStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';
  
  return (
    <div style={{
      background: isDark ? '#1a1a2e' : '#ffffff',
      color: isDark ? '#ffffff' : '#000000',
      padding: '24px',
      borderRadius: '16px',
      fontFamily: 'system-ui, sans-serif',
      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <h2 style={{ margin: '0 0 12px 0', fontSize: '24px' }}>VUX Event Details</h2>
      <p style={{ margin: '0 0 24px 0', opacity: 0.8 }}>Loading event {eventId} from VUX Engine...</p>

      {rsvpStatus === 'success' ? (
        <div style={{ padding: '16px', background: '#10b98120', color: '#10b981', borderRadius: '8px', textAlign: 'center' }}>
          <strong>Success!</strong>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>Ticket and QR Code sent via email to {currentUser?.email}.</p>
        </div>
      ) : (
        <button 
          onClick={handleRsvp}
          disabled={loading || !currentUser}
          style={{
            width: '100%',
            padding: '12px',
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: loading || !currentUser ? 'not-allowed' : 'pointer',
            opacity: loading || !currentUser ? 0.7 : 1
          }}
        >
          {loading ? 'Processing...' : currentUser ? `RSVP as ${currentUser.name}` : 'Login required to RSVP'}
        </button>
      )}
    </div>
  );
}
