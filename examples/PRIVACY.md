# PRIVACY — please read

The CVs in this repo describe **real consultants** at WE+ and partner firms (Privatum, etc.). They've been anonymized: no names, no emails, no phone numbers, no LinkedIn URLs, no street addresses. But the *content* (skills, employers, project history, certifications, languages) is real.

Treat this dataset like you'd treat your own LinkedIn data. **Don't be the crew that leaked the WE+ candidate pool.**

---

## Hard rules

1. **Don't deploy CVs in a public bundle.** No `vercel --prod` with `data/` baked in. If your demo needs the CVs, use a local-only env or a private deploy with HTTP basic auth.

2. **Don't upload CVs to consumer AI.** No personal ChatGPT, no Gemini, no Copilot Chat with the CVs pasted in — those are training-data risks. Use the **API** (Anthropic, OpenAI) where data isn't trained on. Or local models (Ollama).

3. **Don't post CVs in Discord / Slack / wherever.** Internal-only.

4. **Don't try to re-identify candidates.** If you spot something suspicious or accidentally find a name that wasn't redacted, **flag it in Discord** so we fix it for everyone. Don't post the leaked name itself.

5. **End of hackathon: delete your local copies.** Soulware will share results / artifacts via the WE+ team channel. Your fork should be deleted or made private after Thursday.

---

## What the API providers see

If you call Anthropic or OpenAI, your prompt (which contains CV text) is sent to their servers. Both have enterprise zero-data-retention (ZDR) options:

- **Anthropic API** — does not train on API traffic by default. ZDR available on request for enterprise.
- **OpenAI API** — does not train on API traffic by default. Standard 30-day retention; ZDR available.
- **Anthropic Claude.ai (consumer chat)** — DOES train. ❌ Don't paste CVs here.
- **ChatGPT (consumer chat)** — DOES train (depending on settings). ❌ Don't paste CVs here.

Use the **API**, not the consumer products.

---

## What we anonymized vs. kept

**Stripped:**
- Names → `Candidate NNN`
- Emails, phones, LinkedIn URLs, personal websites → placeholders
- Home address (street/city) → kept province only (`Vlaams-Brabant`, `Antwerpen`, etc.)
- Date of birth → mostly stripped (rarely kept "born YYYY")
- Spouse / family / references → stripped

**Kept (because matching needs it):**
- Employer names — public companies (Nike, KBC, Liantis, Privatum, etc.)
- Job titles, project descriptions
- Skills, certifications, education
- Languages with proficiency

A real name → CAND-ID mapping exists for **WE+ leadership only** (used to evaluate your matches at the end). It is **not** in this repo. Don't ask for it.

---

## After the hackathon

WE+ will decide — with Soulware — what subset of this dataset (if any) becomes part of the production system. The fact that we anonymized it for the hackathon **doesn't authorize** ongoing use beyond the event.

Questions: ask Koen (Soulware client lead) or Gert Dubois (WE+ tech lead).
