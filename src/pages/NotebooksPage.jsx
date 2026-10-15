import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useCreateBlockNote, BlockNoteViewRaw as BlockNoteView } from '@blocknote/react'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/react/style.css'
import Modal from '../components/Modal'

export default function NotebooksPage() {
  const outletCtx = useOutletContext() || {}

  const [favorites, setFavorites] = useState([
    { id: 'fav-1', title: 'Cybersecurity Protocols', icon: 'star', starFilled: true, shortcut: '⌥1' },
    { id: 'fav-2', title: 'Linear Algebra & Matrices', icon: 'bookmark', starFilled: false, shortcut: '⌥2' },
  ])

  // Estado fallback local para carpetas si no viniese de context
  const [localFolders, setLocalFolders] = useState([
    {
      id: 'f-1',
      name: 'University Notes',
      icon: 'school',
      iconColor: 'text-tag-university-text',
      expanded: true,
      notes: [
        { id: 'n-1', title: 'Linear Algebra & Matrices', active: false },
        { id: 'n-2', title: 'Cybersecurity Protocols', active: true },
        { id: 'n-3', title: 'Database Systems Exam Prep', active: false },
        { id: 'n-4', title: 'Computer Architecture', active: false },
      ],
    },
    {
      id: 'f-2',
      name: 'Personal Projects',
      icon: 'terminal',
      iconColor: 'text-tag-personal-text',
      expanded: false,
      notes: [
        { id: 'n-5', title: 'React UI Component Architecture', active: false },
        { id: 'n-6', title: '3D Printer Slicer Configs', active: false },
      ],
    },
    {
      id: 'f-3',
      name: 'Reading & Research',
      icon: 'library_books',
      iconColor: 'text-tertiary',
      expanded: false,
      notes: [
        { id: 'n-7', title: 'Deep Work Chapter Summary', active: false },
        { id: 'n-8', title: 'Zero Trust Security Whitepaper', active: false },
      ],
    },
  ])

  // Vinculación al estado global proporcionado por AppShell
  const folders = outletCtx.notebookFolders || outletCtx.notebooks || localFolders
  const setFolders = outletCtx.setNotebookFolders || outletCtx.setNotebooks || setLocalFolders

  const [recentEdits, setRecentEdits] = useState([
    { id: 'rec-1', title: 'Cybersecurity Lab', timeAgo: '14m ago' },
    { id: 'rec-2', title: 'React Component Lib', timeAgo: '2h ago' },
    { id: 'rec-3', title: 'Málaga 10k Schedule', timeAgo: 'Yesterday' },
  ])

  // Estados para Modales de Carpeta y Nota
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [folderFormData, setFolderFormData] = useState({ name: '' })
  const [selectedFolderIcon, setSelectedFolderIcon] = useState('folder')

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [noteFormData, setNoteFormData] = useState({ title: '', folderId: '' })

  const handleOpenAddFolderModal = () => {
    setFolderFormData({ name: '' })
    setSelectedFolderIcon('folder')
    setIsFolderModalOpen(true)
  }

  const handleSaveAddFolder = (data) => {
    if (!data.name?.trim()) return

    const newFolder = {
      id: `f-${Date.now()}`,
      name: data.name.trim(),
      icon: selectedFolderIcon || 'folder',
      iconColor: 'text-primary',
      expanded: true,
      notes: [],
    }

    setFolders((prev) => [...prev, newFolder])
    setIsFolderModalOpen(false)
  }

  const handleOpenAddNoteModal = (targetFolderId = null) => {
    setNoteFormData({
      title: '',
      folderId: targetFolderId || (folders[0]?.id || ''),
    })
    setIsNoteModalOpen(true)
  }

  const handleSaveAddNote = (data) => {
    if (!data.title?.trim()) return
    const targetFolderId = data.folderId || (folders[0]?.id)

    const newNote = {
      id: `n-${Date.now()}`,
      title: data.title.trim(),
      active: false,
    }

    setFolders((prev) => {
      if (prev.length === 0) {
        return [
          {
            id: `f-${Date.now()}`,
            name: 'General Notes',
            icon: 'folder',
            iconColor: 'text-secondary',
            expanded: true,
            notes: [newNote],
          },
        ]
      }
      return prev.map((f) => {
        if (f.id === targetFolderId || (!targetFolderId && f.id === prev[0].id)) {
          return {
            ...f,
            expanded: true,
            notes: [newNote, ...f.notes],
          }
        }
        return f
      })
    })

    setRecentEdits((prev) => [{ id: `rec-${Date.now()}`, title: data.title.trim(), timeAgo: 'Just now' }, ...prev])
    setIsNoteModalOpen(false)
  }

  const folderModalFields = [
    { name: 'name', label: 'Nombre de la Carpeta', type: 'text', required: true, placeholder: 'Ej: Proyectos Web, Algoritmos...' },
  ]

  const noteModalFields = [
    { name: 'title', label: 'Título de la Nota / Página', type: 'text', required: true, placeholder: 'Ej: Resumen Algoritmos...' },
    {
      name: 'folderId',
      label: 'Carpeta de destino',
      type: 'select',
      options: folders.map((f) => ({ value: f.id, label: f.name })),
    },
  ]

  const handleDeleteFolder = (folderId) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId))
  }

  const handleDeleteNote = (folderId, noteId) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, notes: f.notes.filter((n) => n.id !== noteId) } : f))
    )
  }

  const handleDeleteFavorite = (favId) => {
    setFavorites((prev) => prev.filter((fav) => fav.id !== favId))
  }

  const handleDeleteRecent = (recentId) => {
    setRecentEdits((prev) => prev.filter((r) => r.id !== recentId))
  }

  const toggleFolderExpanded = (folderId) => {
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, expanded: !f.expanded } : f)))
  }

  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: 'heading',
        props: { level: 1 },
        content: 'Cybersecurity Protocols & Public Key Cryptography',
      },
      {
        type: 'paragraph',
        content:
          'Comprehensive breakdown of asymmetric key encapsulation mechanisms, Diffie-Hellman ephemeral handshakes (DHE/ECDHE), and Wireshark trace analysis prepared for the practical evaluation on Nov 3rd.',
      },
      {
        type: 'heading',
        props: { level: 2 },
        content: '1. Diffie-Hellman Key Exchange Flow',
      },
      {
        type: 'paragraph',
        content:
          'In an ephemeral handshake, both client and server negotiate a shared secret over an insecure channel without transmitting the key material directly. Mathematical security relies strictly on the intractability of discrete logarithm computations over finite fields.',
      },
      {
        type: 'heading',
        props: { level: 2 },
        content: '2. Lab Checklist & Packet Inspection',
      },
      {
        type: 'checkListItem',
        props: { checked: true },
        content: 'Capture initial TLS 1.3 ClientHello packet in Wireshark',
      },
      {
        type: 'checkListItem',
        props: { checked: true },
        content: 'Verify ServerKeyExchange ephemeral parameters and signature',
      },
      {
        type: 'checkListItem',
        props: { checked: false },
        content: 'Document man-in-the-middle downgrade prevention mechanisms',
      },
    ],
  })

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col lg:flex-row gap-space-lg w-full max-w-[2400px] 2xl:max-w-[2800px] mx-auto items-start">
        {/* LEFT PANEL: Notebooks Tree & Directory (Linear/Notion inspired utility) */}
        <aside className="w-full lg:w-[280px] shrink-0 bg-surface-pure rounded-xl p-space-md shadow-sm flex flex-col gap-space-md">
          {/* Panel Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[18px] text-primary">auto_stories</span>
              <span className="font-headline-sm text-headline-sm text-on-surface">Notebooks</span>
            </div>
            <div className="flex items-center gap-1">
              <button className="w-6 h-6 rounded flex items-center justify-center text-secondary hover:bg-surface-muted hover:text-on-surface transition-colors" title="Collapse sidebar (⌘[)">
                <span className="material-symbols-outlined text-[16px]">dock_to_left</span>
              </button>
              <button
                onClick={handleOpenAddFolderModal}
                className="w-6 h-6 rounded flex items-center justify-center text-secondary hover:bg-surface-muted hover:text-on-surface transition-colors cursor-pointer"
                title="New Folder"
              >
                <span className="material-symbols-outlined text-[16px]">create_new_folder</span>
              </button>
              <button
                onClick={() => handleOpenAddNoteModal()}
                className="w-6 h-6 rounded flex items-center justify-center bg-primary text-on-primary hover:bg-primary-container transition-colors cursor-pointer"
                title="New Note (N)"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>
          </div>

          {/* Quick Search / Filter Input */}
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-[15px] text-secondary">search</span>
            <input
              className="w-full bg-surface-subtle font-body-sm text-body-sm text-on-surface pl-8 pr-3 py-1.5 rounded outline-none focus:bg-surface-pure transition-all placeholder:text-secondary"
              placeholder="Filter pages & tags..."
              type="text"
            />
          </div>

          {/* Tree Hierarchy */}
          <div className="flex flex-col gap-space-md overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
            {/* Pinned Section */}
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider px-2">Favorites</span>
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-surface-muted text-on-surface group transition-colors relative cursor-pointer"
                >
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="material-symbols-outlined text-[14px] text-secondary opacity-30 group-hover:opacity-100 cursor-grab shrink-0 -ml-1 transition-opacity" title="Drag to reorder">
                      drag_indicator
                    </span>
                    <span
                      className="material-symbols-outlined text-[16px] text-primary shrink-0"
                      style={fav.starFilled ? { fontVariationSettings: "'FILL' 1" } : {}}
                    >
                      {fav.icon}
                    </span>
                    <span className="font-body-sm text-body-sm truncate font-medium">{fav.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-code-sm text-[11px] text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                      {fav.shortcut}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteFavorite(fav.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-secondary hover:text-error hover:bg-error/10 transition-all cursor-pointer"
                      title="Remove favorite"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Notebooks / Folders Section */}
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider px-2">Folders</span>
              {folders.map((folder) => (
                <div key={folder.id} className="flex flex-col mt-0.5">
                  <div className="flex items-center group px-1 rounded hover:bg-surface-muted">
                    <span
                      className="material-symbols-outlined text-[14px] text-secondary opacity-20 group-hover:opacity-100 cursor-grab shrink-0 transition-opacity"
                      title="Drag to reorder"
                    >
                      drag_indicator
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleFolderExpanded(folder.id)}
                      className="flex items-center gap-1.5 px-1 py-1 text-on-surface font-label-md text-label-md w-full text-left font-semibold cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px] text-secondary">
                        {folder.expanded ? 'expand_more' : 'chevron_right'}
                      </span>
                      <span className={`material-symbols-outlined text-[16px] ${folder.iconColor}`}>{folder.icon}</span>
                      <span className="truncate flex-1">{folder.name}</span>
                      <span className="font-code-sm text-label-sm text-secondary mr-1">{folder.notes.length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenAddNoteModal(folder.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-secondary hover:text-on-surface hover:bg-surface-subtle transition-all cursor-pointer"
                      title="Add note to folder"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFolder(folder.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-secondary hover:text-error hover:bg-error/10 transition-all cursor-pointer"
                      title="Delete folder"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>

                  {folder.expanded && (
                    <div className="flex flex-col pl-5 mt-0.5 gap-0.5">
                      {folder.notes.map((note) => (
                        <div
                          key={note.id}
                          className={`flex items-center group rounded pr-1 ${
                            note.active ? 'bg-surface-muted' : 'hover:bg-surface-muted'
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-[12px] pl-1 cursor-grab ${
                              note.active ? 'text-primary opacity-60 group-hover:opacity-100' : 'text-secondary opacity-0 group-hover:opacity-80'
                            }`}
                          >
                            drag_indicator
                          </span>
                          <a
                            className={`px-1.5 py-1 font-body-sm text-body-sm truncate flex-1 transition-colors ${
                              note.active ? 'text-primary font-medium' : 'text-secondary hover:text-on-surface'
                            }`}
                            href="#"
                          >
                            {note.title}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(folder.id, note.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-secondary hover:text-error hover:bg-error/10 transition-all cursor-pointer"
                            title="Delete note"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Recent Pages */}
            <div className="flex flex-col gap-1 pt-2">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider px-2">Recent Edits</span>
              {recentEdits.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-2 py-1 rounded text-on-surface-variant hover:bg-surface-muted hover:text-on-surface transition-colors group cursor-pointer"
                >
                  <span className="font-body-sm text-body-sm truncate max-w-[150px]">{item.title}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-code-sm text-[11px] text-secondary">{item.timeAgo}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecent(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-secondary hover:text-error hover:bg-error/10 transition-all cursor-pointer"
                      title="Remove from recent"
                    >
                      <span className="material-symbols-outlined text-[13px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Resizer Handle */}
        <div className="hidden lg:flex flex-col items-center justify-center w-2 -mx-1 shrink-0 group cursor-col-resize h-[calc(100vh-140px)] self-stretch z-10">
          <div className="w-px h-full bg-border-subtle group-hover:bg-primary transition-colors flex items-center justify-center">
            <div className="w-1.5 h-7 rounded-full bg-surface-variant group-hover:bg-primary transition-colors opacity-0 group-hover:opacity-100 shadow-xs"></div>
          </div>
        </div>

        {/* RIGHT PANEL: Notion/Linear Style Document Workspace Canvas */}
        <section className="flex-1 bg-surface-pure rounded-xl shadow-sm min-w-0 flex flex-col overflow-hidden relative">
          {/* Sticky Document Secondary Sub-Toolbar */}
          <div className="flex items-center justify-between px-space-lg py-2.5 bg-surface-pure/90 backdrop-blur z-20">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-secondary min-w-0">
              <a className="font-label-md text-label-md hover:text-on-surface transition-colors" href="#">Notebooks</a>
              <span className="font-code-sm text-code-sm">/</span>
              <a className="font-label-md text-label-md text-tag-university-text flex items-center gap-1 hover:underline" href="#">
                <span className="material-symbols-outlined text-[14px]">school</span> University
              </a>
              <span className="font-code-sm text-code-sm">/</span>
              <span className="font-label-md text-label-md text-on-surface font-semibold truncate">Cybersecurity Protocols</span>
            </div>
            {/* Meta actions & indicators */}
            <div className="flex items-center gap-space-sm shrink-0">
              <span className="hidden sm:inline font-code-sm text-code-sm text-secondary">1,420 words · edited 14m ago</span>
              <div className="flex items-center gap-1">
                <button className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-surface-muted text-on-surface font-label-sm text-label-sm flex items-center gap-1 transition-colors">
                  <span className="material-symbols-outlined text-[14px]">ios_share</span> Share
                </button>
                <button className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-surface-muted text-on-surface font-label-sm text-label-sm flex items-center gap-1 transition-colors">
                  <span className="material-symbols-outlined text-[14px]">markdown</span> Export
                </button>
                <button className="w-7 h-7 rounded hover:bg-surface-muted flex items-center justify-center text-secondary hover:text-on-surface transition-colors">
                  <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                </button>
              </div>
            </div>
          </div>

          {/* Document Cover Graphic with Reposition Pill Actions */}
          <div className="relative w-full h-44 sm:h-52 bg-gradient-to-r from-surface-container via-surface-variant to-primary-fixed overflow-hidden group">
            <svg className="absolute inset-0 w-full h-full opacity-30 text-primary" preserveAspectRatio="none" viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern height="40" id="grid" patternUnits="userSpaceOnUse" width="40">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.75" />
                </pattern>
              </defs>
              <rect fill="url(#grid)" height="100%" width="100%" />
              <path d="M0,180 Q200,90 400,140 T800,40" fill="none" stroke="currentColor" strokeDasharray="6,6" strokeWidth="2" />
              <circle cx="400" cy="140" fill="currentColor" r="4" />
              <circle cx="650" cy="75" fill="currentColor" r="5" />
            </svg>
            <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
              <button className="px-2.5 py-1 bg-surface-pure/80 backdrop-blur rounded text-on-surface font-label-sm text-label-sm hover:bg-surface-pure shadow-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">image</span> Change Cover
              </button>
              <button className="px-2.5 py-1 bg-surface-pure/80 backdrop-blur rounded text-on-surface font-label-sm text-label-sm hover:bg-surface-pure shadow-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">drag_pan</span> Reposition
              </button>
            </div>
          </div>

          {/* Main Editor Container (Notion Style Content Padding) */}
          <div className="px-6 sm:px-12 md:px-16 lg:px-20 pb-20 pt-2 flex flex-col max-w-5xl 2xl:max-w-6xl mx-auto w-full">
            {/* Document Badge Icon */}
            <div className="-mt-9 mb-4 flex items-center">
              <div className="w-14 h-14 rounded-xl bg-surface-pure shadow-md p-1.5 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer group">
                <div className="w-full h-full bg-tag-university-bg rounded-lg flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
                </div>
              </div>
            </div>

            {/* BlockNote Functional Editor */}
            <div className="mt-2 min-h-[500px]">
              <BlockNoteView editor={editor} theme="light" />
            </div>
          </div>
        </section>
      </div>

      {/* Modal para Crear Carpeta con Selector de Iconos */}
      <Modal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSave={handleSaveAddFolder}
        title="Crear Nueva Carpeta de Apuntes"
        fields={folderModalFields}
        formData={folderFormData}
        onChangeField={(name, value) => setFolderFormData((prev) => ({ ...prev, [name]: value }))}
        showIconPicker={true}
        selectedIcon={selectedFolderIcon}
        onSelectIcon={setSelectedFolderIcon}
      />

      {/* Modal para Crear Nueva Nota */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSave={handleSaveAddNote}
        title="Crear Nueva Nota"
        fields={noteModalFields}
        formData={noteFormData}
        onChangeField={(name, value) => setNoteFormData((prev) => ({ ...prev, [name]: value }))}
      />
    </div>
  )
}
