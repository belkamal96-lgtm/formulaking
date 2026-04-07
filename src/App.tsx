import { useState, useRef, useEffect } from "react";
import { 
  Camera, 
  Upload, 
  FileText, 
  Volume2, 
  Loader2, 
  X, 
  BookOpen,
  Sparkles,
  RefreshCw,
  PlayCircle,
  Download,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { analyzeFormula, generateSpeech } from "./services/gemini";
import { cn } from "./lib/utils";

export default function App() {
  const [file, setFile] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);

  // Handle Camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (showCamera && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(s => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => {
          console.error("Camera error:", err);
          setError("Could not access camera. Please check permissions.");
          setShowCamera(false);
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCamera]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setFile(dataUrl.split(",")[1]);
        setMimeType("image/jpeg");
        setShowCamera(false);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFile(result.split(",")[1]);
        setMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!file || !mimeType) return;
    setIsAnalyzing(true);
    setError(null);
    setExplanation(null);
    setAudioUrl(null);

    try {
      const result = await analyzeFormula(file, mimeType);
      setExplanation(result || "Could not analyze the formula.");
    } catch (err) {
      console.error("Analysis error:", err);
      const message = err instanceof Error ? err.message : "Failed to analyze the formula. Please try again.";
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSpeak = async () => {
    if (!explanation) return;
    if (audioUrl) {
      if (audioRef.current) {
        if (isSpeaking) {
          audioRef.current.pause();
          setIsSpeaking(false);
        } else {
          audioRef.current.play();
          setIsSpeaking(true);
        }
      }
      return;
    }

    setIsGeneratingAudio(true);
    try {
      // Use a shorter version for TTS if it's too long, or just ensure it's generated
      const url = await generateSpeech(explanation.substring(0, 5000)); // Limit length for TTS stability
      if (url) {
        setAudioUrl(url);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
          setIsSpeaking(true);
        }
      } else {
        setError("Could not generate audio. Please try again.");
      }
    } catch (err) {
      console.error("Speech error:", err);
      setError("Audio generation failed.");
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const downloadPDF = async () => {
    if (!pdfContentRef.current || !explanation) return;
    setIsDownloading(true);
    try {
      // Wait a bit for KaTeX to be fully ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const element = pdfContentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add subsequent pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save("Formula-Results.pdf");
    } catch (err) {
      console.error("PDF error:", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setMimeType(null);
    setExplanation(null);
    setAudioUrl(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 pb-10">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-indigo-600 p-1.5 sm:p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
              <BookOpen size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">BBS Formulas</h1>
              </div>
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-widest">T.U. BBS 4th Year • Enhanced</p>
            </div>
          </div>
          {file && (
            <button 
              onClick={reset}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            >
              <RefreshCw size={18} className="sm:w-5 sm:h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <AnimatePresence mode="wait">
          {!file && !showCamera ? (
            <motion.div 
              key="upload-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 sm:space-y-8"
            >
              <div className="text-center space-y-3 sm:space-y-4 py-8 sm:py-12">
                <h2 className="text-2xl font-extrabold text-slate-900 sm:text-4xl px-2">
                  Master Your Formulas <span className="text-indigo-600">Simply</span>
                </h2>
                <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed px-4">
                  Upload a photo or PDF of your BBS 4th year formulas. Our AI will explain them in a mix of Nepali and English for your exam.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <button 
                  onClick={() => setShowCamera(true)}
                  className="group relative overflow-hidden bg-white border-2 border-dashed border-slate-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center gap-3 sm:gap-4 transition-all hover:border-indigo-400 hover:bg-indigo-50/30"
                >
                  <div className="bg-indigo-100 p-3 sm:p-4 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
                    <Camera size={28} className="sm:w-8 sm:h-8" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-base sm:text-lg text-slate-900">Take a Photo</h3>
                    <p className="text-xs sm:text-sm text-slate-500">Capture formula from your book</p>
                  </div>
                </button>

                <label className="group relative overflow-hidden bg-white border-2 border-dashed border-slate-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center gap-3 sm:gap-4 transition-all hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer">
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                  />
                  <div className="bg-indigo-100 p-3 sm:p-4 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
                    <Upload size={28} className="sm:w-8 sm:h-8" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-base sm:text-lg text-slate-900">Upload File</h3>
                    <p className="text-xs sm:text-sm text-slate-500">Image or PDF document</p>
                  </div>
                </label>
              </div>
            </motion.div>
          ) : showCamera ? (
            <motion.div 
              key="camera-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl aspect-[3/4] max-w-md mx-auto"
            >
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute bottom-6 sm:bottom-8 left-0 right-0 flex justify-center items-center gap-6 sm:gap-8">
                <button 
                  onClick={() => setShowCamera(false)}
                  className="bg-white/20 backdrop-blur-md p-3 sm:p-4 rounded-full text-white hover:bg-white/30 transition-colors"
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
                <button 
                  onClick={capturePhoto}
                  className="bg-white p-5 sm:p-6 rounded-full text-indigo-600 shadow-xl hover:scale-105 transition-transform"
                >
                  <Camera size={28} className="sm:w-8 sm:h-8" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="preview-section"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 sm:space-y-8"
            >
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600">
                    {mimeType?.includes("pdf") ? <FileText size={16} /> : <Camera size={16} />}
                    <span className="text-xs sm:text-sm font-medium">Captured Formula</span>
                  </div>
                  <button onClick={reset} className="text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </div>
                <div className="p-4 sm:p-6 flex justify-center bg-slate-100/50 min-h-[150px] sm:min-h-[200px] items-center">
                  {mimeType?.includes("pdf") ? (
                    <div className="flex flex-col items-center gap-3 sm:gap-4 text-slate-500">
                      <FileText size={48} className="text-indigo-400 sm:w-16 sm:h-16" />
                      <p className="text-sm sm:text-base font-medium">PDF Document Uploaded</p>
                    </div>
                  ) : (
                    <img 
                      src={`data:${mimeType};base64,${file}`} 
                      alt="Formula" 
                      className="max-h-[300px] sm:max-h-[400px] rounded-lg shadow-md"
                    />
                  )}
                </div>
                {!explanation && !isAnalyzing && (
                  <div className="p-4 sm:p-6 bg-white border-t border-slate-200">
                    <button 
                      onClick={handleAnalyze}
                      className="w-full bg-indigo-600 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles size={18} className="sm:w-5 sm:h-5" />
                      Explain All Formulas
                    </button>
                  </div>
                )}
              </div>

              {isAnalyzing && (
                <div className="bg-white rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center space-y-4 sm:space-y-6 border border-slate-200 shadow-sm">
                  <div className="relative inline-block">
                    <Loader2 size={40} className="text-indigo-600 animate-spin sm:w-12 sm:h-12" />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 bg-indigo-100 rounded-full -z-10 blur-xl"
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">Analyzing Formulas...</h3>
                    <p className="text-xs sm:text-sm text-slate-500">The AI is taking its time to think and provide the best explanations with examples for every formula.</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <X size={20} className="shrink-0" />
                    <p className="text-sm font-bold">Analysis Error</p>
                  </div>
                  <p className="text-sm leading-relaxed">{error}</p>
                  {error.includes("Vercel") && (
                    <div className="pt-2 border-t border-red-100">
                      <p className="text-xs font-medium text-red-500 mb-2 uppercase tracking-wider">Quick Fix Guide:</p>
                      <ol className="text-xs space-y-1 list-decimal list-inside text-red-500/80">
                        <li>Go to your <strong>Vercel Dashboard</strong></li>
                        <li>Select this project &gt; <strong>Settings</strong> &gt; <strong>Environment Variables</strong></li>
                        <li>Add <strong>VITE_GEMINI_API_KEY</strong> as the name</li>
                        <li>Paste your <strong>Google AI Studio API Key</strong> as the value</li>
                        <li><strong>Redeploy</strong> your app to apply changes</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {explanation && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-50/50">
                    <div className="flex items-center gap-2 text-indigo-700">
                      <Sparkles size={18} className="sm:w-5 sm:h-5" />
                      <h3 className="font-bold text-sm sm:text-base">Exam-Ready Explanations</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleSpeak}
                        disabled={isGeneratingAudio}
                        className={cn(
                          "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-full font-bold text-xs transition-all shadow-sm",
                          isSpeaking 
                            ? "bg-indigo-600 text-white" 
                            : "bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50"
                        )}
                      >
                        {isGeneratingAudio ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Loading...
                          </>
                        ) : isSpeaking ? (
                          <>
                            <Volume2 size={14} className="animate-pulse" />
                            Speaking...
                          </>
                        ) : (
                          <>
                            <PlayCircle size={14} />
                            Listen
                          </>
                        )}
                      </button>
                      <button 
                        onClick={downloadPDF}
                        disabled={isDownloading}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-full font-bold text-xs bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm"
                      >
                        {isDownloading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Download size={14} />
                        )}
                        {isDownloading ? "Saving..." : "Save PDF"}
                      </button>
                    </div>
                  </div>
                  <div className="p-6 sm:p-8 prose prose-slate max-w-none overflow-auto">
                    <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      <p className="text-xs sm:text-sm text-slate-500 font-medium italic">
                        All formulas found have been explained in Nepali & English mix.
                      </p>
                    </div>
                    
                    <div ref={pdfContentRef} className="bg-white p-2">
                      <ReactMarkdown 
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg sm:text-xl font-bold text-slate-800 mt-6 mb-3" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-base sm:text-lg font-bold text-slate-800 mt-4 mb-2" {...props} />,
                          p: ({node, ...props}) => <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-4" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 mb-4 text-slate-600" {...props} />,
                          li: ({node, ...props}) => <li className="ml-4 text-sm sm:text-base" {...props} />,
                          code: ({node, ...props}) => <code className="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded font-mono text-xs sm:text-sm" {...props} />,
                          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-200 pl-4 italic text-slate-500 my-4 text-sm sm:text-base" {...props} />,
                        }}
                      >
                        {explanation}
                      </ReactMarkdown>
                    </div>
                    
                    <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-4">
                      <button 
                        onClick={reset}
                        className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group"
                      >
                        <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                        Analyze New Set
                      </button>
                      <button 
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="w-full sm:w-auto px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-lg hover:bg-slate-200 transition-all"
                      >
                        Back to Top
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <audio 
        ref={audioRef} 
        onEnded={() => setIsSpeaking(false)} 
        onPause={() => setIsSpeaking(false)}
        onPlay={() => setIsSpeaking(true)}
        className="hidden" 
      />

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-12 text-center">
        <p className="text-xl font-bold text-slate-600">Made by Kamal Belbase</p>
        <p className="mt-2 text-xs text-slate-400">Exam-ready explanations in Nepali & English</p>
      </footer>
    </div>
  );
}
