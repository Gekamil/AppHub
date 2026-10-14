import React from 'react'

export const POPULAR_ICONS = [
  'school',
  'fitness_center',
  'terminal',
  'code',
  'menu_book',
  'folder',
  'schedule',
  'event',
  'work',
  'person',
  'lightbulb',
  'task_alt',
  'flag',
  'star',
  'bookmark',
  'favorite',
  'palette',
  'science',
  'rocket_launch',
  'psychology',
  'directions_run',
  'database',
  'security',
  'hub',
]

export default function Modal({
  isOpen,
  onClose,
  onSave,
  title = 'Nuevo Elemento',
  fields = [],
  formData = {},
  onChangeField,
  showIconPicker = false,
  selectedIcon = '',
  onSelectIcon,
  children,
}) {
  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-surface-pure rounded-2xl shadow-2xl border border-border-subtle p-6 z-10 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle shrink-0">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-muted transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label className="font-label-sm text-label-sm text-secondary font-medium">
                {field.label} {field.required && <span className="text-error">*</span>}
              </label>

              {field.type === 'textarea' ? (
                <textarea
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={(e) => onChangeField(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-subtle hover:bg-surface-pure focus:bg-surface-pure border border-border-subtle rounded-lg text-on-surface font-body-sm text-body-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                />
              ) : field.type === 'select' ? (
                <select
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={(e) => onChangeField(field.name, e.target.value)}
                  required={field.required}
                  className="w-full h-10 px-3 bg-surface-subtle hover:bg-surface-pure focus:bg-surface-pure border border-border-subtle rounded-lg text-on-surface font-body-sm text-body-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                >
                  {field.options?.map((opt) => (
                    <option key={opt.value ?? opt} value={opt.value ?? opt}>
                      {opt.label ?? opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || 'text'}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={(e) => onChangeField(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full h-10 px-3 bg-surface-subtle hover:bg-surface-pure focus:bg-surface-pure border border-border-subtle rounded-lg text-on-surface font-body-sm text-body-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              )}
            </div>
          ))}

          {/* Icon Picker Grid */}
          {showIconPicker && (
            <div className="flex flex-col gap-2 pt-2">
              <label className="font-label-sm text-label-sm text-secondary font-medium">
                Seleccionar Icono:
              </label>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-2 bg-surface-muted/50 rounded-xl max-h-36 overflow-y-auto border border-border-subtle">
                {POPULAR_ICONS.map((iconName) => {
                  const isSelected = selectedIcon === iconName
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => onSelectIcon && onSelectIcon(iconName)}
                      className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-on-primary ring-2 ring-primary/40 shadow-xs'
                          : 'bg-surface-pure text-on-surface-variant hover:bg-surface-subtle hover:text-on-surface'
                      }`}
                      title={iconName}
                    >
                      <span className="material-symbols-outlined text-[20px]">{iconName}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {children}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-surface-muted hover:bg-surface-variant text-secondary hover:text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-9 px-5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
