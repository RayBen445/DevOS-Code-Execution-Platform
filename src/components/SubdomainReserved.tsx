import { AlertCircle } from "lucide-react";
import { buildDevosUrl } from "../lib/brand";

export default function SubdomainReserved() {
  return (
    <div className="min-h-screen bg-base text-white flex flex-col items-center justify-center gap-3">
      <AlertCircle className="w-10 h-10 text-yellow-400" />
      <p className="text-lg">This subdomain is reserved.</p>
      <a href={buildDevosUrl()} className="text-blue-400 hover:underline text-sm">
        Go to DevOS
      </a>
    </div>
  );
}
