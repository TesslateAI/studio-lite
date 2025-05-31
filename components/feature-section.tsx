import { FileText, Users, Lightbulb } from "lucide-react"

export default function FeatureSection() {
  return (
    <div className="grid md:grid-cols-2 gap-12">
      <div className="bg-zinc-50 rounded-lg p-6 flex items-center justify-center">
        <div className="max-w-md">
          <img
            src="/placeholder.svg?height=400&width=500"
            alt="Tesslate Studio Lite interface demo"
            className="rounded-lg border border-zinc-200 shadow-sm"
          />
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h3 className="text-xl font-medium">Create with Tesslate Studio Lite</h3>
          </div>
          <p className="text-zinc-600">
          Test and iterate with our most advanced, fine-tuned AI models—built for UI, code, and creative tasks.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            <h3 className="text-xl font-medium">Bring your knowledge</h3>
          </div>
          <p className="text-zinc-600">
          Bring your own data or prompts to see how our specialized models adapt and respond intelligently.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h3 className="text-xl font-medium">Share and collaborate with your team</h3>
          </div>
          <p className="text-zinc-600">
          Invite your team, share sessions, and explore the limits of our models together.
          </p>
        </div>
      </div>
    </div>
  )
} 