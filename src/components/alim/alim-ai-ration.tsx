"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sparkles, Send, Loader2, Bot, User, Plus, ArrowRight,
  CheckCircle2, AlertCircle, Euro, Zap, Beef,
} from "lucide-react";
import { alimData, num, fmt } from "@/lib/alim-data";

type AIFeed = {
  name: string;
  quantityKgBrut: number;
};

type AIRation = {
  name: string;
  description: string;
  feeds: AIFeed[];
  expectedUFL: number;
  expectedPDI: number;
  expectedCost: number;
  recommendation: string;
};

type AIResponse = {
  analysis: string;
  rations: AIRation[];
  advice: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  rations?: AIRation[];
  analysis?: string;
  advice?: string;
};

const SUGGESTIONS = [
  "J'ai 50 brebis allaitantes 70kg en semaine +2 avec 8 tonnes de foin et 500kg d'orge. Budget serré.",
  "Brebis gestantes doubles 3 semaines avant agnelage. J'ai de l'ensilage maïs, du blé et du tourteau de soja.",
  "40 agnelles de renouvellement 40kg en croissance. Comment les mener à 60kg en 3 mois au moindre coût ?",
  "Bélier 80kg en période de lutte. J'ai du foin de luzerne et de l'orge.",
];

export function AlimAIRation() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [animalCategory, setAnimalCategory] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const availableAnimals = alimData.animals.filter((a) => num(a.UFL) !== null);

  const send = async (text?: string) => {
    const message = text || input;
    if (!message.trim() || loading) return;

    setLoading(true);
    setError("");
    const userMsg: ChatMessage = { role: "user", content: message };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await fetch("/api/ai-ration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, animalCategory }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Désolé, je n'ai pas pu traiter votre demande: ${data.error}` },
        ]);
      } else {
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: data.analysis || "Voici mes propositions :",
          rations: data.rations || [],
          analysis: data.analysis,
          advice: data.advice,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      setError(err.message || "Erreur de communication");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Erreur: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleSuggestion = (s: string) => {
    setInput(s);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-700" />
          Assistant IA — Générateur de rations
        </h2>
        <p className="text-sm text-stone-500">
          Décrivez votre situation en langage naturel. L&apos;IA analyse vos besoins et génère
          des rations adaptées à partir de la base de données OvinFormulation.
        </p>
      </div>

      {/* Animal pre-selector (optional) */}
      <Card className="border-stone-200">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Animal cible (optionnel):</Label>
            <Select value={animalCategory} onValueChange={setAnimalCategory}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Laissez l'IA le déterminer..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {availableAnimals.map((a, i) => (
                  <SelectItem key={i} value={a.category} className="text-xs">{a.category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {animalCategory && (
              <Button variant="ghost" size="sm" onClick={() => setAnimalCategory("")} className="h-8 text-xs">
                Effacer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat messages */}
      <Card className="border-stone-200 min-h-[400px] flex flex-col">
        <CardContent className="flex-1 p-4 space-y-4 max-h-[500px] overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 mx-auto mb-3 text-purple-300" />
              <p className="text-sm text-stone-600 mb-1">Décrivez votre situation pour générer une ration</p>
              <p className="text-xs text-stone-400 mb-4">Exemples de questions :</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(s)}
                    className="text-left text-xs p-2.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-purple-200 transition-colors"
                  >
                    <Sparkles className="h-3 w-3 inline mr-1 text-purple-400" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-purple-700" />
                </div>
              )}
              <div className={`max-w-[85%] ${msg.role === "user" ? "order-1" : ""}`}>
                <div className={`rounded-lg p-3 ${
                  msg.role === "user"
                    ? "bg-stone-800 text-white"
                    : "bg-stone-100 text-stone-900"
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Ration cards */}
                {msg.rations && msg.rations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.rations.map((ration, ri) => (
                      <RationCard key={ri} ration={ration} />
                    ))}
                  </div>
                )}

                {/* Advice */}
                {msg.advice && (
                  <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5">
                    <p className="text-xs text-amber-900">
                      <span className="font-semibold">💡 Conseil: </span>
                      {msg.advice}
                    </p>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center order-2">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Bot className="h-4 w-4 text-purple-700" />
              </div>
              <div className="rounded-lg bg-stone-100 p-3">
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                <span className="text-xs text-stone-500 ml-2">Analyse en cours...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input area */}
        <div className="border-t border-stone-200 p-3">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Décrivez votre situation... (ex: 50 brebis gestantes, foin + orge disponible)"
              disabled={loading}
              className="flex-1 h-10"
            />
            <Button onClick={() => send()} disabled={loading || !input.trim()} className="bg-purple-700 hover:bg-purple-800">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {error && (
            <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}
        </div>
      </Card>

      {/* Info */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-purple-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-700">
              <strong className="text-purple-900">Comment ça marche :</strong> L&apos;assistant IA
              analyse votre message, identifie le type d&apos;animal et les aliments disponibles, puis
              génère 1 à 3 rations équilibrées. Les quantités sont en kg brut par animal et par jour.
              Vérifiez toujours les résultats avec le module Ration pour une analyse complète.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RationCard({ ration }: { ration: AIRation }) {
  return (
    <div className="rounded-lg border border-purple-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div>
          <h4 className="text-sm font-semibold text-stone-900">{ration.name}</h4>
          <p className="text-[11px] text-stone-600">{ration.description}</p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        <div className="rounded bg-stone-50 p-1.5 text-center">
          <Zap className="h-3 w-3 text-amber-600 mx-auto mb-0.5" />
          <div className="text-[9px] text-stone-500 uppercase">UFL</div>
          <div className="text-xs font-bold text-stone-900">{fmt(ration.expectedUFL, 2)}</div>
        </div>
        <div className="rounded bg-stone-50 p-1.5 text-center">
          <Beef className="h-3 w-3 text-rose-600 mx-auto mb-0.5" />
          <div className="text-[9px] text-stone-500 uppercase">PDI (g)</div>
          <div className="text-xs font-bold text-stone-900">{fmt(ration.expectedPDI, 0)}</div>
        </div>
        <div className="rounded bg-stone-50 p-1.5 text-center">
          <Euro className="h-3 w-3 text-emerald-600 mx-auto mb-0.5" />
          <div className="text-[9px] text-stone-500 uppercase">€/jour</div>
          <div className="text-xs font-bold text-stone-900">{fmt(ration.expectedCost, 2)}</div>
        </div>
      </div>

      {/* Feeds */}
      <div className="space-y-0.5 mb-2">
        {ration.feeds.map((feed, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-stone-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              {feed.name}
            </span>
            <span className="font-medium text-stone-900 tabular-nums">{fmt(feed.quantityKgBrut, 2)} kg/j</span>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div className="rounded bg-purple-50 border border-purple-100 p-2">
        <p className="text-[11px] text-purple-900">
          <CheckCircle2 className="h-3 w-3 inline mr-1" />
          {ration.recommendation}
        </p>
      </div>
    </div>
  );
}
