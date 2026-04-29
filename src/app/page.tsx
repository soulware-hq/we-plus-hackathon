'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './page.module.css';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [activeVac, setActiveVac] = useState<string | null>(null);
  const [selectedCands, setSelectedCands] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // New States for Candidates Tab
  const [sidebarTab, setSidebarTab] = useState<'vacancies' | 'candidates'>('vacancies');
  const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
  const [activeCandidate, setActiveCandidate] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
        // Default select first vacancy that is not _meta
        const vacIds = Object.keys(d.vacancies).filter(k => k !== '_meta');
        if (vacIds.length > 0) {
          setActiveVac(vacIds[0]);
        }
        const candIds = Object.keys(d.candidates).filter(k => k !== '_meta');
        if (candIds.length > 0) {
          setActiveCandidate(candIds[0]);
        }
      })
      .catch(err => {
        console.error("Failed to load data", err);
        setLoading(false);
      });
  }, []);

  const toggleCandidate = (id: string) => {
    const newSet = new Set(selectedCands);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCands(newSet);
  };

  const selectAllCandidates = () => {
    if (!data) return;
    const allIds = Object.keys(data.candidates).filter(k => k !== '_meta');
    if (selectedCands.size === allIds.length) {
      setSelectedCands(new Set()); // Deselect all
    } else {
      setSelectedCands(new Set(allIds));
    }
  };

  const runMatch = async () => {
    if (!activeVac || selectedCands.size === 0) {
      alert("Please select a vacancy and at least one candidate.");
      return;
    }
    setMatching(true);
    setResults(null);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vacancyId: activeVac,
          candidateIds: Array.from(selectedCands)
        })
      });
      const resultData = await res.json();
      setResults(resultData);
    } catch (error) {
      console.error(error);
      alert("Match failed. Check console for details.");
    }
    setMatching(false);
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  const vacancies = Object.entries(data?.vacancies || {}).filter(([k]) => k !== '_meta');
  const candidates = Object.entries(data?.candidates || {}).filter(([k]) => k !== '_meta');
  
  const currentVacancyData = data?.vacancies[activeVac || ''];
  const currentCandidateData = data?.candidates[activeCandidate || ''];

  const filteredCandidates = candidates.filter(([id, cand]: [string, any]) => {
    if (!candidateSearchTerm) return true;
    const term = candidateSearchTerm.toLowerCase();
    const skills = cand.primary_stack?.join(' ').toLowerCase() || '';
    const role = cand.primary_role?.toLowerCase() || '';
    const langs = cand.languages?.join(' ').toLowerCase() || '';
    return id.toLowerCase().includes(term) || skills.includes(term) || role.includes(term) || langs.includes(term);
  });

  return (
    <div className={styles.layout}>
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className={styles.sidebarOverlay} onClick={() => setMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.open : ''}`}>
        <div className={styles.sidebarTabs}>
          <button 
            className={`${styles.tab} ${sidebarTab === 'vacancies' ? styles.activeTab : ''}`}
            onClick={() => setSidebarTab('vacancies')}
          >
            Vacancies
          </button>
          <button 
            className={`${styles.tab} ${sidebarTab === 'candidates' ? styles.activeTab : ''}`}
            onClick={() => setSidebarTab('candidates')}
          >
            Candidates
          </button>
        </div>

        {sidebarTab === 'vacancies' ? (
          <>
            <div className={styles.sidebarHeader}>
              <h2>Vacancies</h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {vacancies.length} open requests
              </div>
            </div>
            <div className={styles.vacancyList}>
              {vacancies.map(([id, vac]: [string, any]) => (
                <div 
                  key={id} 
                  className={`${styles.vacancyItem} ${activeVac === id ? styles.active : ''}`}
                  onClick={() => {
                    setActiveVac(id);
                    setResults(null); // Clear previous results
                    setMobileMenuOpen(false);
                  }}
                >
                  <div className={styles.vacancyTitle}>{vac.title || id}</div>
                  <div className={styles.vacancyMeta}>
                    {vac.end_client || vac.region || 'No location'} • {id}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className={styles.sidebarHeader}>
              <h2>Candidates</h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {filteredCandidates.length} profiles
              </div>
            </div>
            <div className={styles.searchBox}>
              <input 
                type="text" 
                placeholder="Filter by skill, role..." 
                className={styles.searchInput}
                value={candidateSearchTerm}
                onChange={(e) => setCandidateSearchTerm(e.target.value)}
              />
            </div>
            <div className={styles.vacancyList}>
              {filteredCandidates.map(([id, cand]: [string, any]) => (
                <div 
                  key={id} 
                  className={`${styles.vacancyItem} ${activeCandidate === id ? styles.active : ''}`}
                  onClick={() => {
                    setActiveCandidate(id);
                    setMobileMenuOpen(false);
                  }}
                >
                  <div className={styles.vacancyTitle}>{cand.primary_role || id}</div>
                  <div className={styles.vacancyMeta}>
                    {id} • {cand.years_experience}y exp
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.topBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className={styles.mobileMenuBtn} onClick={() => setMobileMenuOpen(true)}>
              ☰
            </button>
            <Image 
              src="/WE+Logo-removebg-preview.png" 
              alt="WE+ Logo" 
              width={160} 
              height={53} 
              className={styles.logo}
            />
            <h1 style={{ fontSize: '1.25rem', color: 'var(--secondary)' }}>TalentMatch</h1>
          </div>
          <button 
            className="btn-primary" 
            onClick={runMatch} 
            disabled={matching || !activeVac || selectedCands.size === 0}
          >
            {matching ? 'Running AI Match...' : 'Run AI Match'}
          </button>
        </div>

        <div className={styles.content}>
          {sidebarTab === 'vacancies' ? (
            <>
              <div className={styles.grid}>
                {/* Vacancy Detail */}
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>
                    <h3>Vacancy Details</h3>
                    <span className="badge">{activeVac}</span>
                  </div>
                  {currentVacancyData ? (
                    <div>
                      <h4 style={{ marginBottom: 12 }}>{currentVacancyData.title}</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        {currentVacancyData.language && <span className="badge">Lang: {currentVacancyData.language}</span>}
                        {currentVacancyData.region && <span className="badge">Region: {currentVacancyData.region}</span>}
                        {currentVacancyData.duration && <span className="badge">Duration: {currentVacancyData.duration}</span>}
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                        Client: {currentVacancyData.end_client || 'N/A'}<br/>
                        Start: {currentVacancyData.start || 'ASAP'}
                      </p>
                    </div>
                  ) : (
                    <p>Select a vacancy</p>
                  )}
                </div>

                {/* Candidate Selection */}
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>
                    <h3>Candidate Pool</h3>
                    <button className="btn-secondary" style={{ padding: '6px 12px' }} onClick={selectAllCandidates}>
                      {selectedCands.size === candidates.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <p style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-muted)' }}>
                    {selectedCands.size} of {candidates.length} selected
                  </p>
                  
                  <div className={styles.candidateList}>
                    {candidates.map(([id, cand]: [string, any]) => (
                      <label key={id} className={styles.candidateItem}>
                        <input 
                          type="checkbox" 
                          checked={selectedCands.has(id)}
                          onChange={() => toggleCandidate(id)}
                        />
                        <div className={styles.candidateInfo}>
                          <div className={styles.candidateName}>{id}</div>
                          <div className={styles.candidateRole}>{cand.primary_role} • {cand.years_experience}y exp</div>
                          <div className={styles.skills}>
                            {cand.primary_stack?.slice(0, 3).map((s: string) => (
                              <span key={s} className="badge" style={{ fontSize: 10 }}>{s}</span>
                            ))}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Results Section */}
              {results && (
                <div className={styles.resultsSection}>
                  <h2 style={{ marginBottom: 16 }}>AI Match Results</h2>
                  {results.matches && results.matches.length > 0 ? (
                    results.matches.map((match: any, index: number) => {
                      const cData = data.candidates[match.candidate_id] || {};
                      return (
                        <div key={index} className={styles.matchCard}>
                          <div className={styles.matchHeader}>
                            <div>
                              <h3 style={{ display: 'inline-block', marginRight: 8 }}>{match.candidate_id}</h3>
                              <span style={{ color: 'var(--text-muted)' }}>{cData.primary_role || ''}</span>
                            </div>
                            <div className={styles.matchScore}>
                              {(match.score * 100).toFixed(0)}%
                            </div>
                          </div>
                          <p className={styles.matchReason}>
                            <strong>Reason:</strong> {match.reason}
                          </p>
                          {match.risks && match.risks.length > 0 && (
                            <div className={styles.matchRisks}>
                              <strong>Risks:</strong>
                              <ul style={{ marginLeft: 20, marginTop: 4 }}>
                                {match.risks.map((r: string, i: number) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="card">No matches found or result format invalid.</div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Candidate Details View */
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                <h3>Candidate Details</h3>
                <span className="badge">{activeCandidate}</span>
              </div>
              {currentCandidateData ? (
                <div>
                  <h4 style={{ marginBottom: 12, fontSize: 18, color: 'var(--primary)' }}>
                    {currentCandidateData.primary_role} • {currentCandidateData.years_experience}y experience
                  </h4>
                  
                  <div className={styles.detailGrid}>
                    <div className={styles.detailBox}>
                      <h4>Primary Stack</h4>
                      <div className={styles.tagList}>
                        {currentCandidateData.primary_stack?.map((s: string) => (
                          <span key={s} className="badge">{s}</span>
                        )) || <span style={{color: 'var(--text-muted)'}}>No skills listed</span>}
                      </div>
                    </div>
                    
                    <div className={styles.detailBox}>
                      <h4>Languages</h4>
                      <div className={styles.tagList}>
                        {currentCandidateData.languages?.map((l: string) => (
                          <span key={l} className="badge">{l}</span>
                        )) || <span style={{color: 'var(--text-muted)'}}>No languages listed</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p>Select a candidate</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
