import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Support.css';

interface Message {
  id: string;
  sender: 'user' | 'admin';
  admin_name?: string;
  message: string;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  messages: Message[];
  status: 'open' | 'answered' | 'closed';
  created_at: string;
  updated_at: string;
}

export default function Support() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const res = await fetch('/api/support/tickets', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      alert('Fyll i både ämne och meddelande');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subject, message })
      });

      if (res.ok) {
        setShowNewTicket(false);
        setSubject('');
        setMessage('');
        loadTickets();
        alert('Ditt ärende har skickats! Vi svarar så snart vi kan.');
      }
    } catch (error) {
      console.error('Failed to create ticket:', error);
      alert('Något gick fel');
    } finally {
      setSending(false);
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ticket_id: selectedTicket.id, message: replyMessage })
      });

      if (res.ok) {
        setReplyMessage('');
        // Reload ticket
        const ticketRes = await fetch(`/api/support/tickets/${selectedTicket.id}`, { credentials: 'include' });
        if (ticketRes.ok) {
          const updatedTicket = await ticketRes.json();
          setSelectedTicket(updatedTicket);
          loadTickets();
        }
      }
    } catch (error) {
      console.error('Failed to reply:', error);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return { text: 'Öppet', class: 'status-open' };
      case 'answered': return { text: 'Besvarat', class: 'status-answered' };
      case 'closed': return { text: 'Stängt', class: 'status-closed' };
      default: return { text: status, class: '' };
    }
  };

  if (loading) {
    return <div className="support-page"><div className="loading">Laddar...</div></div>;
  }

  return (
    <div className="support-page" data-testid="support-page">
      <header className="page-header">
        <Link to="/" className="back-btn">←</Link>
        <h1>Support</h1>
      </header>

      {/* New Ticket Button */}
      {!showNewTicket && !selectedTicket && (
        <button 
          className="btn-primary new-ticket-btn"
          onClick={() => setShowNewTicket(true)}
          data-testid="new-ticket-btn"
        >
          + Nytt ärende
        </button>
      )}

      {/* New Ticket Form */}
      {showNewTicket && (
        <div className="new-ticket-form card">
          <h2>Skapa nytt ärende</h2>
          
          <label>Ämne</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Kort beskrivning av ditt ärende"
            data-testid="ticket-subject"
          />

          <label>Meddelande</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Beskriv ditt problem eller din fråga..."
            rows={5}
            data-testid="ticket-message"
          />

          <div className="form-actions">
            <button 
              className="btn-secondary"
              onClick={() => { setShowNewTicket(false); setSubject(''); setMessage(''); }}
            >
              Avbryt
            </button>
            <button 
              className="btn-primary"
              onClick={handleCreateTicket}
              disabled={sending || !subject.trim() || !message.trim()}
              data-testid="submit-ticket-btn"
            >
              {sending ? 'Skickar...' : 'Skicka'}
            </button>
          </div>
        </div>
      )}

      {/* Selected Ticket View */}
      {selectedTicket && (
        <div className="ticket-view card">
          <button className="back-link" onClick={() => setSelectedTicket(null)}>
            ← Tillbaka till ärenden
          </button>
          
          <div className="ticket-header">
            <h2>{selectedTicket.subject}</h2>
            <span className={`status-badge ${getStatusBadge(selectedTicket.status).class}`}>
              {getStatusBadge(selectedTicket.status).text}
            </span>
          </div>

          <div className="messages-list">
            {selectedTicket.messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.sender}`}>
                <div className="message-header">
                  <span className="sender-name">
                    {msg.sender === 'admin' ? `${msg.admin_name || 'Support'}` : 'Du'}
                  </span>
                  <span className="message-time">{formatDate(msg.created_at)}</span>
                </div>
                <p className="message-content">{msg.message}</p>
              </div>
            ))}
          </div>

          {selectedTicket.status !== 'closed' && (
            <div className="reply-form">
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Skriv ett svar..."
                rows={3}
                data-testid="reply-message"
              />
              <button 
                className="btn-primary"
                onClick={handleReply}
                disabled={sending || !replyMessage.trim()}
                data-testid="send-reply-btn"
              >
                {sending ? 'Skickar...' : 'Skicka svar'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tickets List */}
      {!showNewTicket && !selectedTicket && (
        <div className="tickets-list">
          {tickets.length === 0 ? (
            <div className="empty-state card">
              <span className="empty-icon">📬</span>
              <p>Du har inga ärenden ännu</p>
              <p className="hint">Skapa ett nytt ärende om du behöver hjälp</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <div 
                key={ticket.id} 
                className="ticket-card card"
                onClick={() => setSelectedTicket(ticket)}
                data-testid={`ticket-${ticket.id}`}
              >
                <div className="ticket-info">
                  <h3>{ticket.subject}</h3>
                  <span className="ticket-date">{formatDate(ticket.updated_at)}</span>
                </div>
                <div className="ticket-meta">
                  <span className={`status-badge ${getStatusBadge(ticket.status).class}`}>
                    {getStatusBadge(ticket.status).text}
                  </span>
                  <span className="message-count">
                    {ticket.messages.length} {ticket.messages.length === 1 ? 'meddelande' : 'meddelanden'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Contact Info */}
      <div className="contact-info card">
        <h3>Annan kontakt</h3>
        <p>Du kan också nå oss på:</p>
        <a href="mailto:support@honsgarden.se" className="email-link">
          support@honsgarden.se
        </a>
      </div>
    </div>
  );
}
