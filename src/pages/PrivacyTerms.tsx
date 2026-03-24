import React from "react";
import { motion } from "framer-motion";
import { Shield, Lock, FileText, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function PrivacyTerms() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-blue-500/30">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-6 py-24">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-12 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl font-black tracking-tighter mb-16">
            PRIVACY & <span className="text-blue-600">TERMS</span>.
          </h1>

          <div className="space-y-24">
            {/* Privacy Section */}
            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-500" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Privacy Policy</h2>
              </div>
              
              <div className="prose prose-invert max-w-none text-white/60 leading-relaxed space-y-6">
                <p>
                  At DevOS, we take your privacy seriously. This policy outlines how we handle your data when you use our browser-based IDE.
                </p>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-500" />
                      Data Encryption
                    </h3>
                    <p className="text-sm">
                      All source code and project data are encrypted at rest and in transit. Your tokens are stored in a secure, isolated Firestore collection.
                    </p>
                  </div>
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      No Tracking
                    </h3>
                    <p className="text-sm">
                      We do not sell your data or use it for advertising. We only collect essential information required to provide the DevOS service.
                    </p>
                  </div>
                </div>

                <h4 className="text-white font-bold text-lg pt-4">1. Information We Collect</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Account Information: Email, display name, and profile photo from your auth provider.</li>
                  <li>Project Data: Source code, file structures, and commit history stored in our database.</li>
                  <li>Integration Tokens: GitHub and Vercel tokens (if provided) used strictly for your own actions.</li>
                </ul>

                <h4 className="text-white font-bold text-lg pt-4">2. How We Use Data</h4>
                <p>
                  Your data is used solely to provide the IDE experience, enable collaboration between project members, and facilitate deployments to third-party services as requested by you.
                </p>
              </div>
            </section>

            {/* Terms Section */}
            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Terms of Service</h2>
              </div>

              <div className="prose prose-invert max-w-none text-white/60 leading-relaxed space-y-6">
                <p>
                  By using DevOS, you agree to the following terms. Please read them carefully.
                </p>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-white font-bold mb-2">1. Acceptable Use</h4>
                    <p>
                      You may not use DevOS for any illegal activities, including but not limited to hosting malware, conducting DDoS attacks, or infringing on intellectual property.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-white font-bold mb-2">2. Account Security</h4>
                    <p>
                      You are responsible for maintaining the security of your account and any integration tokens you provide. DevOS is not liable for any loss resulting from compromised credentials.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-white font-bold mb-2">3. Service Availability</h4>
                    <p>
                      DevOS is provided "as is" without warranties of any kind. We strive for 99.9% uptime but do not guarantee uninterrupted service.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-white font-bold mb-2">4. Termination</h4>
                    <p>
                      We reserve the right to suspend or terminate accounts that violate these terms or engage in abusive behavior that threatens the stability of our infrastructure.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-24 pt-12 border-t border-white/5 text-center">
            <p className="text-white/20 text-sm">
              Last Updated: March 24, 2026
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
