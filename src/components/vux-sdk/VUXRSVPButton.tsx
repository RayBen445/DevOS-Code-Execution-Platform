import React, { useState } from 'react';

interface UserData {
  name: string;
  email: string;
}

export interface VUXRSVPButtonProps {
  apiKey: string | undefined;
  eventId: string;
  currentUser?: UserData;
  className?: string;
}

export function VUXRSVPButton({ apiKey, eventId, currentUser, className }: VUXRSVPButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRsvp = async () => {
    if (!apiKey || !currentUser) return;
    
    setLoading(true);
    try {
      // TODO: Connect to VUX Events REST API
      console.log(`Sending RSVP for ${currentUser.email} to event ${eventId}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Ticket successfully sent via VUX Events!');
    } catch (error) {
      console.error(error);
      alert('Failed to RSVP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleRsvp}
      disabled={loading || !currentUser}
      className={className}
      style={{
        padding: '10px 20px',
        background: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontWeight: 'bold',
        cursor: loading || !currentUser ? 'not-allowed' : 'pointer',
      }}
    >
      {loading ? 'Registering...' : 'Get Ticket via VUX'}
    </button>
  );
}
