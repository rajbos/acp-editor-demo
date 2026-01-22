# Mini LLM Configuration

This directory contains configuration for the mini LLM container.

## Phase 1: Ollama (Local Development)

For local development, we use Ollama with a small model.

### Using Docker Compose

The `docker-compose.yml` in the root already includes Ollama:

```bash
docker-compose up mini-llm
```

### Manual Docker Run

```bash
# Start Ollama
docker run -d -p 11434:11434 --name ollama ollama/ollama

# Pull a small model (choose one)
docker exec -it ollama ollama pull llama3.2:1b        # 1.3 GB
docker exec -it ollama ollama pull phi3.5:3.8b        # 2.2 GB
docker exec -it ollama ollama pull gemma2:2b          # 1.6 GB

# Test the model
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2:1b",
  "prompt": "Hello, how are you?",
  "stream": false
}'
```

## Phase 3: Production Deployment

For Azure deployment, consider:

1. **llama.cpp server** for better performance and smaller container size
2. **Quantized models** (Q4/Q5) to reduce memory requirements
3. **Azure Container Apps** with scale-to-zero

### llama.cpp Server

```bash
# Build from GGUF model
docker run -d -p 11434:8080 \
  -v /path/to/models:/models \
  ghcr.io/ggml-org/llama.cpp:server \
  --model /models/llama-3.2-1b-q4_0.gguf \
  --host 0.0.0.0 \
  --port 8080
```

## Model Recommendations

For cost-efficient development and deployment:

| Model | Size | Use Case |
|-------|------|----------|
| llama3.2:1b | 1.3 GB | Development/testing |
| phi3.5:3.8b | 2.2 GB | Better quality, still small |
| gemma2:2b | 1.6 GB | Good balance |
| llama3.2:3b | 2.0 GB | Production-ready |

## Integration with Agent Bridge

The agent bridge connects to the LLM via `LLM_URL` environment variable:

```bash
# Local development
export LLM_URL=http://localhost:11434

# Docker Compose
# Set in docker-compose.yml: LLM_URL=http://mini-llm:11434
```

## API Endpoints

### Ollama API

```bash
# Generate (non-streaming)
POST http://localhost:11434/api/generate
{
  "model": "llama3.2:1b",
  "prompt": "Hello",
  "stream": false
}

# Generate (streaming)
POST http://localhost:11434/api/generate
{
  "model": "llama3.2:1b",
  "prompt": "Hello",
  "stream": true
}

# List models
GET http://localhost:11434/api/tags
```

### llama.cpp Server API

```bash
# Completion
POST http://localhost:8080/completion
{
  "prompt": "Hello",
  "n_predict": 128
}

# Health check
GET http://localhost:8080/health
```

## References

- [Ollama Docker Documentation](https://docs.ollama.com/docker/)
- [llama.cpp Server](https://github.com/ggerganov/llama.cpp/tree/master/examples/server)
- [Ollama Model Library](https://ollama.com/library)
