# MindSpace LiveKit Voice Agent

This directory contains the production-ready LiveKit Voice Agent for **Theme 05: Real-Time Multimodal Voice & System Architecture Assistant**.

---

## Architecture Flow

```
User Voice (Microphone)
        ↓
LiveKit WebRTC Room
        ↓
LiveKit Agent (Silero VAD + STT)
        ↓
Immediate Conversational Ack ("Got it — mapping that now.")
        ↓
LiveKit Data Channel Event
        ↓
MindSpace EventBridge (Frontend)
        ↓
Revision Engine & Operation Executor
        ↓
Live React Flow Graph
```

---

## Prerequisites

1. Python 3.10+
2. A LiveKit Cloud project or self-hosted LiveKit instance (https://cloud.livekit.io)
3. OpenAI API key or Deepgram API key for speech-to-text

---

## Setup Steps

### 1. Install Dependencies

```bash
cd agent
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` in the root directory:

```bash
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret
OPENAI_API_KEY=your_openai_key
```

### 3. Run the Agent Worker

```bash
python agent.py dev
```

The agent will connect to your LiveKit room, listen for user speech, stream immediate verbal confirmations, dispatch architecture intents to MindSpace, and handle real-time interruptions gracefully.
