import { AlertCircle } from "lucide-react";
import { buildDevosUrl } from "../lib/brand";

interface Props {
  label?: string;
}

export default function SubdomainNotFound({ label }: Props) {
  return (
    <div className="min-h-screen bg-base text-white flex flex-col items-center justify-center gap-3">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-2xl font-bold">404</p>
      <p className="text-white/60">
        Subdomain not found
        {label ? (
          <>
            : <span className="text-white">{label}</span>
          </>
        ) : null}
        .
      </p>
      <a href={buildDevosUrl()} className="text-blue-400 hover:underline text-sm mt-2">
        Go to DevOS
      </a>
    </div>
  );
}
