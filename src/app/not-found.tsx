import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="fixed inset-0 flex items-center justify-center px-4">
      <div className="flex items-center gap-6">
        <Image src="/logo.png" alt="HippoHamster" width={80} height={80} />
        <div className="h-24 w-px bg-border" />
        <div>
          <h1 className="text-2xl font-bold">This page couldn't be found</h1>
          <Link href="/" className="mt-2 inline-block text-brand hover:underline">
            Go back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
