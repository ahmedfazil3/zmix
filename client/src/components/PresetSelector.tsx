import { Zap, Scale, Shield, Moon } from 'lucide-react';
import { Card } from '@/components/ui/card';

export type MixerPreset = 'fast' | 'balanced' | 'max_privacy' | 'stealth';

interface PresetConfig {
  id: MixerPreset;
  name: string;
  description: string;
  icon: typeof Zap;
  hops: string;
  time: string;
  privacy: 'Low' | 'Medium' | 'High' | 'Maximum';
  iconColor: string;
  borderColor: string;
}

const PRESETS: PresetConfig[] = [
  {
    id: 'fast',
    name: 'Fast',
    description: 'Quick mixing for smaller amounts',
    icon: Zap,
    hops: '2-3 hops',
    time: '~30 seconds',
    privacy: 'Medium',
    iconColor: 'text-yellow-500',
    borderColor: 'border-yellow-500/50',
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Good privacy without long waits',
    icon: Scale,
    hops: '2-4 hops',
    time: '~1 minute',
    privacy: 'High',
    iconColor: 'text-blue-500',
    borderColor: 'border-blue-500/50',
  },
  {
    id: 'max_privacy',
    name: 'Max Privacy',
    description: 'Aggressive mixing with complex routing',
    icon: Shield,
    hops: '3-5 hops',
    time: '~2 minutes',
    privacy: 'Maximum',
    iconColor: 'text-green-500',
    borderColor: 'border-green-500/50',
  },
  {
    id: 'stealth',
    name: 'Stealth',
    description: 'Extreme privacy with long delays',
    icon: Moon,
    hops: '4-6 hops',
    time: 'Hours',
    privacy: 'Maximum',
    iconColor: 'text-purple-500',
    borderColor: 'border-purple-500/50',
  },
];

interface PresetSelectorProps {
  selected: MixerPreset;
  onSelect: (preset: MixerPreset) => void;
}

export function PresetSelector({ selected, onSelect }: PresetSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {PRESETS.map((preset) => {
        const Icon = preset.icon;
        const isSelected = selected === preset.id;
        
        return (
          <Card
            key={preset.id}
            data-testid={`preset-card-${preset.id}`}
            className={`cursor-pointer p-2 transition-all hover-elevate active-elevate-2 ${
              isSelected ? `border-2 ${preset.borderColor}` : 'border'
            }`}
            onClick={() => onSelect(preset.id)}
          >
            <div className="flex flex-col items-center text-center gap-1.5">
              <Icon className={`h-4 w-4 ${preset.iconColor}`} />
              <div className="font-semibold text-xs">{preset.name}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">
                {preset.hops}
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight">
                {preset.time}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
