import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SSOCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      console.error("SSO Error:", error);
      toast.error(`Kontyra SSO Error: ${error}`);
      navigate("/?login=true");
      return;
    }

    if (token) {
      // 1. Sign in locally using the secure custom token minted by the Central Hub
      signInWithCustomToken(auth, token)
        .then((userCredential) => {
          // 2. Success! Redirect to the child app's dashboard
          toast.success("Successfully signed in with Kontyra");
          navigate("/projects");
        })
        .catch((err) => {
          console.error("Token verification failed", err);
          const errorMessage = err.message || err.code || "Unknown error";
          toast.error(`Authentication failed: ${errorMessage}`);
          navigate(`/?login=true&error=${encodeURIComponent(errorMessage)}`);
        });
    } else {
      // No token and no error, this shouldn't happen unless user visited route directly
      navigate("/");
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background glow matching the app style */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="flex flex-col items-center gap-6 z-10">
        <div className="relative">
          <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center backdrop-blur-xl shadow-2xl relative z-10">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
          {/* Decorative ring */}
          <div className="absolute inset-[-10px] bg-blue-500/20 rounded-[2rem] blur-xl -z-10 animate-pulse" />
        </div>
        
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Authenticating</h1>
          <p className="text-sm text-white/50 font-medium">Establishing secure connection via Kontyra...</p>
        </div>
      </div>
    </div>
  );
}
