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
  const [followupData, setFollowupData] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // New States for Candidates Tab
  const [sidebarTab, setSidebarTab] = useState<'vacancies' | 'candidates' | 'followup'>('vacancies');
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

    fetch('/api/followup')
      .then(res => res.json())
      .then(d => {
        if (d.results) setFollowupData(d.results);
      })
      .catch(err => console.error("Failed to load follow up", err));
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
      
      // Refresh follow up data after a run
      fetch('/api/followup')
        .then(res => res.json())
        .then(d => {
          if (d.results) setFollowupData(d.results);
        });
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
          <button 
            className={`${styles.tab} ${sidebarTab === 'followup' ? styles.activeTab : ''}`}
            onClick={() => setSidebarTab('followup')}
          >
            Follow Up
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
        ) : sidebarTab === 'candidates' ? (
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
        ) : (
          <>
            <div className={styles.sidebarHeader}>
              <h2>Follow Up</h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {followupData.length} active matches
              </div>
            </div>
            <div className={styles.vacancyList}>
              {followupData.map((fData: any) => (
                <div 
                  key={fData.vacancy_id} 
                  className={styles.vacancyItem}
                  onClick={() => {
                    setActiveVac(fData.vacancy_id);
                    setResults(fData);
                    setSidebarTab('vacancies');
                    setMobileMenuOpen(false);
                  }}
                >
                  <div className={styles.vacancyTitle}>{fData.vacancy_id}</div>
                  <div className={styles.vacancyMeta}>
                    {fData.matches?.length || 0} candidates matched
                  </div>
                </div>
              ))}
              {followupData.length === 0 && (
                <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 14 }}>
                  No match results yet. Run AI Match first.
                </div>
              )}
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
                      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>
                        Client: {currentVacancyData.end_client || 'N/A'}<br/>
                        Start: {currentVacancyData.start || 'ASAP'}
                      </p>
                      
                      {currentVacancyData.description && (
                        <div className={styles.descriptionBox}>
                          <h4 style={{ marginBottom: 8, color: 'var(--text-muted)' }}>Description</h4>
                          <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6, maxHeight: '300px', overflowY: 'auto', paddingRight: '10px' }}>
                            {currentVacancyData.description}
                          </div>
                        </div>
                      )}
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
                      const displayName = match.name && match.name !== "Extract Name from CV or use ID" && match.name !== match.candidate_id 
                        ? `${match.name} (${match.candidate_id})` 
                        : match.candidate_id;
                      
                      return (
                        <div key={index} className={styles.matchCard}>
                          <div className={styles.matchHeader}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className={styles.rankBadge}>#{match.rank || index + 1}</span>
                                <h3 style={{ display: 'inline-block' }}>{displayName}</h3>
                              </div>
                              <span style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>{cData.primary_role || ''}</span>
                            </div>
                            <div className={styles.matchScore}>
                              {match.score ? (match.score <= 1 ? (match.score * 100).toFixed(0) : match.score) : 0}%
                            </div>
                          </div>
                          
                          {match.sub_scores && (
                            <div className={styles.subScores}>
                              <div className={styles.subScore}><span className={styles.subScoreLabel}>Skills</span> <span className={styles.subScoreValue}>{match.sub_scores.skills}/10</span></div>
                              <div className={styles.subScore}><span className={styles.subScoreLabel}>Seniority</span> <span className={styles.subScoreValue}>{match.sub_scores.seniority}/10</span></div>
                              <div className={styles.subScore}><span className={styles.subScoreLabel}>Industry</span> <span className={styles.subScoreValue}>{match.sub_scores.industry}/10</span></div>
                            </div>
                          )}
                          
                          <p className={styles.matchReason}>
                            <strong>Reason:</strong> {match.reason}
                          </p>
                          
                          {match.evidence && match.evidence.length > 0 && (
                            <div className={styles.matchRisks}>
                              <strong style={{ color: 'var(--primary)' }}>Evidence:</strong>
                              <ul style={{ marginLeft: 20, marginTop: 4, color: 'var(--text)', fontSize: '0.9rem' }}>
                                {match.evidence.map((e: string, i: number) => <li key={i}>"{e}"</li>)}
                              </ul>
                            </div>
                          )}

                          {match.gaps && match.gaps.length > 0 && (
                            <div className={styles.matchRisks} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '2px solid rgb(239, 68, 68)' }}>
                              <strong style={{ color: 'rgb(252, 165, 165)' }}>Gaps & Risks:</strong>
                              <ul style={{ marginLeft: 20, marginTop: 4, color: 'rgb(252, 165, 165)', fontSize: '0.9rem' }}>
                                {match.gaps.map((r: string, i: number) => <li key={i}>{r}</li>)}
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
          ) : sidebarTab === 'candidates' ? (
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
          ) : (
            /* Follow Up Kanban View */
            <div className={styles.section} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className={styles.sectionTitle}>
                <h3>Follow Up Board</h3>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
                Drag and drop candidates across stages for your matched vacancies.
              </p>
              
              <div className={styles.kanbanBoard}>
                {['Suggested', 'Interviewing', 'Offered', 'Rejected'].map(stage => (
                  <div key={stage} className={styles.kanbanColumn}>
                    <div className={styles.kanbanHeader}>{stage}</div>
                    
                    {/* Just load all candidates from followupData into Suggested for now */}
                    {stage === 'Suggested' && followupData.flatMap(f => f.matches || []).map((match: any, idx: number) => (
                      <div key={`${match.candidate_id}-${idx}`} className={styles.kanbanCard} draggable>
                        <strong>{match.name && match.name !== "Extract Name from CV or use ID" ? match.name : match.candidate_id}</strong>
                        <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4 }}>
                          Score: {match.score ? (match.score <= 1 ? (match.score * 100).toFixed(0) : match.score) : 0}%
                        </div>
                      </div>
                    ))}
                    
                    {/* Other columns empty by default for drag & drop UI mockup */}
                    {stage !== 'Suggested' && (
                      <div className={styles.kanbanEmpty}>Drop here</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
