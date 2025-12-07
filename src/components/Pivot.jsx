import { useState, useRef, useEffect } from 'react'
import '../styles/pivot.css'

function Item({ children }) {
  return children
}

export default function Pivot({ children, defaultIndex = 0 }) {
  const items = Array.isArray(children) ? children : [children]
  const [index, setIndex] = useState(defaultIndex)
  const containerRef = useRef(null)
  const headersRef = useRef(null)
  const startX = useRef(0)
  const dragging = useRef(false)

  const updateHeadersPosition = (activeIndex) => {
    const headers = headersRef.current
    if (!headers) return
    
    const buttons = headers.querySelectorAll('.pivot__header')
    const activeButton = buttons[activeIndex]
    if (!activeButton) return
    
    const offset = activeButton.offsetLeft - 16
    headers.scrollTo({ left: offset, behavior: 'smooth' })
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    
    const getX = (e) => e.touches?.[0]?.clientX ?? e.clientX
    
    const onStart = (e) => {
      if (e.target.closest('.pivot__header')) return
      dragging.current = true
      startX.current = getX(e)
    }
    
    const onMove = (e) => {
      if (!dragging.current) return
      const dx = getX(e) - startX.current
      
      if (Math.abs(dx) < 5) return
      
      const dragPercent = (dx / el.offsetWidth) * 100
      
      el.style.transition = 'none'
      el.style.transform = `translateX(${-index * 100 + dragPercent}%)`
    }
    
    const onEnd = () => {
      if (!dragging.current) return
      dragging.current = false
      const finalX = parseFloat(el.style.transform.match(/-?\d+\.?\d*/)?.[0] || -index * 100)
      const moved = Math.abs(finalX + index * 100)
      
      el.style.transition = ''
      
      if (moved > 20) {
        if (finalX < -index * 100 && index < items.length - 1) {
          setIndex(index + 1)
          return
        } else if (finalX > -index * 100 && index > 0) {
          setIndex(index - 1)
          return
        }
      }
      
      el.style.transform = `translateX(${-index * 100}%)`
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('mousedown', onStart)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)

    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('mousedown', onStart)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
    }
  }, [index, items.length])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    
    el.style.transform = `translateX(${-index * 100}%)`
    updateHeadersPosition(index)
    
    window.scrollTo(0, 0)
  }, [index])

  return (
    <div className="pivot">
      <div className="pivot__headers" role="tablist" ref={headersRef}>
        {items.map((child, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === index}
            className={`pivot__header ${i === index ? 'pivot__header--active' : ''}`}
            onClick={() => setIndex(i)}
          >
            {child.props.title}
          </button>
        ))}
      </div>

      <div className="pivot__viewport">
        <div className="pivot__track" ref={containerRef}>
          {items.map((child, i) => (
            <div key={i} className="pivot__panel">
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

Pivot.Item = Item
