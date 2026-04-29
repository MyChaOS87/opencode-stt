import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import { transcribe, listBackends } from "./stt";
import type { SpeechToTextConfig, SttBackend } from "./types";

/**
 * Speech-to-Text Plugin for OpenCode.
 * 
 * Provides voice input capability using a local vLLM server, Moonshine, or Whisper models.
 * 
 * Features:
 * - `voice_input` tool for AI-triggered voice recording
 * - Automatic silence detection
 * - Support for vLLM (GPU-accelerated), Moonshine (fast, edge-optimized), and Whisper models
 * 
 * Usage:
 * 1. For vLLM (recommended): Start vLLM server with a compatible model (e.g. Voxtral)
 * 2. For other backends: Install Python dependencies: uv pip install sounddevice soundfile numpy
 *    - Moonshine: uv pip install useful-moonshine-onnx@git+https://github.com/moonshine-ai/moonshine.git#subdirectory=moonshine-onnx
 *    - Whisper: uv pip install openai-whisper
 *    - Faster-Whisper: uv pip install faster-whisper
 * 3. Install the plugin: Add "opencode-speech-to-text" to your opencode.json plugins
 */
export const SpeechToTextPlugin: Plugin = async () => {
  const config: SpeechToTextConfig = {
    backend: (process.env.STT_BACKEND as SttBackend) || "auto",
    model: process.env.STT_MODEL || "tiny",
    language: process.env.STT_LANGUAGE || "en",
    maxDuration: parseInt(process.env.STT_MAX_DURATION || "30", 10),
    pythonPath: process.env.STT_PYTHON_PATH || "python3",
    vllmUrl: process.env.STT_VLLM_URL || "http://localhost:8080",
  };

  const backends = await listBackends(config.pythonPath, config.vllmUrl);

  return {
    tool: {
      voice_input: tool({
        description: `Record voice input from the microphone and transcribe it to text.
        
Uses local speech-to-text models for privacy-preserving transcription.
The recording automatically stops when silence is detected.

Backends (in order of preference):
- vllm: Fastest, GPU-accelerated via local vLLM server (recommended)
- moonshine: Fast, edge-optimized, runs on CPU
- faster-whisper: Optimized Whisper implementation
- whisper: OpenAI's original Whisper

Returns the transcribed text that can be used as user input or for any other purpose.

Available backends: ${backends.length > 0 ? backends.join(", ") : "none detected - start vLLM server or install dependencies"}`,
        args: {
          max_duration: tool.schema.number().optional().describe(
            "Maximum recording duration in seconds (default: 30)"
          ),
          backend: tool.schema.string().optional().describe(
            "STT backend: vllm, moonshine, whisper, faster-whisper, or auto (default: auto)"
          ),
          model: tool.schema.string().optional().describe(
            "Model size for non-vLLM backends: tiny (fast), base, small, medium, large"
          ),
          language: tool.schema.string().optional().describe(
            "Language code for transcription (default: en)"
          ),
        },
        async execute(args) {
          const result = await transcribe({
            ...config,
            maxDuration: args.max_duration ?? config.maxDuration,
            backend: (args.backend as SttBackend) ?? config.backend,
            model: args.model ?? config.model,
            language: args.language ?? config.language,
          });

          if (!result.success) {
            return `Voice input failed: ${result.error}

To fix this, ensure one of the following:
1. vLLM server is running (recommended for GPU):
   - Start vLLM: vllm serve mistralai/Voxtral-Mini-4B-Realtime-2602 --port 8080
   
2. Alternative backends installed (CPU):
   - Python dependencies: uv pip install sounddevice soundfile numpy
   - Moonshine: uv pip install useful-moonshine-onnx@git+https://github.com/moonshine-ai/moonshine.git#subdirectory=moonshine-onnx
   - Whisper: uv pip install openai-whisper
   - Faster-Whisper: uv pip install faster-whisper
   
3. Microphone permissions are granted to the terminal
4. STT_VLLM_URL environment variable is set correctly (default: http://localhost:8080)`;
          }

          return `Voice input transcribed (${result.backend}/${result.model}):

${result.text}`;
        },
      }),

      voice_check: tool({
        description: "Check which speech-to-text backends are available on this system.",
        args: {},
        async execute() {
          const available = await listBackends(config.pythonPath, config.vllmUrl);
          
          if (available.length === 0) {
            return `No STT backends detected.

Please set up one of the following:

1. vLLM (recommended for GPU acceleration):
   - Install: uv pip install vllm
   - Start server: vllm serve mistralai/Voxtral-Mini-4B-Realtime-2602 --port 8080
   
2. Moonshine (fastest CPU):
   uv pip install useful-moonshine-onnx@git+https://github.com/moonshine-ai/moonshine.git#subdirectory=moonshine-onnx
  
3. Whisper (OpenAI's original):
   uv pip install openai-whisper
  
4. Faster-Whisper (optimized):
   uv pip install faster-whisper

Base dependencies (required for all):
  uv pip install sounddevice soundfile numpy`;
          }

          return `Available STT backends: ${available.join(", ")}

Current configuration:
- Backend: ${config.backend}
- Model: ${config.model}
- Language: ${config.language}
- Max duration: ${config.maxDuration}s
- vLLM server URL: ${config.vllmUrl}

Note: vLLM backend is auto-detected when the vLLM server is running at the configured URL.`;
        },
      }),
    },
  };
};

export default SpeechToTextPlugin;
