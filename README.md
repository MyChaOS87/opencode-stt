# OpenCode Speech-to-Text Plugin

Speech-to-text plugin for [OpenCode](https://opencode.ai) with support for **vLLM** (GPU-accelerated), **Moonshine**, **Whisper**, and **Faster-Whisper** backends.

## Features

- **Voice Input Tool** - Record audio from microphone and transcribe to text
- **Automatic Silence Detection** - Recording stops when you stop speaking
- **Multiple Backends** - vLLM (GPU), Moonshine, Whisper, or Faster-Whisper (CPU)
- **Privacy-First** - All processing is done locally, no cloud APIs
- **Configurable** - Choose backend, model size, language, and recording duration

## Installation

### 1. Install the Plugin

Local plugins are loaded from `~/.config/opencode/plugins/`. Choose one:

**Option A: Symlink the built bundle** (for local development)

```bash
# Clone and build
git clone https://github.com/MyChaOS87/opencode-stt
cd opencode-stt
bun install && bun run build

# Symlink into opencode plugins directory
mkdir -p ~/.config/opencode/plugins
ln -sf "$PWD/dist/index.js" ~/.config/opencode/plugins/opencode-stt.js
```

**Option B: Install from npm** (once published)

```json
{
  "plugin": ["opencode-speech-to-text"]
}
```

### 2. Install Python Dependencies

```bash
# Base dependencies (required for all backends)
uv pip install sounddevice soundfile numpy

# Choose ONE backend:

# Option A: vLLM — GPU-accelerated (see vLLM section below)
uv pip install vllm

# Option B: Moonshine — fastest CPU backend
uv pip install useful-moonshine-onnx@git+https://github.com/moonshine-ai/moonshine.git#subdirectory=moonshine-onnx

# Option C: Whisper — OpenAI's original
uv pip install openai-whisper

# Option D: Faster-Whisper — optimized Whisper
uv pip install faster-whisper
```

### 3. Grant Microphone Permissions

Ensure your terminal application has microphone access in your system settings.

## vLLM Backend (GPU-Accelerated)

The vLLM backend uses a locally running OpenAI-compatible server. It is auto-detected when `STT_VLLM_URL` is reachable.

### Start the vLLM Server

```bash
vllm serve mistralai/Voxtral-Mini-4B-Realtime-2602 \
  --served-model-name default \
  --port 8080
```

> **Important:** `--served-model-name default` is required. The plugin always requests
> the model named `"default"` from the API — without this flag the request will fail.

### Set the Environment Variable

```bash
export STT_VLLM_URL=http://localhost:8080
```

Then start OpenCode. The plugin will auto-detect the vLLM backend.

### Using opencode-voxtral

If you are using the [opencode-voxtral](https://github.com/MyChaOS87/opencode-voxtral) wrapper,
`STT_VLLM_URL` and `STT_PYTHON_PATH` are set automatically.

## Usage

### Voice Input

Ask OpenCode to record your voice:

```
You: Listen to my voice
Assistant: [uses voice_input tool — recording starts, stops on silence]
Assistant: I heard: "Please help me refactor the authentication module"
```

### Check Setup

Use the `voice_check` tool to verify available backends:

```
You: Check my voice setup
Assistant: [uses voice_check tool]
Available STT backends: vllm
Current configuration:
- Backend: auto
- Model: tiny
- Language: en
- Max duration: 30s
- vLLM server URL: http://localhost:8080
```

## Configuration

All options are set via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `STT_BACKEND` | Backend: `vllm`, `moonshine`, `whisper`, `faster-whisper`, `auto` | `auto` |
| `STT_MODEL` | Model size for CPU backends: `tiny`, `base`, `small`, `medium`, `large` | `tiny` |
| `STT_LANGUAGE` | Language code | `en` |
| `STT_MAX_DURATION` | Max recording seconds | `30` |
| `STT_PYTHON_PATH` | Path to Python interpreter | `python3` |
| `STT_VLLM_URL` | URL of running vLLM server | `http://localhost:8080` |

In `auto` mode the backend priority is: **vllm → moonshine → faster-whisper → whisper**.

### CPU Backend Comparison

| Backend | Model | Size | Speed | Quality |
|---------|-------|------|-------|---------|
| **Moonshine** | tiny | 190MB | Fastest | Good |
| **Moonshine** | base | 400MB | Very Fast | Better |
| Whisper | tiny | 150MB | Slow | Good |
| Whisper | base | 290MB | Slower | Better |
| Whisper | small | 970MB | Much Slower | Great |

## System Requirements

### Audio (all backends)

#### macOS
```bash
brew install portaudio ffmpeg
```

#### Ubuntu/Debian
```bash
sudo apt install -y portaudio19-dev python3-dev ffmpeg
```

#### Fedora
```bash
sudo dnf install portaudio-devel python3-devel ffmpeg
```

## Troubleshooting

### "No STT backend available"

- **vLLM**: ensure the server is running and `STT_VLLM_URL` is set correctly
- **CPU**: install at least one of `moonshine-onnx`, `openai-whisper`, or `faster-whisper`

### "Plugin export is not a function" in opencode logs

The plugin must be a single-export JS file. Ensure you are using the built `dist/index.js`,
not the TypeScript source. Re-run `bun run build` after any source changes.

### vLLM "model not found" error

The vLLM server must be started with `--served-model-name default`. Without it the server
registers the model under the full HuggingFace path and the plugin's API request for
`"default"` will return a 404.

### "sounddevice not found" / wrong Python

Set `STT_PYTHON_PATH` to the Python interpreter that has your dependencies installed:

```bash
export STT_PYTHON_PATH=/path/to/your/venv/bin/python
```

### "No microphone found"

1. Check system permissions for your terminal
2. List available devices: `python -c "import sounddevice; print(sounddevice.query_devices())"`

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Type check
bun run typecheck
```

## License

MIT

## Credits

- [Mistral AI Voxtral](https://mistral.ai) - GPU-accelerated speech recognition via vLLM
- [Moonshine](https://github.com/moonshine-ai/moonshine) - Fast ASR for edge devices
- [OpenAI Whisper](https://github.com/openai/whisper) - Robust speech recognition
- [VoiceMode MCP](https://github.com/mbailey/voicemode) - Inspiration for the voice interface
