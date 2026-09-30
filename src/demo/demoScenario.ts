export interface DemoPrompt {
  id: string;
  title: string;
  tagline: string;
  prompt: string;
  category: 'AI Agents' | 'Cloud Scalability' | 'Orchestration';
  tags: string[];
}

export const FOOD_DELIVERY_PROMPT = 'Build a real-time food delivery platform';
export const RABBITMQ_INTERRUPT_PROMPT = 'Actually, use RabbitMQ instead of Kafka.';

export const DEMO_PROMPTS: DemoPrompt[] = [
  {
    id: 'demo-food-delivery',
    title: 'Real-Time Food Delivery Platform',
    tagline: 'Customer App → API Gateway → Order Service → Kafka → Delivery Service → PostgreSQL',
    prompt: FOOD_DELIVERY_PROMPT,
    category: 'Cloud Scalability',
    tags: ['Customer App', 'API Gateway', 'Order Service', 'Kafka', 'Delivery Service', 'PostgreSQL'],
  },
  {
    id: 'demo-kafka',
    title: 'Kafka Async Queue',
    tagline: 'High-throughput async event communication stream',
    prompt: 'Use Kafka for async communication.',
    category: 'Cloud Scalability',
    tags: ['Kafka', 'Async', 'Queue'],
  },
  {
    id: 'demo-multiagent',
    title: 'Multi-Agent Support Architecture',
    tagline: 'Agent Router → Sales, Billing, and Technical Agents',
    prompt: 'Actually, make it a multi-agent system.',
    category: 'Orchestration',
    tags: ['Agent Router', 'Sales', 'Billing', 'Technical'],
  },
  {
    id: 'demo-billing-db',
    title: 'Dedicated Billing Database',
    tagline: 'Billing Agent → Billing Database (ACID Store)',
    prompt: 'Billing should have its own database.',
    category: 'Cloud Scalability',
    tags: ['Billing', 'Database', 'ACID'],
  },
];

export const DEMO_INTERRUPTS: string[] = [
  RABBITMQ_INTERRUPT_PROMPT,
  'Actually, make it a multi-agent system.',
  'Wait! Replace the database with Qdrant Vector DB',
  'Stop, add an in-memory Redis cache for low latency',
];
