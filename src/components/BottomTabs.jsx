import { useState } from 'react'
import '../styles/bottom-tabs.css'

export default function BottomTabs({ children }) {
  const [activeTab, setActiveTab] = useState(0)

  // Extrair títulos e conteúdo dos children
  const tabs = Array.isArray(children)
    ? children.map((child) => ({
        title: child.props?.title || 'Tab',
        icon: child.props?.icon || '📄',
        content: child.props?.children || child
      }))
    : [{
        title: children.props?.title || 'Tab',
        icon: children.props?.icon || '📄',
        content: children.props?.children || children
      }]

  return (
    <div className="bottom-tabs">
      {/* Conteúdo da aba ativa */}
      <div className="bottom-tabs__content">
        {tabs[activeTab]?.content}
      </div>

      {/* Barra de abas na base */}
      <nav className="bottom-tabs__nav" role="tablist">
        {tabs.map((tab, index) => (
          <button
            key={index}
            role="tab"
            aria-selected={index === activeTab}
            className={`bottom-tabs__tab ${index === activeTab ? 'bottom-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            <span className="bottom-tabs__icon">{tab.icon}</span>
            <span className="bottom-tabs__label">{tab.title}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

// Componente para envolver cada aba
BottomTabs.Tab = function({ children, title, icon }) {
  return children
}
