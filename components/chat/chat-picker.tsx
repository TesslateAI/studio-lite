import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function ChatPicker({
  models,
  selectedModel,
  onSelectedModelChange,
  userPlan = 'free',
}: {
  models: any[]
  selectedModel?: string
  onSelectedModelChange?: (id: string) => void
  userPlan?: 'free' | 'pro'
}) {
  // Polyfill for groupBy
  function groupBy(array: any[], keyFn: (item: any) => string) {
    return array.reduce((result, item) => {
      const key = keyFn(item);
      if (!result[key]) result[key] = [];
      result[key].push(item);
      return result;
    }, {} as Record<string, any[]>);
  }

  const groupedModels = groupBy(models, ({ provider }) => provider);

  const selectedModelObj = models.find((m: any) => m.id === selectedModel);

  return (
    <div className="flex items-center space-x-2">
      <div className="flex flex-col">
        <Select
          name="languageModel"
          value={selectedModel}
          onValueChange={onSelectedModelChange}
        >
          <SelectTrigger className="whitespace-nowrap border-none shadow-none focus:ring-0 px-0 py-0 h-6 text-xs rounded-lg">
            <SelectValue>{selectedModelObj ? selectedModelObj.name : 'Select Model'}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-lg">
            {Object.entries(groupedModels).map(([provider, models]: any) => (
              <SelectGroup key={provider}>
                <SelectLabel>{provider}</SelectLabel>
                {models?.map((model: any) => {
                  const isPro = model.access === 'pro';
                  const isDisabled = isPro && userPlan !== 'pro';
                  return (
                    <SelectItem
                      key={model.id}
                      value={model.id}
                      className={`rounded-md flex flex-row items-center justify-between w-full ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}
                      disabled={isDisabled}
                    >
                      <span className="font-medium truncate">{model.name}</span>
                      <span className={`text-xs ml-2 ${isPro ? 'text-green-600' : 'text-gray-500'}`}>{isPro ? 'Pro' : 'Free'}</span>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
} 