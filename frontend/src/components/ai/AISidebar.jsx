import React, { useState, useEffect } from "react";
import useAIStore from "../../store/useAIStore";
import useAuthUser from "../../hooks/useAuthUser";
import { checkGrammar, suggestVocabulary, translateMessage } from "../../lib/api";
import { axiosInstance } from "../../lib/axios";
import {
  Wand2Icon,
  MessageSquareIcon,
  BookAIcon,
  LanguagesIcon,
  SparklesIcon,
  XIcon,
  CheckIcon,
} from "lucide-react";

const AISidebar = ({ selectedMessage }) => {
  const { isSidebarOpen, setSidebarOpen, activeTab, setActiveTab } = useAIStore();
  const { authUser } = useAuthUser();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [streamData, setStreamData] = useState("");
  const [grammarResult, setGrammarResult] = useState(null);
  const [vocabResult, setVocabResult] = useState(null);
  const [translationResult, setTranslationResult] = useState(null);

  const targetLanguage =
    authUser?.learningLanguage && authUser.learningLanguage !== "None"
      ? authUser.learningLanguage
      : "English";
  const nativeLanguage = authUser?.nativeLanguage || "English";

  useEffect(() => {
    if (!selectedMessage || !isSidebarOpen) return;

    let cancelled = false;
    setErrorMsg("");

    if (activeTab === "suggestions") {
      setStreamData("");
      setLoading(true);

      const baseUrl = axiosInstance.defaults.baseURL || "/api";
      const url = `${baseUrl}/ai/stream-explain?message=${encodeURIComponent(selectedMessage)}`;
      const eventSource = new EventSource(url, { withCredentials: true });

      eventSource.onmessage = (event) => {
        if (event.data === "[DONE]") {
          eventSource.close();
          setLoading(false);
          return;
        }
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.chunk) {
            setStreamData((prev) => prev + parsed.chunk);
          } else if (parsed.error) {
            setErrorMsg(parsed.error);
          }
        } catch {
          // Ignore malformed SSE frame
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setLoading(false);
      };

      return () => eventSource.close();
    }

    const runAction = async () => {
      setLoading(true);
      try {
        if (activeTab === "corrections") {
          const data = await checkGrammar(selectedMessage, targetLanguage);
          if (!cancelled) setGrammarResult(data);
        } else if (activeTab === "vocabulary") {
          const data = await suggestVocabulary(selectedMessage, targetLanguage);
          if (!cancelled) setVocabResult(data);
        } else if (activeTab === "translation") {
          const data = await translateMessage(selectedMessage, "auto", nativeLanguage);
          if (!cancelled) setTranslationResult(data);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(
            err?.response?.data?.message || "Failed to fetch AI insights. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    runAction();
    return () => {
      cancelled = true;
    };
  }, [selectedMessage, activeTab, isSidebarOpen, targetLanguage, nativeLanguage]);

  if (!isSidebarOpen) return null;

  return (
    <div className="w-80 border-l border-base-300 bg-base-100 flex flex-col h-full shadow-xl z-20">
      {/* Header */}
      <div className="p-4 border-b border-base-300 flex justify-between items-center bg-base-200/50">
        <div className="flex items-center gap-2 text-primary font-bold">
          <SparklesIcon className="size-5" />
          <span>AI Copilot</span>
        </div>
        <button
          className="btn btn-ghost btn-xs btn-square"
          onClick={() => setSidebarOpen(false)}
        >
          <XIcon className="size-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-base-300 scrollbar-hide">
        <button
          className={`flex-1 py-3 px-2 text-xs font-medium border-b-2 flex flex-col items-center gap-1 min-w-[70px] ${
            activeTab === "suggestions"
              ? "border-primary text-primary"
              : "border-transparent opacity-60 hover:opacity-100"
          }`}
          onClick={() => setActiveTab("suggestions")}
        >
          <Wand2Icon className="size-4" /> Suggest
        </button>
        <button
          className={`flex-1 py-3 px-2 text-xs font-medium border-b-2 flex flex-col items-center gap-1 min-w-[70px] ${
            activeTab === "corrections"
              ? "border-primary text-primary"
              : "border-transparent opacity-60 hover:opacity-100"
          }`}
          onClick={() => setActiveTab("corrections")}
        >
          <CheckIcon className="size-4" /> Correct
        </button>
        <button
          className={`flex-1 py-3 px-2 text-xs font-medium border-b-2 flex flex-col items-center gap-1 min-w-[70px] ${
            activeTab === "vocabulary"
              ? "border-primary text-primary"
              : "border-transparent opacity-60 hover:opacity-100"
          }`}
          onClick={() => setActiveTab("vocabulary")}
        >
          <BookAIcon className="size-4" /> Vocab
        </button>
        <button
          className={`flex-1 py-3 px-2 text-xs font-medium border-b-2 flex flex-col items-center gap-1 min-w-[70px] ${
            activeTab === "translation"
              ? "border-primary text-primary"
              : "border-transparent opacity-60 hover:opacity-100"
          }`}
          onClick={() => setActiveTab("translation")}
        >
          <LanguagesIcon className="size-4" /> Translate
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-base-100 space-y-3">
        {!selectedMessage && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
            <MessageSquareIcon className="size-12" />
            <p className="text-sm">Select a message in the chat to see AI insights.</p>
          </div>
        )}

        {errorMsg && (
          <div className="alert alert-warning text-xs py-2">
            <span>{errorMsg}</span>
          </div>
        )}

        {loading && (
          <div className="flex justify-center p-4">
            <span className="loading loading-dots loading-md text-primary"></span>
          </div>
        )}

        {selectedMessage && activeTab === "suggestions" && streamData && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {streamData}
            {loading && <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />}
          </div>
        )}

        {selectedMessage && !loading && activeTab === "corrections" && grammarResult && (
          <div className="bg-base-200 rounded-xl p-4 space-y-2 text-sm">
            <p className="font-bold text-xs uppercase opacity-60">
              {grammarResult.hasErrors ? "Suggested Correction" : "Looks Good!"}
            </p>
            <p className="font-medium text-success">{grammarResult.improved}</p>
            <p className="text-xs opacity-80">{grammarResult.explanation}</p>
          </div>
        )}

        {selectedMessage && !loading && activeTab === "vocabulary" && vocabResult?.suggestions && (
          <div className="space-y-2">
            {vocabResult.suggestions.map((item, idx) => (
              <div key={idx} className="bg-base-200 rounded-xl p-3 text-sm">
                <p className="font-semibold text-primary">
                  {item.word} → {item.synonym}
                </p>
                <p className="text-xs opacity-75 mt-1">{item.context}</p>
              </div>
            ))}
          </div>
        )}

        {selectedMessage && !loading && activeTab === "translation" && translationResult && (
          <div className="bg-base-200 rounded-xl p-4 space-y-2 text-sm">
            <h4 className="text-xs font-bold uppercase opacity-60">Natural Translation</h4>
            <p className="font-medium">{translationResult.natural}</p>
            {translationResult.literal && (
              <p className="text-xs opacity-70">Literal: {translationResult.literal}</p>
            )}
            {translationResult.nuanceExplanation && (
              <p className="text-xs opacity-80 pt-1 border-t border-base-300">
                {translationResult.nuanceExplanation}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AISidebar;
