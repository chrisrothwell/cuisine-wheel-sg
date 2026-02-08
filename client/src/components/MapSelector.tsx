import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Sphere,
  Graticule
} from "react-simple-maps";
import { geoInterpolate, geoCentroid } from "d3-geo";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { type Country } from "../../../drizzle/schema";
import { type CountryWithDisplay } from "@/hooks/useCountries";

const geoUrl = "/world.json";
const SG_COORDS: [number, number] = [103.8198, 1.3521];
const INITIAL_MAP_CONFIG = { center: [103.8198, 1.3521] as [number, number], scale: 280 };

interface MapSelectorProps {
  countries: CountryWithDisplay[];
  onCountrySelected: (country: CountryWithDisplay) => void;
  isSpinning: boolean;
}

export default function MapSelector({ countries, onCountrySelected, isSpinning }: MapSelectorProps) {
  // Helper function to validate and sanitize map config
  const validateMapConfig = (config: { center?: [number, number] | number[]; scale?: number }): { center: [number, number]; scale: number } => {
    const center = config.center || [103.8198, 1.3521];
    const scale = config.scale || 280;
    
    // Ensure center is an array with at least 2 elements
    const [lon, lat] = Array.isArray(center) && center.length >= 2 ? center : [103.8198, 1.3521];
    
    // Ensure coordinates are valid numbers (not NaN or Infinity)
    const validLon = typeof lon === 'number' && isFinite(lon) ? lon : 103.8198;
    const validLat = typeof lat === 'number' && isFinite(lat) ? lat : 1.3521;
    const validScale = typeof scale === 'number' && isFinite(scale) && scale > 0 ? scale : 280;
    
    return {
      center: [validLon, validLat] as [number, number],
      scale: validScale,
    };
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<CountryWithDisplay | null>(null);
  const [rotationOffset, setRotationOffset] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  
  // State to hold the dynamically calculated coordinates of the winner
  const [winnerCoords, setWinnerCoords] = useState<[number, number] | null>(null);
  
  // Ref to store geographies data for centroid calculation
  const geographiesRef = useRef<any[]>([]);
  // Ref to track which country we've calculated coordinates for
  const calculatedCountryRef = useRef<CountryWithDisplay | null>(null);
  // Ref to track if we need to reset on next spin
  const needsResetRef = useRef(false);
  // Ref to track the current spin cycle - prevents old coords from triggering zoom
  const spinCycleRef = useRef(0);
  // Ref to track if we've already zoomed and called callback for this country
  const hasZoomedForCountryRef = useRef<string | null>(null);
  // Ref to track if we've tried the fallback flag
  const flagFallbackTriedRef = useRef<string | null>(null);
  
  const [mapConfig, setMapConfig] = useState(() => validateMapConfig(INITIAL_MAP_CONFIG));

  // Track prop changes
  useEffect(() => {
    console.log('[MapSelector] Props updated - isSpinning:', isSpinning, 'countries count:', countries.length, 'selectedCountry:', selectedCountry?.name);
  }, [isSpinning, countries.length, selectedCountry]);

  // 1. Visual Scan Logic + Reset on new spin
  useEffect(() => {
    console.log('[MapSelector] Effect #1 triggered - isSpinning:', isSpinning, 'needsReset:', needsResetRef.current);
    
    let interval: NodeJS.Timeout;
    let timer: NodeJS.Timeout;
    let rotationInterval: NodeJS.Timeout;
    
    if (isSpinning) {
      console.log('[MapSelector] Spinning started, needsReset:', needsResetRef.current);
      
      // Increment spin cycle to invalidate any pending zoom from previous spin
      spinCycleRef.current += 1;
      const currentCycle = spinCycleRef.current;
      console.log('[MapSelector] New spin cycle:', currentCycle);
      
      // Start globe rotation
      rotationInterval = setInterval(() => {
        setRotationOffset(prev => prev + 4); // Rotate 4 degrees each frame for faster spin
      }, 16); // ~60fps
      
      // If we've zoomed before, reset the map position immediately
      if (needsResetRef.current) {
        console.log('[MapSelector] Resetting map to initial position');
        setMapConfig(validateMapConfig(INITIAL_MAP_CONFIG));
        setRotationOffset(0); // Reset rotation
        needsResetRef.current = false;
      }
      
      // Clear state to start fresh spin
      setSelectedCountry(null);
      setWinnerCoords(null);
      calculatedCountryRef.current = null;
      hasZoomedForCountryRef.current = null; // Reset zoom tracker
      flagFallbackTriedRef.current = null; // Reset flag fallback tracker
      setIsZooming(false);
      
      interval = setInterval(() => {
        const newIndex = Math.floor(Math.random() * countries.length);
        setCurrentIndex(newIndex);
      }, 200); // Faster country scanning

      const spinDuration = 3000;
      timer = setTimeout(() => {
        clearInterval(interval);
        clearInterval(rotationInterval); // Stop rotation
        
        const randomIndex = Math.floor(Math.random() * countries.length);
        const winner = countries[randomIndex];
        
        console.log('[MapSelector] Winner selected:', winner.name, 'at index', randomIndex, 'cycle:', currentCycle);
        setCurrentIndex(randomIndex);
        setSelectedCountry(winner);
      }, spinDuration);
    } else {
      console.log('[MapSelector] Not spinning, effect #1 doing nothing');
    }
    
    return () => {
      if (interval) clearInterval(interval);
      if (timer) clearTimeout(timer);
      if (rotationInterval) clearInterval(rotationInterval);
    };
  }, [isSpinning, countries]);

  // 2. Calculate winner coordinates when selectedCountry changes
  useEffect(() => {
    if (selectedCountry && geographiesRef.current.length > 0) {
      // Only calculate if we haven't already calculated for this country
      if (calculatedCountryRef.current?.code !== selectedCountry.code) {
        console.log('[MapSelector] Calculating coordinates for:', selectedCountry.name, 'code:', selectedCountry.code, 'cycle:', spinCycleRef.current);
        // Try alpha-3 first (most common in geography data)
        let matchingGeo = geographiesRef.current.find(
          (geo) => geo.id === selectedCountry.alpha3
        );
        
        // Fallback to alpha-2 if alpha-3 doesn't match
        if (!matchingGeo) {
          matchingGeo = geographiesRef.current.find(
            (geo) => geo.id === selectedCountry.alpha2
          );
        }
        
        if (matchingGeo) {
          const centroid = geoCentroid(matchingGeo);
          console.log('[MapSelector] Centroid calculated:', centroid, 'for cycle:', spinCycleRef.current, 'matched by:', matchingGeo.id);
          setWinnerCoords(centroid as [number, number]);
          calculatedCountryRef.current = selectedCountry;
        } else {
          console.warn('[MapSelector] No matching geography found for country:', selectedCountry.name, 'alpha2:', selectedCountry.alpha2, 'alpha3:', selectedCountry.alpha3);
          // Fallback to Malaysia if country not found
          const fallbackGeo = geographiesRef.current.find(
            (geo) => geo.id === "MYS" || geo.id === "MY"
          );
          if (fallbackGeo) {
            const centroid = geoCentroid(fallbackGeo);
            console.log('[MapSelector] Centroid calculated (fallback to Malaysia):', centroid);
            setWinnerCoords(centroid as [number, number]);
            calculatedCountryRef.current = selectedCountry;
          }
        }
      }
    } else if (!selectedCountry) {
      // Reset when selectedCountry is cleared
      console.log('[MapSelector] Selected country cleared, resetting coordinates');
      calculatedCountryRef.current = null;
    }
  }, [selectedCountry]);

  // 3. Animated Zoom Handler (triggered once winnerCoords are found)
  useEffect(() => {
    // Validate winnerCoords before using
    if (!winnerCoords || !Array.isArray(winnerCoords) || winnerCoords.length < 2) {
      return;
    }
    
    const [lon, lat] = winnerCoords;
    if (typeof lon !== 'number' || typeof lat !== 'number' || !isFinite(lon) || !isFinite(lat)) {
      console.warn('[MapSelector] Invalid winnerCoords:', winnerCoords);
      return;
    }
    
    if (selectedCountry) {
      console.log('[MapSelector] Zoom effect triggered for:', selectedCountry.name, 'coords:', winnerCoords, 'cycle:', spinCycleRef.current);
      
      // Only zoom once per country
      if (hasZoomedForCountryRef.current === selectedCountry.code) {
        console.log('[MapSelector] Already zoomed for this country, skipping');
        return;
      }
      
      // Only zoom if this selectedCountry was set in the current spin cycle
      if (calculatedCountryRef.current?.code === selectedCountry.code) {
        console.log('[MapSelector] Starting animated zoom to:', selectedCountry.name);
        setIsZooming(true);
        hasZoomedForCountryRef.current = selectedCountry.code;
        
        // Animate the zoom over 2 seconds
        const startConfig = validateMapConfig(mapConfig);
        const endConfig = validateMapConfig({ center: winnerCoords, scale: 600 });
        const startRotation = rotationOffset;
        
        const duration = 2000; // 2 seconds
        const startTime = Date.now();
        
        const animateZoom = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Easing function for smooth animation
          const easeInOutCubic = (t: number) => 
            t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          
          const easedProgress = easeInOutCubic(progress);
          
          // Interpolate center with validation
          const centerLon = startConfig.center[0] + (endConfig.center[0] - startConfig.center[0]) * easedProgress;
          const centerLat = startConfig.center[1] + (endConfig.center[1] - startConfig.center[1]) * easedProgress;
          
          // Interpolate scale
          const scale = startConfig.scale + (endConfig.scale - startConfig.scale) * easedProgress;
          
          // Validate and set the new config
          const newConfig = validateMapConfig({ center: [centerLon, centerLat] as [number, number], scale });
          setMapConfig(newConfig);
          
          // Smoothly adjust rotation to match the target
          const targetRotation = 0; // Stop rotation when zoomed
          const rotation = startRotation + (targetRotation - startRotation) * easedProgress;
          setRotationOffset(rotation);
          
          if (progress < 1) {
            requestAnimationFrame(animateZoom);
          } else {
            setIsZooming(false);
            needsResetRef.current = true;
            onCountrySelected(selectedCountry);
          }
        };
        
        requestAnimationFrame(animateZoom);
      } else {
        console.log('[MapSelector] Skipping zoom - country from previous spin cycle');
      }
    }
  }, [winnerCoords, selectedCountry, onCountrySelected]);

  // 4. Curved flight path using dynamically calculated centroid
  const flightPath = useMemo(() => {
    if (!winnerCoords) return [];
    const interpolate = geoInterpolate(SG_COORDS, winnerCoords);
    return Array.from({ length: 50 }, (_, i) => interpolate(i / 50));
  }, [winnerCoords]);

  return (
    <div className="relative w-full h-[600px] bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
      <div className="w-full h-full">
        <ComposableMap
          projection="geoOrthographic"
          projectionConfig={{
            rotate: [
              -(mapConfig.center?.[0] ?? 20) - rotationOffset, 
              -(mapConfig.center?.[1] ?? 0), 
              0
            ],
            scale: mapConfig.scale ?? 140,
          }}
          className="w-full h-full"
        >
          <Sphere stroke="#064e3b" strokeWidth={0.5} fill="transparent" id="sphere" />
          <Graticule stroke="#064e3b" strokeWidth={0.3} />
          
          <Geographies geography={geoUrl}>
            {({ geographies }) => {
              // Store geographies in ref for centroid calculation
              if (geographiesRef.current.length !== geographies.length) {
                console.log('[MapSelector] Geographies loaded:', geographies.length, 'countries');
              }
              geographiesRef.current = geographies;
              
              return geographies.map((geo) => {
                // Determine if this is the chosen winner (show as soon as selectedCountry is set)
                // Match by alpha-3 or alpha-2 (geo.id is typically ISO alpha-3 or alpha-2)
                const isWinner = selectedCountry && (
                  selectedCountry.alpha3 === geo.id || 
                  selectedCountry.alpha2 === geo.id
                );
                
                // Determine if this specific polygon is the one being "scanned" (only if no winner yet)
                // Match by alpha-3 or alpha-2
                const currentCountry = countries[currentIndex];
                const isScanning = isSpinning && !selectedCountry && currentCountry && (
                  currentCountry.alpha3 === geo.id || 
                  currentCountry.alpha2 === geo.id
                );

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isWinner ? "#ec4899" : isScanning ? "#6366f1" : "#065f46"}
                    stroke="#047857"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none", transition: "fill 0.3s" },
                      hover: { outline: "none", fill: "#334155" },
                    }}
                  />
                );
              });
            }}
          </Geographies>
        </ComposableMap>
      </div>

      {/* Flag & Result UI */}
      <AnimatePresence>
        {selectedCountry && winnerCoords && !isZooming && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
          >
            {/* Flag SVG from flagcdn.com - uses ISO 3166-1 alpha-2 code (lowercase) */}
            <div className="w-48 h-32 rounded-lg overflow-hidden shadow-2xl border-4 border-pink-500/30 drop-shadow-[0_0_30px_rgba(236,72,153,0.6)]">
              <img
                src={`https://flagcdn.com/${selectedCountry.alpha2.toLowerCase()}.svg`}
                alt={`${selectedCountry.name} flag`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Only try fallback once per country
                  if (flagFallbackTriedRef.current !== selectedCountry.alpha2) {
                    flagFallbackTriedRef.current = selectedCountry.alpha2;
                    // Use flagsapi.com as fallback - uses ISO 3166-1 alpha-2 code (uppercase)
                    e.currentTarget.src = `https://flagsapi.com/${selectedCountry.alpha2.toUpperCase()}/flat/64.png`;
                  }
                }}
              />
            </div>
            
            {/* Country name */}
            <div className="bg-slate-900/90 backdrop-blur-md px-8 py-3 rounded-full border border-pink-500/40 shadow-2xl">
              <h2 className="text-white text-3xl font-bold tracking-tight">
                {selectedCountry.name}
              </h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanning HUD - only show while spinning and no winner selected yet */}
      {isSpinning && !selectedCountry && (
        <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/40 backdrop-blur px-4 py-2 rounded-lg border border-indigo-500/30">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
          <span className="text-indigo-300 font-mono text-xs uppercase tracking-widest">
            Scanning: {countries[currentIndex]?.name}
          </span>
        </div>
      )}
    </div>
  );
}