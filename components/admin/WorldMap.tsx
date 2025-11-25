'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Country coordinates
const countryCoords: { [key: string]: [number, number] } = {
  'United States': [37.0902, -95.7129],
  'USA': [37.0902, -95.7129],
  'US': [37.0902, -95.7129],
  'India': [20.5937, 78.9629],
  'IN': [20.5937, 78.9629],
  'United Kingdom': [55.3781, -3.4360],
  'UK': [55.3781, -3.4360],
  'GB': [55.3781, -3.4360],
  'Canada': [56.1304, -106.3468],
  'CA': [56.1304, -106.3468],
  'Australia': [-25.2744, 133.7751],
  'AU': [-25.2744, 133.7751],
  'Germany': [51.1657, 10.4515],
  'DE': [51.1657, 10.4515],
  'France': [46.2276, 2.2137],
  'FR': [46.2276, 2.2137],
  'Brazil': [-14.2350, -47.9292],
  'BR': [-14.2350, -47.9292],
  'Japan': [36.2048, 138.2529],
  'JP': [36.2048, 138.2529],
  'China': [35.8617, 104.1954],
  'CN': [35.8617, 104.1954],
  'Mexico': [23.6345, -102.5528],
  'MX': [23.6345, -102.5528],
  'Spain': [40.4637, -3.7492],
  'ES': [40.4637, -3.7492],
  'Italy': [41.8719, 12.5674],
  'IT': [41.8719, 12.5674],
  'Netherlands': [52.1326, 5.2913],
  'NL': [52.1326, 5.2913],
}

interface Location {
  country: string
  count: number
  percentage: number
}

interface WorldMapProps {
  locations: Location[]
}

export default function WorldMap({ locations }: WorldMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    // Initialize map
    mapInstance.current = L.map(mapRef.current).setView([20, 0], 2)

    // Add OpenStreetMap tiles (FREE!)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current)

    // Add markers for each location
    locations.forEach(location => {
      const coords = countryCoords[location.country]
      if (coords && mapInstance.current) {
        // Create custom marker
        const markerSize = Math.max(15, Math.min(location.count * 5, 50))
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            background: linear-gradient(135deg, #8b5cf6, #6366f1);
            width: ${markerSize}px;
            height: ${markerSize}px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: ${markerSize > 30 ? '14px' : '10px'};
          ">${location.count}</div>`,
          iconSize: [markerSize, markerSize],
        })

        // Add marker with popup
        L.marker(coords, { icon: customIcon })
          .bindPopup(`
            <div style="padding: 8px; font-family: sans-serif;">
              <strong style="font-size: 14px; color: #1e293b;">${location.country}</strong><br/>
              <span style="font-size: 16px; font-weight: bold; color: #8b5cf6;">${location.count}</span> 
              <span style="font-size: 12px; color: #64748b;">users (${location.percentage}%)</span>
            </div>
          `)
          .addTo(mapInstance.current)
      }
    })

    return () => {
      mapInstance.current?.remove()
      mapInstance.current = null
    }
  }, [locations])

  return <div ref={mapRef} className="w-full h-full" />
}