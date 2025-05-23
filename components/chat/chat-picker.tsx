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
}: {
  models: any[]
  selectedModel?: string
  onSelectedModelChange?: (id: string) => void
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

  return (
    <div className="flex items-center space-x-2">
      <div className="flex flex-col">
        <Select
          name="languageModel"
          value={selectedModel}
          onValueChange={onSelectedModelChange}
        >
          <SelectTrigger className="whitespace-nowrap border-none shadow-none focus:ring-0 px-0 py-0 h-6 text-xs rounded-lg">
            <SelectValue placeholder="Select Model" />
          </SelectTrigger>
          <SelectContent className="rounded-lg">
            {Object.entries(groupedModels).map(([provider, models]: any) => (
              <SelectGroup key={provider}>
                <SelectLabel>{provider}</SelectLabel>
                {models?.map((model: any) => (
                  <SelectItem key={model.id} value={model.id} className="rounded-md">
                    {model.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
} 