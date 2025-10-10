// app/quick-study/outputs/viewers/components/ContentMorphingPanel.tsx
import React, { useState, useCallback } from 'react'
import { Sliders, Sparkles, Zap, Save } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'

interface ContentMorphingPanelProps {
  onGenerate: (params: MorphingParams) => void
  onSave: () => void
  hasChanges: boolean
  isProcessing: boolean
  disabled?: boolean
}

export interface MorphingParams {
  density: number  // 1-5 (1=zwięzły, 5=rozbudowany)
  tone: 'formal' | 'casual' | 'explanatory' | 'academic' | 'technical'
}

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal', emoji: '🎩' },
  { value: 'casual', label: 'Casual', emoji: '😊' },
  { value: 'explanatory', label: 'Explanatory', emoji: '💡' },
  { value: 'academic', label: 'Academic', emoji: '🎓' },
  { value: 'technical', label: 'Technical', emoji: '⚙️' }
] as const

const DENSITY_LABELS = [
  'Minimal', 'Concise', 'Balanced', 'Detailed', 'Comprehensive'
]

export function ContentMorphingPanel({ onGenerate, onSave, hasChanges, isProcessing, disabled = false }: ContentMorphingPanelProps) {
  // Slider states - NO debouncing, manual trigger only
  const [density, setDensity] = useState<number>(3) // Default: Balanced
  const [tone, setTone] = useState<MorphingParams['tone']>('explanatory') // Default

  // Density slider handlers
  const handleDensityChange = useCallback((value: number[]) => {
    setDensity(value[0])
    console.log('🎛️ Density changed to:', value[0], '-', DENSITY_LABELS[value[0] - 1])
  }, [])

  // Tone selector handlers  
  const handleToneChange = useCallback((newTone: MorphingParams['tone']) => {
    setTone(newTone)
    console.log('🎛️ Tone changed to:', newTone)
  }, [])

  // Generate button handler
  const handleGenerate = useCallback(() => {
    const params: MorphingParams = { density, tone }
    console.log('🚀 Generate clicked with params:', params)
    onGenerate(params)
  }, [density, tone, onGenerate])

  // Check if settings are at default (to show/hide generate button state)
  const isDefault = density === 3 && tone === 'explanatory'

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
      
      {/* Header with Generate Button */}
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Content Tuning
          </span>
        </div>
        
        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={disabled || isProcessing}
          size="sm"
          className={`h-7 text-xs flex items-center gap-1.5 ${
            isDefault 
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <Zap className="h-3 w-3" />
          {isProcessing ? 'Generating...' : 'Generate'}
        </Button>
      </div>

      {/* Sliders Container - NO auto-triggering */}
      <div className="px-3 pb-3 space-y-4">
        
        {/* Density Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Density
            </label>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              {DENSITY_LABELS[density - 1]}
            </span>
          </div>
          
          <div className="relative">
            <Slider
              value={[density]}
              onValueChange={handleDensityChange}
              min={1}
              max={5}
              step={1}
              disabled={disabled || isProcessing}
              className="w-full"
            />
            
            {/* Density labels */}
            <div className="flex justify-between mt-1 text-xs text-gray-400 dark:text-gray-600">
              <span>Minimal</span>
              <span>Balanced</span>
              <span>Rich</span>
            </div>
          </div>
        </div>

        {/* Tone Selector with Save Button */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Tone
          </label>
          
          <div className="flex items-center justify-between gap-2">
            {/* Tone buttons on the left */}
            <div className="flex items-center gap-1 flex-wrap">
              {TONE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={tone === option.value ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleToneChange(option.value)}
                  disabled={disabled || isProcessing}
                  className="h-7 text-xs flex items-center gap-1.5 px-2"
                >
                  <span>{option.emoji}</span>
                  <span>{option.label}</span>
                </Button>
              ))}
            </div>
            
            {/* Save Button - on the same row, far right */}
            {hasChanges && (
              <Button
                onClick={onSave}
                disabled={disabled}
                size="sm"
                variant="default"
                className="h-7 text-xs flex items-center gap-1.5 px-3 flex-shrink-0"
              >
                <Save className="h-3 w-3" />
                Save Changes
              </Button>
            )}
          </div>
        </div>

        {/* Current Settings Display */}
        <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center justify-between pt-1 border-t border-gray-200 dark:border-gray-700">
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
            Original format preserved
          </span>
          <span>
            {DENSITY_LABELS[density - 1]} • {TONE_OPTIONS.find(t => t.value === tone)?.emoji} {tone}
          </span>
        </div>
      </div>
    </div>
  )
}