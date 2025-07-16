import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-bold">shadcn + Tailwind is working!</h1>
        <Button variant="default">Primary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="destructive">Danger</Button>
      </div>
    </main>
  );
}
