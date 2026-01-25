import '../styles/navigation.css'

export default function BottomNav({ currentPage, onNavigate }) {
  return (
    <nav className="bottom-nav">
      <button
        className={`bottom-nav__item ${currentPage === 'dashboard' ? 'bottom-nav__item--active' : ''}`}
        onClick={() => onNavigate('dashboard')}
      >
        <span className="bottom-nav__icon">📊</span>
        <span>Dashboard</span>
      </button>
      
      <button
        className={`bottom-nav__item ${currentPage === 'streamings' ? 'bottom-nav__item--active' : ''}`}
        onClick={() => onNavigate('streamings')}
      >
        <span className="bottom-nav__icon">📺</span>
        <span>Streamings</span>
      </button>
      
      <button
        className={`bottom-nav__item ${currentPage === 'users' ? 'bottom-nav__item--active' : ''}`}
        onClick={() => onNavigate('users')}
      >
        <span className="bottom-nav__icon">👥</span>
        <span>Pessoas</span>
      </button>
    </nav>
  )
}
