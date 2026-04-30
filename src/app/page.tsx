'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Rocket, 
  Settings, 
  MapPin, 
  Globe, 
  Calendar, 
  Briefcase, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Filter,
  Plus,
  FileText,
  Clock,
  ExternalLink,
  Target,
  BarChart3,
  Zap,
  Building2,
  Menu,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
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
  const [matchLimit, setMatchLimit] = useState<number>(3);
  
  // New States for Candidates Tab
  const [sidebarTab, setSidebarTab] = useState<'vacancies' | 'candidates' | 'followup'>('vacancies');
  const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
  const [poolSearchTerm, setPoolSearchTerm] = useState('');
  const [activeCandidate, setActiveCandidate] = useState<string | null>(null);
  
  // Kanban Drag and Drop State
  const [kanbanState, setKanbanState] = useState<Record<string, string>>({});

  // Ingestion Modal State
  const [ingestModalOpen, setIngestModalOpen] = useState(false);
  const [ingestType, setIngestType] = useState<'cv' | 'vacancy'>('cv');
  const [ingestText, setIngestText] = useState('');
  const [ingestFile, setIngestFile] = useState<File | null>(null);
  const [ingestName, setIngestName] = useState('');
  const [ingestLocation, setIngestLocation] = useState('');
  const [ingesting, setIngesting] = useState(false);
  const [autoMatches, setAutoMatches] = useState<Record<string, any>>({});
  const [autoMatching, setAutoMatching] = useState<string | null>(null);
  const [poolModalOpen, setPoolModalOpen] = useState(false);

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

    // Load cache from localStorage
    const cached = localStorage.getItem('talentmatch_auto_cache');
    if (cached) {
      try {
        setAutoMatches(JSON.parse(cached));
      } catch (e) {
        console.error("Failed to parse cache", e);
      }
    }
  }, []);

  useEffect(() => {
    if (Object.keys(autoMatches).length > 0) {
      localStorage.setItem('talentmatch_auto_cache', JSON.stringify(autoMatches));
    }
  }, [autoMatches]);

  useEffect(() => {
    if (!activeVac || sidebarTab !== 'vacancies') return;
    if (autoMatches[activeVac]) return;

    const triggerAutoMatch = async () => {
      setAutoMatching(activeVac);
      try {
        const res = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vacancyId: activeVac,
            limit: 3
          })
        });
        const resultData = await res.json();
        if (resultData.matches) {
          setAutoMatches(prev => ({ ...prev, [activeVac]: resultData }));
        }
      } catch (error) {
        console.error("Auto-match failed:", error);
      }
      setAutoMatching(null);
    };

    triggerAutoMatch();
  }, [activeVac, sidebarTab, autoMatches]);

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

  const addToFollowup = async (match: any) => {
    try {
      const res = await fetch('/api/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vacancy_id: activeVac,
          candidate_id: match.candidate_id,
          rank: match.rank,
          score: match.score,
          sub_scores: match.sub_scores,
          reason: match.reason,
          evidence: match.evidence,
          gaps: match.gaps,
          stage: 'Suggested'
        })
      });
      if (res.ok) {
        const d = await fetch('/api/followup').then(r => r.json());
        if (d.results) setFollowupData(d.results);
      }
    } catch (err) {
      console.error("Failed to add to follow-up", err);
    }
  };

  const isAlreadyInFollowup = (candidateId: string) => {
    if (!activeVac) return false;
    const vacancyFollowup = followupData.find(f => f.vacancy_id === activeVac);
    return vacancyFollowup?.matches.some((m: any) => m.candidate_id === candidateId);
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
          candidateIds: Array.from(selectedCands),
          limit: matchLimit
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

  const renderMatchCard = (match: any, index: number, isAutoMatch: boolean = false) => {
    const cData = (data?.candidates && data.candidates[match.candidate_id]) || {};
    const inFollowup = isAlreadyInFollowup(match.candidate_id);
    const displayName = match.name && match.name !== "Extract Name from CV or use ID" && match.name !== match.candidate_id 
      ? `${match.name} (${match.candidate_id})` 
      : (cData.name || match.candidate_id);

    return (
      <motion.div 
        key={index} 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={styles.matchCard} 
        style={isAutoMatch ? { margin: 0, height: '100%', display: 'flex', flexDirection: 'column' } : {}}
      >
        <div className={styles.matchHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={styles.rankBadge} style={(match.rank === 1 || index === 0) ? { background: 'var(--gold)', color: '#000' } : {}}>
              #{match.rank || index + 1}
            </span>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-bright)' }}>{displayName}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={styles.candidateRole} style={{ fontSize: '11px', color: 'var(--gold)', opacity: 0.8 }}>{cData.primary_role || 'Specialist'}</span>
                {inFollowup && <ShieldCheck size={12} style={{ color: 'var(--success)' }} />}
              </div>
            </div>
          </div>
          <div className={styles.matchScore} style={{ border: '1px solid var(--gold)', color: 'var(--gold)', fontSize: '0.85rem' }}>
            {match.score ? (match.score <= 1 ? (match.score * 100).toFixed(0) : match.score) : 0}%
          </div>
        </div>
        
        {match.sub_scores && (
          <div className={styles.subScores}>
            <div className={styles.subScore}>
              <span className={styles.subScoreLabel}>Expertise</span> 
              <span className={styles.subScoreValue}>{match.sub_scores.skills}/10</span>
            </div>
            <div className={styles.subScore}>
              <span className={styles.subScoreLabel}>Experience</span> 
              <span className={styles.subScoreValue}>{match.sub_scores.seniority}/10</span>
            </div>
            <div className={styles.subScore}>
              <span className={styles.subScoreLabel}>Domain</span> 
              <span className={styles.subScoreValue}>{match.sub_scores.industry}/10</span>
            </div>
          </div>
        )}
        
        <div className={styles.matchReason} style={{ flexGrow: isAutoMatch ? 1 : 0 }}>
          <p>{match.reason}</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {match.evidence && match.evidence.length > 0 && (
            <div className={styles.matchRisks} style={{ background: 'rgba(202, 138, 4, 0.05)', borderColor: 'rgba(202, 138, 4, 0.2)', color: 'var(--text)' }}>
              <div style={{ color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Target size={14} />
                <strong style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Key Evidence</strong>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.8rem', opacity: 0.8 }}>
                {match.evidence.slice(0, 2).map((e: string, i: number) => (
                  <li key={i} style={{ marginBottom: 4, display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--gold)' }}>•</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {match.gaps && match.gaps.length > 0 && (
            <div className={styles.matchRisks}>
              <div style={{ color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <AlertCircle size={14} />
                <strong style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analysis Gaps</strong>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.8rem', opacity: 0.8 }}>
                {match.gaps.slice(0, 2).map((r: string, i: number) => (
                  <li key={i} style={{ marginBottom: 4, display: 'flex', gap: 8 }}>
                    <span style={{ color: '#fca5a5' }}>•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button 
          className={inFollowup ? "btn-secondary" : "btn-primary"} 
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          onClick={() => !inFollowup && addToFollowup(match)}
          disabled={inFollowup}
        >
          {inFollowup ? (
            <><CheckCircle2 size={16} /> Selected</>
          ) : (
            <><Plus size={16} /> Shortlist</>
          )}
        </button>
      </motion.div>
    );
  };

  // Kanban Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    setKanbanState(prev => ({
      ...prev,
      [id]: targetStage
    }));
  };

  const handleIngest = async () => {
    if (!ingestText.trim() && !ingestFile) return;
    setIngesting(true);
    try {
      const formData = new FormData();
      formData.append('type', ingestType);
      if (ingestFile) {
        formData.append('file', ingestFile);
      } else {
        formData.append('text', ingestText);
      }
      
      if (ingestName) formData.append('name', ingestName);
      if (ingestLocation) formData.append('location', ingestLocation);

      const res = await fetch('/api/ingest', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if (res.ok) {
        alert(`${ingestType.toUpperCase()} successfully parsed and saved! ID: ${result.id}`);
        setIngestModalOpen(false);
        setIngestText('');
        setIngestFile(null);
        setIngestName('');
        setIngestLocation('');
        // Refresh data
        fetch('/api/data').then(r => r.json()).then(d => setData(d));
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (e: any) {
      alert(`Request failed: ${e.message}`);
    }
    setIngesting(false);
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
    const cvText = cand.description?.toLowerCase() || '';
    return id.toLowerCase().includes(term) || skills.includes(term) || role.includes(term) || langs.includes(term) || cvText.includes(term);
  });

  return (
    <div className={styles.layout}>
      {/* Ingest Modal Overlay */}
      {ingestModalOpen && (
        <div className={styles.modalOverlay} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className={styles.modalContent} style={{ background: 'var(--surface)', padding: 24, borderRadius: 12, width: '90%', maxWidth: 600, border: '1px solid var(--border)' }}>
            <h2>Add New {ingestType === 'cv' ? 'Candidate CV' : 'Vacancy'}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16, marginTop: 8 }}>
              Upload a file (PDF/DOCX) or paste the raw text below. Our AI will automatically extract the necessary metadata and save it to the database.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>{ingestType === 'cv' ? 'Full Name' : 'Job Title'} (Manual Override)</label>
                <input 
                  type="text" 
                  value={ingestName}
                  onChange={e => setIngestName(e.target.value)}
                  placeholder={ingestType === 'cv' ? "e.g. John Doe" : "e.g. Senior Frontend Engineer"}
                  style={{ width: '100%', padding: 10, background: 'var(--surface-sunken)', color: 'white', border: '1px solid var(--border)', borderRadius: 6 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>{ingestType === 'cv' ? 'Location' : 'Region'} (Manual Override)</label>
                <input 
                  type="text" 
                  value={ingestLocation}
                  onChange={e => setIngestLocation(e.target.value)}
                  placeholder={ingestType === 'cv' ? "e.g. Berlin, Germany" : "e.g. Remote / EMEA"}
                  style={{ width: '100%', padding: 10, background: 'var(--surface-sunken)', color: 'white', border: '1px solid var(--border)', borderRadius: 6 }}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>Upload File (Optional)</label>
              <input 
                type="file" 
                accept=".pdf,.docx,.doc,.txt,.md"
                onChange={(e) => setIngestFile(e.target.files?.[0] || null)}
                style={{ width: '100%', padding: 8, background: 'var(--surface-sunken)', borderRadius: 4, border: '1px solid var(--border)' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>OR PASTE TEXT</span>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
            </div>

            <textarea
              className={styles.textarea}
              placeholder={`Paste ${ingestType === 'cv' ? 'CV' : 'Vacancy description'} text here...`}
              value={ingestText}
              onChange={e => setIngestText(e.target.value)}
              rows={10}
              style={{ width: '100%', marginBottom: 16, background: 'var(--surface-sunken)', color: 'white', border: '1px solid var(--border)', padding: 12, borderRadius: 8, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button 
                className={styles.buttonSecondary} 
                onClick={() => { 
                  setIngestModalOpen(false); 
                  setIngestFile(null);
                  setIngestName('');
                  setIngestLocation('');
                }}
                disabled={ingesting}
              >
                Cancel
              </button>
              <button 
                className={styles.buttonPrimary} 
                onClick={handleIngest}
                disabled={ingesting || (!ingestText.trim() && !ingestFile)}
              >
                {ingesting ? 'Parsing with AI...' : 'Parse & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <Briefcase size={16} style={{ marginBottom: 4 }} />
            <span>Vacancies</span>
          </button>
          <button 
            className={`${styles.tab} ${sidebarTab === 'candidates' ? styles.activeTab : ''}`}
            onClick={() => setSidebarTab('candidates')}
          >
            <Users size={16} style={{ marginBottom: 4 }} />
            <span>Pool</span>
          </button>
          <button 
            className={`${styles.tab} ${sidebarTab === 'followup' ? styles.activeTab : ''}`}
            onClick={() => setSidebarTab('followup')}
          >
            <CheckCircle2 size={16} style={{ marginBottom: 4 }} />
            <span>Matches</span>
          </button>
        </div>

        {sidebarTab === 'vacancies' ? (
          <>
            <div className={styles.sidebarHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Active Requests</h2>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>
                  {vacancies.length} TOTAL
                </div>
              </div>
              <button 
                className="btn-primary" 
                style={{ padding: '6px', borderRadius: '8px' }}
                onClick={() => { setIngestType('vacancy'); setIngestModalOpen(true); }}
              >
                <Plus size={18} />
              </button>
            </div>
            <div className={styles.vacancyList}>
              {vacancies.map(([id, vac]: [string, any]) => (
                <button 
                  key={id} 
                  className={`${styles.vacancyItem} ${activeVac === id ? styles.active : ''}`}
                  onClick={() => {
                    setActiveVac(id);
                    setResults(null); 
                    setMobileMenuOpen(false);
                  }}
                >
                  <div className={styles.vacancyTitle}>{vac.title || id}</div>
                  <div className={styles.vacancyMeta}>
                    {id} • {vac.end_client || 'General'}
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : sidebarTab === 'candidates' ? (
          <>
            <div className={styles.sidebarHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Talent Pool</h2>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>
                  {filteredCandidates.length} PROFILES
                </div>
              </div>
              <button 
                className="btn-primary" 
                style={{ padding: '6px', borderRadius: '8px' }}
                onClick={() => { setIngestType('cv'); setIngestModalOpen(true); }}
              >
                <Plus size={18} />
              </button>
            </div>
            <div className={styles.searchBox} style={{ padding: '0 16px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search skills..." 
                  className={styles.searchInput}
                  style={{ paddingLeft: 34 }}
                  value={candidateSearchTerm}
                  onChange={(e) => setCandidateSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.vacancyList}>
              {filteredCandidates.map(([id, cand]: [string, any]) => (
                <button 
                  key={id} 
                  className={`${styles.vacancyItem} ${activeCandidate === id ? styles.active : ''}`}
                  onClick={() => {
                    setActiveCandidate(id);
                    setMobileMenuOpen(false);
                  }}
                >
                  <div className={styles.vacancyTitle}>{cand.name || id}</div>
                  <div className={styles.vacancyMeta}>
                    {id} • {cand.years_experience}y exp
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className={styles.sidebarHeader}>
              <h2>Saved Matches</h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>
                {followupData.length} HISTORY
              </div>
            </div>
            <div className={styles.vacancyList}>
              {followupData.map((fData: any) => (
                <button 
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
                    {fData.matches?.length || 0} SELECTED
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.topBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <button className={styles.mobileMenuBtn} onClick={() => setMobileMenuOpen(true)}>
              <Settings size={24} />
            </button>
            <div style={{ 
              background: 'var(--grey-50)', 
              padding: '6px 14px', 
              borderRadius: 'var(--radius-sm)', 
              display: 'flex', 
              alignItems: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.2)'
            }}>
              <Image 
                src="/WE+Logo-removebg-preview.png" 
                alt="WE+" 
                width={110} 
                height={32} 
                className={styles.logo}
                style={{ objectFit: 'contain' }}
              />
            </div>
            <div style={{ height: '24px', width: '1px', background: 'var(--glass-border)' }}></div>
            <h1 style={{ fontSize: '0.9rem', color: 'var(--blue-400)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>
              TalentMatch <span style={{ opacity: 0.5, fontWeight: 400 }}>v2.0</span>
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '20px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }}></div>
                <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600, letterSpacing: '0.05em' }}>SYSTEM ONLINE</span>
             </div>
             <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                <Globe size={14} style={{ marginRight: 8 }} />
                EN
             </button>
          </div>
        </div>

        <div className={styles.content}>
          {sidebarTab === 'vacancies' ? (
            <>
              {/* Vacancy Detail Section */}

                {/* Vacancy Detail Bento Grid */}
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className={styles.iconCircle}>
                        <Briefcase size={18} />
                      </div>
                      <h3 style={{ margin: 0 }}>Vacancy Overview</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Top</span>
                        <select 
                          value={matchLimit} 
                          onChange={(e) => setMatchLimit(Number(e.target.value))}
                          className={styles.selectControl}
                        >
                          <option value={3}>3</option>
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                        </select>
                      </div>

                      <button 
                        onClick={runMatch} 
                        disabled={matching || !activeVac || selectedCands.size === 0}
                        className="btn-primary"
                        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        {matching ? <div className="spinner" style={{ width: 14, height: 14 }}></div> : <Zap size={14} />}
                        <span style={{ fontSize: '12px' }}>Deep Scan ({selectedCands.size})</span>
                      </button>

                      <button 
                        className="btn-secondary" 
                        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
                        onClick={() => setPoolModalOpen(true)}
                      >
                        <Users size={16} />
                        <span style={{ fontSize: '12px' }}>Talent Pool</span>
                      </button>
                    </div>
                  </div>

                  {currentVacancyData ? (
                    <div className={styles.bentoGrid}>
                      <div className={`${styles.bentoItem} ${styles.colSpan2}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                          <div>
                            <span style={{ fontSize: '11px', color: 'var(--gold)', fontFamily: 'var(--font-heading)', letterSpacing: '0.1em' }}>POSITION</span>
                            <h2 style={{ fontSize: '1.75rem', margin: '4px 0', color: 'var(--text-bright)' }}>{currentVacancyData.title}</h2>
                          </div>
                          <span className="badge" style={{ padding: '6px 14px' }}>{activeVac}</span>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                          <div className={styles.metaBox}>
                            <Globe size={14} />
                            <span>{currentVacancyData.region || 'Remote'}</span>
                          </div>
                          <div className={styles.metaBox}>
                            <Clock size={14} />
                            <span>{currentVacancyData.duration || 'Full-time'}</span>
                          </div>
                          <div className={styles.metaBox}>
                            <Building2 size={14} />
                            <span>{currentVacancyData.end_client || 'Direct Hire'}</span>
                          </div>
                          <div className={styles.metaBox}>
                            <Calendar size={14} />
                            <span>Start: {currentVacancyData.start || 'ASAP'}</span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.bentoItem}>
                        <div className={styles.boxHeader}>
                          <FileText size={16} />
                          <span className={styles.boxLabel}>Requirements</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.6' }}>
                          {currentVacancyData.description?.split('\n').slice(0, 5).join('\n')}...
                        </div>
                      </div>

                      <div className={`${styles.bentoItem} ${styles.colSpan3}`}>
                        <div className={styles.boxHeader} style={{ color: 'var(--blue-400)' }}>
                          <Menu size={16} />
                          <span className={styles.boxLabel}>Full Description</span>
                        </div>
                        <div className={styles.descriptionBox}>
                          <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, color: 'var(--text-normal)' }}>
                            {currentVacancyData.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.bentoItem} style={{ textAlign: 'center', padding: '100px 0', border: '1px dashed var(--glass-border)' }}>
                      <Search size={48} style={{ color: 'var(--stone-600)', marginBottom: '16px' }} />
                      <h3 style={{ color: 'var(--text-muted)' }}>No Vacancy Selected</h3>
                      <p style={{ color: 'var(--stone-500)', fontSize: '14px' }}>Please select a request from the sidebar to begin analysis.</p>
                    </div>
                  )}
                </div>

                {/* AI Match Results (Auto-Scan) */}
                <div className={styles.section} style={{ marginTop: '32px' }}>
                  <div className={styles.sectionTitle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className={styles.iconCircle} style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--blue-400)' }}>
                        <Zap size={18} />
                      </div>
                      <h3 style={{ margin: 0 }}>AI Selection (Top {matchLimit})</h3>
                      {autoMatches[activeVac!] && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--success)', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 8px', borderRadius: 20 }}>
                          <CheckCircle2 size={10} />
                          CACHED
                        </div>
                      )}
                    </div>
                  </div>

                  {autoMatches[activeVac!]?.matches ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
                      {autoMatches[activeVac!].matches.map((match: any, i: number) => renderMatchCard(match, i, true))}
                    </div>
                  ) : autoMatching === activeVac ? (
                    <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
                      <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 20px' }}></div>
                      <h3 style={{ fontSize: '1rem', color: 'var(--gold)' }}>Analyzing Talent Pool...</h3>
                      <p style={{ fontSize: '13px' }}>Claude is finding your top {matchLimit} matches</p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', border: '1px dashed var(--glass-border)', borderRadius: 16 }}>
                      <Search size={32} style={{ marginBottom: 16, opacity: 0.5 }} />
                      <p>Select a vacancy to trigger automatic pool scanning.</p>
                    </div>
                  )}
                </div>

              {/* Pool Modal Overlay */}
              {poolModalOpen && (
                <div className={styles.modalOverlay}>
                  <div className={styles.modalContent} style={{ maxWidth: '800px', width: '95%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                      <div>
                        <h2 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary)' }}>Candidate Pool & AI Insights</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
                          Manage selection and view automated matches for {currentVacancyData?.title}
                        </p>
                      </div>
                      <button className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '12px' }} onClick={() => setPoolModalOpen(false)}>Close</button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {/* Selection List */}
                      <div className={styles.section}>
                        <div className={styles.sectionTitle}>
                          <h3 style={{ fontSize: '1.1rem' }}>Manual Selection</h3>
                          <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={selectAllCandidates}>
                            {selectedCands.size === candidates.length ? 'None' : 'All'}
                          </button>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                          <input 
                            type="text" 
                            placeholder="Filter pool..." 
                            className={styles.searchInput}
                            value={poolSearchTerm}
                            onChange={(e) => setPoolSearchTerm(e.target.value)}
                            style={{ fontSize: '13px', padding: '8px 12px' }}
                          />
                        </div>
                        <div className={styles.candidateList} style={{ maxHeight: '65vh' }}>
                          {candidates.filter(([id, cand]: [string, any]) => {
                            if (!poolSearchTerm) return true;
                            const term = poolSearchTerm.toLowerCase();
                            return id.toLowerCase().includes(term) || (cand.name || '').toLowerCase().includes(term) || (cand.primary_role || '').toLowerCase().includes(term);
                          }).map(([id, cand]: [string, any]) => (
                            <label key={id} className={styles.candidateItem}>
                              <input 
                                type="checkbox" 
                                checked={selectedCands.has(id)}
                                onChange={() => toggleCandidate(id)}
                              />
                              <div className={styles.candidateInfo}>
                                <div className={styles.candidateName}>{cand.name || id}</div>
                                <div className={styles.candidateRole}>{cand.primary_role} • {cand.years_experience}y</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Results Section */}
              {results && (
                <div className={styles.resultsSection}>
                  <h2 style={{ marginBottom: 16 }}>AI Match Results (Detailed Scan)</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {results.matches && results.matches.length > 0 ? (
                      results.matches.map((match: any, index: number) => renderMatchCard(match, index, false))
                    ) : (
                      <p>No candidates matched the requirements.</p>
                    )}
                  </div>
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
                    {currentCandidateData.name ? `${currentCandidateData.name} • ` : ''}
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
                  
                  {currentCandidateData.description && (
                    <div className={styles.descriptionBox}>
                      <h4 style={{ marginBottom: 8, color: 'var(--text-muted)' }}>Complete CV</h4>
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6, maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
                        {currentCandidateData.description}
                      </div>
                    </div>
                  )}
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
              
              <div className={styles.scrollArea} style={{ display: 'flex', flexDirection: 'column' }}>
                <div className={styles.kanbanBoard}>
                  {['Suggested', 'Interviewing', 'Offered', 'Rejected'].map(stage => (
                    <div 
                      key={stage} 
                      className={styles.kanbanColumn}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, stage)}
                    >
                      <div className={styles.kanbanHeader}>
                        {stage}
                        <span style={{ fontSize: '10px', opacity: 0.6 }}>
                          {followupData
                            .flatMap(f => (f.matches || []).map((m: any) => ({ ...m, vacId: f.vacancy_id })))
                            .filter((match: any) => (kanbanState[`${match.vacId}-${match.candidate_id}`] || 'Suggested') === stage).length}
                        </span>
                      </div>
                    
                    {followupData
                      .flatMap(f => (f.matches || []).map((m: any) => ({ ...m, vacId: f.vacancy_id })))
                      .filter((match: any) => {
                        const id = `${match.vacId}-${match.candidate_id}`;
                        const matchStage = kanbanState[id] || 'Suggested'; // Default to suggested
                        return matchStage === stage;
                      })
                      .map((match: any, idx: number) => {
                        const id = `${match.vacId}-${match.candidate_id}`;
                        return (
                          <div 
                            key={`${id}-${idx}`} 
                            className={styles.kanbanCard} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, id)}
                          >
                            <strong>{match.name && match.name !== "Extract Name from CV or use ID" ? match.name : match.candidate_id}</strong>
                            <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4 }}>
                              Score: {match.score ? (match.score <= 1 ? (match.score * 100).toFixed(0) : match.score) : 0}%
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                              Matched for: {match.vacId}
                            </div>
                          </div>
                        );
                      })}
                      
                    {/* Show empty state if nothing is in this column */}
                    {followupData
                      .flatMap(f => (f.matches || []).map((m: any) => ({ ...m, vacId: f.vacancy_id })))
                      .filter((match: any) => {
                        const id = `${match.vacId}-${match.candidate_id}`;
                        return (kanbanState[id] || 'Suggested') === stage;
                      }).length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '14px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', marginTop: '10px' }}>
                          Drop here
                        </div>
                      )}
                  </div>
                ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
