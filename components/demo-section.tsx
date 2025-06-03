export default function DemoSection() {
  return (
    <div className="border border-black rounded-lg overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm">👤</div>
        <div className="bg-gray-100 rounded-lg p-3 flex-1">
          <p>Tesslate Designer, generate a UI for my coffee shop business.</p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4">
        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm">✨</div>
        <div className="flex-1">
          <p className="mb-2">Generating <span className="font-mono bg-zinc-100 px-2 py-1 rounded text-xs">index.html</span>...</p>
          <div className="bg-white border border-zinc-200 rounded-lg p-4 mb-3 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-2">
              <span className="font-mono text-xs text-zinc-500">index.html</span>
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">Ready</span>
            </div>
            <pre className="bg-zinc-50 rounded-lg p-4 w-full text-xs text-left overflow-x-auto font-mono">
{`<!DOCTYPE html>
<html>
  <head>
    <title>Sample UI</title>
  </head>
  <body>
    <h1>Hello, world!</h1>
    <!-- ... -->
  </body>
</html>`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
} 