import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Community.css';

interface Question {
  id: string;
  user_id: string;
  author_name: string;
  title: string;
  body: string;
  category: string;
  created_at: string;
  answer_count: number;
  views: number;
  is_answered: boolean;
  is_featured: boolean;
}

interface Answer {
  id: string;
  author_name: string;
  is_agda: boolean;
  body: string;
  created_at: string;
  likes: number;
  is_accepted: boolean;
}

interface AnswerPreview {
  id: string;
  author_name: string;
  is_agda: boolean;
  preview: string;
  full_body_length: number;
  created_at: string;
  likes: number;
}

const CATEGORIES = [
  { value: 'general', label: 'Allmänt' },
  { value: 'health', label: 'Hälsa & sjukdomar' },
  { value: 'feeding', label: 'Foder & näring' },
  { value: 'housing', label: 'Hönshus & inhägnad' },
  { value: 'breeding', label: 'Avel & kycklingar' },
  { value: 'eggs', label: 'Ägg & värpning' },
];

export default function Community() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  return (
    <div className="community-page">
      <CommunityList />
    </div>
  );
}

function CommunityList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAskModal, setShowAskModal] = useState(false);
  const [filter, setFilter] = useState<string>('');
  
  const loadQuestions = useCallback(async () => {
    try {
      let url = '/api/community/questions?limit=30';
      if (filter) url += `&category=${filter}`;
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);
  
  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);
  
  const handleAskQuestion = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setShowAskModal(true);
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  };
  
  if (loading) {
    return <div className="community-page loading">Laddar frågor...</div>;
  }
  
  return (
    <div className="community-page">
      <header className="community-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            ← Tillbaka
          </button>
          <h1>Frågor & Svar</h1>
        </div>
        <button 
          className="ask-btn" 
          onClick={handleAskQuestion}
          data-testid="ask-question-btn"
        >
          ✍️ Ställ en fråga
        </button>
      </header>
      
      <p className="community-intro">
        Få svar från Agda (AI) och andra hönsägare!
      </p>
      
      {/* Category filter */}
      <div className="filter-row">
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="category-filter"
        >
          <option value="">Alla kategorier</option>
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>
      
      {/* Questions list */}
      {questions.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🐔</span>
          <p>Inga frågor ännu. Var först att ställa en fråga!</p>
          <button className="ask-btn" onClick={handleAskQuestion}>
            ✍️ Ställ första frågan
          </button>
        </div>
      ) : (
        <div className="questions-list">
          {questions.map((q) => (
            <Link 
              to={`/community/q/${q.id}`} 
              key={q.id} 
              className={`question-card ${q.is_answered ? 'answered' : ''}`}
              data-testid={`question-card-${q.id}`}
            >
              <div className="question-meta">
                <span className="category">{CATEGORIES.find(c => c.value === q.category)?.label || q.category}</span>
                {q.is_answered && <span className="answered-badge">✓ Besvarad</span>}
              </div>
              <h3 className="question-title">{q.title}</h3>
              <p className="question-preview">{q.body.slice(0, 120)}{q.body.length > 120 ? '...' : ''}</p>
              <div className="question-footer">
                <span className="author">av {q.author_name}</span>
                <span className="date">{formatDate(q.created_at)}</span>
                <span className="answers">{q.answer_count} svar</span>
                <span className="views">{q.views} visningar</span>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      {/* Ask Question Modal */}
      {showAskModal && (
        <AskQuestionModal 
          onClose={() => setShowAskModal(false)} 
          onSuccess={() => {
            setShowAskModal(false);
            loadQuestions();
          }}
        />
      )}
    </div>
  );
}

interface AskQuestionModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function AskQuestionModal({ onClose, onSuccess }: AskQuestionModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async () => {
    if (title.length < 5) {
      setError('Titeln måste vara minst 5 tecken');
      return;
    }
    if (body.length < 10) {
      setError('Frågan måste vara minst 10 tecken');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      const res = await fetch('/api/community/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, body, category }),
      });
      
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.detail || 'Kunde inte skapa frågan');
      }
    } catch (err) {
      setError('Ett fel uppstod. Försök igen.');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ask-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Ställ en fråga</h2>
        <p className="modal-subtitle">Agda (AI) svarar automatiskt!</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <label>Kategori</label>
        <select 
          value={category} 
          onChange={(e) => setCategory(e.target.value)}
          data-testid="question-category-select"
        >
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
        
        <label>Titel</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="T.ex. 'Min höna slutade lägga ägg'"
          maxLength={200}
          data-testid="question-title-input"
        />
        
        <label>Din fråga</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Beskriv din situation och vad du undrar över..."
          rows={5}
          maxLength={5000}
          data-testid="question-body-input"
        />
        
        <div className="modal-buttons">
          <button className="cancel" onClick={onClose}>Avbryt</button>
          <button 
            className="save" 
            onClick={handleSubmit} 
            disabled={saving}
            data-testid="submit-question-btn"
          >
            {saving ? 'Publicerar...' : 'Publicera fråga'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Question Detail Page (exported as separate route component)
export function QuestionDetail() {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [answerBody, setAnswerBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const loadQuestion = useCallback(async () => {
    if (!questionId) return;
    
    try {
      // Try full question first (requires login)
      const fullRes = await fetch(`/api/community/questions/${questionId}`, { 
        credentials: 'include' 
      });
      
      if (fullRes.ok) {
        const data = await fullRes.json();
        setQuestion(data.question);
        setAnswers(data.answers || []);
        setPreviewMode(false);
      } else if (fullRes.status === 401) {
        // Not logged in - get preview
        const previewRes = await fetch(`/api/community/questions/${questionId}/preview`);
        if (previewRes.ok) {
          const data = await previewRes.json();
          setQuestion(data.question);
          // Convert previews to partial answers for display
          setAnswers(data.answers_preview?.map((p: AnswerPreview) => ({
            ...p,
            body: p.preview,
            is_preview: true
          })) || []);
          setPreviewMode(true);
        }
      }
    } catch (error) {
      console.error('Failed to load question:', error);
    } finally {
      setLoading(false);
    }
  }, [questionId]);
  
  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);
  
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: question?.title || 'Fråga på Hönsgården',
          text: `${question?.title} - Se svaret på Hönsgården`,
          url: url,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      alert('Länk kopierad!');
    }
  };
  
  const handleSubmitAnswer = async () => {
    if (answerBody.length < 5) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/community/questions/${questionId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: answerBody }),
      });
      
      if (res.ok) {
        setAnswerBody('');
        setShowAnswerForm(false);
        loadQuestion();
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleLike = async (answerId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      await fetch(`/api/community/answers/${answerId}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      loadQuestion();
    } catch (error) {
      console.error('Failed to like:', error);
    }
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (loading) {
    return <div className="community-page loading">Laddar fråga...</div>;
  }
  
  if (!question) {
    return (
      <div className="community-page">
        <div className="not-found">
          <span>🔍</span>
          <p>Frågan kunde inte hittas</p>
          <button onClick={() => navigate('/community')}>Tillbaka till frågor</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="community-page question-detail-page">
      <header className="community-header">
        <button className="back-btn" onClick={() => navigate('/community')}>
          ← Tillbaka
        </button>
        <button 
          className="share-btn" 
          onClick={handleShare}
          data-testid="share-question-btn"
        >
          📤 Dela
        </button>
      </header>
      
      {/* Question */}
      <article className="question-full">
        <div className="question-meta">
          <span className="category">
            {CATEGORIES.find(c => c.value === question.category)?.label || question.category}
          </span>
          <span className="date">{formatDate(question.created_at)}</span>
        </div>
        <h1 className="question-title">{question.title}</h1>
        <p className="question-body">{question.body}</p>
        <div className="question-author">
          Fråga från <strong>{question.author_name}</strong>
        </div>
      </article>
      
      {/* Content gating banner */}
      {previewMode && (
        <div className="gating-banner" data-testid="login-banner">
          <span className="lock-icon">🔒</span>
          <div className="gating-text">
            <strong>Logga in för att se hela svaren</strong>
            <p>Skapa ett gratis konto för att se Agdas fullständiga svar och delta i diskussionen.</p>
          </div>
          <button 
            className="login-btn" 
            onClick={() => navigate('/login')}
            data-testid="login-to-view-btn"
          >
            Logga in / Skapa konto
          </button>
        </div>
      )}
      
      {/* Answers */}
      <section className="answers-section">
        <h2>{answers.length} svar</h2>
        
        {answers.map((answer) => (
          <div 
            key={answer.id} 
            className={`answer-card ${answer.is_agda ? 'agda-answer' : ''} ${answer.is_accepted ? 'accepted' : ''} ${(answer as any).is_preview ? 'preview-answer' : ''}`}
            data-testid={`answer-${answer.id}`}
          >
            <div className="answer-header">
              <span className={`author ${answer.is_agda ? 'agda' : ''}`}>
                {answer.is_agda ? '🐔 Agda (AI)' : answer.author_name}
              </span>
              {answer.is_accepted && <span className="accepted-badge">✓ Accepterat svar</span>}
              <span className="date">{formatDate(answer.created_at)}</span>
            </div>
            <div className="answer-body">
              {answer.body}
              {(answer as any).is_preview && (
                <span className="read-more">... (logga in för att läsa mer)</span>
              )}
            </div>
            {!previewMode && (
              <div className="answer-actions">
                <button 
                  className="like-btn" 
                  onClick={() => handleLike(answer.id)}
                >
                  ❤️ {answer.likes}
                </button>
              </div>
            )}
          </div>
        ))}
        
        {/* Add answer form (only for logged in users) */}
        {user && !previewMode && (
          <div className="add-answer-section">
            {showAnswerForm ? (
              <div className="answer-form">
                <textarea
                  value={answerBody}
                  onChange={(e) => setAnswerBody(e.target.value)}
                  placeholder="Dela med dig av dina erfarenheter..."
                  rows={4}
                  data-testid="answer-input"
                />
                <div className="form-buttons">
                  <button className="cancel" onClick={() => setShowAnswerForm(false)}>
                    Avbryt
                  </button>
                  <button 
                    className="submit" 
                    onClick={handleSubmitAnswer}
                    disabled={submitting || answerBody.length < 5}
                    data-testid="submit-answer-btn"
                  >
                    {submitting ? 'Skickar...' : 'Publicera svar'}
                  </button>
                </div>
              </div>
            ) : (
              <button 
                className="add-answer-btn" 
                onClick={() => setShowAnswerForm(true)}
                data-testid="add-answer-btn"
              >
                ✍️ Skriv ett svar
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
