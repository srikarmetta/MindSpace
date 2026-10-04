import React from 'react';
import { Sparkles, ArrowRight, Network, Server, Cpu, Database, Cloud } from 'lucide-react';
import { useGraphStore } from '../../state/graphStore';

export const EmptyState: React.FC = () => {
  const setInputPrompt = useGraphStore((s) => s.setInputPrompt);

  const categories = [
    {
      title: 'Distributed Systems',
      description: 'Microservices, message queues, relational databases, cache tiers',
      icon: <Network className="w-4 h-4 text-zinc-400" />,
      examplePrompt: 'Design a distributed system with an API gateway, order service, payment service, Redis cache, and PostgreSQL database.'
    },
    {
      title: 'AI / Multi-Agent Systems',
      description: 'Agent routers, knowledge retrieval (RAG), vector stores, triage agents',
      icon: <Cpu className="w-4 h-4 text-zinc-400" />,
      examplePrompt: 'Create a multi-agent customer support architecture with an Agent Router, Support Agent, RAG service, and Vector Knowledge Base.'
    },
    {
      title: 'Event-Driven Architectures',
      description: 'Kafka/RabbitMQ event streams, workers, pub/sub, downstream dispatch',
      icon: <Server className="w-4 h-4 text-zinc-400" />,
      examplePrompt: 'Architect an event-driven system where user events publish to RabbitMQ and asynchronous workers process analytics and notifications.'
    },
    {
      title: 'SaaS Platforms',
      description: 'Multi-tenant auth, user workspaces, billing pipelines, dedicated storage',
      icon: <Database className="w-4 h-4 text-zinc-400" />,
      examplePrompt: 'Build a SaaS platform with web client, auth service, subscription billing service, PostgreSQL, and object storage for user assets.'
    },
    {
      title: 'Cloud Architectures',
      description: 'Edge CDN, global load balancers, blob stores, serverless compute',
      icon: <Cloud className="w-4 h-4 text-zinc-400" />,
      examplePrompt: 'Design a cloud media streaming platform with CDN in front of object storage, transcoding worker, and metadata database.'
    },
  ];

  const handleSelectExample = (promptText: string) => {
    // Populates input for user review/customization, DOES NOT auto-execute
    setInputPrompt(promptText);
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 pointer-events-auto z-10 bg-transparent">
      <div className="max-w-2xl w-full text-center space-y-7 animate-in fade-in duration-300">
        {/* Brand mark */}
        <div className="inline-flex items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-xl">
            <Sparkles className="w-5 h-5 text-zinc-100" />
          </div>
        </div>

        {/* Title & Core Product Value Prop */}
        <div className="space-y-2.5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100">
            Design systems by thinking out loud.
          </h1>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Describe the system you want to build and MindSpace will turn your evolving requirements into a live architecture graph.
          </p>
        </div>

        {/* Informational Guidance Cards */}
        <div className="text-left space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
              Describe anything
            </span>
            <span className="text-[11px] font-mono text-zinc-600">
              Click to load template · Edit before sending
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.title}
                type="button"
                onClick={() => handleSelectExample(cat.examplePrompt)}
                className="group p-3 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition-all text-left flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-200 group-hover:text-white transition-colors">
                    {cat.icon}
                    <span>{cat.title}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1 leading-normal line-clamp-2">
                    {cat.description}
                  </p>
                </div>
                <div className="mt-2.5 flex items-center gap-1 text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  <span>Use template</span>
                  <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Real-time Evolution Assurance */}
        <div className="pt-2 text-[11px] text-zinc-500 font-mono">
          <span>Continuous refinement · Interrupt with changes at any time without losing state</span>
        </div>
      </div>
    </div>
  );
};
