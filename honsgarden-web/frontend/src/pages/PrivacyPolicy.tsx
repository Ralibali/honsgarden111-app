import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Link to="/login" style={{ 
          color: 'var(--accent-primary)', 
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '24px'
        }}>
          &larr; Tillbaka
        </Link>
        
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Integritetspolicy</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
          Senast uppdaterad: December 2024
        </p>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            1. Vilka vi ar
          </h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            Honsgarden ar en app for hobbyhonsagare som vill halla koll pa sin honsgard. 
            Vi tar din integritet pa allvar och samlar endast in data som ar nodvandig 
            for att ge dig den basta upplevelsen.
          </p>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            2. Vilken data vi samlar in
          </h2>
          <ul style={{ lineHeight: '1.7', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
            <li><strong>Kontoinformation:</strong> E-postadress och eventuellt namn vid registrering</li>
            <li><strong>Honsgards-data:</strong> Information om dina honor, aggproduktion, foder och ekonomi</li>
            <li><strong>Betalningsinformation:</strong> Hanteras sakert via Stripe - vi sparar aldrig kortuppgifter</li>
            <li><strong>Anvandningsdata:</strong> Anonym statistik for att forbattra appen</li>
          </ul>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            3. Hur vi anvander din data
          </h2>
          <ul style={{ lineHeight: '1.7', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
            <li>For att tillhandahalla och forbattra vara tjanster</li>
            <li>For att skicka viktiga meddelanden om ditt konto</li>
            <li>For att ge personliga AI-baserade rad (Premium)</li>
            <li>For att skicka nyhetsbrev (endast om du samtyckt)</li>
          </ul>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            4. Delning av data
          </h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            Vi saljer aldrig din data. Vi delar endast data med:
          </p>
          <ul style={{ lineHeight: '1.7', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
            <li><strong>Stripe:</strong> For sakra betalningar</li>
            <li><strong>OpenAI:</strong> For AI-funktioner (anonymiserad data)</li>
            <li><strong>Myndigheter:</strong> Endast om lagen kraver det</li>
          </ul>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            5. Dina rattigheter (GDPR)
          </h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            Enligt GDPR har du ratt att:
          </p>
          <ul style={{ lineHeight: '1.7', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
            <li>Fa tillgang till din data</li>
            <li>Ratta felaktig data</li>
            <li>Radera din data ("ratten att bli glomd")</li>
            <li>Exportera din data</li>
            <li>Aterkalla samtycke</li>
          </ul>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)', marginTop: '12px' }}>
            Kontakta oss pa <a href="mailto:support@honsgarden.se" style={{ color: 'var(--accent-primary)' }}>support@honsgarden.se</a> for att utova dessa rattigheter.
          </p>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            6. Datalagring
          </h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            Din data lagras sakert i EU. Vi behaller din data sa lange du har ett aktivt konto. 
            Vid radering av konto raderas all data inom 30 dagar.
          </p>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            7. Cookies
          </h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            Vi anvander endast nodvandiga cookies for autentisering. Inga tredjepartscookies 
            for sparning eller reklam.
          </p>
        </section>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--accent-primary)' }}>
            8. Kontakt
          </h2>
          <p style={{ lineHeight: '1.7', color: 'var(--text-secondary)' }}>
            Fragor om integritet? Kontakta oss:<br />
            E-post: <a href="mailto:support@honsgarden.se" style={{ color: 'var(--accent-primary)' }}>support@honsgarden.se</a>
          </p>
        </section>
        
        <div style={{ 
          marginTop: '48px', 
          paddingTop: '24px', 
          borderTop: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <Link to="/terms" style={{ color: 'var(--accent-primary)', marginRight: '24px' }}>
            Anvandarvillkor
          </Link>
          <Link to="/login" style={{ color: 'var(--text-secondary)' }}>
            Tillbaka till inloggning
          </Link>
        </div>
      </div>
    </div>
  );
}
