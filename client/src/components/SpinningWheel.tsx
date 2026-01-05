import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { Country } from "../../../drizzle/schema";

interface SpinningWheelProps {
  countries: Country[];
  onCountrySelected: (country: Country) => void;
}

export default function SpinningWheel({ countries, onCountrySelected }: SpinningWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const spinWheel = () => {
    if (isSpinning || countries.length === 0) return;

    setIsSpinning(true);
    setSelectedCountry(null);

    // Random number of full rotations (5-10) plus random angle
    const fullRotations = 5 + Math.floor(Math.random() * 5);
    const randomAngle = Math.floor(Math.random() * 360);
    const totalRotation = rotation + fullRotations * 360 + randomAngle;

    setRotation(totalRotation);

    // Calculate which country was selected
    setTimeout(() => {
      const normalizedAngle = totalRotation % 360;
      const segmentAngle = 360 / countries.length;
      const selectedIndex = Math.floor((360 - normalizedAngle) / segmentAngle) % countries.length;
      const selected = countries[selectedIndex];
      
      setSelectedCountry(selected);
      setIsSpinning(false);
      onCountrySelected(selected);
    }, 4000);
  };

  const segmentAngle = 360 / countries.length;

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Wheel container */}
      <div className="relative">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20">
          <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[30px] border-t-primary neon-border-pink" />
        </div>

        {/* Wheel */}
        <div
          ref={wheelRef}
          className="relative w-[400px] h-[400px] rounded-full border-4 border-primary neon-border-pink overflow-hidden"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
          }}
        >
          {/* Wheel segments */}
          {countries.map((country, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = (index + 1) * segmentAngle;
            const midAngle = (startAngle + endAngle) / 2;
            
            // Alternate colors for segments
            const bgColor = index % 2 === 0 ? "bg-card" : "bg-muted/50";
            
            return (
              <div
                key={country.id}
                className={`absolute w-full h-full ${bgColor}`}
                style={{
                  clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((startAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle - 90) * Math.PI / 180)}%, ${50 + 50 * Math.cos((endAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((endAngle - 90) * Math.PI / 180)}%)`,
                }}
              >
                <div
                  className="absolute top-1/2 left-1/2 origin-center"
                  style={{
                    transform: `rotate(${midAngle}deg) translateY(-120px)`,
                  }}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">{country.flagEmoji}</div>
                    <div className="text-xs font-bold text-foreground uppercase tracking-wider whitespace-nowrap">
                      {country.cuisineType}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent neon-border-pink flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
      </div>

      {/* Spin button */}
      <Button
        size="lg"
        onClick={spinWheel}
        disabled={isSpinning || countries.length === 0}
        className="text-lg px-8 py-6 neon-border-cyan"
      >
        <Sparkles className="w-5 h-5 mr-2" />
        {isSpinning ? "Spinning..." : "Spin the Wheel"}
      </Button>

      {/* Selected result */}
      {selectedCountry && !isSpinning && (
        <div className="hud-frame p-6 bg-card border border-primary text-center animate-in fade-in zoom-in duration-500">
          <div className="text-5xl mb-3">{selectedCountry.flagEmoji}</div>
          <h3 className="text-2xl font-bold neon-pink mb-2">{selectedCountry.cuisineType}</h3>
          <p className="text-muted-foreground">{selectedCountry.description}</p>
        </div>
      )}
    </div>
  );
}
