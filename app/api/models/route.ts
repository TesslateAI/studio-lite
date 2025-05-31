import modelsList from '@/lib/models.json';

export async function GET() {
  return new Response(JSON.stringify(modelsList), { status: 200 });
} 