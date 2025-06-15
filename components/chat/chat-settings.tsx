import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
} from '../ui/dropdown-menu'
import { Input } from '../ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Settings2 } from 'lucide-react'

interface LanguageModelConfig {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export function ChatSettings({
  languageModel,
  onLanguageModelChange,
}: {
  languageModel: LanguageModelConfig
  onLanguageModelChange: (model: Partial<LanguageModelConfig>) => void
}) {
  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground h-6 w-6 rounded-sm">
                <Settings2 className="h-4 w-4" />
              </Button>
          </TooltipTrigger>
          <TooltipContent>LLM settings</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="start" className="p-2 space-y-2 w-56">
        <span className="text-sm font-medium px-2">Parameters</span>
        <div className="flex space-x-4 items-center justify-between px-2">
          <span className="text-sm flex-1 text-muted-foreground">
            Output tokens
          </span>
          <Input
            type="number"
            defaultValue={languageModel.maxTokens}
            min={50}
            max={10000}
            step={1}
            className="h-6 rounded-sm w-[84px] text-xs text-center tabular-nums"
            placeholder="Auto"
            onChange={(e) =>
              onLanguageModelChange({
                maxTokens: parseFloat(e.target.value) || undefined,
              })
            }
          />
        </div>
        <div className="flex space-x-4 items-center justify-between px-2">
          <span className="text-sm flex-1 text-muted-foreground">
            Temperature
          </span>
          <Input
            type="number"
            defaultValue={languageModel.temperature}
            min={0}
            max={5}
            step={0.01}
            className="h-6 rounded-sm w-[84px] text-xs text-center tabular-nums"
            placeholder="Auto"
            onChange={(e) =>
              onLanguageModelChange({
                temperature: parseFloat(e.target.value) || undefined,
              })
            }
          />
        </div>
        <div className="flex space-x-4 items-center justify-between px-2">
          <span className="text-sm flex-1 text-muted-foreground">Top P</span>
          <Input
            type="number"
            defaultValue={languageModel.topP}
            min={0}
            max={1}
            step={0.01}
            className="h-6 rounded-sm w-[84px] text-xs text-center tabular-nums"
            placeholder="Auto"
            onChange={(e) =>
              onLanguageModelChange({
                topP: parseFloat(e.target.value) || undefined,
              })
            }
          />
        </div>
        <div className="flex space-x-4 items-center justify-between px-2">
          <span className="text-sm flex-1 text-muted-foreground">Top K</span>
          <Input
            type="number"
            defaultValue={languageModel.topK}
            min={0}
            max={500}
            step={1}
            className="h-6 rounded-sm w-[84px] text-xs text-center tabular-nums"
            placeholder="Auto"
            onChange={(e) =>
              onLanguageModelChange({
                topK: parseFloat(e.target.value) || undefined,
              })
            }
          />
        </div>
        <div className="flex space-x-4 items-center justify-between px-2">
          <span className="text-sm flex-1 text-muted-foreground">
            Frequence penalty
          </span>
          <Input
            type="number"
            defaultValue={languageModel.frequencyPenalty}
            min={0}
            max={2}
            step={0.01}
            className="h-6 rounded-sm w-[84px] text-xs text-center tabular-nums"
            placeholder="Auto"
            onChange={(e) =>
              onLanguageModelChange({
                frequencyPenalty: parseFloat(e.target.value) || undefined,
              })
            }
          />
        </div>
        <div className="flex space-x-4 items-center justify-between px-2">
          <span className="text-sm flex-1 text-muted-foreground">
            Presence penalty
          </span>
          <Input
            type="number"
            defaultValue={languageModel.presencePenalty}
            min={0}
            max={2}
            step={0.01}
            className="h-6 rounded-sm w-[84px] text-xs text-center tabular-nums"
            placeholder="Auto"
            onChange={(e) =>
              onLanguageModelChange({
                presencePenalty: parseFloat(e.target.value) || undefined,
              })
            }
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}