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
import { motion, AnimatePresence } from "framer-motion";
import { type Country } from "../../../drizzle/schema";

const geoUrl = "https://raw.githubusercontent.com/lotusms/world-map-data/main/world.json";
const SG_COORDS: [number, number] = [103.8198, 1.3521];
const INITIAL_MAP_CONFIG = { center: [20, 0] as [number, number], scale: 140 };

interface MapSelectorProps {
  countries: Country[];
  onCountrySelected: (country: Country) => void;
  isSpinning: boolean;
}

export default function MapSelector({ countries, onCountrySelected, isSpinning }: MapSelectorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  
  // State to hold the dynamically calculated coordinates of the winner
  const [winnerCoords, setWinnerCoords] = useState<[number, number] | null>(null);
  
  // Ref to store geographies data for centroid calculation
  const geographiesRef = useRef<any[]>([]);
  // Ref to track which country we've calculated coordinates for
  const calculatedCountryRef = useRef<Country | null>(null);
  // Ref to track if we need to reset on next spin
  const needsResetRef = useRef(false);
  // Ref to track the current spin cycle - prevents old coords from triggering zoom
  const spinCycleRef = useRef(0);
  // Ref to track if we've already zoomed and called callback for this country
  const hasZoomedForCountryRef = useRef<string | null>(null);
  
  const [mapConfig, setMapConfig] = useState(INITIAL_MAP_CONFIG);

  // Track prop changes
  useEffect(() => {
    console.log('[MapSelector] Props updated - isSpinning:', isSpinning, 'countries count:', countries.length, 'selectedCountry:', selectedCountry?.name);
  }, [isSpinning, countries.length, selectedCountry]);

  // 1. Visual Scan Logic + Reset on new spin
  useEffect(() => {
    console.log('[MapSelector] Effect #1 triggered - isSpinning:', isSpinning, 'needsReset:', needsResetRef.current);
    
    let interval: NodeJS.Timeout;
    let timer: NodeJS.Timeout;
    
    if (isSpinning) {
      console.log('[MapSelector] Spinning started, needsReset:', needsResetRef.current);
      
      // Increment spin cycle to invalidate any pending zoom from previous spin
      spinCycleRef.current += 1;
      const currentCycle = spinCycleRef.current;
      console.log('[MapSelector] New spin cycle:', currentCycle);
      
      // If we've zoomed before, reset the map position immediately
      if (needsResetRef.current) {
        console.log('[MapSelector] Resetting map to initial position');
        setMapConfig(INITIAL_MAP_CONFIG);
        needsResetRef.current = false;
      }
      
      // Clear state to start fresh spin
      setSelectedCountry(null);
      setWinnerCoords(null);
      calculatedCountryRef.current = null;
      hasZoomedForCountryRef.current = null; // Reset zoom tracker
      
      interval = setInterval(() => {
        const newIndex = Math.floor(Math.random() * countries.length);
        setCurrentIndex(newIndex);
      }, 80);

      const spinDuration = 3000;
      timer = setTimeout(() => {
        clearInterval(interval);
        
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
    };
  }, [isSpinning, countries]);

  // 2. Calculate winner coordinates when selectedCountry changes
  useEffect(() => {
    if (selectedCountry && geographiesRef.current.length > 0) {
      // Only calculate if we haven't already calculated for this country
      if (calculatedCountryRef.current?.code !== selectedCountry.code) {
        console.log('[MapSelector] Calculating coordinates for:', selectedCountry.name, 'code:', selectedCountry.code, 'cycle:', spinCycleRef.current);
        const matchingGeo = geographiesRef.current.find(
          (geo) => geo.id === selectedCountry.code
        );
        console.log(matchingGeo);
        if (matchingGeo) {
          const centroid = geoCentroid(matchingGeo);
          console.log('[MapSelector] Centroid calculated:', centroid, 'for cycle:', spinCycleRef.current);
          setWinnerCoords(centroid as [number, number]);
          calculatedCountryRef.current = selectedCountry;
        } else {
          console.warn('[MapSelector] No matching geography found for country code:', selectedCountry.code);
          const matchingGeo = geographiesRef.current.find(
            (geo) => geo.id === "MYS"
          );
          console.log(matchingGeo);
          if (matchingGeo) {
            const centroid = geoCentroid(matchingGeo);
            console.log('[MapSelector] Centroid calculated:', centroid);
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

  // 3. Cinematic Zoom Handler (triggered once winnerCoords are found)
  useEffect(() => {
    if (winnerCoords && selectedCountry) {
      console.log('[MapSelector] Zoom effect triggered for:', selectedCountry.name, 'coords:', winnerCoords, 'cycle:', spinCycleRef.current);
      
      // Only zoom once per country
      if (hasZoomedForCountryRef.current === selectedCountry.code) {
        console.log('[MapSelector] Already zoomed for this country, skipping');
        return;
      }
      
      // Only zoom if this selectedCountry was set in the current spin cycle
      if (calculatedCountryRef.current?.code === selectedCountry.code) {
        console.log('[MapSelector] Zooming to winner coordinates:', winnerCoords, 'for country:', selectedCountry.name);
        setMapConfig({
          center: winnerCoords,
          scale: 600,
        });
        needsResetRef.current = true;
        hasZoomedForCountryRef.current = selectedCountry.code; // Mark as zoomed
        
        // Call the callback
        onCountrySelected(selectedCountry);
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
      <motion.div
        animate={{ 
          x: (isSpinning && !selectedCountry) ? [0, -3, 3, 0] : 0,
        }}
        transition={{ 
          repeat: (isSpinning && !selectedCountry) ? Infinity : 0, 
          duration: 0.2 
        }}
        className="w-full h-full"
      >
        <ComposableMap
          projection="geoOrthographic"
          projectionConfig={{
            rotate: [-mapConfig.center[0], -mapConfig.center[1], 0],
            scale: mapConfig.scale,
          }}
          className="w-full h-full"
        >
          <Sphere stroke="#1e293b" strokeWidth={0.5} fill="transparent" id="sphere" />
          <Graticule stroke="#1e293b" strokeWidth={0.5} />
          
          <Geographies geography={geoUrl}>
            {({ geographies }) => {
              // Store geographies in ref for centroid calculation
              if (geographiesRef.current.length !== geographies.length) {
                console.log('[MapSelector] Geographies loaded:', geographies.length, 'countries');
                console.log(geographies);
              }
              geographiesRef.current = geographies;
              
              return geographies.map((geo) => {
                // Determine if this is the chosen winner (show as soon as selectedCountry is set)
                const isWinner = selectedCountry?.code === geo.id;
                // Determine if this specific polygon is the one being "scanned" (only if no winner yet)
                const isScanning = isSpinning && !selectedCountry && countries[currentIndex]?.code === geo.id;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isWinner ? "#ec4899" : isScanning ? "#6366f1" : "#0f172a"}
                    stroke="#1e293b"
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

          {winnerCoords && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Line
                coordinates={flightPath as any}
                stroke="#ec4899"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray="5,5"
              />
            </motion.g>
          )}
        </ComposableMap>
      </motion.div>

      {/* Flag & Result UI */}
      <AnimatePresence>
        {selectedCountry && winnerCoords && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <div className="text-8xl drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]">
              {selectedCountry.name}
            </div>
            <div className="bg-slate-900/80 backdrop-blur-md px-6 py-2 rounded-full border border-pink-500/30 shadow-xl">
              <h2 className="text-white text-2xl font-bold tracking-tight">
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