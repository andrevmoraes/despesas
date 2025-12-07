import '../styles/skeleton.css'

function DashboardSkeleton() {
  // Simula quantidade de tiles de pessoas (normalmente 2-4)
  const peopleTiles = [1, 2, 3]
  const configTiles = [1, 2, 3, 4]

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '12px' }}>
        
        {/* Performance Bar - estilo Windows Phone */}
        <div style={{ 
          height: '2px', 
          width: '100%',
          backgroundColor: '#e5e7eb',
          marginBottom: '12px',
          overflow: 'hidden'
        }}>
          <div 
            className="skeleton-progress-bar"
            style={{ 
              height: '100%',
              width: '30%',
              background: 'linear-gradient(to right, transparent, #0078D7, transparent)'
            }}
          />
        </div>

        {/* Grid de Tiles */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '12px',
          overflow: 'visible'
        }}>
          
          {/* Live Tile Grande (span 2, aspect-ratio 2/1) */}
          <div 
            className="skeleton-tile-gray" 
            style={{ 
              gridColumn: 'span 2',
              aspectRatio: '2 / 1',
              animationDelay: '0ms'
            }}
          />

          {/* Título: pessoas */}
          <div style={{ 
            gridColumn: 'span 2',
            marginTop: '8px',
            marginBottom: '4px'
          }}>
            <div className="skeleton-text-gray" style={{ width: '80px', height: '12px', opacity: 0.6 }}></div>
          </div>

          {/* Tiles de Pessoas (aspect-ratio 1/1) */}
          {peopleTiles.map((i) => (
            <div 
              key={`person-${i}`}
              className="skeleton-tile-gray" 
              style={{ 
                aspectRatio: '1 / 1',
                animationDelay: `${(i + 1) * 100}ms`
              }}
            />
          ))}

          {/* Título: configurações */}
          <div style={{ 
            gridColumn: 'span 2',
            marginTop: '8px',
            marginBottom: '4px'
          }}>
            <div className="skeleton-text-gray" style={{ width: '120px', height: '12px', opacity: 0.6 }}></div>
          </div>

          {/* Tiles de Configurações (menores, aspect-ratio 1/1) */}
          {configTiles.map((i) => (
            <div 
              key={`config-${i}`}
              className="skeleton-tile-gray" 
              style={{ 
                aspectRatio: '1 / 1',
                minHeight: '120px',
                animationDelay: `${(peopleTiles.length + i + 1) * 100}ms`
              }}
            />
          ))}

        </div>
      </div>
    </div>
  )
}

export default DashboardSkeleton
