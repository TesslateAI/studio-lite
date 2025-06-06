import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Model } from '@/lib/types';

type Plan = 'free' | 'plus' | 'pro';

export function ChatPicker({
  models,
  selectedModel,
  onSelectedModelChange,
  userPlan = 'free',
}: {
  models: Model[]
  selectedModel?: string
  onSelectedModelChange?: (id: string) => void
  userPlan?: Plan
}) {
  function groupBy<T, K extends keyof any>(array: T[], keyFn: (item: T) => K): Record<K, T[]> {
    return array.reduce((result, item) => {
      const key = keyFn(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
      return result;
    }, {} as Record<K, T[]>);
  }

  const groupedModels = groupBy(models, ({ provider }) => provider);

  const selectedModelObj = models.find(m => m.id === selectedModel);
  const planRank: Record<Plan, number> = { free: 0, plus: 1, pro: 2 };
  const userPlanLevel = planRank[userPlan];

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
            {Object.entries(groupedModels).map(([provider, providerModels]) => (
              <SelectGroup key={provider}>
                <SelectLabel>{provider}</SelectLabel>
                {providerModels.map((model) => {
                  const modelAccess = model.access || 'free';
                  const requiredPlanLevel = planRank[modelAccess] ?? 0;
                  const isDisabled = userPlanLevel < requiredPlanLevel;

                  const getPlanStyle = (plan: string) => {
                    switch(plan) {
                      case 'pro': return { text: 'Pro', color: 'text-green-600' };
                      case 'plus': return { text: 'Plus', color: 'text-blue-600' };
                      default: return { text: 'Free', color: 'text-gray-500' };
                    }
                  };

                  const planStyle = getPlanStyle(modelAccess);
                  return (
                    <SelectItem
                      key={model.id}
                      value={model.id}
                      className={`rounded-md flex flex-row items-center justify-between w-full ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}
                      disabled={isDisabled}
                    >
                      <span className="font-medium truncate">{model.name}</span>
                      <span className={`text-xs ml-2 ${planStyle.color}`}>{planStyle.text}</span>
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