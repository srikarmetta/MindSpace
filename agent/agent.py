"""
MindSpace LiveKit Voice Agent
Theme 05: Real-Time Multimodal Voice & System Architecture Assistant

Architecture:
Microphone -> LiveKit -> Voice Agent -> Intent/Conversation Layer -> MindSpace Revision Engine -> Live Graph
"""

import os
import json
import logging
from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import JobContext, WorkerOptions, cli
from livekit.agents.llm import function_context
from livekit.plugins import openai, silero, deepgram

load_dotenv()
logger = logging.getLogger("mindspace-voice-agent")

# Verify credentials presence
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

SYSTEM_PROMPT = """You are MindSpace, a full-duplex interactive voice AI system architect.
Your role is to understand user system requirements and construct live architecture graphs.

Rules:
1. Provide immediate, conversational acknowledgement (e.g., "Got it — I'm mapping that now.") BEFORE running graph operations.
2. Be concise, punchy, and professional.
3. NEVER say "Done" or "Completed" until the graph operations have actually completed and committed.
4. When the user interrupts or corrects (e.g., "Wait, make it multi-agent" or "Use RabbitMQ"), acknowledge the pivot immediately.
"""

async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to LiveKit room: {ctx.room.name}")
    await ctx.connect()

    # Audio VAD, STT, LLM, and TTS pipeline
    vad = silero.VAD.load()
    stt = deepgram.STT() if os.getenv("DEEPGRAM_API_KEY") else openai.STT()
    llm = openai.LLM(model="gpt-4o-mini")
    tts = openai.TTS(voice="alloy")

    # Define function call to dispatch architecture intent to frontend
    fnc_ctx = function_context.FunctionContext()

    @fnc_ctx.ai_callable(description="Dispatch architecture intent to MindSpace live graph engine")
    async def dispatch_architecture_intent(prompt: str, is_interrupt: bool = False):
        """Sends structured intent to MindSpace frontend over LiveKit data channel."""
        payload = json.dumps({
            "type": "INTENT_DISPATCH",
            "prompt": prompt,
            "is_interrupt": is_interrupt,
            "timestamp": ctx.room.server_timestamp or 0
        })
        # Publish to room participants on reliable data channel
        await ctx.room.local_participant.publish_data(payload.encode("utf-8"), reliable=True)
        return "Intent dispatched to MindSpace graph engine."

    # Create Voice Assistant agent
    assistant = agents.voice.VoiceAssistant(
        vad=vad,
        stt=stt,
        llm=llm,
        tts=tts,
        fnc_ctx=fnc_ctx,
        system_message=SYSTEM_PROMPT,
    )

    # Listen for user interruption events from VAD
    @assistant.on("user_speech_committed")
    def on_user_speech(transcript):
        logger.info(f"User transcript: {transcript.text}")

    @assistant.on("agent_speech_interrupted")
    def on_interrupted():
        logger.warning("User interrupted agent vocal response")
        # Send interruption signal to frontend
        interrupt_payload = json.dumps({"type": "USER_INTERRUPT"}).encode("utf-8")
        ctx.create_task(ctx.room.local_participant.publish_data(interrupt_payload, reliable=True))

    # Start voice loop
    assistant.start(ctx.room)
    await assistant.say("MindSpace online. What architecture are we designing today?", allow_interruptions=True)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
