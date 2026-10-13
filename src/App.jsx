import { useEffect, useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'

const STORAGE_KEY = 'total-cv-db-v1'

const sectionLabels = {
  skills: 'Skills',
  courses: 'Courses',
  experience: 'Experience',
  projects: 'Projects',
  certifications: 'Certifications',
}

const defaultData = {
  profile: {
    name: 'Avery Morgan',
    title: 'Product Designer & Frontend Developer',
    email: 'avery@example.com',
    phone: '+1 (555) 248-6331',
    location: 'Seattle, WA',
    website: 'averymorgan.dev',
  },
  summary:
    'Product-minded frontend developer with a strong focus on accessible, user-centered digital experiences. Experienced in building polished interfaces, translating user research into clean product decisions, and shipping reliable web applications.',
  sections: {
    skills: ['React', 'JavaScript', 'Accessibility', 'Figma', 'Design Systems'],
    courses: ['Google UX Design Certificate', 'Advanced JavaScript', 'Responsive Web Design'],
    experience: ['Built user-focused web features for SaaS products', 'Led UX improvements for onboarding and retention', 'Collaborated with engineers on product roadmaps'],
    projects: ['Personal portfolio site', 'Internal dashboard for KPI reporting', 'Accessible design system documentation'],
    certifications: ['Certified Scrum Product Owner', 'Google UX Design Certificate'],
  },
}

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'cv'

const loadStoredData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : defaultData
  } catch {
    return defaultData
  }
}

function App() {
  const [data, setData] = useState(loadStoredData)
  const [draft, setDraft] = useState({ category: 'skills', value: '' })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const orderedSections = useMemo(
    () => ['skills', 'courses', 'experience', 'projects', 'certifications'],
    [],
  )

  const updateProfile = (field, value) => {
    setData((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [field]: value,
      },
    }))
  }

  const handleAddItem = () => {
    const trimmedValue = draft.value.trim()
    if (!trimmedValue) {
      return
    }

    setData((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [draft.category]: [...(current.sections[draft.category] || []), trimmedValue],
      },
    }))

    setDraft((current) => ({ ...current, value: '' }))
  }

  const handleRemoveItem = (category, itemToRemove) => {
    setData((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [category]: (current.sections[category] || []).filter((item) => item !== itemToRemove),
      },
    }))
  }

  const saveDatabase = () => {
    const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `${slugify(data.profile.name || 'cv')}-database.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const restoreDatabase = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      try {
        const parsed = JSON.parse(String(loadEvent.target?.result || '{}'))
        if (parsed && parsed.profile && parsed.sections) {
          setData(parsed)
        }
      } catch (error) {
        console.error('Unable to restore database', error)
        alert('The selected file is not a valid Total CV database.')
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const generatePdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 40
    let cursorY = 52

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.text(data.profile.name || 'Your Name', margin, cursorY)
    cursorY += 24

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const meta = [
      data.profile.title,
      data.profile.email,
      data.profile.phone,
      data.profile.location,
      data.profile.website,
    ].filter(Boolean)

    doc.text(meta.join(' • '), margin, cursorY)
    cursorY += 24

    if (data.summary) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      const lines = doc.splitTextToSize(data.summary, pageWidth - margin * 2)
      doc.text(lines, margin, cursorY)
      cursorY += lines.length * 12 + 10
    }

    const renderSection = (title, items) => {
      if (!items || !items.length) {
        return
      }

      if (cursorY > 760) {
        doc.addPage()
        cursorY = 52
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(title, margin, cursorY)
      cursorY += 18

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)

      items.forEach((item) => {
        const lines = doc.splitTextToSize(`• ${item}`, pageWidth - margin * 2 - 16)
        if (cursorY + lines.length * 12 > 790) {
          doc.addPage()
          cursorY = 52
        }
        doc.text(lines, margin + 8, cursorY)
        cursorY += lines.length * 12 + 6
      })

      cursorY += 8
    }

    renderSection('Skills', data.sections.skills)
    renderSection('Courses', data.sections.courses)
    renderSection('Experience', data.sections.experience)
    renderSection('Projects', data.sections.projects)
    renderSection('Certifications', data.sections.certifications)

    doc.save(`${slugify(data.profile.name || 'cv')}-cv.pdf`)
  }

  const resetToDemo = () => {
    setData(defaultData)
    setDraft({ category: 'skills', value: '' })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Total CV</p>
          <h1>Career Inventory Builder</h1>
        </div>
        <div className="button-row">
          <button className="secondary" onClick={saveDatabase}>Save database</button>
          <label className="secondary file-label">
            Import JSON
            <input type="file" accept="application/json" onChange={restoreDatabase} />
          </label>
          <button onClick={generatePdf}>Generate PDF</button>
        </div>
      </header>

      <main className="layout">
        <section className="panel profile-panel">
          <h2>Profile</h2>
          <div className="field-grid">
            <label>
              Full name
              <input value={data.profile.name} onChange={(event) => updateProfile('name', event.target.value)} />
            </label>
            <label>
              Job title
              <input value={data.profile.title} onChange={(event) => updateProfile('title', event.target.value)} />
            </label>
            <label>
              Email
              <input value={data.profile.email} onChange={(event) => updateProfile('email', event.target.value)} />
            </label>
            <label>
              Phone
              <input value={data.profile.phone} onChange={(event) => updateProfile('phone', event.target.value)} />
            </label>
            <label>
              Location
              <input value={data.profile.location} onChange={(event) => updateProfile('location', event.target.value)} />
            </label>
            <label>
              Website
              <input value={data.profile.website} onChange={(event) => updateProfile('website', event.target.value)} />
            </label>
          </div>

          <label className="summary-field">
            Professional summary
            <textarea
              rows="5"
              value={data.summary}
              onChange={(event) => setData((current) => ({ ...current, summary: event.target.value }))}
            />
          </label>
        </section>

        <section className="panel inventory-panel">
          <div className="section-header">
            <h2>Inventory</h2>
            <button className="ghost" onClick={resetToDemo}>Reset demo</button>
          </div>

          <div className="add-item-row">
            <select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
              {orderedSections.map((category) => (
                <option key={category} value={category}>
                  {sectionLabels[category]}
                </option>
              ))}
            </select>
            <input
              placeholder="Add a skill, course, or highlight"
              value={draft.value}
              onChange={(event) => setDraft((current) => ({ ...current, value: event.target.value }))}
            />
            <button onClick={handleAddItem}>Add</button>
          </div>

          <div className="section-list">
            {orderedSections.map((category) => (
              <div key={category} className="section-card">
                <h3>{sectionLabels[category]}</h3>
                <ul>
                  {(data.sections[category] || []).map((item) => (
                    <li key={`${category}-${item}`}>
                      <span>{item}</span>
                      <button type="button" className="delete-button" onClick={() => handleRemoveItem(category, item)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
